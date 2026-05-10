import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getConfig, getRuntimeStatus, setConfig } from '../lib/api.js'

const DEFAULT_FORM = {
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com',
  fallbackModel: 'deepseek-chat',
  qwenBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  qwenPrimaryModel: 'qwen-max-latest',
  qwenCodingModel: 'qwen3-coder-plus',
  doubaoVisionEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
  doubaoVisionModel: 'doubao-seed-1-6-vision-250815',
  doubaoVisionApiKey: '',
  workspace_root: '',
  permissionMode: 'default'
}

const TABS = [
  ['models', '模型'],
  ['runtime', '运行环境'],
  ['safety', '安全'],
  ['about', '关于']
]

export default function SettingsPage({ onClose }) {
  const [tab, setTab] = useState('models')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [runtime, setRuntime] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignored = false
    async function load() {
      try {
        const [configResult, runtimeResult] = await Promise.allSettled([getConfig(), getRuntimeStatus()])
        if (ignored) return
        if (configResult.status === 'fulfilled') setForm(current => ({ ...current, ...(configResult.value.config || {}), deepseekApiKey: '', doubaoVisionApiKey: '' }))
        if (runtimeResult.status === 'fulfilled') setRuntime(runtimeResult.value)
      } catch {}
    }
    load()
    return () => { ignored = true }
  }, [])

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function patch(partial) {
    setForm(current => ({ ...current, ...partial }))
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const payload = { ...form }
      if (!payload.deepseekApiKey) delete payload.deepseekApiKey
      if (!payload.doubaoVisionApiKey) delete payload.doubaoVisionApiKey
      await setConfig(payload)
      setMessage('已保存')
    } catch (error) {
      setMessage(`保存失败：${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <section className="mx-auto flex h-full max-h-[820px] w-full max-w-3xl flex-col rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] shadow-xl">
        <header className="flex h-14 items-center justify-between border-b border-[color:var(--border)] px-5">
          <div>
            <h2 className="text-base font-semibold">设置</h2>
            <p className="text-xs text-[color:var(--text-muted)]">模型、运行环境和安全策略</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[color:var(--bg-tertiary)]" aria-label="关闭设置">
            <X size={16} />
          </button>
        </header>

        <div className="flex gap-1 border-b border-[color:var(--border)] px-5 py-3">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`h-8 rounded-md px-3 text-sm ${tab === id ? 'bg-[color:var(--accent)] text-white' : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-tertiary)]'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'models' && (
            <div className="space-y-4">
              <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">DeepSeek API Key<input type="password" value={form.deepseekApiKey} onChange={(event) => patch({ deepseekApiKey: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
              <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">Base URL<input value={form.deepseekBaseUrl} onChange={(event) => patch({ deepseekBaseUrl: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
              <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">Model<input value={form.fallbackModel} onChange={(event) => patch({ fallbackModel: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
              <details className="rounded-md border border-[color:var(--border)] p-3">
                <summary className="cursor-pointer text-sm font-medium">豆包视觉模型</summary>
                <div className="mt-3 space-y-3">
                  <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">API Key<input type="password" value={form.doubaoVisionApiKey} onChange={(event) => patch({ doubaoVisionApiKey: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
                  <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">Endpoint<input value={form.doubaoVisionEndpoint} onChange={(event) => patch({ doubaoVisionEndpoint: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
                  <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">Model<input value={form.doubaoVisionModel} onChange={(event) => patch({ doubaoVisionModel: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
                </div>
              </details>
            </div>
          )}

          {tab === 'runtime' && (
            <div className="space-y-4">
              <label className="block space-y-1 text-xs text-[color:var(--text-muted)]">Python 路径<input value={form.pythonPath || ''} onChange={(event) => patch({ pythonPath: event.target.value })} placeholder="python" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
              <pre className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] p-3 text-xs whitespace-pre-wrap">{JSON.stringify(runtime || {}, null, 2)}</pre>
            </div>
          )}

          {tab === 'safety' && (
            <div className="grid gap-2">
              {[
                ['default', '安全模式', '普通聊天和工具调用都经过策略检查。'],
                ['full', '全权限', '兼容旧工具，风险操作仍需要确认。'],
                ['readonly', '只读', '仅允许读取和解释，不执行写入。']
              ].map(([mode, label, desc]) => (
                <button key={mode} type="button" onClick={() => patch({ permissionMode: mode })} className={`rounded-md border p-3 text-left ${form.permissionMode === mode ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-tertiary)]'}`}>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="mt-1 text-xs text-[color:var(--text-muted)]">{desc}</div>
                </button>
              ))}
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-2 text-sm">
              <div>版本：0.1.0</div>
              <div>Electron：{window.electronAPI?.isElectron ? '已连接' : '浏览器预览'}</div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[color:var(--border)] px-5 py-3">
          <div className="text-xs text-[color:var(--text-muted)]">{message}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--bg-tertiary)]">取消</button>
            <button type="button" onClick={save} disabled={saving} className="h-9 rounded-md bg-[color:var(--accent)] px-3 text-sm text-white disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
