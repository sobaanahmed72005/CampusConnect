// Socket.io Real-Time Event Handler & JWT Security Middleware Gateway
// Handles Connection Authentication, Room Authorization & Real-Time Messaging

const socketIo = require('socket.io')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { query } = require('./database')
const { sendPushToUser } = require('../services/pushService')
const { recordActivity } = require('../services/telemetryService')


function initSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  })

  // 1. Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = null
      if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token
      } else if (socket.handshake.headers && socket.handshake.headers.cookie) {
        const cookieStr = socket.handshake.headers.cookie
        const match = cookieStr.match(/token=([^;]+)/)
        if (match) token = match[1]
      }

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_jwt_secret_256bit_key_for_testing')
      const userRes = await query(
        'SELECT id, first_name, last_name, email, role, session_version FROM users WHERE id = $1 AND is_active = true',
        [decoded.id]
      )

      if (userRes.rows.length === 0) {
        return next(new Error('User account deactivated or missing'))
      }

      const user = userRes.rows[0]
      if (decoded.session_version !== undefined && decoded.session_version !== user.session_version) {
        return next(new Error('Session revoked'))
      }

      socket.user = user
      next()
    } catch (err) {
      return next(new Error('Authentication failed'))
    }
  })

  // 2. Connection Connection Lifecycle & Room Management
  io.on('connection', (socket) => {

    // Event: join_conversation
    socket.on('join_conversation', async (data) => {
      try {
        const { conversation_id } = data
        if (!conversation_id) return

        const convRes = await query('SELECT * FROM marketplace_conversations WHERE id = $1', [conversation_id])
        if (convRes.rows.length === 0) return

        const conv = convRes.rows[0]
        if (conv.buyer_id !== socket.user.id && conv.seller_id !== socket.user.id) {
          return socket.emit('error', { message: 'Forbidden: You are not a participant in this conversation' })
        }

        const roomName = `conversation:${conversation_id}`
        socket.join(roomName)
        socket.emit('joined_room', { conversation_id })
      } catch (err) {
        socket.emit('error', { message: 'Failed to join conversation room' })
      }
    })

    // Event: send_message
    socket.on('send_message', async (data) => {
      try {
        const { conversation_id, content } = data
        if (!conversation_id || !content || typeof content !== 'string' || content.trim().length === 0) {
          return socket.emit('error', { message: 'Invalid message content' })
        }

        const convRes = await query('SELECT * FROM marketplace_conversations WHERE id = $1', [conversation_id])
        if (convRes.rows.length === 0) return socket.emit('error', { message: 'Conversation not found' })

        const conv = convRes.rows[0]
        if (conv.buyer_id !== socket.user.id && conv.seller_id !== socket.user.id) {
          return socket.emit('error', { message: 'Forbidden: Participant boundary violated' })
        }

        const msgId = crypto.randomUUID()
        const msgRes = await query(
          `INSERT INTO marketplace_messages (id, conversation_id, sender_id, content, is_read, created_at)
           VALUES ($1, $2, $3, $4, false, NOW())
           RETURNING *`,
          [msgId, conversation_id, socket.user.id, content.trim().substring(0, 2000)]
        )

        await query('UPDATE marketplace_conversations SET updated_at = NOW() WHERE id = $1', [conversation_id])

        const messagePayload = {
          ...msgRes.rows[0],
          sender_first_name: socket.user.first_name,
          sender_last_name: socket.user.last_name
        }

        const roomName = `conversation:${conversation_id}`
        io.to(roomName).emit('receive_message', messagePayload)

        const recipientId = conv.buyer_id === socket.user.id ? conv.seller_id : conv.buyer_id
        sendPushToUser(recipientId, {
          title: `New Marketplace Message 💬`,
          body: `${socket.user.first_name}: ${content.trim().slice(0, 60)}`,
          url: '/marketplace'
        }).catch(() => {})
        recordActivity(socket.user.id, 'MESSAGE_SENT', 'CONVERSATION', conversation_id)
      } catch (err) {

        socket.emit('error', { message: 'Failed to dispatch real-time message' })
      }
    })

    // Event: typing
    socket.on('typing', (data) => {
      const { conversation_id } = data
      if (conversation_id) {
        socket.to(`conversation:${conversation_id}`).emit('user_typing', {
          conversation_id,
          user_id: socket.user.id,
          first_name: socket.user.first_name
        })
      }
    })

    // Event: stop_typing
    socket.on('stop_typing', (data) => {
      const { conversation_id } = data
      if (conversation_id) {
        socket.to(`conversation:${conversation_id}`).emit('user_stop_typing', {
          conversation_id,
          user_id: socket.user.id
        })
      }
    })

    socket.on('disconnect', () => {})
  })

  return io
}

module.exports = { initSocket }
