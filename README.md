# Layout Fixer

> Fix text typed in the wrong keyboard layout with one shortcut.

```
Ghbdtn → Привіт
```

Layout Fixer is a privacy-first background desktop utility for macOS and Windows
that repairs selected text typed with the wrong keyboard layout. Press a
shortcut, and the text is instantly replaced with the correct layout.

## How it works

1. Select text in any application
2. Press `Cmd + Shift + L` (macOS) or `Ctrl + Shift + L` (Windows/Linux)
3. Text is replaced with the corrected layout

That's it. Layout Fixer runs in the background and stays out of your way.

## Privacy

- **Fully local** — all conversion happens on your machine
- **No cloud** — nothing is sent to any server
- **No tracking** — no analytics, no telemetry, no accounts
- **No text leaves your device** — clipboard access is temporary and overwritten after each operation

## Current status

| Platform | Status |
|----------|--------|
| macOS | Working — dev tested |
| Windows | Planned — testing needed |
| Linux | Experimental |

## Supported layouts

- English (US) ↔ Ukrainian

More layouts coming in future releases. See the [roadmap](ROADMAP.md).

## Development

### Prerequisites

- Node.js 20.19+ or 22.12+
- Rust 1.85+
- [Tauri v2 platform prerequisites](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
npm install
npm run tauri dev
```

`npm run dev` starts only the browser debug UI. Tray, global shortcut, and
selected-text replacement require the Tauri process.

### Checks

```bash
npm run typecheck
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

### Production build

```bash
npm run tauri build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features.

## License

[MIT](LICENSE)
