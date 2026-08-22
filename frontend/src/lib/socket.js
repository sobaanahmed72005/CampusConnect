import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000'

    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect()
  }
}
