import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function SectionCard({
  icon: Icon,
  title,
  actionText = 'View all',
  actionLink,
  badgeText,
  badgeClass = 'badge-primary',
  children,
  className = '',
  iconColor = 'var(--primary)'
}) {
  return (
    <div className={`card ${className}`}>
      <div className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 className="flex items-center gap-2" style={{ fontSize: '1.1rem' }}>
          {Icon && <Icon size={18} style={{ color: iconColor }} />}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {badgeText && <span className={`badge ${badgeClass}`}>{badgeText}</span>}
          {actionLink && (
            <Link to={actionLink} className="text-sm text-primary-color flex items-center gap-1 font-semibold">
              {actionText} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
