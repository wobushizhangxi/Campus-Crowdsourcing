const adapter = require('./adapter')
const { detect: detectPython, getSetupGuide: getPythonGuide } = require('../pythonBootstrap')

async function detect() {
  const [health, python] = await Promise.all([
    adapter.healthCheck(),
    detectPython()
  ])
  return {
    available: health.available,
    bridge: health.detail,
    python: {
      path: python.python,
      version: python.pythonVersion,
      ready: python.ready,
      issues: python.issues
    },
    setupGuide: python.ready ? null : getPythonGuide(python)
  }
}

async function repair() {
  return {
    runtime: 'browser-use',
    guidance: '请确保 Python 3.11+ 已安装，并运行：pip install browser-use && playwright install chromium',
    installCommand: 'pip install browser-use && playwright install chromium --with-deps',
  }
}

async function getSetupGuide() {
  return {
    title: '浏览器自动化 (browser-use)',
    description: 'browser-use 通过 AI 驱动真实浏览器完成网页任务。需要 Python 3.11+ 和 Chromium。',
    steps: [
      '安装 Python 3.11 或更高版本',
      'pip install browser-use',
      'playwright install chromium --with-deps',
      '在设置页面配置 Doubao vision 模型的 API Key 和 endpoint',
    ],
  }
}

module.exports = { detect, repair, getSetupGuide, adapter }
