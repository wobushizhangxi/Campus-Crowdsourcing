const ALLOWED_PREFIXES = [
  'https://platform.deepseek.com',
  'https://bailian.console.aliyun.com',
  'https://console.volcengine.com',
  'https://chromewebstore.google.com',
  'https://docs.openinterpreter.com'
]

function matchesAllowedPrefix(url, prefix) {
  const parsedUrl = new URL(url)
  const parsedPrefix = new URL(prefix)
  if (parsedUrl.origin !== parsedPrefix.origin) return false
  if (parsedPrefix.pathname === '/') return true
  return parsedUrl.pathname.startsWith(parsedPrefix.pathname)
}

function isAllowed(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_PREFIXES.some((prefix) => matchesAllowedPrefix(url, prefix))
  } catch {
    return false
  }
}

function getShell(deps = {}) {
  if (deps.shell) return deps.shell
  return require('electron').shell
}

function register(ipcMain, deps = {}) {
  ipcMain.handle('app:open-external', async (_evt, { url } = {}) => {
    if (!isAllowed(url)) throw new Error(`URL not in allowlist: ${url}`)
    await getShell(deps).openExternal(url)
    return { ok: true }
  })
}

module.exports = { register, isAllowed }
