import { test, expect, vi, beforeEach, afterAll } from 'vitest'
import { createRequire } from 'module'
import path from 'path'
import os from 'os'
import fs from 'fs'

const require = createRequire(import.meta.url)

const testDir = path.join(os.tmpdir(), 'aionui-conv-test-' + Date.now())

require.cache[require.resolve('electron')] = {
  exports: {
    app: {
      getPath: vi.fn(() => testDir)
    }
  }
}

const conversationStore = require('../services/conversationStore')

fs.mkdirSync(testDir, { recursive: true })
conversationStore.__testDbPath = path.join(testDir, 'conversations.db')

beforeEach(() => {
  conversationStore.close()
})

afterAll(() => {
  conversationStore.close()
  try { fs.rmSync(testDir, { recursive: true, force: true }) } catch {}
  conversationStore.__testDbPath = null
})

const { listConversations, upsertConversation, getConversation, deleteConversation } = conversationStore

test('listConversations returns empty array when no conversations', () => {
  const list = listConversations()
  expect(list).toEqual([])
})

test('upsertConversation creates a new conversation', () => {
  const conv = upsertConversation('conv-1', { title: 'Test', messages: [{ role: 'user', content: 'hello' }] })
  expect(conv.id).toBe('conv-1')
  expect(conv.title).toBe('Test')
  expect(conv.messages).toHaveLength(1)
})

test('getConversation returns the created conversation', () => {
  const conv = getConversation('conv-1')
  expect(conv).not.toBeNull()
  expect(conv.title).toBe('Test')
})

test('upsertConversation updates an existing conversation', () => {
  upsertConversation('conv-1', { title: 'Updated Title' })
  const conv = getConversation('conv-1')
  expect(conv.title).toBe('Updated Title')
  expect(conv.messages).toHaveLength(1)
})

test('listConversations returns all conversations', () => {
  upsertConversation('conv-2', { title: 'Second' })
  upsertConversation('conv-3', { title: 'Third' })
  const list = listConversations()
  expect(list.length).toBe(3)
  const ids = list.map(c => c.id)
  expect(ids).toContain('conv-1')
  expect(ids).toContain('conv-2')
  expect(ids).toContain('conv-3')
})

test('deleteConversation removes the conversation', () => {
  deleteConversation('conv-1')
  const conv = getConversation('conv-1')
  expect(conv).toBeNull()
  const list = listConversations()
  expect(list.length).toBe(2)
})
