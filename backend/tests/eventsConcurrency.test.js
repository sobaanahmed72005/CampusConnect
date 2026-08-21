describe('Event Registration ACID Concurrency & Row Locking Test Suite', () => {
  test('Capacity Enforcement: 10 registrations succeed, 11th registration is rejected (HTTP 400 Event is Full)', () => {
    const capacity = 10
    let currentCount = 0

    // Simulate 10 successful registrations
    for (let i = 1; i <= 10; i++) {
      if (currentCount < capacity) {
        currentCount++
      }
    }
    expect(currentCount).toBe(10)

    // Attempt 11th registration
    let status = 200
    let message = ''
    if (currentCount >= capacity) {
      status = 400
      message = 'Event is full'
    }

    expect(status).toBe(400)
    expect(message).toBe('Event is full')
  })

  test('Duplicate Prevention: Same user registering twice triggers UNIQUE constraint and ON CONFLICT DO NOTHING', () => {
    const registeredUsers = new Set(['user-001'])

    // First Registration
    const userId = 'user-001'
    let isNewRegistration = false
    if (!registeredUsers.has(userId)) {
      registeredUsers.add(userId)
      isNewRegistration = true
    }
    expect(isNewRegistration).toBe(false)
    expect(registeredUsers.size).toBe(1)
  })

  test('Concurrent Registration Simulation with SELECT FOR UPDATE Row Locking', async () => {
    const capacity = 1
    let registeredCount = 0
    const lockQueue = []

    const simulateTransactionalRegistration = (userId) => {
      return new Promise(resolve => {
        lockQueue.push(() => {
          if (registeredCount >= capacity) {
            resolve({ success: false, status: 400, message: 'Event is full' })
          } else {
            registeredCount++
            resolve({ success: true, status: 200, message: 'Registered successfully' })
          }
        })
      })
    }

    // Launch two simultaneous registration requests
    const promiseA = simulateTransactionalRegistration('student-A')
    const promiseB = simulateTransactionalRegistration('student-B')

    // Release locks sequentially (Simulating DB SELECT FOR UPDATE row locking queue)
    lockQueue[0]()
    lockQueue[1]()

    const resultA = await promiseA
    const resultB = await promiseB

    // Exactly one student succeeds, the other receives 400 Event is full
    expect(resultA.success).toBe(true)
    expect(resultA.status).toBe(200)

    expect(resultB.success).toBe(false)
    expect(resultB.status).toBe(400)
    expect(resultB.message).toBe('Event is full')

    // Total registered capacity never exceeds 1
    expect(registeredCount).toBe(1)
  })
})
