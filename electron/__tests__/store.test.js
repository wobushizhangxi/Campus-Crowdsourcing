import { test, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const TMP = path.join(os.tmpdir(), `agentdev-test-${Date.now()}`)
process.env.AGENTDEV_DATA_DIR = TMP
const require = createRequire(import.meta.url)
const { store } = require('../store')

beforeEach(() => {
  fs.rmSync(TMP, { recursive: true, force: true })
})

test('getConfig returns defaults including new fields', () => {
  const config = store.getConfig()
  expect(config.permissionMode).toBe('default')
  expect(config.workspace_root).toBe(os.homedir())
  expect(config.shell_whitelist_extra).toEqual([])
  expect(config.shell_blacklist_extra).toEqual([])
  expect(config.session_confirm_cache_enabled).toBe(true)
  expect(config.deepseekChatEndpoint).toBe('https://api.deepseek.com')
  expect(config.deepseekApiKey).toBe('')
  expect(config.deepseekPlannerModel).toBe('deepseek-chat')
  expect(config.deepseekCodingModel).toBe('deepseek-coder')
  expect(config.qwenVisionEndpoint).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1')
  expect(config.qwenVisionApiKey).toBe('')
  expect(config.qwenVisionModel).toBe('qwen3-vl-plus')
  expect(config.doubaoVisionEndpoint).toBe('https://ark.cn-beijing.volces.com/api/v3')
  expect(config.doubaoVisionApiKey).toBe('')
  expect(config.doubaoVisionModel).toBe('doubao-1-5-thinking-vision-pro-250428')
})

test('config has visionLoopEnabled default true', () => {
  const config = store.getConfig()
  expect(config.visionLoopEnabled).toBe(true)
})

test('setConfig persists patches', () => {
  store.setConfig({ apiKey: 'sk-x', workspace_root: 'D:\\work' })
  expect(store.getConfig().apiKey).toBe('sk-x')
  expect(store.getConfig().workspace_root).toBe('D:\\work')
})
