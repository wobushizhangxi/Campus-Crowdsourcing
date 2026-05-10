import { useEffect, useState } from 'react'
import { Paperclip, Send, Square } from 'lucide-react'
import ModelSelector, { STORAGE_KEY } from './ModelSelector.jsx'

function insertPath(current, filePath) {
  const trimmed = current.trim()
  return `"${filePath}" ${trimmed}`.trim()
}

export default function InputBar({ onSend, disabled, agentRunning, onCancel, selectedModel, onModelChange }) {
  const [text, setText] = useState('')

  useEffect(() => {
    function handleFileSelected(event) {
      const filePath = event.detail?.path
      if (filePath) setText((current) => insertPath(current, filePath))
    }
    window.addEventListener('agentdev:file-selected', handleFileSelected)
    return () => window.removeEventListener('agentdev:file-selected', handleFileSelected)
  }, [])

  async function handleAttachFile() {
    const filePath = window.electronAPI?.selectFile
      ? await window.electronAPI.selectFile()
      : window.prompt('请输入文件的绝对路径：')
    if (filePath) setText((current) => insertPath(current, filePath))
  }

  function handleModelChange(id) {
    localStorage.setItem(STORAGE_KEY, id)
    onModelChange(id)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const value = text.trim()
    if (!value || disabled) return
    onSend(value)
    setText('')
  }

  function handleKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-6 py-4">
      <div className="flex items-end gap-3 bg-[color:var(--bg-primary)] border border-[color:var(--border)] rounded-md px-3 py-2 focus-within:border-[color:var(--accent)]">
        <button type="button" onClick={handleAttachFile} className="h-8 w-8 flex items-center justify-center rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-tertiary)]" aria-label="附加文件路径" title="附加本地文件路径">
          <Paperclip size={14} />
        </button>
        <ModelSelector value={selectedModel} onChange={handleModelChange} />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKey}
          placeholder="输入消息或任务，Enter 发送，Shift+Enter 换行"
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm max-h-40 py-1"
        />
        {agentRunning ? (
          <button type="button" onClick={onCancel} className="h-8 w-8 flex items-center justify-center rounded-md bg-red-500 text-white hover:bg-red-600" aria-label="停止执行">
            <Square size={14} />
          </button>
        ) : (
          <button type="submit" disabled={disabled || !text.trim()} className="h-8 w-8 flex items-center justify-center rounded-md bg-[color:var(--accent)] text-white disabled:opacity-40" aria-label="发送">
            <Send size={14} />
          </button>
        )}
      </div>
    </form>
  )
}
