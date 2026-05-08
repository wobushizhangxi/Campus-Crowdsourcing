import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, X } from 'lucide-react'

const TIER_KEYS = ['lite', 'browser', 'full']

const DEP_LABELS = {
  deepseekKey: 'DeepSeek API Key',
  qwenKey: 'Qwen3-VL DashScope API Key',
  doubaoKey: 'Doubao Volcengine Ark API Key',
  midsceneExtension: 'Chrome Midscene extension connected',
  pythonOpenInterpreter: 'Python + Open Interpreter',
  screenAuthorized: 'Screen authorization enabled'
}

function StatusIcon({ ready }) {
  return ready
    ? <CheckCircle2 size={16} className="text-[color:var(--success)]" aria-hidden="true" />
    : <AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />
}

export default function WelcomeSetupDialog({ open, onClose, onMarkSeen }) {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let ignored = false
    setError('')
    window.electronAPI?.invoke?.('setup:status')
      .then((next) => { if (!ignored) setStatus(next) })
      .catch((err) => { if (!ignored) setError(err?.message || 'Failed to read setup status') })
    return () => { ignored = true }
  }, [open])

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
              <section key={key} className={`rounded-lg border p-4 ${tier.ready ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/60'}`}>
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
                      <li key={dep} className="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <StatusIcon ready={ready} />
                          <span className="truncate">{DEP_LABELS[dep] || dep}</span>
                        </span>
                        {!ready && href && (
                          <a href={href} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[color:var(--accent)]">
                            Setup <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        )}
                      </li>
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
