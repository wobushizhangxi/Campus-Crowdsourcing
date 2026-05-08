# AionUi V2 User Manual

This manual covers the AionUi V2 desktop app: chat, execution tasks, model setup, runtime setup, confirmations, audit logs, run outputs, dry-run demos, and Windows packaging.

## What AionUi Does

AionUi is the visible control plane for agentic desktop work. DeepSeek plans text work and proposes actions. AionUi validates those actions, applies safety policy, asks for confirmation when risk is medium or high, dispatches approved actions to managed runtimes, and records the full timeline.

Default runtimes:

- DeepSeek: required for chat, planning, action intent, and coding reasoning.
- Midscene + Qwen3-VL: browser observation and web actions through the Chrome extension.
- UI-TARS + Doubao vision: desktop screen observation, mouse, and keyboard actions.
- Open Interpreter: managed sidecar for command, file, and code execution.
- AionUi dry-run: deterministic demo runtime when external runtimes are missing.

## First-Time Setup / 首次设置

1. Install Open Interpreter with Python 3.10+:

```powershell
pip install open-interpreter
```

2. Install Google Chrome, then install the Midscene browser extension manually. Open the extension and click `Allow Bridge Connection`.
3. Open Settings and fill in the three API groups:
   - DeepSeek API Key and endpoint. The default endpoint is `https://api.deepseek.com`.
   - Qwen3-VL on Alibaba DashScope: set `qwenVisionApiKey`.
   - Doubao on Volcengine Ark: set `doubaoVisionApiKey`.
4. Open Models/Runtimes and wait until Open Interpreter, UI-TARS, and Midscene show ready or show actionable setup guidance.
5. Run one dry-run task before real automation, then run a small `web.observe` browser smoke test.

### Troubleshooting

- Browser ready is not green: check that Chrome is open, the Midscene extension is installed, and `Allow Bridge Connection` has been clicked.
- Midscene bridge ready but extension not connected: reload the extension page, reopen Chrome, and try `web.observe` again.
- UI-TARS is not ready: confirm the Doubao Volcengine Ark API key is set and screen authorization is enabled only when the visible desktop is safe.
- Open Interpreter is not ready: confirm Python can run `interpreter` from a terminal and then restart AionUi.

## First Run

1. Open Settings.
2. Configure DeepSeek, Qwen3-VL, and Doubao API keys.
3. Install and connect the Midscene Chrome extension.
4. Open Models/Runtimes and check Open Interpreter, UI-TARS, and Midscene status.
5. Keep dry-run enabled if the external runtimes are not installed yet.
6. Use Chat mode for normal conversation, or Execute mode for brokered task execution.

## Chat Mode

Chat mode is for normal assistant replies. It uses DeepSeek through the text model router.

Chat mode does not treat the model as an execution brain. It is safe for regular questions, coding discussion, and planning before running anything locally.

## Execute Mode

Execute mode routes the user task to DeepSeek planning. The model must return structured action proposals. AionUi then:

1. Parses and validates the action plan.
2. Rejects unknown runtimes or action types.
3. Classifies risk.
4. Blocks unsafe actions.
5. Shows pending confirmations for medium and high risk actions.
6. Dispatches approved actions to Open Interpreter, UI-TARS, Midscene, or dry-run adapters.
7. Saves results to Run Outputs.
8. Appends sanitized audit events.

## Control Center

The Control Center shows current task session, pending actions, running actions, completed actions, failed actions, denied actions, blocked actions, exact sanitized payload summaries, approve and deny buttons, and emergency stop.

Emergency stop cancels queued actions and asks active runtimes to stop where possible.

## Models And Runtimes

The Models/Runtimes panel shows readiness for DeepSeek, Qwen3-VL, Doubao vision, Open Interpreter, UI-TARS, Midscene, and dry-run runtime.

Each runtime card can show ready, not installed, needs configuration, disabled, or error states. Setup and repair buttons call runtime bootstrap IPC and return guidance instead of crashing the app.

## Audit Logs

Audit logs are append-only JSONL events stored under the app data directory. The UI supports filters by session, runtime, risk, phase, and text. Exported logs are sanitized.

Secrets are masked in API keys, bearer tokens, command strings, environment variables, URLs, headers, file content snippets, and runtime logs.

## Run Outputs

Run Outputs replaces the old document-first artifact surface. It stores command summaries, generated files, screenshots metadata, dry-run artifacts, and runtime result notes. Output files open through the app's safe file-open bridge.

## Open Interpreter

Open Interpreter is a default AionUi execution capability, but its AGPL source is not vendored here. Configure it as an external command, sidecar endpoint, or maintained fork outside this repository.

Supported actions include `shell.command`, `file.read`, `file.write`, `file.delete`, `code.execute`, and `runtime.setup`.

Open Interpreter never receives raw model output directly. It only executes actions approved by the broker.

### Setup

1. Install Open Interpreter outside this repository.
2. Start an AionUi-compatible sidecar or wrapper process.
3. Set `Open Interpreter endpoint` in Settings, for example `http://127.0.0.1:8756`.
4. Run a health check from Models/Runtimes.
5. Test a command action such as `npm test`, a workspace file write, and a small code execution snippet.

Every proposed command, file write, or code execution appears in Control Center and Audit Logs. Setup or install commands are high risk and require confirmation.

## UI-TARS

UI-TARS is the desktop screen-control capability. AionUi launches the managed `uitars-bridge` automatically and injects the Doubao Volcengine Ark endpoint from Settings.

Supported actions include `screen.observe`, `screen.region.select`, `mouse.move`, `mouse.click`, `keyboard.type`, and `keyboard.shortcut`.

Mouse and keyboard actions require active screen authorization and normally require confirmation.

### Setup

1. Create or reuse a Volcengine Ark endpoint for `doubao-1-5-thinking-vision-pro-250428`.
2. Set `doubaoVisionApiKey` in Settings.
3. Keep the default endpoint `https://ark.cn-beijing.volces.com/api/v3` unless your Ark deployment differs.
4. Turn on `Screen authorization active` only when the visible screen is safe for automation.
5. Test `screen.observe`, then a mouse click proposal, then a keyboard type proposal.
6. Use emergency stop before further UI action when testing interruption behavior.

All UI-TARS actions appear in Control Center and Audit Logs. Mouse and keyboard actions are denied or blocked unless screen authorization is active and the broker approves the action.

## Midscene

Midscene is the browser automation capability. AionUi launches the managed `midscene-bridge` automatically, but Chrome and the Midscene extension are installed manually by the user.

Supported actions include `web.observe`, `web.click`, `web.type`, and `web.query`.

### Setup

1. Install Google Chrome.
2. Install the Midscene browser extension manually.
3. Click `Allow Bridge Connection` in the extension.
4. Set `qwenVisionApiKey` in Settings for Qwen3-VL on DashScope.
5. Run `web.observe` before any click or type action.

All Midscene actions appear in Control Center and Audit Logs. AionUi never auto-installs the browser extension.

## Dry-Run Demo

Dry-run mode simulates DeepSeek planning, Open Interpreter execution, UI-TARS screen control, Midscene browser actions, and run outputs. It is clearly labelled as dry-run and is intended for demos, tests, and first-run validation without external installs.

Try:

```text
Inspect a fake screen, propose the next click, run a fake test command, create a fake output summary, and export the logs.
```

## Risk Levels

- Low: observation and non-mutating reads.
- Medium: bounded command, file, and code work.
- High: installs, deletes, overwrites, GUI input, submissions, and sensitive system changes.
- Blocked: credential exfiltration, disk formatting, hidden background execution, disabling security tooling, and unbounded recursive delete.

High-risk actions always require confirmation. Blocked actions never run.

## Developer Commands

```powershell
npm run setup
npm test
npm run build:client
npm run electron:build
```

If Electron download fails because of TLS interception or proxy behavior, use a trusted mirror or pre-populated Electron cache before packaging.

## More Documentation

- Runtime setup: `docs/runtime-setup.md`
- Developer guide: `docs/developer-guide.md`
- Security policy: `docs/security-policy.md`
- Dry-run demo: `docs/demo-script.md`
- Release checklist: `docs/release-checklist.md`
- Test report: `docs/test-report.md`
