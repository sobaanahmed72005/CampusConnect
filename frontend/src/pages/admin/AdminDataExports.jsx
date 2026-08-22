import React, { useState, useEffect } from 'react'
import api from '../../lib/api'
import { Download, FileText, ShieldAlert, CheckCircle2, RefreshCw, FileCode } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

export default function AdminDataExports() {
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState('users')
  const [selectedFormat, setSelectedFormat] = useState('csv')
  const [generating, setGenerating] = useState(false)
  const [exportsList, setExportsList] = useState([])

  useEffect(() => {
    api.get('/admin/exports/modules')
      .then(res => {
        setModules(res.data.modules || [])
      })
      .catch(() => {})
  }, [])

  const handleGenerateExport = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/admin/exports', {
        module: selectedModule,
        format: selectedFormat
      })
      toast.success(`Export generated for ${selectedModule}! (${res.data.export.recordCount} records)`)
      setExportsList(prev => [res.data.export, ...prev])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate export')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = (filename) => {
    const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/exports/${encodeURIComponent(filename)}/download`
    window.open(downloadUrl, '_blank')
  }

  return (
    <div className="admin-exports p-6 flex flex-col gap-6" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Controlled Data Export Gateway"
        subtitle="Privacy-conscious CSV and JSON dataset export generator for administrative reporting"
        badge="Data Governance"
      />

      {/* Privacy Notice Banner */}
      <div className="p-4" style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="flex items-center gap-2 font-bold text-xs text-accent mb-1">
          <ShieldAlert size={14} /> Privacy & Data Protection Compliance
        </div>
        <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
          Data exports enforce strict column allow-lists. Passwords, JWT secrets, session tokens, verification tokens, and private chat messages are automatically stripped from all export files.
        </div>
      </div>

      {/* Generator Form */}
      <div className="card p-5" style={{ background: 'var(--bg-surface)' }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <FileText size={16} className="text-primary" /> Generate Module Dataset
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label text-xs">Target Module</label>
            <select className="form-input text-xs" value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
              {modules.map(m => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-xs">Export Format</label>
            <select className="form-input text-xs" value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)}>
              <option value="csv">CSV (Comma-Separated Values)</option>
              <option value="json">JSON (Structured Payload)</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleGenerateExport} disabled={generating}>
            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {generating ? 'Generating...' : 'Generate Dataset'}
          </button>
        </div>
      </div>

      {/* Generated Exports Feed */}
      {exportsList.length > 0 && (
        <div className="card p-4" style={{ background: 'var(--bg-surface)' }}>
          <div className="font-bold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" /> Generated Exports
          </div>
          <div className="flex flex-col gap-2">
            {exportsList.map(exp => (
              <div key={exp.exportId} className="flex items-center justify-between p-3 rounded border text-xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  {exp.format === 'json' ? <FileCode size={18} className="text-accent" /> : <FileText size={18} className="text-primary" />}
                  <div>
                    <div style={{ fontWeight: 700 }}>{exp.filename}</div>
                    <div className="text-muted">Module: {exp.module} • {exp.recordCount} records • {(exp.sizeBytes / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button className="btn btn-outline btn-xs flex items-center gap-1" onClick={() => handleDownload(exp.filename)}>
                  <Download size={12} /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
