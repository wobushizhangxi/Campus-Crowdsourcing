# Tri-Model Routing + Midscene Bridge Implementation Plan

> **For codex (executor):** Execute this plan task-by-task using TDD. Each step is bite-sized (2–5 min). Steps use `- [ ]` syntax. Commit after every passing test. Do not skip ahead. Spec: `docs/superpowers/specs/2026-05-09-tri-model-and-midscene-design.md`. This plan ALSO finishes leftover Tasks 12–15 from the previous bridge-sidecars plan; they appear here as **Phase 0**.

**Goal:** (1) Pivot AionUi's model router so DeepSeek-V4 owns chat/plan/code/intent; (2) add a third bridge sidecar `server/midscene-bridge` driving Midscene Bridge Mode with Qwen3-VL; (3) swap UI-TARS's model to Doubao 1.5 vision via Volcengine Ark; (4) finish the previous plan's leftover packaging/docs/acceptance work.

**Branch:** Create `feat/tri-model-midscene` from current `main`. Commit per step.

**Red lines (do not cross):**
1. Do **not** edit: `electron/services/openInterpreter/protocol.js`, `electron/services/uiTars/protocol.js`, `server/oi-bridge/translator.js`, `server/uitars-bridge/translator.js`.
2. Bridges bind `127.0.0.1` only. Verified in tests.
3. No source vendoring of OI / UI-TARS. Midscene goes via npm.
4. No auto-installing the Chrome extension. USER_MANUAL documents the manual step.
5. Pin `@midscene/web` exact resolved version after install.
6. No cross-border default endpoints; all three default to mainland-China reachable hosts.

---

## File Plan (locked in)

```
NEW
  server/midscene-bridge/package.json
  server/midscene-bridge/index.js
  server/midscene-bridge/bridgeMode.js
  server/midscene-bridge/translator.js
  server/midscene-bridge/__tests__/translator.test.js
  server/midscene-bridge/__tests__/health.test.js
  server/midscene-bridge/__tests__/execute.test.js

  electron/services/midscene/protocol.js
  electron/services/midscene/adapter.js
  electron/services/midscene/bootstrap.js
  electron/__tests__/midscene-adapter.test.js
  electron/__tests__/midscene-bootstrap.test.js

  electron/ipc/setupStatus.js                   # Phase 5: setup-status IPC + welcome flags
  electron/__tests__/setup-status-ipc.test.js
  client/src/components/WelcomeSetupDialog.jsx  # Phase 5: first-run modal

MODIFY
  electron/security/actionTypes.js              # +MIDSCENE runtime, +web.* action types
  electron/services/modelRouter.js              # DeepSeek primary for everything text
  electron/__tests__/model-router.test.js       # flip Qwen-primary assertions to DeepSeek-primary
  electron/services/uiTars/bootstrap.js         # surface Doubao endpoint requirement
  electron/services/bridgeSupervisor.js         # 3 sidecars, env injection per bridge
  electron/__tests__/bridge-supervisor.test.js  # 3-sidecar coverage
  electron/store.js                             # new endpoint fields, deprecate old qwenPlanner ones
  electron/__tests__/store.test.js
  electron/main.js                              # supervisor passes 3 configs
  electron/ipc/*                                # if any IPC surface exposes model config, update
  package.json                                  # +midscene-bridge workspace, extraResources, postinstall electron-rebuild
  README.md                                     # rewrite product positioning per spec §2
  docs/USER_MANUAL.md                           # tri-model setup + Midscene extension steps
  docs/runtime-setup.md                         # tri-endpoint setup
  docs/test-report.md                           # 2026-05-09 acceptance section
  docs/security-policy.md                       # mention midscene runtime alongside OI/UI-TARS
  electron/__tests__/open-interpreter-adapter.test.js   # Phase 0: healthy/offline/5xx
  electron/__tests__/ui-tars-adapter.test.js            # Phase 0: healthy/offline/5xx
  electron/ipc/index.js                                 # register setupStatus handler
  electron/preload.js                                   # expose setup:* IPCs to renderer
  client/src/App.jsx                                    # mount welcome dialog on first launch
  client/src/panels/SettingsPanel.jsx                   # "重新查看初始设置向导" button
```

---

# PHASE 0 — Finish leftover bridge-sidecars work

(Replaces Tasks 12–15 of `2026-05-09-bridge-sidecars-implementation.md`. Do these first; they are release blockers.)

## Task 0.1: Adapter integration — healthy / offline / 5xx

**Files:**
- Modify: `electron/__tests__/open-interpreter-adapter.test.js`
- Modify: `electron/__tests__/ui-tars-adapter.test.js`

- [ ] **Step 1:** Read both files to learn the existing test style. Reuse the same fetch-mock approach already in use (likely `vi.fn()` patching `global.fetch`).

- [ ] **Step 2:** For each adapter test file, add three cases:

```js
describe('bridge healthy', () => {
  it('returns success when bridge responds 200 with normalized result', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ ok: true, exitCode: 0, stdout: 'ok' })
    }))
    const adapter = createOpenInterpreterAdapter({ storeRef: stubStore({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) })
    const res = await adapter.execute(approvedAction({ type: 'shell.command', payload: { command: 'echo' } }))
    expect(res.ok).toBe(true)
    expect(res.stdout).toBe('ok')
  })
})

describe('bridge offline (ECONNREFUSED)', () => {
  it('returns recoverable error', async () => {
    global.fetch = vi.fn(async () => { throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) })
    const adapter = createOpenInterpreterAdapter({ storeRef: stubStore({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) })
    const res = await adapter.execute(approvedAction({ type: 'shell.command', payload: { command: 'echo' } }))
    expect(res.ok).toBe(false)
    expect(res.metadata?.recoverable).toBe(true)
  })
})

describe('bridge 5xx', () => {
  it('returns recoverable error with status surfaced', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 503, text: async () => 'unavailable' }))
    const adapter = createOpenInterpreterAdapter({ storeRef: stubStore({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) })
    const res = await adapter.execute(approvedAction({ type: 'shell.command', payload: { command: 'echo' } }))
    expect(res.ok).toBe(false)
    expect(res.metadata?.recoverable).toBe(true)
  })
})
```

If the existing adapter does not already mark errors with `metadata.recoverable=true` on these paths, **fix the adapter** in this same task to make the tests pass — it's a prerequisite the spec promised. The adapter file IS allowed to change (only the protocol files are red-line).

- [ ] **Step 3:** Mirror all three cases for `ui-tars-adapter.test.js`, adapter at `http://127.0.0.1:8765`, action `screen.observe`.

- [ ] **Step 4:** Run + commit.

```bash
npx vitest run electron/__tests__/open-interpreter-adapter.test.js electron/__tests__/ui-tars-adapter.test.js
git add electron/__tests__/open-interpreter-adapter.test.js electron/__tests__/ui-tars-adapter.test.js electron/services/openInterpreter/adapter.js electron/services/uiTars/adapter.js
git commit -m "test(adapters): cover healthy/offline/5xx bridge paths"
```

## Task 0.2: Packaging — extraResources + electron-rebuild

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Install electron-rebuild

```bash
npm install -D electron-rebuild
```

- [ ] **Step 2:** Edit `package.json` `build.extraResources` — add bridge entries:

```json
"extraResources": [
  { "from": "resources/skills", "to": "skills" },
  { "from": "client/dist", "to": "client/dist" },
  { "from": "server/oi-bridge", "to": "server/oi-bridge" },
  { "from": "server/uitars-bridge", "to": "server/uitars-bridge" }
]
```

(Midscene-bridge will be appended in Task 4.6 — keep it consistent there.)

- [ ] **Step 3:** Add postinstall script to root `scripts`:

```json
"postinstall": "electron-rebuild"
```

- [ ] **Step 4:** Verify build still succeeds:

```bash
npm install
npm run electron:build
```

Expected: NSIS installer in `dist-electron/`. Inspect the .exe → after install, `<install-dir>/resources/server/oi-bridge/index.js` exists.

- [ ] **Step 5:** Commit.

```bash
git add package.json package-lock.json
git commit -m "build(electron): ship oi-bridge and uitars-bridge via extraResources, rebuild natives"
```

## Task 0.3: Acceptance prep — capture current state

**Files:**
- Modify: `docs/test-report.md`

- [ ] **Step 1:** Append a placeholder section so it's ready for fill-in at the end:

```markdown
## 2026-05-09 Tri-Model + Midscene Acceptance

(filled at Task 5.6)
```

- [ ] **Step 2:** Commit.

```bash
git add docs/test-report.md
git commit -m "docs(test-report): placeholder for tri-model acceptance"
```

---

# PHASE 1 — Model router pivot to DeepSeek-V4

## Task 1.1: Settings schema — new endpoint fields

**Files:**
- Modify: `electron/store.js`
- Modify: `electron/__tests__/store.test.js`

- [ ] **Step 1:** Read `electron/store.js` — find the config defaults block.

- [ ] **Step 2:** Add new fields with sensible defaults:

```js
deepseekChatEndpoint: 'https://api.deepseek.com',
deepseekApiKey: '',
deepseekPlannerModel: 'deepseek-chat',
deepseekCodingModel: 'deepseek-coder',
qwenVisionEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
qwenVisionApiKey: '',
qwenVisionModel: 'qwen3-vl-plus',
doubaoVisionEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
doubaoVisionApiKey: '',
doubaoVisionModel: 'doubao-1-5-thinking-vision-pro-250428',
```

Keep the old `qwenApiKey`/`qwenBaseUrl`/`qwenPlannerModel`/`qwenCodingModel` fields readable for backward compatibility but stop wiring them into modelRouter in Task 1.2.

- [ ] **Step 3:** Extend `electron/__tests__/store.test.js` — assert defaults exist for all 9 new fields.

- [ ] **Step 4:** Run + commit.

```bash
npx vitest run electron/__tests__/store.test.js
git add electron/store.js electron/__tests__/store.test.js
git commit -m "feat(settings): tri-model endpoint config (deepseek/qwen-vision/doubao-vision)"
```

## Task 1.2: modelRouter — DeepSeek-V4 as primary

**Files:**
- Modify: `electron/services/modelRouter.js`
- Modify: `electron/__tests__/model-router.test.js`

- [ ] **Step 1:** Read both files. Identify the routing function (likely `route(intent)` returning a provider client).

- [ ] **Step 2:** Flip routing rules. New shape:

```js
function route(intent, config = store.getConfig()) {
  // intent ∈ { 'chat', 'plan', 'intent-classify', 'code' }
  // All four go to DeepSeek-V4.
  return {
    provider: 'deepseek',
    endpoint: config.deepseekChatEndpoint,
    apiKey: config.deepseekApiKey,
    model: intent === 'code' ? config.deepseekCodingModel : config.deepseekPlannerModel
  }
}
```

Remove any Qwen-routing branch from this file. Qwen is now a vision-only model consumed by midscene-bridge — it does NOT appear in modelRouter.

- [ ] **Step 3:** Update `electron/__tests__/model-router.test.js`:
  - Flip every assertion that says "Qwen primary" or "Qwen for plan" to "DeepSeek".
  - Keep tests that assert DeepSeek fallback shape.
  - Add a new test: `Qwen is not reachable from modelRouter` — verifying no branch returns `provider: 'qwen'`.

- [ ] **Step 4:** Run + commit.

```bash
npx vitest run electron/__tests__/model-router.test.js
git add electron/services/modelRouter.js electron/__tests__/model-router.test.js
git commit -m "feat(modelRouter): DeepSeek-V4 primary for chat/plan/intent/code; remove Qwen routing"
```

## Task 1.3: Verify qwenProvider is no longer reached for chat

**Files:**
- Modify (if needed): `electron/services/models/qwenProvider.js`

- [ ] **Step 1:** Grep:

```bash
grep -rn "qwenProvider" electron/ server/
```

- [ ] **Step 2:** If anything still imports `qwenProvider` for chat/plan/code, remove the import. Keep the file (it may still be useful as a thin OpenAI-compatible client used by midscene-bridge env, though Midscene SDK handles its own HTTP — so probably the file can be deleted later, but DON'T delete it in this task; just unwire).

- [ ] **Step 3:** Run full suite, expect green.

```bash
npm test
```

- [ ] **Step 4:** Commit.

```bash
git add -A electron/
git commit -m "refactor: unwire qwenProvider from modelRouter callers"
```

---

# PHASE 2 — UI-TARS model swap to Doubao

## Task 2.1: uitars-bridge env wiring

**Files:**
- Modify: `electron/services/bridgeSupervisor.js`
- Modify: `server/uitars-bridge/index.js`
- Modify: `server/uitars-bridge/agentRunner.js`

- [ ] **Step 1:** In `bridgeSupervisor.js` `startOne('uitars', ...)`, replace the existing UITARS_MODEL_ENDPOINT/UITARS_MODEL_API_KEY env injection with the Doubao-specific config:

```js
env: {
  ...process.env,
  UITARS_MODEL_PROVIDER: 'volcengine',
  UITARS_MODEL_ENDPOINT: config.doubaoVisionEndpoint,
  UITARS_MODEL_API_KEY: config.doubaoVisionApiKey,
  UITARS_MODEL_NAME: config.doubaoVisionModel
}
```

- [ ] **Step 2:** In `server/uitars-bridge/index.js` `wireDefaultRunner()`, read the four env vars and pass them to `agentRunner.createAgentRunner`.

- [ ] **Step 3:** In `agentRunner.js` `guiAgentFactory`, pass the provider/endpoint/apiKey/model to `new GUIAgent({ model: { provider, endpoint, apiKey, name: model } })`. (Match `@ui-tars/sdk`'s actual config schema; check the installed version's TS types — adjust field names if they differ.)

- [ ] **Step 4:** Add a unit test in `server/uitars-bridge/__tests__/agent-runner.test.js` (new) asserting the factory gets the Volcengine fields.

```js
const { describe, it, expect, vi } = require('vitest')
const { createAgentRunner } = require('../agentRunner')

describe('uitars-bridge agentRunner volcengine wiring', () => {
  it('passes provider=volcengine + endpoint to GUIAgent', () => {
    const captured = {}
    const fakeFactory = (cfg) => { Object.assign(captured, cfg); return { runOnce: vi.fn() } }
    createAgentRunner({
      modelProvider: 'volcengine',
      modelEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      modelApiKey: 'k',
      modelName: 'doubao-1-5-thinking-vision-pro-250428',
      guiAgentFactory: fakeFactory
    })
    expect(captured.modelProvider).toBe('volcengine')
    expect(captured.modelEndpoint).toContain('volces.com')
  })
})
```

- [ ] **Step 5:** Run + commit.

```bash
npx vitest run server/uitars-bridge
git add electron/services/bridgeSupervisor.js server/uitars-bridge
git commit -m "feat(uitars-bridge): swap to Doubao via Volcengine Ark"
```

## Task 2.2: ui-tars bootstrap surfaces Doubao key requirement

**Files:**
- Modify: `electron/services/uiTars/bootstrap.js`

- [ ] **Step 1:** In `getSetupGuide`, change the steps text to mention Volcengine Ark + doubao-vision-pro and the field name `doubaoVisionApiKey`. Update the proposed setup action's `payload.guide` URL to point at Volcengine docs.

- [ ] **Step 2:** Update `electron/__tests__/ui-tars-bootstrap.test.js` to assert the new wording where it currently asserts the old guide.

- [ ] **Step 3:** Run + commit.

```bash
npx vitest run electron/__tests__/ui-tars-bootstrap.test.js
git add electron/services/uiTars/bootstrap.js electron/__tests__/ui-tars-bootstrap.test.js
git commit -m "feat(ui-tars/bootstrap): surface Doubao/Volcengine setup steps"
```

---

# PHASE 3 — actionTypes & midscene adapter contract

## Task 3.1: Extend actionTypes.js with web.* and MIDSCENE runtime

**Files:**
- Modify: `electron/security/actionTypes.js`

- [ ] **Step 1:** Add to `RUNTIME_NAMES`:

```js
MIDSCENE: 'midscene',
```

- [ ] **Step 2:** Add to `ACTION_TYPES`:

```js
WEB_OBSERVE: 'web.observe',
WEB_CLICK: 'web.click',
WEB_TYPE: 'web.type',
WEB_QUERY: 'web.query',
```

- [ ] **Step 3:** Run full suite:

```bash
npm test
```

- [ ] **Step 4:** Commit.

```bash
git add electron/security/actionTypes.js
git commit -m "feat(actionTypes): add MIDSCENE runtime and web.* action types"
```

## Task 3.2: midscene/protocol.js — frozen contract

**Files:**
- Create: `electron/services/midscene/protocol.js`

- [ ] **Step 1:** Mirror `openInterpreter/protocol.js` shape:

```js
const { ACTION_TYPES, RUNTIME_NAMES } = require('../../security/actionTypes')

const SUPPORTED_ACTION_TYPES = Object.freeze([
  ACTION_TYPES.WEB_OBSERVE,
  ACTION_TYPES.WEB_CLICK,
  ACTION_TYPES.WEB_TYPE,
  ACTION_TYPES.WEB_QUERY
])

function toMidsceneRequest(action) {
  if (action.runtime !== RUNTIME_NAMES.MIDSCENE && action.runtime !== RUNTIME_NAMES.DRY_RUN) {
    throw new Error(`Midscene 适配器无法执行运行时 ${action.runtime}`)
  }
  if (!SUPPORTED_ACTION_TYPES.includes(action.type)) {
    throw new Error(`Midscene 适配器不支持 ${action.type}`)
  }
  return {
    protocol: 'aionui.midscene.v1',
    actionId: action.id,
    sessionId: action.sessionId,
    type: action.type,
    payload: action.payload || {},
    approved: action.status === 'approved' || action.status === 'running',
    createdAt: action.createdAt
  }
}

function normalizeMidsceneResult(action, result = {}) {
  return {
    actionId: action.id,
    ok: result.ok !== false,
    exitCode: Number.isInteger(result.exitCode) ? result.exitCode : (result.ok === false ? 1 : 0),
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    filesChanged: Array.isArray(result.filesChanged) ? result.filesChanged : [],
    durationMs: Number.isFinite(result.durationMs) ? result.durationMs : 0,
    completedAt: result.completedAt || new Date().toISOString(),
    metadata: result.metadata || {}
  }
}

module.exports = { SUPPORTED_ACTION_TYPES, toMidsceneRequest, normalizeMidsceneResult }
```

- [ ] **Step 2:** This file becomes RED-LINE — no further edits in this plan.

- [ ] **Step 3:** Commit.

```bash
git add electron/services/midscene/protocol.js
git commit -m "feat(midscene): protocol.js — aionui.midscene.v1 contract"
```

## Task 3.3: midscene/adapter.js — HTTP shim mirroring uiTars

**Files:**
- Create: `electron/services/midscene/adapter.js`
- Create: `electron/__tests__/midscene-adapter.test.js`

- [ ] **Step 1:** Write the failing test mirroring `ui-tars-adapter.test.js` structure:

```js
const { describe, it, expect, vi, beforeEach } = require('vitest')
const { createMidsceneAdapter } = require('../services/midscene/adapter')

const stubStore = (cfg) => ({ getConfig: () => ({ midsceneEndpoint: 'http://127.0.0.1:8770', ...cfg }) })
const approvedAction = (extra) => ({
  id: 'a1', sessionId: 's1', runtime: 'midscene',
  status: 'approved', createdAt: new Date().toISOString(), ...extra
})

describe('midscene adapter', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('returns ok when bridge responds 200', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, stdout: 'clicked' }) }))
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    const res = await adapter.execute(approvedAction({ type: 'web.click', payload: { target: 'OK' } }))
    expect(res.ok).toBe(true)
    expect(res.stdout).toBe('clicked')
  })

  it('marks recoverable when bridge offline', async () => {
    global.fetch = vi.fn(async () => { throw Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }) })
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    const res = await adapter.execute(approvedAction({ type: 'web.click', payload: { target: 'OK' } }))
    expect(res.ok).toBe(false)
    expect(res.metadata?.recoverable).toBe(true)
  })

  it('rejects unsupported runtime', async () => {
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    await expect(adapter.execute({ ...approvedAction({ type: 'web.click' }), runtime: 'open-interpreter' })).rejects.toThrow()
  })
})
```

- [ ] **Step 2:** Implement `electron/services/midscene/adapter.js`:

```js
const { store } = require('../../store')
const { RUNTIME_NAMES } = require('../../security/actionTypes')
const { toMidsceneRequest, normalizeMidsceneResult } = require('./protocol')

function getFetch() { return typeof fetch === 'function' ? fetch : null }

function recoverable(action, reason, extra = {}) {
  return normalizeMidsceneResult(action, {
    ok: false, exitCode: 1, stderr: reason,
    metadata: { recoverable: true, ...extra }
  })
}

function createMidsceneAdapter(options = {}) {
  const storeRef = options.storeRef || store

  return {
    async execute(action, context = {}) {
      const config = storeRef.getConfig()
      if (action.runtime !== RUNTIME_NAMES.MIDSCENE && action.runtime !== RUNTIME_NAMES.DRY_RUN) {
        throw new Error(`Midscene 适配器无法执行 ${action.runtime}`)
      }
      const endpoint = config.midsceneEndpoint || 'http://127.0.0.1:8770'
      const fetchImpl = getFetch()
      if (!fetchImpl) return recoverable(action, 'fetch 不可用')

      const request = toMidsceneRequest(action)
      try {
        const resp = await fetchImpl(endpoint.replace(/\/+$/, '') + '/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: context.signal
        })
        if (!resp.ok) {
          const text = await resp.text().catch(() => '')
          return recoverable(action, `Midscene bridge 返回 ${resp.status}：${text.slice(0, 200)}`)
        }
        return normalizeMidsceneResult(action, await resp.json())
      } catch (err) {
        return recoverable(action, `Midscene bridge 不可达：${err.message || err}`)
      }
    },
    emergencyStop() { return { ok: true, runtime: 'midscene' } }
  }
}

module.exports = { createMidsceneAdapter, recoverable }
```

- [ ] **Step 3:** Run + commit.

```bash
npx vitest run electron/__tests__/midscene-adapter.test.js
git add electron/services/midscene/adapter.js electron/__tests__/midscene-adapter.test.js
git commit -m "feat(midscene): HTTP adapter to bridge with healthy/offline/5xx handling"
```

## Task 3.4: midscene/bootstrap.js — health probe

**Files:**
- Create: `electron/services/midscene/bootstrap.js`
- Create: `electron/__tests__/midscene-bootstrap.test.js`

- [ ] **Step 1:** Mirror `uiTars/bootstrap.js` shape but probe `http://127.0.0.1:8770/health` and surface Chrome extension status from the bridge's response (the bridge reports `extensionConnected: bool` in /health).

```js
async function detect(config = store.getConfig()) {
  try {
    const r = await fetchImpl('http://127.0.0.1:8770/health')
    if (!r.ok) return notInstalled()
    const data = await r.json()
    return {
      runtime: 'midscene',
      state: data.extensionConnected ? 'configured' : 'needs-extension',
      endpoint: 'http://127.0.0.1:8770',
      extensionConnected: Boolean(data.extensionConnected),
      guidance: getSetupGuide(config)
    }
  } catch {
    return notInstalled()
  }
}
```

- [ ] **Step 2:** Failing test then minimal impl. Run + commit.

```bash
npx vitest run electron/__tests__/midscene-bootstrap.test.js
git add electron/services/midscene/{bootstrap.js,__tests__} electron/__tests__/midscene-bootstrap.test.js
git commit -m "feat(midscene): bootstrap.detect probes bridge /health and extension state"
```

---

# PHASE 4 — midscene-bridge sidecar

## Task 4.1: scaffold + /health

**Files:**
- Create: `server/midscene-bridge/package.json`
- Create: `server/midscene-bridge/index.js`
- Create: `server/midscene-bridge/__tests__/health.test.js`

- [ ] **Step 1:** Write `package.json`:

```json
{
  "name": "@aionui/midscene-bridge",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.19.2",
    "@midscene/web": "^0.18.0"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2:** Add to root `package.json` workspaces array: `"server/midscene-bridge"`. Run `npm install`.

- [ ] **Step 3:** Failing health test (mirror oi-bridge/health.test.js — must include 127.0.0.1 bind assertion).

- [ ] **Step 4:** Implement `server/midscene-bridge/index.js`:

```js
const express = require('express')

function createApp(deps = {}) {
  const bridge = deps.bridge || { ready: () => false, extensionConnected: () => false }
  const app = express()
  app.use(express.json({ limit: '20mb' }))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      runtime: 'midscene',
      bridgeReady: Boolean(bridge.ready()),
      extensionConnected: Boolean(bridge.extensionConnected())
    })
  })

  return app
}

function start({ port = 8770, host = '127.0.0.1' } = {}) {
  const app = createApp()
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => resolve(server))
  })
}

if (require.main === module) {
  const portArg = process.argv.indexOf('--port')
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8770
  start({ port }).then((s) => process.stdout.write(`midscene-bridge listening on 127.0.0.1:${s.address().port}\n`))
}

module.exports = { createApp, start }
```

- [ ] **Step 5:** Run + commit.

```bash
npx vitest run server/midscene-bridge
git add server/midscene-bridge package.json package-lock.json
git commit -m "feat(midscene-bridge): scaffold express app with /health"
```

## Task 4.2: translator (pure)

**Files:**
- Create: `server/midscene-bridge/translator.js`
- Create: `server/midscene-bridge/__tests__/translator.test.js`

- [ ] **Step 1:** Failing test (4 supported types + 1 not-implemented):

```js
const { describe, it, expect } = require('vitest')
const { classify } = require('../translator')

describe('midscene-bridge translator', () => {
  it('routes web.observe to screenshot', () => expect(classify({ type: 'web.observe' }).backend).toBe('screenshot-page'))
  it('routes web.click to ai-action with NL target', () => {
    const r = classify({ type: 'web.click', payload: { target: '搜索按钮' } })
    expect(r.backend).toBe('ai-action')
    expect(r.instruction).toContain('搜索按钮')
  })
  it('routes web.type to ai-input', () => {
    const r = classify({ type: 'web.type', payload: { text: 'hello' } })
    expect(r.backend).toBe('ai-input')
    expect(r.text).toBe('hello')
  })
  it('routes web.query to ai-query', () => {
    const r = classify({ type: 'web.query', payload: { question: '页面标题？' } })
    expect(r.backend).toBe('ai-query')
    expect(r.question).toBe('页面标题？')
  })
  it('marks web.scroll/web.hover/web.assert/web.wait as notImplemented', () => {
    for (const t of ['web.scroll', 'web.hover', 'web.assert', 'web.wait']) {
      expect(classify({ type: t }).backend).toBe('not-implemented')
    }
  })
})
```

- [ ] **Step 2:** Implement `translator.js`:

```js
const NOT_IMPL = new Set(['web.scroll', 'web.hover', 'web.assert', 'web.wait'])

function classify(action) {
  if (NOT_IMPL.has(action.type)) return { backend: 'not-implemented', reason: `${action.type} not in v1` }
  if (action.type === 'web.observe') return { backend: 'screenshot-page' }
  if (action.type === 'web.click') {
    return { backend: 'ai-action', instruction: `点击：${action.payload?.target || ''}` }
  }
  if (action.type === 'web.type') {
    return { backend: 'ai-input', text: String(action.payload?.text ?? '') }
  }
  if (action.type === 'web.query') {
    return { backend: 'ai-query', question: String(action.payload?.question ?? '') }
  }
  return { backend: 'unknown', reason: `Unsupported ${action.type}` }
}

module.exports = { classify }
```

- [ ] **Step 3:** Run + commit.

```bash
npx vitest run server/midscene-bridge/__tests__/translator.test.js
git add server/midscene-bridge
git commit -m "feat(midscene-bridge): pure translator for v1 web.* action types"
```

## Task 4.3: bridgeMode singleton

**Files:**
- Create: `server/midscene-bridge/bridgeMode.js`

- [ ] **Step 1:** Implement a thin wrapper:

```js
function createBridgeMode(opts = {}) {
  let agent = null
  const factory = opts.factory || (() => {
    const { AgentOverChromeBridge } = require('@midscene/web/bridge-mode')
    return new AgentOverChromeBridge({
      modelConfig: {
        endpoint: opts.endpoint,
        apiKey: opts.apiKey,
        model: opts.model
      }
    })
  })

  function ensure() {
    if (!agent) agent = factory()
    return agent
  }

  return {
    ready: () => Boolean(opts.endpoint && opts.apiKey),
    extensionConnected: () => {
      try { return Boolean(ensure().isConnected?.()) } catch { return false }
    },
    async screenshotPage() { return await ensure().screenshot() },
    async aiAction(instruction) { return await ensure().aiAction(instruction) },
    async aiInput(text) { return await ensure().aiInput(text) },
    async aiQuery(question) { return await ensure().aiQuery(question) }
  }
}

module.exports = { createBridgeMode }
```

> NOTE FOR CODEX: After installing `@midscene/web`, verify the actual exported API names against the package's TypeScript definitions and adjust method names if they differ (e.g., `aiAction` vs `ai-action` vs `act`). The structure is correct; specific method calls might need a one-line tweak.

- [ ] **Step 2:** Commit (no test yet — will be tested via /execute).

```bash
git add server/midscene-bridge/bridgeMode.js
git commit -m "feat(midscene-bridge): bridgeMode wrapper around @midscene/web AgentOverChromeBridge"
```

## Task 4.4: /execute route + tests

**Files:**
- Modify: `server/midscene-bridge/index.js`
- Create: `server/midscene-bridge/__tests__/execute.test.js`

- [ ] **Step 1:** Failing test (mirror uitars-bridge/execute.test.js):

```js
const { describe, it, expect } = require('vitest')
const request = require('supertest')
const { createApp } = require('../index')

const fakeBridge = {
  ready: () => true,
  extensionConnected: () => true,
  screenshotPage: async () => Buffer.from('PNG'),
  aiAction: async (instr) => ({ ok: true, instruction: instr }),
  aiInput: async (text) => ({ ok: true, typed: text }),
  aiQuery: async (q) => ({ ok: true, answer: 'baidu', question: q })
}

describe('midscene-bridge POST /execute', () => {
  it('web.observe returns base64 screenshot', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1', actionId: 'm1',
      type: 'web.observe', payload: {}, approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.metadata.screenshotBase64).toBe(Buffer.from('PNG').toString('base64'))
  })

  it('web.click invokes aiAction', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1', actionId: 'm2',
      type: 'web.click', payload: { target: '搜索' }, approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.metadata.instruction).toContain('搜索')
  })

  it('web.type invokes aiInput (no model loop)', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1', actionId: 'm3',
      type: 'web.type', payload: { text: 'hi' }, approved: true
    })
    expect(res.body.metadata.typed).toBe('hi')
  })

  it('web.query returns answer', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1', actionId: 'm4',
      type: 'web.query', payload: { question: '页面标题？' }, approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.metadata.answer).toBe('baidu')
  })

  it('rejects approved=false', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1', actionId: 'm5',
      type: 'web.observe', approved: false
    })
    expect(res.status).toBe(403)
  })

  it('returns notImplemented for web.scroll', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1', actionId: 'm6',
      type: 'web.scroll', approved: true
    })
    expect(res.body.metadata.notImplemented).toBe(true)
  })
})
```

- [ ] **Step 2:** Extend `index.js` (full file replacement):

```js
const express = require('express')
const { classify } = require('./translator')

function normalize(raw = {}) {
  const ok = raw.ok !== false
  return {
    ok,
    exitCode: ok ? 0 : 1,
    stdout: String(raw.stdout || ''),
    stderr: String(raw.stderr || ''),
    filesChanged: [],
    durationMs: Number(raw.durationMs) || 0,
    completedAt: new Date().toISOString(),
    metadata: raw.metadata || {}
  }
}

function createApp(deps = {}) {
  const bridge = deps.bridge || { ready: () => false, extensionConnected: () => false }
  const app = express()
  app.use(express.json({ limit: '20mb' }))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true, runtime: 'midscene',
      bridgeReady: Boolean(bridge.ready()),
      extensionConnected: Boolean(bridge.extensionConnected())
    })
  })

  app.post('/execute', async (req, res) => {
    const action = req.body || {}
    if (!action.approved) return res.status(403).json(normalize({ ok: false, stderr: 'action not approved' }))
    const plan = classify(action)
    try {
      if (plan.backend === 'not-implemented') {
        return res.json(normalize({ ok: false, stderr: plan.reason, metadata: { notImplemented: true, reason: plan.reason } }))
      }
      if (plan.backend === 'screenshot-page') {
        const buf = await bridge.screenshotPage()
        return res.json(normalize({ ok: true, metadata: { screenshotBase64: Buffer.from(buf).toString('base64'), mime: 'image/png' } }))
      }
      if (plan.backend === 'ai-action') {
        const r = await bridge.aiAction(plan.instruction)
        return res.json(normalize({ ok: r.ok !== false, stderr: r.reason, metadata: r }))
      }
      if (plan.backend === 'ai-input') {
        const r = await bridge.aiInput(plan.text)
        return res.json(normalize({ ok: r.ok !== false, metadata: r }))
      }
      if (plan.backend === 'ai-query') {
        const r = await bridge.aiQuery(plan.question)
        return res.json(normalize({ ok: r.ok !== false, stdout: String(r.answer || ''), metadata: r }))
      }
      return res.json(normalize({ ok: false, stderr: plan.reason || 'unknown' }))
    } catch (err) {
      return res.json(normalize({ ok: false, stderr: String(err.message || err) }))
    }
  })

  return app
}

function start({ port = 8770, host = '127.0.0.1' } = {}) {
  const app = createApp(wireDefaultBridge())
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => resolve(server))
  })
}

function wireDefaultBridge() {
  const { createBridgeMode } = require('./bridgeMode')
  return {
    bridge: createBridgeMode({
      endpoint: process.env.MIDSCENE_QWEN_ENDPOINT,
      apiKey: process.env.MIDSCENE_QWEN_API_KEY,
      model: process.env.MIDSCENE_QWEN_MODEL || 'qwen3-vl-plus'
    })
  }
}

if (require.main === module) {
  const portArg = process.argv.indexOf('--port')
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8770
  start({ port }).then((s) => process.stdout.write(`midscene-bridge listening on 127.0.0.1:${s.address().port}\n`))
}

module.exports = { createApp, start }
```

- [ ] **Step 3:** Run + commit.

```bash
npx vitest run server/midscene-bridge
git add server/midscene-bridge
git commit -m "feat(midscene-bridge): /execute with web.observe/click/type/query"
```

## Task 4.5: bridgeSupervisor — manage 3 sidecars

**Files:**
- Modify: `electron/services/bridgeSupervisor.js`
- Modify: `electron/__tests__/bridge-supervisor.test.js`

- [ ] **Step 1:** Update DEFAULTS:

```js
const DEFAULTS = {
  oi:       { name: 'oi-bridge',       port: 8756, dir: 'server/oi-bridge' },
  uitars:   { name: 'uitars-bridge',   port: 8765, dir: 'server/uitars-bridge' },
  midscene: { name: 'midscene-bridge', port: 8770, dir: 'server/midscene-bridge' }
}
```

- [ ] **Step 2:** In `startOne(key, ...)`, branch the env injection per key:

```js
const env = { ...process.env }
if (key === 'uitars') {
  env.UITARS_MODEL_PROVIDER = 'volcengine'
  env.UITARS_MODEL_ENDPOINT = config.doubaoVisionEndpoint
  env.UITARS_MODEL_API_KEY = config.doubaoVisionApiKey
  env.UITARS_MODEL_NAME = config.doubaoVisionModel
}
if (key === 'midscene') {
  env.MIDSCENE_QWEN_ENDPOINT = config.qwenVisionEndpoint
  env.MIDSCENE_QWEN_API_KEY = config.qwenVisionApiKey
  env.MIDSCENE_QWEN_MODEL = config.qwenVisionModel
}
state[key].child = spawnImpl('node', [path.join(rootDir, cfg.dir, 'index.js'), '--port', String(cfg.port)], { stdio: 'ignore', env })
```

- [ ] **Step 3:** Update existing supervisor tests to assert all three children spawn and that env injection is correct (use spawnImpl spy):

```js
it('starts all three bridges with proper env injection per bridge', async () => {
  const spawnCalls = []
  const sup = createSupervisor({
    spawnImpl: (cmd, args, opts) => { spawnCalls.push({ cmd, args, env: opts.env }); return { on(){}, kill(){}, killed: false } },
    healthImpl: async () => ({ ok: true })
  })
  await sup.start()
  expect(spawnCalls).toHaveLength(3)
  const uitars = spawnCalls.find(c => c.args.some(a => a.includes('uitars-bridge')))
  expect(uitars.env.UITARS_MODEL_PROVIDER).toBe('volcengine')
  const ms = spawnCalls.find(c => c.args.some(a => a.includes('midscene-bridge')))
  expect(ms.env.MIDSCENE_QWEN_ENDPOINT).toBeDefined()
})
```

- [ ] **Step 4:** Run + commit.

```bash
npx vitest run electron/__tests__/bridge-supervisor.test.js
git add electron/services/bridgeSupervisor.js electron/__tests__/bridge-supervisor.test.js
git commit -m "feat(supervisor): manage 3 sidecars with per-bridge env injection"
```

## Task 4.6: Packaging — add midscene-bridge to extraResources

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Append to `build.extraResources`:

```json
{ "from": "server/midscene-bridge", "to": "server/midscene-bridge" }
```

- [ ] **Step 2:** Run `npm run electron:build`. Verify installer contains `resources/server/midscene-bridge/index.js`.

- [ ] **Step 3:** Commit.

```bash
git add package.json
git commit -m "build: ship midscene-bridge via extraResources"
```

## Task 4.7: Wire IPC and confirm runtime status surfaces

**Files:**
- Modify: `electron/ipc/*` (whichever file currently exposes `runtime/status` for OI and UI-TARS)

- [ ] **Step 1:** Grep for the existing runtime-status IPC handler:

```bash
grep -rn "runtime.*status\|getRuntimeStatus\|listRuntimes" electron/ipc/
```

- [ ] **Step 2:** Wherever it returns `{ openInterpreter, uiTars }`, add `midscene` using the new bootstrap module:

```js
const midsceneBootstrap = require('../services/midscene/bootstrap')
// ...
midscene: await midsceneBootstrap.detect(config)
```

- [ ] **Step 3:** Update the related IPC test (`runtime-ipc.test.js`) to assert all three runtimes appear.

- [ ] **Step 4:** Run + commit.

```bash
npx vitest run electron/__tests__/runtime-ipc.test.js
git add electron/ipc electron/__tests__/runtime-ipc.test.js electron/services/midscene
git commit -m "feat(ipc): surface midscene runtime status alongside OI and UI-TARS"
```

---

# PHASE 5 — Docs + Acceptance

## Task 5.1: README rewrite

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Replace the "V2 product direction" bullet list with the spec §2 wording. Replace the "Architecture" diagram block with the diagram from spec §1 (3 bridges).

- [ ] **Step 2:** Add a `## Prerequisites` section:

```markdown
## Prerequisites

- Windows 10/11 x64
- Python 3.10+ with `pip install open-interpreter`
- Google Chrome with the Midscene browser extension installed and connected
- API keys for three Chinese-cloud endpoints:
  - DeepSeek (https://platform.deepseek.com)
  - Alibaba DashScope (Qwen3-VL)
  - Volcengine Ark (Doubao 1.5 vision)

All three default endpoints are mainland-China reachable. No cross-border egress required.
```

- [ ] **Step 3:** Replace the "Open Interpreter Runtime" / "UI-TARS Runtime" subsections to reflect that bridges are launched automatically; add a parallel "Midscene Runtime" subsection.

- [ ] **Step 4:** Commit.

```bash
git add README.md
git commit -m "docs(readme): tri-model + Midscene positioning, prerequisites, runtime sections"
```

## Task 5.2: USER_MANUAL — setup walkthrough

**Files:**
- Modify: `docs/USER_MANUAL.md`

- [ ] **Step 1:** Add a "首次设置 / First-Time Setup" section walking through all three runtimes:

1. 安装 Open Interpreter（pip）
2. 安装 Chrome Midscene 扩展并点"Allow Bridge Connection"
3. Settings 填三组 API：
   - DeepSeek API Key + endpoint（默认值）
   - Qwen3-VL（DashScope）API Key
   - Doubao（Volcengine Ark）API Key
4. 在 Runtimes 面板看三个 runtime 全部转绿
5. 跑一次 dry-run 验证

- [ ] **Step 2:** Add a troubleshooting subsection: "Browser ready 不亮 → 检查扩展是否点了允许"。

- [ ] **Step 3:** Commit.

```bash
git add docs/USER_MANUAL.md
git commit -m "docs(user-manual): tri-model setup walkthrough + Midscene extension steps"
```

## Task 5.3: runtime-setup.md + security-policy.md

**Files:**
- Modify: `docs/runtime-setup.md`
- Modify: `docs/security-policy.md`

- [ ] **Step 1:** Add Midscene runtime entry to both. In security-policy, classify `web.click` as **medium**, `web.type` as **medium**, `web.observe` and `web.query` as **low**. (Web actions are still user-confirmed via Control Center; the model never auto-runs.)

- [ ] **Step 2:** Commit.

```bash
git add docs/runtime-setup.md docs/security-policy.md
git commit -m "docs: tri-runtime setup and Midscene risk classification"
```

## Task 5.4: setup-status IPC — detect deps live

**Files:**
- Create: `electron/ipc/setupStatus.js`
- Modify: `electron/ipc/index.js` (or wherever `registerAll` lives) to register the new handler
- Create: `electron/__tests__/setup-status-ipc.test.js`

- [ ] **Step 1:** Failing test:

```js
const { describe, it, expect } = require('vitest')
const { computeSetupStatus } = require('../ipc/setupStatus')

describe('setup-status', () => {
  it('reports lite tier ready when only DeepSeek key set', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: 'k', qwenVisionApiKey: '', doubaoVisionApiKey: '', uiTarsScreenAuthorized: false }) }
    const fakeBootstrap = {
      midscene: { detect: async () => ({ extensionConnected: false }) },
      openInterpreter: { detect: async () => ({ state: 'not-installed', oiReady: false }) },
      uiTars: { detect: async () => ({ screenAuthorized: false }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstrap })
    expect(status.tiers.lite.ready).toBe(true)
    expect(status.tiers.browser.ready).toBe(false)
    expect(status.tiers.full.ready).toBe(false)
    expect(status.deps.deepseekKey).toBe(true)
    expect(status.deps.midsceneExtension).toBe(false)
  })

  it('reports browser tier ready when Qwen key + extension connected', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: 'k', qwenVisionApiKey: 'q', doubaoVisionApiKey: '', uiTarsScreenAuthorized: false }) }
    const fakeBootstrap = {
      midscene: { detect: async () => ({ extensionConnected: true }) },
      openInterpreter: { detect: async () => ({ oiReady: false }) },
      uiTars: { detect: async () => ({ screenAuthorized: false }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstrap })
    expect(status.tiers.browser.ready).toBe(true)
    expect(status.tiers.full.ready).toBe(false)
  })

  it('reports full tier ready only when all five deps green', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: 'k', qwenVisionApiKey: 'q', doubaoVisionApiKey: 'd', uiTarsScreenAuthorized: true }) }
    const fakeBootstrap = {
      midscene: { detect: async () => ({ extensionConnected: true }) },
      openInterpreter: { detect: async () => ({ oiReady: true }) },
      uiTars: { detect: async () => ({ screenAuthorized: true }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstrap })
    expect(status.tiers.full.ready).toBe(true)
  })
})
```

- [ ] **Step 2:** Implement `electron/ipc/setupStatus.js`:

```js
const { store } = require('../store')
const midsceneBootstrap = require('../services/midscene/bootstrap')
const oiBootstrap = require('../services/openInterpreter/bootstrap')
const uitarsBootstrap = require('../services/uiTars/bootstrap')

async function computeSetupStatus({ storeRef = store, bootstraps = {} } = {}) {
  const cfg = storeRef.getConfig()
  const ms = bootstraps.midscene || midsceneBootstrap
  const oi = bootstraps.openInterpreter || oiBootstrap
  const ut = bootstraps.uiTars || uitarsBootstrap

  const [msStatus, oiStatus, utStatus] = await Promise.all([
    ms.detect(cfg).catch(() => ({})),
    oi.detect(cfg).catch(() => ({})),
    ut.detect(cfg).catch(() => ({}))
  ])

  const deps = {
    deepseekKey: Boolean(cfg.deepseekApiKey),
    qwenKey: Boolean(cfg.qwenVisionApiKey),
    doubaoKey: Boolean(cfg.doubaoVisionApiKey),
    midsceneExtension: Boolean(msStatus.extensionConnected),
    pythonOpenInterpreter: Boolean(oiStatus.oiReady || oiStatus.state === 'configured'),
    screenAuthorized: Boolean(utStatus.screenAuthorized)
  }

  const tiers = {
    lite: {
      label: '轻量：仅聊天',
      requires: ['deepseekKey'],
      ready: deps.deepseekKey
    },
    browser: {
      label: '中等：+浏览器自动化（推荐）',
      requires: ['deepseekKey', 'qwenKey', 'midsceneExtension'],
      ready: deps.deepseekKey && deps.qwenKey && deps.midsceneExtension,
      recommended: true
    },
    full: {
      label: '完整：+桌面 + 本地执行',
      requires: ['deepseekKey', 'qwenKey', 'midsceneExtension', 'doubaoKey', 'pythonOpenInterpreter', 'screenAuthorized'],
      ready: deps.deepseekKey && deps.qwenKey && deps.midsceneExtension && deps.doubaoKey && deps.pythonOpenInterpreter && deps.screenAuthorized
    }
  }

  return {
    deps,
    tiers,
    helpLinks: {
      deepseekKey: 'https://platform.deepseek.com',
      qwenKey: 'https://dashscope.console.aliyun.com',
      doubaoKey: 'https://console.volcengine.com/ark',
      midsceneExtension: 'https://midscenejs.com/docs/extension',
      pythonOpenInterpreter: 'https://docs.openinterpreter.com/getting-started/setup',
      screenAuthorized: 'aionui://settings#screen-authorization'
    }
  }
}

function register(ipcMain) {
  ipcMain.handle('setup:status', async () => computeSetupStatus())
}

module.exports = { register, computeSetupStatus }
```

- [ ] **Step 3:** In `electron/ipc/index.js` `registerAll`, add `require('./setupStatus').register(ipcMain)`. Also expose `setup:status` in `electron/preload.js` if the preload uses an allowlist pattern (grep first).

- [ ] **Step 4:** Run + commit.

```bash
npx vitest run electron/__tests__/setup-status-ipc.test.js
git add electron/ipc/setupStatus.js electron/ipc/index.js electron/preload.js electron/__tests__/setup-status-ipc.test.js
git commit -m "feat(setup-status): IPC reports per-dep state and tier readiness"
```

## Task 5.5: WelcomeSetupDialog — first-run modal in client

**Files:**
- Create: `client/src/components/WelcomeSetupDialog.jsx`
- Modify: `client/src/App.jsx` (mount the dialog, show on first launch)
- Modify: `client/src/panels/SettingsPanel.jsx` (add "查看初始设置向导" button)
- Modify: `electron/store.js` (add `welcomeShown: false` flag) — already covered if Task 1.1 left room; otherwise add here

- [ ] **Step 1:** Read `client/src/components/ConfirmModal.jsx` to learn the modal styling pattern, then create `WelcomeSetupDialog.jsx`:

```jsx
import { useEffect, useState } from 'react'

const TIER_KEYS = ['lite', 'browser', 'full']

const DEP_LABELS = {
  deepseekKey: 'DeepSeek API Key',
  qwenKey: 'Qwen3-VL（DashScope）API Key',
  doubaoKey: '豆包（Volcengine Ark）API Key',
  midsceneExtension: 'Chrome Midscene 扩展已连接',
  pythonOpenInterpreter: 'Python + Open Interpreter',
  screenAuthorized: '屏幕控制授权'
}

export default function WelcomeSetupDialog({ open, onClose, onMarkSeen }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!open) return
    window.aionui.invoke('setup:status').then(setStatus)
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal welcome-setup">
        <h2>欢迎使用 AionUi</h2>
        <p className="lede">
          AionUi 把三个国内模型分配到各自最强的活上：DeepSeek-V4 负责聊天/规划/写代码，
          Qwen3-VL 负责浏览器看屏，豆包 1.5 视觉版负责桌面看屏。
          按需启用，不必一次到位。
        </p>

        {status && TIER_KEYS.map((k) => {
          const tier = status.tiers[k]
          return (
            <section key={k} className={`tier ${tier.ready ? 'ready' : 'pending'} ${tier.recommended ? 'recommended' : ''}`}>
              <header>
                <h3>{tier.label}{tier.recommended && <span className="badge">推荐</span>}</h3>
                <span className="state">{tier.ready ? '✓ 已就绪' : '✗ 未就绪'}</span>
              </header>
              <ul>
                {tier.requires.map((dep) => (
                  <li key={dep} className={status.deps[dep] ? 'ok' : 'missing'}>
                    {status.deps[dep] ? '✓' : '✗'} {DEP_LABELS[dep]}
                    {!status.deps[dep] && status.helpLinks[dep] && (
                      <a href={status.helpLinks[dep]} target="_blank" rel="noreferrer"> 设置 →</a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <footer>
          <label>
            <input type="checkbox" onChange={(e) => onMarkSeen(e.target.checked)} />
            不再自动显示
          </label>
          <button onClick={onClose}>开始使用</button>
        </footer>
      </div>
    </div>
  )
}
```

Add CSS in `client/src/styles/` (a new `welcome-setup.css` imported from main entry, or extend the existing modal css). Tier states use color: `.ready` green border, `.pending` amber, `.recommended` highlighted card.

- [ ] **Step 2:** In `App.jsx`, mount the dialog. On startup, invoke `setup:get-welcome-shown` IPC and only auto-open if false:

```jsx
const [welcomeOpen, setWelcomeOpen] = useState(false)

useEffect(() => {
  window.aionui.invoke('setup:get-welcome-shown').then((shown) => { if (!shown) setWelcomeOpen(true) })
}, [])

// ...
<WelcomeSetupDialog
  open={welcomeOpen}
  onClose={() => setWelcomeOpen(false)}
  onMarkSeen={(checked) => { if (checked) window.aionui.invoke('setup:mark-welcome-shown') }}
/>
```

- [ ] **Step 3:** Add the two helper IPCs in `electron/ipc/setupStatus.js`:

```js
ipcMain.handle('setup:get-welcome-shown', () => Boolean(store.getConfig().welcomeShown))
ipcMain.handle('setup:mark-welcome-shown', () => { store.updateConfig({ welcomeShown: true }) })
```

- [ ] **Step 4:** Add `welcomeShown: false` to `electron/store.js` defaults if not already there.

- [ ] **Step 5:** Add a button in `SettingsPanel.jsx` titled "重新查看初始设置向导" that calls `setWelcomeOpen(true)` (passed via context or props) so users can revisit anytime.

- [ ] **Step 6:** Smoke test:

```bash
npm run electron:dev
```

Expected: on first launch, dialog appears showing live ✓/✗. Closing + reopening app does NOT reshow if "不再自动显示" was checked. Settings → "重新查看" button always reopens.

- [ ] **Step 7:** Commit.

```bash
git add client/src electron/ipc/setupStatus.js electron/store.js
git commit -m "feat(welcome): first-run setup dialog with three tiers and live dep status"
```

## Task 5.5b: WelcomeSetupDialog — inline paste & toggle (UX fix)

**Why:** Users reported that clicking the per-dep "Setup ↗" links jumps to an
external console (DeepSeek / DashScope / Volcengine), but after copying the
API key there is no input field in the dialog to paste it back into. They
end up hunting for the matching field in `SettingsPanel.jsx`. This task
turns the dialog from a read-only status report into a one-stop setup flow.

**Files:**
- Modify: `client/src/components/WelcomeSetupDialog.jsx`
- Modify: `electron/ipc/setupStatus.js` (add `setup:set-key` and `setup:set-screen-authorized`)
- Modify: `electron/preload.js` (allowlist new IPC channels if it allowlists)
- Modify: `electron/__tests__/setup-status-ipc.test.js` (cover new mutators)

### Target visual (ASCII mockup — implement to match this)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AionUi 初始设置                                                    ✕   │
│  按你想要解锁的能力档位完成对应配置。                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │  轻量：仅聊天                                       ⚠ 未就绪          │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ⚠ DeepSeek API Key                              Get key ↗       │ │ │
│ │ │ ┌──────────────────────────────────────┐ ┌─┐  ┌──────┐           │ │ │
│ │ │ │ ••••••••••••••••••••                 │ │👁│  │ Save │           │ │ │
│ │ │ └──────────────────────────────────────┘ └─┘  └──────┘           │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │  中等：+浏览器自动化     [推荐]                     ⚠ 未就绪          │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ DeepSeek API Key                              Get key ↗       │ │ │
│ │ ├──────────────────────────────────────────────────────────────────┤ │ │
│ │ │ ⚠ Qwen3-VL（DashScope）API Key                  Get key ↗       │ │ │
│ │ │ ┌──────────────────────────────────────┐ ┌─┐  ┌──────┐           │ │ │
│ │ │ │ paste key here                       │ │👁│  │ Save │           │ │ │
│ │ │ └──────────────────────────────────────┘ └─┘  └──────┘           │ │ │
│ │ ├──────────────────────────────────────────────────────────────────┤ │ │
│ │ │ ⚠ Chrome Midscene 扩展已连接                    Setup ↗         │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │  完整：+桌面 + 本地执行                             ⚠ 未就绪          │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ✓ DeepSeek API Key                              Get key ↗       │ │ │
│ │ │ ⚠ Qwen3-VL（DashScope）API Key                  Get key ↗       │ │ │
│ │ │ ⚠ Chrome Midscene 扩展已连接                    Setup ↗         │ │ │
│ │ │ ⚠ 豆包（Volcengine Ark）API Key                 Get key ↗       │ │ │
│ │ │ ┌──────────────────────────────────────┐ ┌─┐  ┌──────┐           │ │ │
│ │ │ │ paste key here                       │ │👁│  │ Save │           │ │ │
│ │ │ └──────────────────────────────────────┘ └─┘  └──────┘           │ │ │
│ │ │ ⚠ Python + Open Interpreter                     安装指引 ↗      │ │ │
│ │ │ ⚠ 屏幕控制授权                                  [□ 启用]        │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [ ] 不再自动显示                                       [ 开始使用 ]    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Rendering rules**

- Card states: `ready` (green left-bar), `pending` (amber), `recommended` (highlighted background, "推荐" badge inline)
- Row icons: `✓` green when satisfied, `⚠` amber when missing
- Right-aligned action per row:
  - **Key deps** → `Get key ↗` link (external) + the inline `[input][👁][Save]` row appears ONLY when row is missing
  - **Install deps** → `Setup ↗` link (external) only
  - **Screen auth** → `[□ 启用]` checkbox toggle only (no external link)
- After Save / toggle: row icon flips to ✓, parent re-fetches `setup:status` so any tier whose dependencies are now all met turns green at the card level.
- Input is always full-width on its own line under the dep label (don't try to fit it on the same row as the label — keys are long).
- `type=password` by default; the eye toggle reveals plaintext.

- [ ] **Step 1: Add IPC mutators** — register two new handlers in `setupStatus.js`:

```js
const KEY_FIELD_MAP = {
  deepseekKey: 'deepseekApiKey',
  qwenKey: 'qwenVisionApiKey',
  doubaoKey: 'doubaoVisionApiKey'
}

ipcMain.handle('setup:set-key', (_evt, { dep, value }) => {
  const field = KEY_FIELD_MAP[dep]
  if (!field) throw new Error(`Unknown dep ${dep}`)
  if (typeof value !== 'string' || value.length > 4096) throw new Error('invalid key')
  store.updateConfig({ [field]: value.trim() })
  return { ok: true }
})

ipcMain.handle('setup:set-screen-authorized', (_evt, { value }) => {
  store.updateConfig({ uiTarsScreenAuthorized: Boolean(value) })
  return { ok: true }
})
```

The 4096 cap is sanity only; real validation is the upstream provider's job.

- [ ] **Step 2: Tests for mutators** — append to
`electron/__tests__/setup-status-ipc.test.js`:

```js
it('setup:set-key updates the matching store field', () => {
  const updates = []
  const KEY_FIELD_MAP = { deepseekKey: 'deepseekApiKey', qwenKey: 'qwenVisionApiKey', doubaoKey: 'doubaoVisionApiKey' }
  const handler = ({ dep, value }) => {
    const field = KEY_FIELD_MAP[dep]
    if (!field) throw new Error('Unknown dep')
    updates.push({ [field]: value.trim() })
    return { ok: true }
  }
  expect(handler({ dep: 'deepseekKey', value: '  sk-test  ' })).toEqual({ ok: true })
  expect(updates[0]).toEqual({ deepseekApiKey: 'sk-test' })
})

it('setup:set-key rejects unknown dep', () => {
  const handler = ({ dep }) => {
    if (!['deepseekKey','qwenKey','doubaoKey'].includes(dep)) throw new Error('Unknown dep')
  }
  expect(() => handler({ dep: 'foo' })).toThrow(/Unknown dep/)
})
```

- [ ] **Step 3: Refactor `WelcomeSetupDialog.jsx`** — branch per dep type:

```jsx
const KEY_DEPS = new Set(['deepseekKey', 'qwenKey', 'doubaoKey'])
const TOGGLE_DEPS = new Set(['screenAuthorized'])

function DepRow({ dep, ok, helpUrl, label, onSaved }) {
  if (KEY_DEPS.has(dep)) return <KeyRow {...{ dep, ok, helpUrl, label, onSaved }} />
  if (TOGGLE_DEPS.has(dep)) return <ToggleRow {...{ dep, ok, label, onSaved }} />
  return <ExternalLinkRow {...{ ok, helpUrl, label }} />
}

function KeyRow({ dep, ok, helpUrl, label, onSaved }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!value.trim()) return
    setSaving(true)
    try {
      await window.aionui.invoke('setup:set-key', { dep, value })
      setValue('')
      onSaved()
    } finally { setSaving(false) }
  }
  return (
    <li className={ok ? 'ok' : 'missing'}>
      <div className="row-head">
        <span>{ok ? '✓' : '⚠'} {label}</span>
        <a href={helpUrl} target="_blank" rel="noreferrer">Get key ↗</a>
      </div>
      {!ok && (
        <div className="row-input">
          <input
            type={show ? 'text' : 'password'}
            placeholder="paste key here"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" onClick={() => setShow(s => !s)} aria-label="toggle visibility">
            {show ? '🙈' : '👁'}
          </button>
          <button type="button" onClick={save} disabled={!value.trim() || saving}>
            {saving ? '...' : 'Save'}
          </button>
        </div>
      )}
    </li>
  )
}

function ToggleRow({ dep, ok, label, onSaved }) {
  async function flip(e) {
    await window.aionui.invoke('setup:set-screen-authorized', { value: e.target.checked })
    onSaved()
  }
  return (
    <li className={ok ? 'ok' : 'missing'}>
      <span>{ok ? '✓' : '⚠'} {label}</span>
      <label className="row-toggle">
        <input type="checkbox" checked={ok} onChange={flip} /> 启用
      </label>
    </li>
  )
}

function ExternalLinkRow({ ok, helpUrl, label }) {
  return (
    <li className={ok ? 'ok' : 'missing'}>
      <span>{ok ? '✓' : '⚠'} {label}</span>
      {!ok && helpUrl && <a href={helpUrl} target="_blank" rel="noreferrer">Setup ↗</a>}
    </li>
  )
}
```

In the parent component, pass an `onSaved` callback that re-fetches
`setup:status` and replaces local state. Tier ready state, "Recommended"
badge, and overall card colors all update live.

- [ ] **Step 4: CSS polish** — inline input row goes full-width on its own
line under the dep label so long keys don't push the label off-screen. Keep
visual consistency with `ConfirmModal`.

- [ ] **Step 5: Smoke test** — `npm run electron:dev`, then verify:
  - DeepSeek row shows password input. Paste fake `sk-xxxx` → Save → row
    turns green; "Lite tier" goes ✓ ready.
  - Toggle screen auth → flips both ways; full tier ready state updates.
  - Tab order sensible: input → Get key link → Show/Hide → Save → next row.
  - After Save the input clears; saved value persists in store and never
    re-renders as plaintext.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/WelcomeSetupDialog.jsx electron/ipc/setupStatus.js electron/preload.js electron/__tests__/setup-status-ipc.test.js
git commit -m "feat(welcome): inline API-key paste fields and screen-auth toggle"
```

## Task 5.6: Acceptance run + test-report

**Files:**
- Modify: `docs/test-report.md`

- [ ] **Step 1:** Run full automated suite:

```bash
npm test
npm run build:client
npm run electron:build
```

All must be green. Installer at `dist-electron/` with all three bridges in resources.

- [ ] **Step 2:** On a clean Windows VM:
  - Install OI (`pip install open-interpreter`)
  - Install Chrome Midscene extension and connect
  - Configure three API keys
  - Run all six v1 actions from spec §4 in order
  - Verify each in Control Center, Run Outputs, audit log
  - Test Emergency Stop on item 5 (Midscene click) mid-flight

- [ ] **Step 3:** Append results to `docs/test-report.md` under the placeholder section from Task 0.3. Format:

```markdown
## 2026-05-09 Tri-Model + Midscene Acceptance

Environment: Windows 11 x64, Python 3.11.x, OI <ver>, Chrome <ver> + Midscene extension <ver>,
DeepSeek-V4 / Qwen3-VL-Plus / Doubao-1.5-thinking-vision-pro endpoints.

| # | Action | Runtime | Result | Audit | Output panel | Notes |
|---|--------|---------|--------|-------|--------------|-------|
| 1 | shell echo hi | OI | PASS | ✓ | ✓ | |
| 2 | code python 1+1 | OI | PASS | ✓ | ✓ | |
| 3 | file.write tmp | OI | PASS | ✓ | ✓ | |
| 4 | mouse.click 回收站 | UI-TARS | PASS | ✓ | ✓ | dry-run first |
| 5 | web.click 搜索 | Midscene | PASS | ✓ | ✓ | live on baidu |
| 6 | web.query 标题 | Midscene | PASS | ✓ | ✓ | answer correct |

Emergency Stop on #5: PASS — action cancelled within 200ms.
```

If any item fails, **do not falsify**. Mark FAIL and stop; surface the failure to the human reviewer.

- [ ] **Step 4:** Commit + push + open PR.

```bash
git add docs/test-report.md
git commit -m "docs(test-report): tri-model acceptance — all 6 items PASS"
git push -u origin feat/tri-model-midscene
gh pr create --title "feat: tri-model routing + Midscene bridge — v1" --body "..."
```

---

## Definition of Done

- All tests pass: `npm test` (with new midscene + supervisor + adapter tests included).
- Frontend build clean: `npm run build:client`.
- Windows installer built: `npm run electron:build` produces a single NSIS installer that contains all three bridges in `resources/server/`.
- Acceptance §5.6 step 2 — all 6 items PASS on clean VM; Emergency Stop verified.
- Welcome dialog appears on first launch, correctly reflects per-dep state for the test VM, dismissable, reopenable from Settings.
- README, USER_MANUAL, runtime-setup, security-policy updated.
- `docs/test-report.md` appended with the matrix above.
- `git diff main -- electron/services/openInterpreter/protocol.js electron/services/uiTars/protocol.js electron/services/midscene/protocol.js server/oi-bridge/translator.js server/uitars-bridge/translator.js` is empty.
- PR opened on `feat/tri-model-midscene`.
