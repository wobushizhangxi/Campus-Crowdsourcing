# AionUi Runtime Setup

## DeepSeek

DeepSeek is the primary text model for chat, task planning, action intent, and coding reasoning.

Configure:

- DeepSeek API key.
- Base URL, default `https://api.deepseek.com`.
- Planner model, default `deepseek-chat`.
- Coding model, default `deepseek-coder`.

## Qwen3-VL

Qwen3-VL is vision-only in AionUi. It is consumed by `server/midscene-bridge` through Midscene Bridge Mode for browser observation and browser actions.

Default China Beijing base URL:

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

Configure:

- Qwen vision API key in `qwenVisionApiKey`.
- Qwen vision model, default `qwen3-vl-plus`.
- Chrome with the Midscene extension installed manually and connected.

## Doubao Vision

Doubao 1.5 vision is consumed by `server/uitars-bridge` for desktop screen control through UI-TARS.

Default Volcengine Ark endpoint:

```text
https://ark.cn-beijing.volces.com/api/v3
```

Configure:

- Doubao vision API key in `doubaoVisionApiKey`.
- Doubao model, default `doubao-1-5-thinking-vision-pro-250428`.
- Screen authorization in AionUi before real desktop input.

## Open Interpreter

Open Interpreter is external. Do not copy its AGPL source into this repository. AionUi launches the managed `server/oi-bridge` sidecar on `127.0.0.1:8756`.

Recommended setup:

1. Install Open Interpreter outside the repo.
2. Confirm Python can run `interpreter`.
3. Run Models/Runtimes health check.

Endpoint contract:

```text
POST /execute
```

Body protocol: `aionui.open-interpreter.v1`.

## UI-TARS

UI-TARS is the desktop screen-control runtime. AionUi launches `server/uitars-bridge` on `127.0.0.1:8765` and injects Doubao Volcengine Ark settings.

Recommended setup:

1. Configure `doubaoVisionApiKey`.
2. Keep `doubaoVisionEndpoint` at the default unless your Ark deployment differs.
3. Enable screen authorization only for safe visible screens.
4. Test observe, click proposal, keyboard proposal, and emergency stop.

Endpoint contract:

```text
POST /execute
```

Body protocol: `aionui.ui-tars.v1`.

## Midscene

Midscene is the browser runtime. AionUi launches `server/midscene-bridge` on `127.0.0.1:8770`; the bridge consumes `@midscene/web` from npm and talks to the manually installed Chrome extension.

Recommended setup:

1. Install Google Chrome.
2. Install the Midscene browser extension manually.
3. Click `Allow Bridge Connection` in the extension.
4. Configure `qwenVisionApiKey` for Qwen3-VL on DashScope.
5. Run a `web.observe` smoke test before `web.click` or `web.type`.

Endpoint contract:

```text
POST /execute
```

Body protocol: `aionui.midscene.v1`.

## Dry-Run

Dry-run is enabled by default. It simulates model planning, command/file/code execution, screen observation, browser actions, mouse, keyboard, outputs, and logs.
