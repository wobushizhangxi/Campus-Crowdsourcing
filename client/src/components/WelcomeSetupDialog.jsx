import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, X } from 'lucide-react'

const TIER_KEYS = ['lite', 'browser', 'full']
const KEY_DEPS = new Set(['deepseekKey', 'qwenKey', 'doubaoKey'])
const TOGGLE_DEPS = new Set(['screenAuthorized'])

const DEP_LABELS = {
  deepseekKey: 'DeepSeek API Key',
  qwenKey: 'Qwen3-VL DashScope API Key',
  doubaoKey: 'Doubao Volcengine Ark API Key',
  pythonOpenInterpreter: 'Python + Open Interpreter',
  screenAuthorized: 'Screen authorization enabled'
}

function StatusIcon({ ready }) {
  return ready
    ? <CheckCircle2 size={16} className="text-[color:var(--success)]" aria-hidden="true" />
    : <AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />
}

function setupInvoke(channel, payload) {
  const invoke = window.electronAPI?.invoke
  if (!invoke) throw new Error('Electron bridge is unavailable')
  return invoke(channel, payload)
}

function openExternalUrl(url) {
  if (window.electronAPI?.openExternal) return window.electronAPI.openExternal(url)
  return setupInvoke('app:open-external', { url })
}

function actionLink({ href, label }) {
  if (!href) return null
  return (
    <button
      type="button"
      onClick={() => {
        openExternalUrl(href).catch((err) => {
          console.error('Failed to open external link', err)
        })
      }}
      className="link-like inline-flex shrink-0 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-[color:var(--accent)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
    >
      {label} <ExternalLink size={12} aria-hidden="true" />
    </button>
  )
}

function ExternalLinkRow({ ok, helpUrl, label }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-white/75 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <StatusIcon ready={ok} />
        <span className="min-w-0 break-words">{label}</span>
      </span>
      {!ok && actionLink({ href: helpUrl, label: 'Setup' })}
    </li>
  )
}

function KeyRow({ dep, ok, helpUrl, label, onSaved }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!value.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await setupInvoke('setup:set-key', { dep, value })
      setValue('')
      await onSaved?.()
    } catch (err) {
      setError(err?.message || 'Failed to save key')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className={`rounded-md border px-3 py-2 text-sm ${ok ? 'border-emerald-100 bg-white/80' : 'border-amber-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <StatusIcon ready={ok} />
          <span className="min-w-0 break-words">{label}</span>
        </span>
        {actionLink({ href: helpUrl, label: 'Get key' })}
      </div>
      {!ok && (
        <div className="mt-2 flex w-full items-center gap-2">
          <input
            type={show ? 'text' : 'password'}
            placeholder="paste key here"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') save() }}
            className="min-w-0 flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]"
          />
          <button type="button" onClick={() => setShow((current) => !current)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] hover:bg-[color:var(--bg-tertiary)]" aria-label={show ? 'Hide key' : 'Show key'} title={show ? 'Hide key' : 'Show key'}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button type="button" onClick={save} disabled={!value.trim() || saving} className="h-9 shrink-0 rounded-md bg-[color:var(--accent)] px-3 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </li>
  )
}

function ToggleRow({ ok, label, onSaved }) {
  const [checked, setChecked] = useState(ok)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setChecked(ok)
  }, [ok])

  async function toggle(event) {
    const next = event.target.checked
    setChecked(next)
    setSaving(true)
    setError('')
    try {
      await setupInvoke('setup:set-screen-authorized', { value: next })
      await onSaved?.()
    } catch (err) {
      setChecked(ok)
      setError(err?.message || 'Failed to update authorization')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className={`rounded-md border px-3 py-2 text-sm ${ok ? 'border-emerald-100 bg-white/80' : 'border-amber-100 bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <StatusIcon ready={ok} />
          <span className="min-w-0 break-words">{label}</span>
        </span>
        <label className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-[color:var(--text-primary)]">
          <input type="checkbox" checked={checked} disabled={saving} onChange={toggle} />
          {checked ? 'Enabled' : 'Enable'}
        </label>
      </div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </li>
  )
}

function DepRow({ dep, ok, helpUrl, label, onSaved }) {
  if (KEY_DEPS.has(dep)) return <KeyRow dep={dep} ok={ok} helpUrl={helpUrl} label={label} onSaved={onSaved} />
  if (TOGGLE_DEPS.has(dep)) return <ToggleRow ok={ok} label={label} onSaved={onSaved} />
  return <ExternalLinkRow ok={ok} helpUrl={helpUrl} label={label} />
}

function tierClassName(tier) {
  if (tier.ready) return 'border-emerald-200 border-l-[color:var(--success)] bg-emerald-50/70'
  if (tier.recommended) return 'border-amber-300 border-l-[color:var(--accent)] bg-[color:var(--accent)]/5'
  return 'border-amber-200 border-l-amber-400 bg-amber-50/60'
}

export default function WelcomeSetupDialog({ open, onClose, onMarkSeen }) {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  const refreshStatus = useCallback(async () => {
    try {
      setError('')
      const next = await setupInvoke('setup:status')
      setStatus(next)
    } catch (err) {
      setError(err?.message || 'Failed to read setup status')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    let ignored = false
    setError('')
    async function loadStatus() {
      try {
        const next = await setupInvoke('setup:status')
        if (!ignored) setStatus(next)
      } catch (err) {
        if (!ignored) setError(err?.message || 'Failed to read setup status')
      }
    }
    loadStatus()
    return () => { ignored = true }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const allReady = status && Object.values(status.deps || {}).every(Boolean)
    if (allReady) return undefined
    let ignored = false
    const id = setInterval(async () => {
      try {
        const next = await setupInvoke('setup:status')
        if (!ignored) setStatus(next)
      } catch (err) {
        if (!ignored) setError(err?.message || 'Failed to read setup status')
      }
    }, 5000)
    return () => {
      ignored = true
      clearInterval(id)
    }
  }, [open, status])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="welcome-setup-title">
      <div className="flex max-h-full w-full max-w-2xl flex-col rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-primary)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div>
            <h2 id="welcome-setup-title" className="text-base font-semibold">AionUi first-time setup</h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">Choose the readiness tier that matches how much automation you want enabled.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[color:var(--bg-tertiary)]" aria-label="Close setup guide" title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {!status && !error && <div className="rounded-md border border-[color:var(--border)] p-3 text-sm text-[color:var(--text-muted)]">Loading setup status...</div>}

          {status && TIER_KEYS.map((key) => {
            const tier = status.tiers[key]
            return (
              <section key={key} className={`rounded-lg border border-l-4 p-4 ${tierClassName(tier)}`}>
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{tier.label}</h3>
                      {tier.recommended && <span className="rounded bg-[color:var(--accent)] px-2 py-0.5 text-xs text-white">Recommended</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs font-medium">
                    <StatusIcon ready={tier.ready} />
                    {tier.ready ? 'Ready' : 'Needs setup'}
                  </div>
                </header>
                <ul className="mt-3 grid gap-2">
                  {tier.requires.map((dep) => {
                    const ready = Boolean(status.deps[dep])
                    const href = status.helpLinks?.[dep]
                    return (
                      <DepRow key={dep} dep={dep} ok={ready} helpUrl={href} label={DEP_LABELS[dep] || dep} onSaved={refreshStatus} />
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] px-5 py-4">
          <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <input type="checkbox" onChange={(event) => onMarkSeen?.(event.target.checked)} />
            Do not show automatically
          </label>
          <button type="button" onClick={onClose} className="h-9 rounded-md bg-[color:var(--accent)] px-4 text-sm font-medium text-white">
            Start using AionUi
          </button>
        </footer>
      </div>
    </div>
  )
}
