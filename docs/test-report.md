# AionUi V2 Test Report

Date: 2026-05-08

## Automated Verification

```text
npm test
```

Result: passed. Final run: 26 test files, 93 tests.

```text
npm run build:client
```

Result: passed.

```text
npm run electron:build
```

Result: passed. Output included `dist-electron\AionUi Setup 0.1.0.exe`.

```text
dist-electron\win-unpacked\AionUi.exe
```

Result: launch smoke passed after the final package build. The packaged app process started and stayed alive for the smoke window, then was closed.

## Notes

- Initial dependency setup required using a reachable Electron mirror because the default Electron binary download failed behind TLS/proxy behavior.
- Open Interpreter and UI-TARS real external runtimes are documented and adapter-tested at the protocol boundary.
- Dry-run mode is available for complete demo flow without external runtime installs.

## Pending Release-Machine Verification

Manual in-app smoke test still recommended on the release machine:

- Normal chat.
- Dry-run Execute mode.
- Control Center approve/deny.
- Logs export.
- Outputs panel.
- Runtime setup cards.
- Emergency stop.

## 2026-05-09 Tri-Model + Midscene Acceptance

Environment: Windows 11 x64 dev machine, Node.js/npm workspace, Electron Builder win target.

### Automated Verification

| Command | Result | Notes |
|---|---|---|
| `npm test` | PASS | 40 test files, 160 tests |
| `npm run build:client` | PASS | Vite production build completed |
| `npm run electron:build` | PASS | Generated `dist-electron\AionUi Setup 0.1.0.exe` |

Packaged resource verification: PASS. `dist-electron\win-unpacked\resources\server\` contains `oi-bridge`, `uitars-bridge`, and `midscene-bridge`.

### Manual Clean-VM Acceptance

Not run in this development environment. The clean Windows VM, Chrome Midscene extension connection, and live DeepSeek / Qwen3-VL / Doubao API keys are required before marking these items PASS.

| # | Action | Runtime | Result | Audit | Output panel | Notes |
|---|---|---|---|---|---|---|
| 1 | shell echo hi | OI | NOT RUN | NOT RUN | NOT RUN | Requires clean VM acceptance |
| 2 | code python 1+1 | OI | NOT RUN | NOT RUN | NOT RUN | Requires clean VM acceptance |
| 3 | file.write tmp | OI | NOT RUN | NOT RUN | NOT RUN | Requires clean VM acceptance |
| 4 | mouse.click controlled target | UI-TARS | NOT RUN | NOT RUN | NOT RUN | Requires screen authorization and Doubao Ark key |
| 5 | web.click search | Midscene | NOT RUN | NOT RUN | NOT RUN | Requires Chrome extension bridge and Qwen3-VL key |
| 6 | web.query title | Midscene | NOT RUN | NOT RUN | NOT RUN | Requires Chrome extension bridge and Qwen3-VL key |

Emergency Stop on #5: NOT RUN. Requires live Midscene browser action on the clean VM.

## Phase A Task 0 — API surface notes

Date: 2026-05-10

### 1. `electron/services/deepseek.js#chat` — contract

**Signature:**
```js
async function chat({ messages, json = false, temperature = 0.7, tools, stream = false, onDelta })
```

**Return shape (with `tools` array provided):**
```js
{
  content: string,              // text content of the assistant response
  assistant_message: {          // ready to push into message history
    role: 'assistant',
    content: string | null,     // null when tool_calls present and no text
    tool_calls: [...]           // RAW tool_calls from API (OpenAI wire format)
  },
  tool_calls: [                 // NORMALIZED — consumers MUST use this, not raw
    {
      id: string,               // call.id || `call_${index}`
      name: string,             // call.name || call.function?.name  ← KEY: flat "name"
      args: object,             // parsed JSON — call.args ?? call.function?.arguments
      raw: object               // original call object from the API
    }
  ]
}
```

**Return shape (without tools):** plain string (`message.content ?? ''`).

**Critical contract point:** The normalized form uses `call.name` and `call.args` — NOT `call.function.name` / `call.function.arguments`. This is the deepseek.js normalized form documented at line 55-62 (`normalizeToolCalls`). All agent loop consumers MUST use this flat form.

**Signal support: GAP — requires Task 0.5 fix.**
- `postChat()` hardcodes `signal: AbortSignal.timeout(timeout)` (line 92) — a fixed 60s timeout.
- `chat()` signature does NOT accept a caller-provided `signal`.
- Agent loop needs to pass `AbortSignal` through to cancel in-flight model calls.
- **Fix needed:** add `signal` param to `chat()` → threaded through to `postChat()` → used instead of (or composed with) `AbortSignal.timeout(timeout)`.

**Streaming variants:** `chatStreamingResult()` and `chatStream()` also lack signal passthrough. Phase A can focus on non-streaming `chat()`.

**Normalization helpers exported:**
- `normalizeTools(tools[])` — accepts either `{type:'function', function:{name,...}}` or `{name, description, parameters}`; normalizes to OpenAI function-calling schema.
- `normalizeToolCalls(toolCalls[])` — accepts either `{id, name, args}` or `{id, function:{name, arguments}}`; normalizes to flat `{id, name, args, raw}`.

**Additional exports:** `DeepSeekError`, `chatStream`, `chatJson`, `parseJsonStrict`.

### 2. `electron/tools/index.js#execute` — contract

**Signature:**
```js
async function execute(name, args, context = {})
```

**Return shape:** Whatever the tool function returns. Error wrapper:
```js
{ error: { code: 'INVALID_ARGS' | 'INTERNAL' | string, message: string } }
```

**`context` passthrough:** The `context` object is passed as the second argument to every tool function (`fn(args, context)`). This is how `skipInternalConfirm` and `signal` will reach tools.

**Signal support:** None currently. No tool reads `context.signal`. The `runShellCommand` tool has its own internal timeout via `setTimeout` + `child.kill()`, but no AbortSignal integration.

**Registered tools** (16 total, via `loadBuiltins()` at module load):
| # | Tool name | Source file | Category |
|---|-----------|------------|----------|
| 1 | `read_file` | fs-read.js | fs-read |
| 2 | `list_dir` | fs-read.js | fs-read |
| 3 | `search_files` | fs-read.js | fs-read |
| 4 | `write_file` | fs-write.js | fs-write |
| 5 | `edit_file` | fs-write.js | fs-write |
| 6 | `create_dir` | fs-write.js | fs-write |
| 7 | `delete_path` | fs-destructive.js | fs-destructive |
| 8 | `move_path` | fs-destructive.js | fs-destructive |
| 9 | `run_shell_command` | shell.js | shell |
| 10 | `get_os_info` | env.js | env |
| 11 | `which` | env.js | env |
| 12 | `generate_docx` | docs.js | docs |
| 13 | `generate_pptx` | docs.js | docs |
| 14 | `remember_user_rule` | remember.js | remember |
| 15 | `forget_user_rule` | remember.js | remember |
| 16 | `load_skill` | skills/loader.js | skill |

**`getExecutionToolSchemas()`:** Returns `[]` (line 36-38). Locked by `tools.test.js:31`. Must NOT modify.

**`TOOL_SCHEMAS` array:** Populated by `register()` calls. Each entry is the raw schema object passed to `register(schema, fn)`. Format: `{ name, description, parameters }` — NOT OpenAI `{type:'function', function:{...}}`.

### 3. `requestConfirm` call sites — double-approval analysis

**`electron/confirm.js#requestConfirm`:**
```js
async function requestConfirm({ kind, payload = {} })
```
- Uses Electron `dialog.showMessageBox` — blocking native dialog.
- Has session-level caching via `sessionAllowed` Set (when `session_confirm_cache_enabled` is true).
- Returns `boolean`.

**Tools that call `requestConfirm` internally:**

| Tool | File:Line | Condition | Kind |
|------|-----------|-----------|------|
| `write_file` | fs-write.js:11 | When `overwrite=true` AND file exists | `'overwrite'` |
| `run_shell_command` | shell.js:39 | When command token NOT in whitelist | `'shell-command'` |
| `delete_path` | fs-destructive.js:10 | Always (before any delete) | `'delete'` |
| `move_path` | fs-destructive.js:22 | Always (before any move) | `'move'` |

**Tools that do NOT call `requestConfirm`:** `read_file`, `list_dir`, `search_files`, `edit_file`, `create_dir`, `get_os_info`, `which`, `generate_docx`, `generate_pptx`, `remember_user_rule`, `forget_user_rule`, `load_skill`.

**Double-approval risk:** In the agent loop, `toolPolicy.evaluateToolCall()` runs first and may set `requiresApproval=true`, triggering `requestApproval` callback. If the user approves, `tools.execute()` runs — and the tool itself may call `requestConfirm` again, showing a SECOND native dialog for the same action. This is a real double-approval UX bug.

**Mitigation strategy (adopted):** Pass `skipInternalConfirm: true` via `context` in `tools.execute()`. Each of the 4 `requestConfirm` call sites needs a one-line guard:
```js
if (context.skipInternalConfirm) return true  // policy already gated this
```
This goes BEFORE the existing `requestConfirm` call. Phase A implements this as a per-tool guard (not a framework change to `confirm.js`), keeping the change minimal and auditable.

### 4. `electron/skills/loader.js` — contract (read-only, NO modifications)

**`loadSkill({ name }, context)`:** Registered as tool `load_skill`. Uses `gray-matter` to parse frontmatter. Returns `{ name, content, referenced_tools, already_loaded }`. Has per-conversation dedup via `loadedByConversation` Map.

**`clearSession(convId)`:** Clears loaded skills for a conversation.

**No modifications to this file** per the reuse pact.


## Phase A acceptance smoke

Date: 2026-05-09

```json
{
  "passed": true,
  "finalText": "The file `hello.txt` has been created on your desktop at `C:\\Users\\g\\Desktop\\hello.txt` with the content \"hello world\".",
  "steps": 4,
  "toolCalls": 1,
  "toolResults": 1,
  "writeFileCalls": 1,
  "fileCreated": true,
  "fileContent": "hello world",
  "durationMs": 3356
}
```

Events:
- **assistant_message** @2119ms: {"type":"assistant_message","time":2119,"content":"","toolCalls":[{"id":"call_00_8LTPq3lHJzm5bPqBeS8p7855","name":"write_file","args":{"path":"C:\\Users\\g\\Desktop\\hello.txt","content":"hello world"
- **approval_request** @2120ms: {"type":"approval_request","time":2120,"call":{"id":"call_00_8LTPq3lHJzm5bPqBeS8p7855","name":"write_file","args":{"path":"C:\\Users\\g\\Desktop\\hello.txt","content":"hello world","overwrite":true},"
- **tool_result** @2121ms: {"type":"tool_result","time":2121,"call":{"id":"call_00_8LTPq3lHJzm5bPqBeS8p7855","name":"write_file","args":{"path":"C:\\Users\\g\\Desktop\\hello.txt","content":"hello world","overwrite":true},"raw":
- **assistant_message** @3356ms: {"type":"assistant_message","time":3356,"content":"The file `hello.txt` has been created on your desktop at `C:\\Users\\g\\Desktop\\hello.txt` with the content \"hello world\".","toolCalls":[]}

Result: PASS


## Phase B acceptance smoke

Date: 2026-05-09

```json
{
  "passed": true,
  "finalText": "Done! The file `hello.txt` has been created at `C:\\Users\\g\\Desktop` with the content \"hello world\" (11 bytes written).",
  "steps": 6,
  "toolCalls": 2,
  "toolResults": 2,
  "writeFileCalls": 1,
  "approvalRequests": 2,
  "fileCreated": true,
  "fileContent": "hello world",
  "abortSupported": true,
  "durationMs": 4481
}
```

Events:
- **assistant_message** @1469ms: {"time":1469,"convId":"smoke-test-1778360072834","type":"assistant_message","content":"Let me first check the path to make sure the directory exists.","toolCalls":[{"id":"call_00_1Ae138t4cftaoKiVzzvu3
- **tool_result** @1485ms: {"time":1485,"convId":"smoke-test-1778360072834","type":"tool_result","call":{"id":"call_00_1Ae138t4cftaoKiVzzvu3482","name":"list_dir","args":{"path":"C:\\Users\\g\\Desktop"},"raw":{"index":0,"id":"c
- **assistant_message** @3471ms: {"time":3471,"convId":"smoke-test-1778360072834","type":"assistant_message","content":"The directory exists. Now I'll create the hello.txt file with content \"hello world\".","toolCalls":[{"id":"call_
- **approval_request** @3472ms: {"time":3472,"convId":"smoke-test-1778360072834","type":"approval_request","call":{"id":"call_00_kiIWP0tX0TeeJw4RCuZ22349","name":"write_file","args":{"path":"C:\\Users\\g\\Desktop\\hello.txt","conten
- **approval_request** @3472ms: {"time":3472,"convId":"smoke-test-1778360072834","type":"approval_request","call":{"id":"call_00_kiIWP0tX0TeeJw4RCuZ22349","name":"write_file","args":{"path":"C:\\Users\\g\\Desktop\\hello.txt","conten
- **tool_result** @3632ms: {"time":3632,"convId":"smoke-test-1778360072834","type":"tool_result","call":{"id":"call_00_kiIWP0tX0TeeJw4RCuZ22349","name":"write_file","args":{"path":"C:\\Users\\g\\Desktop\\hello.txt","content":"h
- **assistant_message** @4481ms: {"time":4481,"convId":"smoke-test-1778360072834","type":"assistant_message","content":"Done! The file `hello.txt` has been created at `C:\\Users\\g\\Desktop` with the content \"hello world\" (11 bytes

Result: PASS


## Phase C acceptance smoke

Date: 2026-05-09

```json
{
  "passed": true,
  "tests": [
    {
      "test": "parseSSE",
      "passed": true
    },
    {
      "test": "parseSSE (no trailing blank line)",
      "passed": true
    },
    {
      "test": "tool registration",
      "passed": true
    },
    {
      "test": "tool policy",
      "passed": true
    },
    {
      "test": "rejects empty goal",
      "passed": true
    }
  ],
  "totalTests": 5,
  "passedCount": 5
}
```

Result: PASS


## Phase D acceptance smoke

Date: 2026-05-09

```json
{
  "passed": true,
  "tests": [
    {
      "test": "adapter healthCheck",
      "passed": true
    },
    {
      "test": "tool desktop_observe registered",
      "passed": true
    },
    {
      "test": "tool desktop_click registered",
      "passed": true
    },
    {
      "test": "tool desktop_type registered",
      "passed": true
    },
    {
      "test": "desktop_observe policy",
      "passed": true
    },
    {
      "test": "desktop_click policy",
      "passed": true
    },
    {
      "test": "desktop_type policy",
      "passed": true
    },
    {
      "test": "desktop_click rejects empty target",
      "passed": true
    }
  ],
  "totalTests": 8,
  "passedCount": 8
}
```

Result: PASS
