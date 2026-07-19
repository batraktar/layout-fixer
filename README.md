# Layout Fixer

> Typed something in the wrong language? One keypress fixes it.

```
Ghbdtn → Привіт
```

You're typing an email, switch languages mid-sentence, and suddenly your text
looks like this. Layout Fixer detects the mistake and fixes it instantly — no
retyping, no copy-pasting, no frustration.

---

## Features

- **Instant fix** — select text, press one shortcut, done
- **Works everywhere** — any app, any text field
- **Custom hotkeys** — use whatever shortcut feels natural to you
- **Clipboard history** — keep track of your recent conversions
- **Privacy-first** — everything stays on your machine, nothing is sent anywhere
- **Lightweight** — lives in your system tray, uses almost no resources
- **macOS & Windows** — dark and light theme support

---

## Installation

1. Go to the [Releases](../../releases) page
2. Download the installer for your system:
   - **macOS** — `.dmg` file
   - **Windows** — `.exe` installer
3. Run the installer and follow the prompts
4. Layout Fixer will appear in your system tray — that's it!

---

## Usage

1. Select text typed in the wrong layout
2. Press the shortcut:
   - **macOS:** `Cmd + Shift + L`
   - **Windows:** `Ctrl + Shift + L`
3. Text is fixed instantly

The app sits quietly in your tray until you need it.

---

## Custom Hotkeys

Don't like the default shortcut? Change it:

1. Open Layout Fixer from the system tray
2. Go to **Settings**
3. Enter your preferred hotkey in the **Custom Hotkey** field
4. Save — the new shortcut is active immediately

**Format examples:**
- `Ctrl+Shift+L`
- `Cmd+Alt+K`
- `Ctrl+Alt+M`

Some shortcuts are reserved by the system (like `Ctrl+C` or `Cmd+Space`) and
can't be used. The app will let you know if your chosen hotkey is taken.

---

## Supported Layouts

| From | To |
|------|----|
| English (US) | Ukrainian |

More language pairs are coming in future releases.

---

## Privacy

- Everything runs **locally** on your device
- **No internet connection** required
- **No tracking**, no analytics, no accounts
- Clipboard access is temporary and overwritten after each use

---

## Development

```bash
npm install
npm run tauri dev
```

Requires: Node.js 20+, Rust 1.85+, and [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

---

## License

[MIT](LICENSE)
