import { useState } from 'react'
import { Settings, Shield, Bell, Database, Lock, Server, CheckCircle2, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'

export default function AdminSettings() {
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    systemName: 'CampusConnect',
    universityName: 'National University of Computer & Emerging Sciences (FAST)',
    maintenanceMode: false,
    studentRegistrationOpen: true,
    rateLimitingEnabled: true,
    maxUploadSizeMB: 10,
    sessionTimeoutHours: 24,
    auditLoggingEnabled: true
  })

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('System configuration saved successfully!')
    }, 600)
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Settings}
        title="Admin System Settings"
        subtitle="Configure platform parameters, security thresholds, and system preferences"
        iconColor="var(--accent)"
        action={
          <span className="badge badge-accent flex items-center gap-1">
            <Shield size={12} /> System Admin Mode
          </span>
        }
      />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* General System Information */}
        <SectionCard icon={Server} title="General Portal Configuration" iconColor="var(--primary)">
          <div className="grid-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label text-xs font-semibold">Portal System Name</label>
              <input
                type="text"
                className="form-input text-xs"
                value={config.systemName}
                onChange={e => setConfig(c => ({ ...c, systemName: e.target.value }))}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-xs font-semibold">University Institution Name</label>
              <input
                type="text"
                className="form-input text-xs"
                value={config.universityName}
                onChange={e => setConfig(c => ({ ...c, universityName: e.target.value }))}
                required
              />
            </div>
          </div>
        </SectionCard>

        {/* Security & Authentication Settings */}
        <SectionCard icon={Lock} title="Security & Authentication Hardening" iconColor="var(--accent)">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 card" style={{ background: 'var(--bg-surface)' }}>
              <div>
                <div className="font-bold text-sm">Sliding Window Rate Limiter</div>
                <div className="text-xs text-muted">Throttle API requests and brute-force authentication attempts</div>
              </div>
              <input
                type="checkbox"
                checked={config.rateLimitingEnabled}
                onChange={e => setConfig(c => ({ ...c, rateLimitingEnabled: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            <div className="flex items-center justify-between p-3 card" style={{ background: 'var(--bg-surface)' }}>
              <div>
                <div className="font-bold text-sm">Open Student Registration</div>
                <div className="text-xs text-muted">Allow new students to register with valid university emails</div>
              </div>
              <input
                type="checkbox"
                checked={config.studentRegistrationOpen}
                onChange={e => setConfig(c => ({ ...c, studentRegistrationOpen: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            <div className="flex items-center justify-between p-3 card" style={{ background: 'var(--bg-surface)' }}>
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>FAST NUCES Institutional Email Domain Restriction</span>
                  <span className="badge badge-primary text-xs">@nu.edu.pk</span>
                </div>
                <div className="text-xs text-muted">Restrict registration strictly to FAST institutional domains (e.g. @nu.edu.pk or campus subdomains)</div>
              </div>
              <input
                type="checkbox"
                checked={config.strictInstitutionalEmail || false}
                onChange={e => setConfig(c => ({ ...c, strictInstitutionalEmail: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            <div className="flex items-center justify-between p-3 card" style={{ background: 'var(--bg-surface)' }}>
              <div>
                <div className="font-bold text-sm">Comprehensive Audit Trail Logging</div>
                <div className="text-xs text-muted">Record administrative actions, event approvals, and user status changes</div>
              </div>
              <input
                type="checkbox"
                checked={config.auditLoggingEnabled}
                onChange={e => setConfig(c => ({ ...c, auditLoggingEnabled: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Storage & Maintenance */}
        <SectionCard icon={Database} title="Storage & System Maintenance" iconColor="var(--warning)">
          <div className="grid-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label text-xs font-semibold">Max File Upload Size (MB)</label>
              <input
                type="number"
                className="form-input text-xs"
                value={config.maxUploadSizeMB}
                onChange={e => setConfig(c => ({ ...c, maxUploadSizeMB: parseInt(e.target.value) }))}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-xs font-semibold">JWT Session Timeout (Hours)</label>
              <input
                type="number"
                className="form-input text-xs"
                value={config.sessionTimeoutHours}
                onChange={e => setConfig(c => ({ ...c, sessionTimeoutHours: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        </SectionCard>

        {/* Save Settings Bar */}
        <div className="flex justify-end gap-3 mt-2">
          <button type="submit" className="btn btn-accent btn-lg" disabled={saving}>
            {saving ? <><div className="spinner" /> Saving Settings...</> : <><Save size={16} /> Save Admin Settings</>}
          </button>
        </div>
      </form>
    </div>
  )
}
