import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'No records found', description, action, style = {} }) {
  return (
    <div
      className="card p-8 text-center animate-fade flex flex-col items-center justify-center my-6"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        maxWidth: '560px',
        margin: 'var(--space-6) auto',
        ...style
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'var(--primary-50)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-4)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)'
        }}
      >
        <Icon size={28} />
      </div>

      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {title}
      </h3>

      {description && (
        <p className="text-xs text-muted mb-6" style={{ maxWidth: '420px', lineHeight: 1.6 }}>
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
