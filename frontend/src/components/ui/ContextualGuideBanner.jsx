import { useState, useEffect } from 'react'
import { Sparkles, X, Info, ShieldCheck, Lightbulb } from 'lucide-react'

export default function ContextualGuideBanner({
  id = 'default',
  title = 'Pro Tip',
  message,
  icon: Icon = Lightbulb,
  color = 'var(--primary)',
  bg = 'var(--primary-50)'
}) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(`cc_guide_dismissed_${id}`)
      if (!isDismissed) setDismissed(false)
    } catch {}
  }, [id])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(`cc_guide_dismissed_${id}`, 'true')
    } catch {}
  }

  if (dismissed || !message) return null

  return (
    <div
      className="card mb-6 animate-fade flex items-center justify-between gap-3 p-4"
      style={{
        background: bg,
        border: `1px solid ${color}40`,
        borderRadius: 'var(--radius-lg)'
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md" style={{ background: `${color}20`, color }}>
          <Icon size={18} />
        </div>
        <div>
          <div className="font-bold text-sm flex items-center gap-2" style={{ color }}>
            {title}
          </div>
          <div className="text-xs text-secondary mt-0.5">{message}</div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-icon text-muted hover:text-primary"
        onClick={handleDismiss}
        aria-label="Dismiss tip"
      >
        <X size={15} />
      </button>
    </div>
  )
}
