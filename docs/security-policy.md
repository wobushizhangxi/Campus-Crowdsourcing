# AionUi V2 Security Policy

## Execution Invariant

Model output is never executed directly.

The required path is:

```text
DeepSeek planner -> actionPlanner -> actionPolicy -> actionBroker -> approved adapter -> auditLog -> runOutputs
```

Any runtime adapter that is not called by the broker is outside the supported product path.

## Model Roles

- DeepSeek is required for chat, task planning, action intent, and coding reasoning.
- Qwen3-VL is restricted to browser vision through Midscene.
- Doubao 1.5 vision is restricted to desktop screen control through UI-TARS.
- Dry-run mode can simulate planning and execution for demos when external runtimes are unavailable.

## Risk Levels

- Low: observation and non-mutating reads.
- Medium: bounded command, file, and code work.
- High: install, delete, overwrite, GUI input, submit, and sensitive local changes.
- Blocked: credential exfiltration, disk formatting, hidden background execution, disabling security tooling, and unbounded recursive delete.

High-risk actions always require explicit confirmation. Blocked actions never reach runtime adapters.

## Action Risk Classification

- `web.observe`: low.
- `web.query`: low.
- `web.click`: medium.
- `web.type`: medium.

Web actions are still brokered through Control Center, audit logging, and run outputs. The model never auto-runs browser actions.

## Runtime Boundaries

Open Interpreter:

- External runtime only.
- AGPL source is not vendored in this repository.
- Executes only broker-approved command, file, code, or setup protocol requests.

UI-TARS:

- Managed `server/uitars-bridge` sidecar on `127.0.0.1:8765`.
- Uses Doubao vision on Volcengine Ark.
- Mouse and keyboard actions require active screen authorization.
- Visual/input requests stay behind `sourceBridge`.

Midscene:

- Managed `server/midscene-bridge` sidecar on `127.0.0.1:8770`.
- Uses `@midscene/web` from npm; no source vendoring.
- Requires the user to manually install and connect the Chrome Midscene extension.
- Browser actions use Qwen3-VL on DashScope and stay behind the Midscene adapter.

## Audit And Export

Audit events are append-only JSONL. Events are sanitized before storage and export. Secrets are masked in command strings, environment variables, headers, URLs, logs, file snippets, and explicit credential fields.

## Emergency Stop

Emergency stop cancels queued actions, aborts broker controllers where possible, and notifies registered adapters.
