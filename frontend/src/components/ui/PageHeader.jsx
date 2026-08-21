import React from 'react'

export default function PageHeader({ icon: Icon, title, subtitle, action, iconColor = 'var(--primary)' }) {
  return (
    <div className="section-header mb-6">
      <div>
        <h1 className="section-title" style={{ marginBottom: subtitle ? 4 : 0 }}>
          {Icon && <Icon size={28} style={{ color: iconColor }} />}
          {title}
        </h1>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{subtitle}</p>}
      </div>
      {action && <div className="flex gap-2 items-center">{action}</div>}
    </div>
  )
}
