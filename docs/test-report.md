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
