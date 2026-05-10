import { useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, Shield, ShieldCheck } from 'lucide-react'
import { getConfig, setConfig } from '../lib/api.js'
import SkillsTab from './SkillsTab.jsx'
import RulesTab from './RulesTab.jsx'

const DEFAULT_FORM = {
  qwenApiKey: '',
  qwenBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  qwenPrimaryModel: 'qwen-max-latest',
  qwenCodingModel: 'qwen3-coder-plus',
  fallbackProvider: '',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com',
  fallbackModel: 'deepseek-chat',
  doubaoVisionApiKey: '',
  doubaoVisionEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
  doubaoVisionModel: 'doubao-seed-1-6-vision-250815',
  dryRunEnabled: true,
  permissionMode: 'default',
  workspace_root: '',
  session_confirm_cache_enabled: true
}

const TABS = [
  { id: 'models', label: '模型' },
  { id: 'runtimes', label: '运行时' },
  { id: 'safety', label: '安全' },
  { id: 'skills', label: '技能' },
  { id: 'rules', label: '偏好' }
]

function BridgeStatusPanel() {
  const [bridges, setBridges] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const result = await window.electronAPI?.invoke('bridge:status')
        if (active && result?.bridges) setBridges(result.bridges)
      } catch {}
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  async function restart(key) {
    setLoading(true)
    try {
      await window.electronAPI?.invoke('bridge:restart', { key })
      // Re-poll after a short delay
      setTimeout(async () => {
        try {
          const result = await window.electronAPI?.invoke('bridge:status')
          if (result?.bridges) setBridges(result.bridges)
        } catch {}
      }, 2000)
    } finally { setLoading(false) }
  }

  const entries = [
    { key: 'browserUse', label: 'Browser-Use (浏览器自动化)', port: 8780, runtime: 'Python' },
    { key: 'uitars', label: 'UI-TARS (桌面控制)', port: 8765, runtime: 'Node.js' },
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Bridge 状态</h2>
      {entries.map(({ key, label, port, runtime }) => {
        const b = bridges[key] || {}
        const running = b.state === 'running'
        const failed = b.state === 'failed'
        const color = running ? 'text-[color:var(--success)]' : failed ? 'text-red-500' : 'text-amber-500'
        const dotColor = running ? 'bg-[color:var(--success)]' : failed ? 'bg-red-500' : 'bg-amber-500'
        const stateText = running ? 'Running' : failed ? 'Failed' : b.state || 'Unknown'
        return (
          <div key={key} className="rounded-md border border-[color:var(--border)] p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColor}`} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-[color:var(--text-muted)] ml-2">{runtime} | port {port}</span>
              </div>
              <span className={`text-xs ${color}`}>{stateText}</span>
            </div>
            {failed && b.lastError && (
              <div className="mt-2 text-xs text-red-500">{b.lastError}</div>
            )}
            {failed && (
              <button type="button" onClick={() => restart(key)} disabled={loading}
                className="mt-2 h-7 rounded-md border border-[color:var(--border)] px-3 text-xs hover:bg-[color:var(--bg-tertiary)]">
                重新启动
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SettingsPanel() {
  const [tab, setTab] = useState('models')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [masked, setMasked] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let ignored = false
    async function loadConfig() {
      try {
        const result = await getConfig()
        if (ignored || !result.config) return
        const config = result.config
        const mode = config.permissionMode || 'default'
        setMasked({ qwenApiKey: config.qwenApiKey, deepseekApiKey: config.deepseekApiKey, apiKey: config.apiKey, doubaoVisionApiKey: config.doubaoVisionApiKey })
        setForm({
          ...DEFAULT_FORM,
          ...config,
          qwenApiKey: '',
          deepseekApiKey: '',
          doubaoVisionApiKey: '',
          permissionMode: mode
        })
        localStorage.setItem('agentdev-permission-mode', mode)
      } catch (error) {
        if (!ignored) setMsg(`加载失败：${error.message}`)
      }
    }
    loadConfig()
    return () => { ignored = true }
  }, [])

  function patch(partial) {
    setForm((current) => ({ ...current, ...partial }))
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    try {
      const next = { ...form }
      if (!next.qwenApiKey) delete next.qwenApiKey
      if (!next.deepseekApiKey) delete next.deepseekApiKey
      if (!next.doubaoVisionApiKey) delete next.doubaoVisionApiKey
      const result = await setConfig(next)
      const mode = result.config?.permissionMode || form.permissionMode
      setMasked({ qwenApiKey: result.config?.qwenApiKey, deepseekApiKey: result.config?.deepseekApiKey, apiKey: result.config?.apiKey, doubaoVisionApiKey: result.config?.doubaoVisionApiKey })
      patch({ qwenApiKey: '', deepseekApiKey: '', doubaoVisionApiKey: '' })
      localStorage.setItem('agentdev-permission-mode', mode)
      window.dispatchEvent(new CustomEvent('agentdev:permission-changed', { detail: { mode } }))
      setMsg('已保存')
      setTimeout(() => setMsg(''), 2000)
    } catch (error) {
      setMsg(`保存失败：${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function chooseWorkspace() {
    const selected = await window.electronAPI?.selectDirectory?.()
    if (selected) patch({ workspace_root: selected })
  }

  const isFull = form.permissionMode === 'full'

  function ApiKeyLabel({ text, url }) {
    return (
      <div className="flex items-center gap-2">
        <span>{text}</span>
        <button
          type="button"
          onClick={() => window.electronAPI?.openExternal?.(url)}
          className="text-[color:var(--text-muted)] hover:text-[color:var(--accent)]"
          title={url}
        >
          <ExternalLink size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-[color:var(--border)] pb-2">
        {TABS.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-8 rounded-md px-3 text-sm ${tab === item.id ? 'bg-[color:var(--accent)] text-white' : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-tertiary)]'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('aionui:open-welcome'))} className="inline-flex h-8 items-center gap-2 rounded-md border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--bg-tertiary)]">
        <ShieldCheck size={14} />
        View first-time setup guide
      </button>

      {tab === 'models' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Doubao Vision (browser + desktop automation)</h2>
            <label className="block space-y-2 text-xs text-[color:var(--text-muted)]"><ApiKeyLabel text="API Key" url="https://console.volcengine.com/ark" />
              <input type="password" value={form.doubaoVisionApiKey}
                onChange={(event) => patch({ doubaoVisionApiKey: event.target.value })}
                placeholder={masked.doubaoVisionApiKey || 'Volcengine Ark API Key'}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" />
            </label>
            <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">Endpoint
              <input value={form.doubaoVisionEndpoint}
                onChange={(event) => patch({ doubaoVisionEndpoint: event.target.value })}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" />
            </label>
            <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">Model Name
              <input value={form.doubaoVisionModel}
                onChange={(event) => patch({ doubaoVisionModel: event.target.value })}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" />
            </label>
          </div>

          <h2 className="text-lg font-semibold">Qwen 配置</h2>
          <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">API Key<input type="password" value={form.qwenApiKey} onChange={(event) => patch({ qwenApiKey: event.target.value })} placeholder={masked.qwenApiKey || 'DashScope API Key'} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
          <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">Base URL<input value={form.qwenBaseUrl} onChange={(event) => patch({ qwenBaseUrl: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
          <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">主模型<input value={form.qwenPrimaryModel} onChange={(event) => patch({ qwenPrimaryModel: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
          <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">代码模型<input value={form.qwenCodingModel} onChange={(event) => patch({ qwenCodingModel: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>

          <div className="border-t border-[color:var(--border)] pt-4 space-y-3">
            <h2 className="text-lg font-semibold">DeepSeek 备用聊天</h2>
            <p className="text-xs text-[color:var(--text-muted)]">仅作为普通聊天备用模型。DeepSeek 不会用于任务规划或动作意图。</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.fallbackProvider === 'deepseek'} onChange={(event) => patch({ fallbackProvider: event.target.checked ? 'deepseek' : '' })} /> 启用普通聊天备用模型</label>
            <label className="block space-y-2 text-xs text-[color:var(--text-muted)]"><ApiKeyLabel text="DeepSeek API Key" url="https://platform.deepseek.com" /><input type="password" value={form.deepseekApiKey} onChange={(event) => patch({ deepseekApiKey: event.target.value })} placeholder={masked.deepseekApiKey || masked.apiKey || 'sk-...'} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
            <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">备用模型<input value={form.fallbackModel} onChange={(event) => patch({ fallbackModel: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
            <label className="block space-y-2 text-xs text-[color:var(--text-muted)]">DeepSeek Base URL<input value={form.deepseekBaseUrl} onChange={(event) => patch({ deepseekBaseUrl: event.target.value })} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]" /></label>
          </div>
        </div>
      )}

      {tab === 'runtimes' && (
        <BridgeStatusPanel />
      )}

      {tab === 'safety' && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">安全设置</h2>
          <div className="grid grid-cols-1 gap-2">
            <button type="button" onClick={() => patch({ permissionMode: 'default' })} className={`flex items-start gap-3 rounded-md border p-3 text-left ${!isFull ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-tertiary)]'}`}>
              <Shield size={18} className={!isFull ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-muted)]'} />
              <div><div className="text-sm font-medium">聊天模式</div><div className="text-xs text-[color:var(--text-muted)]">普通对话。执行任务仍会走动作提案和审批流程。</div></div>
            </button>
            <button type="button" onClick={() => patch({ permissionMode: 'full' })} className={`flex items-start gap-3 rounded-md border p-3 text-left ${isFull ? 'border-[color:var(--success)] bg-[color:var(--success)]/5' : 'border-[color:var(--border)] hover:bg-[color:var(--bg-tertiary)]'}`}>
              <ShieldCheck size={18} className={isFull ? 'text-[color:var(--success)]' : 'text-[color:var(--text-muted)]'} />
              <div><div className="text-sm font-medium">兼容工具模式</div><div className="text-xs text-[color:var(--text-muted)]">旧版本地工具保留为兼容能力，但不会暴露给执行模式。</div></div>
            </button>
          </div>
          <div className="flex gap-2">
            <input value={form.workspace_root} onChange={(event) => patch({ workspace_root: event.target.value })} className="min-w-0 flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]" />
            <button type="button" onClick={chooseWorkspace} className="h-9 rounded-md border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--bg-tertiary)] flex items-center gap-1"><FolderOpen size={14} /> 选择</button>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.session_confirm_cache_enabled} onChange={(event) => patch({ session_confirm_cache_enabled: event.target.checked })} /> 本会话记住已批准的兼容 shell 命令</label>
        </div>
      )}

      {tab === 'skills' && <SkillsTab />}
      {tab === 'rules' && <RulesTab />}

      {['models', 'runtimes', 'safety'].includes(tab) && (
        <button type="button" onClick={handleSave} disabled={saving} className="w-full h-9 rounded-md bg-[color:var(--accent)] text-white text-sm font-medium disabled:opacity-50">{saving ? '保存中...' : '保存设置'}</button>
      )}
      {msg && <div className="text-xs text-[color:var(--text-muted)]">{msg}</div>}
    </div>
  )
}
