import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react'

const STEPS = [
  { key: 'apikey', label: 'API Key' },
  { key: 'python', label: '运行环境' },
  { key: 'bridge', label: 'Bridge' },
  { key: 'done', label: '完成' }
]

function setupInvoke(channel, payload) {
  const invoke = window.electronAPI?.invoke
  if (!invoke) throw new Error('Electron bridge is unavailable')
  return invoke(channel, payload)
}

function StatusDot({ ok }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-[color:var(--success)]' : 'bg-red-500'}`}
      aria-hidden="true"
    />
  )
}

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-0 px-5 py-4" role="tablist" aria-label="Setup steps">
      {steps.map((s, i) => {
        const isDone = i < current
        const isCurrent = i === current
        const isFuture = i > current

        let circleClass = 'border-2 border-[color:var(--border)] bg-transparent text-[color:var(--text-muted)]'
        if (isDone) circleClass = 'border-2 border-[color:var(--success)] bg-[color:var(--success)] text-white'
        if (isCurrent) circleClass = 'border-2 border-[color:var(--accent)] bg-[color:var(--accent)] text-white'

        return (
          <div key={s.key} className="flex items-center" role="tab" aria-selected={isCurrent} aria-label={`步骤 ${i + 1}: ${s.label}`}>
            <div className="flex flex-col items-center gap-1">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${circleClass}`}>
                {isDone ? <CheckCircle2 size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`text-xs ${isCurrent ? 'font-medium text-[color:var(--text-primary)]' : 'text-[color:var(--text-muted)]'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 w-8 rounded ${i < current ? 'bg-[color:var(--success)]' : 'bg-[color:var(--border)]'}`} aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function BridgeRow({ bridgeKey, bridge }) {
  const running = bridge.state === 'running'
  const failed = bridge.state === 'failed'
  const dotBg = running ? 'bg-[color:var(--success)]' : failed ? 'bg-red-500' : 'bg-amber-500'
  const textColor = running ? 'text-[color:var(--success)]' : failed ? 'text-red-500' : 'text-amber-500'
  const stateLabel = running ? 'Running' : failed ? 'Failed' : bridge.state || 'Unknown'

  return (
    <div className="rounded-md border border-[color:var(--border)] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotBg}`} aria-hidden="true" />
          <span className="text-sm font-medium">{bridgeKey}</span>
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{stateLabel}</span>
      </div>
      {failed && bridge.lastError && (
        <div className="mt-2 text-xs text-red-500">{bridge.lastError}</div>
      )}
    </div>
  )
}

export default function WelcomeSetupDialog({ open, onClose, onMarkSeen }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    doubaoVisionApiKey: '',
    doubaoVisionEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    doubaoVisionModel: 'doubao-seed-1-6-vision-250815'
  })
  const [pythonStatus, setPythonStatus] = useState(null)
  const [pythonLoading, setPythonLoading] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return
    setStep(0)
    setError('')
    setPythonStatus(null)
    setBridgeStatus(null)
    setForm({
      doubaoVisionApiKey: '',
      doubaoVisionEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      doubaoVisionModel: 'doubao-seed-1-6-vision-250815'
    })
  }, [open])

  // Step 1: detect Python on mount
  useEffect(() => {
    if (!open || step !== 1) return
    detectPython()
  }, [open, step])

  // Step 2: poll bridge status every 5s
  useEffect(() => {
    if (!open || step !== 2) return
    let active = true
    async function poll() {
      try {
        const result = await setupInvoke('bridge:status')
        if (active && result?.bridges) setBridgeStatus(result.bridges)
      } catch {
        // bridge may not be ready yet
      }
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [open, step])

  async function detectPython() {
    setPythonLoading(true)
    setError('')
    try {
      const result = await setupInvoke('setup:status')
      setPythonStatus(result?.deps || {})
    } catch (err) {
      setError(err?.message || 'Python 环境检测失败')
    } finally {
      setPythonLoading(false)
    }
  }

  async function handleSaveApiKeyAndNext() {
    if (saving || !form.doubaoVisionApiKey.trim()) return
    setSaving(true)
    setError('')
    try {
      await setupInvoke('config:set', form)
      setStep(1)
    } catch (err) {
      setError(err?.message || '保存 API Key 失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleSkipApiKey() {
    try {
      await setupInvoke('setup:mark-welcome-shown')
    } catch {
      // Ignore in browser-only dev sessions
    }
    onMarkSeen?.(true)
    setStep(1)
  }

  function handleNext() {
    if (step < 3) setStep((s) => s + 1)
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  async function handleStart() {
    try {
      await setupInvoke('setup:mark-welcome-shown')
    } catch {
      // Ignore in browser-only dev sessions
    }
    onMarkSeen?.(true)
    onClose?.()
  }

  const bridgesRunning =
    bridgeStatus && Object.keys(bridgeStatus).length > 0
      ? Object.values(bridgeStatus).every((b) => b.state === 'running')
      : false

  const step0Valid = form.doubaoVisionApiKey.trim().length > 0

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-setup-title"
    >
      <div className="flex max-h-full w-full max-w-lg flex-col rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-primary)] shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div>
            <h2 id="welcome-setup-title" className="text-base font-semibold">
              AionUi 初始设置
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              完成以下步骤以启用全部功能。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[color:var(--bg-tertiary)]"
            aria-label="关闭设置向导"
            title="关闭"
          >
            <X size={16} />
          </button>
        </header>

        {/* Step indicator */}
        <StepIndicator current={step} steps={STEPS} />

        {/* Error banner */}
        {error && (
          <div className="mx-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {/* ---- Step 0: API Key ---- */}
          {step === 0 && (
            <>
              <h3 className="text-sm font-semibold">配置 Doubao Vision API Key</h3>
              <p className="text-xs text-[color:var(--text-muted)]">
                用于浏览器自动化和桌面控制。在火山引擎控制台获取。
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder="输入 API Key"
                    value={form.doubaoVisionApiKey}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, doubaoVisionApiKey: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveApiKeyAndNext()
                    }}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    value={form.doubaoVisionEndpoint}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, doubaoVisionEndpoint: e.target.value }))
                    }
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]">
                    Model
                  </label>
                  <input
                    type="text"
                    value={form.doubaoVisionModel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, doubaoVisionModel: e.target.value }))
                    }
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]"
                  />
                </div>
              </div>
            </>
          )}

          {/* ---- Step 1: Python environment detection ---- */}
          {step === 1 && (
            <>
              <h3 className="text-sm font-semibold">检测运行环境</h3>

              {pythonLoading && (
                <div className="rounded-md border border-[color:var(--border)] p-3 text-sm text-[color:var(--text-muted)]">
                  正在检测 Python 环境...
                </div>
              )}

              {!pythonLoading && pythonStatus && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border border-[color:var(--border)] px-3 py-2 text-sm">
                    <StatusDot ok={Boolean(pythonStatus.python)} />
                    <span>Python{typeof pythonStatus.python === 'string' ? `: ${pythonStatus.python}` : pythonStatus.python ? ' 可用' : ' 未安装'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-[color:var(--border)] px-3 py-2 text-sm">
                    <StatusDot ok={Boolean(pythonStatus.browserUse)} />
                    <span>browser-use{pythonStatus.browserUse ? ' 已安装' : ' 未安装'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-[color:var(--border)] px-3 py-2 text-sm">
                    <StatusDot ok={Boolean(pythonStatus.playwright)} />
                    <span>playwright{pythonStatus.playwright ? ' 已安装' : ' 未安装'}</span>
                  </div>
                </div>
              )}

              {!pythonLoading && !pythonStatus && !error && (
                <div className="rounded-md border border-[color:var(--border)] p-3 text-sm text-[color:var(--text-muted)]">
                  点击重新检测按钮开始检测。
                </div>
              )}
            </>
          )}

          {/* ---- Step 2: Bridge status ---- */}
          {step === 2 && (
            <>
              <h3 className="text-sm font-semibold">Bridge 状态</h3>

              {!bridgeStatus && (
                <div className="rounded-md border border-[color:var(--border)] p-3 text-sm text-[color:var(--text-muted)]">
                  正在获取 Bridge 状态...
                </div>
              )}

              {bridgeStatus && Object.keys(bridgeStatus).length === 0 && (
                <div className="rounded-md border border-[color:var(--border)] p-3 text-sm text-[color:var(--text-muted)]">
                  未配置 Bridge 服务。
                </div>
              )}

              {bridgeStatus &&
                Object.entries(bridgeStatus).map(([key, b]) => (
                  <BridgeRow key={key} bridgeKey={key} bridge={b} />
                ))}

              {bridgeStatus && Object.keys(bridgeStatus).length > 0 && bridgesRunning && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-700">
                  所有 Bridge 服务运行正常。
                </div>
              )}
            </>
          )}

          {/* ---- Step 3: All ready ---- */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 size={56} className="text-[color:var(--success)]" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">一切就绪</h3>
              <p className="mt-2 max-w-xs text-sm text-[color:var(--text-muted)]">
                AionUi 已完成配置，现在可以开始使用了。
              </p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <footer className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] px-5 py-4">
          <div>
            {step > 0 && step < 3 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--bg-tertiary)]"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                上一步
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Step 0: skip + save&next */}
            {step === 0 && (
              <>
                <button
                  type="button"
                  onClick={handleSkipApiKey}
                  className="h-9 rounded-md border border-[color:var(--border)] px-4 text-sm hover:bg-[color:var(--bg-tertiary)]"
                >
                  跳过
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKeyAndNext}
                  disabled={!step0Valid || saving}
                  className="h-9 rounded-md bg-[color:var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? '保存中...' : '下一步'}
                </button>
              </>
            )}

            {/* Step 1: re-detect + next */}
            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={detectPython}
                  disabled={pythonLoading}
                  className="h-9 rounded-md border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--bg-tertiary)] disabled:opacity-50"
                >
                  重新检测
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-9 rounded-md bg-[color:var(--accent)] px-4 text-sm font-medium text-white"
                >
                  下一步
                </button>
              </>
            )}

            {/* Step 2: next (disabled until bridges running) */}
            {step === 2 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!bridgesRunning}
                className="h-9 rounded-md bg-[color:var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                下一步
              </button>
            )}

            {/* Step 3: start using */}
            {step === 3 && (
              <button
                type="button"
                onClick={handleStart}
                className="h-9 rounded-md bg-[color:var(--accent)] px-4 text-sm font-medium text-white"
              >
                开始使用
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
