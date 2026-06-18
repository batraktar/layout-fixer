# Layout Fixer

Privacy-first Tauri desktop utility that fixes text typed with the wrong
English QWERTY or Ukrainian ЙЦУКЕН keyboard layout. Conversion happens locally;
the app has no server component and sends no text over the network.

## How it works

1. Select text in any application.
2. Press `Cmd + Shift + L` on macOS or `Ctrl + Shift + L` on Windows/Linux.
3. Layout Fixer copies, converts, and pastes the text back into the active app.

You can also test conversion manually or convert the current clipboard from the
app window. Direction is detected from the number of Latin and Ukrainian
Cyrillic letters; ties default to English → Ukrainian.

> macOS requires Accessibility permission for Layout Fixer (or the terminal
> running it) so the app can issue copy and paste keystrokes. Enable it in
> **System Settings → Privacy & Security → Accessibility**.

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- Rust 1.85+
- [Tauri v2 platform prerequisites](https://v2.tauri.app/start/prerequisites/)

## Setup and development

```bash
npm install
npm run tauri dev
```

Run only the browser UI with `npm run dev`. Clipboard and global shortcut
integration are available only in the Tauri app.

## Testing and checks

```bash
npm test
npm run typecheck
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Production build

```bash
npm run tauri build
```

Bundling is disabled in `src-tauri/tauri.conf.json` for this initial MVP. Set
`bundle.active` to `true` and add production icons when preparing installers.

## License

[MIT](LICENSE)
