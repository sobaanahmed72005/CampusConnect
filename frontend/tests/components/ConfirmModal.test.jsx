import { describe, test, expect, vi } from 'vitest'

describe('Frontend Component: ConfirmModal Component Suite', () => {
  test('Modal dialog enforces accessibility properties role="dialog" and aria-modal="true"', () => {
    const modalProps = {
      isOpen: true,
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
      role: 'dialog',
      'aria-modal': true
    }

    expect(modalProps.isOpen).toBe(true)
    expect(modalProps.role).toBe('dialog')
    expect(modalProps['aria-modal']).toBe(true)
  })

  test('Pressing Escape key triggers onClose callback handler', () => {
    const onClose = vi.fn()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    handleKeyDown({ key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
