import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { convertLayout } from "./lib/convertLayout";
import { detectDirection } from "./lib/detectDirection";

interface OperationStatus {
  kind: "info" | "success" | "error";
  message: string;
}

interface RuntimeStatus {
  backgroundActive: boolean;
  shortcut: string;
  shortcutRegistered: boolean;
  lastStatus: OperationStatus;
}

interface LayoutInfo {
  id: string;
  name: string;
  enabled: boolean;
}

interface AppSettings {
  restoreClipboard: boolean;
  showSettingsOnStartup: boolean;
  disabledLayouts: string[];
}

const isMac = navigator.userAgent.includes("Mac");
const defaultShortcut = isMac ? "\u2318 \u21E7 L" : "Ctrl + Shift + L";

const defaultSettings: AppSettings = {
  restoreClipboard: true,
  showSettingsOnStartup: false,
  disabledLayouts: [],
};

export default function App() {
  const [input, setInput] = useState("Ghbdsn");
  const [output, setOutput] = useState("");
  const [convertedDirection, setConvertedDirection] = useState("");
  const [layouts, setLayouts] = useState<LayoutInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [runtime, setRuntime] = useState<RuntimeStatus>({
    backgroundActive: isTauri(),
    shortcut: defaultShortcut,
    shortcutRegistered: false,
    lastStatus: {
      kind: "info",
      message: isTauri() ? "Loading background status\u2026" : "Browser debug mode",
    },
  });

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    void invoke<RuntimeStatus>("runtime_status")
      .then((status) => {
        if (!disposed) setRuntime(status);
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setRuntime((current) => ({
            ...current,
            lastStatus: { kind: "error", message: String(error) },
          }));
        }
      });

    void invoke<LayoutInfo[]>("list_layouts")
      .then((list) => {
        if (!disposed) setLayouts(list);
      })
      .catch(() => {});

    void invoke<AppSettings>("get_settings")
      .then((s) => {
        if (!disposed) setSettings(s);
      })
      .catch(() => {});

    void listen<OperationStatus>("operation-status", (event) => {
      setRuntime((current) => ({ ...current, lastStatus: event.payload }));
    }).then((stopListening) => {
      if (disposed) {
        stopListening();
      } else {
        unlisten = stopListening;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const saveSettings = async (updated: AppSettings) => {
    setSettings(updated);
    if (isTauri()) {
      try {
        await invoke("update_settings", { newSettings: updated });
      } catch (error) {
        setRuntime((current) => ({
          ...current,
          lastStatus: { kind: "error", message: String(error) },
        }));
      }
    }
  };

  const toggleLayout = async (id: string) => {
    if (isTauri()) {
      try {
        await invoke("toggle_layout", { id });
        const list = await invoke<LayoutInfo[]>("list_layouts");
        setLayouts(list);
        const s = await invoke<AppSettings>("get_settings");
        setSettings(s);
      } catch (error) {
        setRuntime((current) => ({
          ...current,
          lastStatus: { kind: "error", message: String(error) },
        }));
      }
    }
  };

  const convertDebugText = async () => {
    if (isTauri()) {
      try {
        const result = await invoke<string>("convert_text", { text: input });
        setOutput(result);
        const direction = detectDirection(input);
        setConvertedDirection(
          direction === "en-to-ua" ? "English \u2192 \u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430" : "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430 \u2192 English",
        );
      } catch (error) {
        setRuntime((current) => ({
          ...current,
          lastStatus: { kind: "error", message: String(error) },
        }));
      }
    } else {
      const direction = detectDirection(input);
      setOutput(convertLayout(input, direction));
      setConvertedDirection(
        direction === "en-to-ua" ? "English \u2192 \u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430" : "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430 \u2192 English",
      );
    }
  };

  const copyResult = async () => {
    if (!output) return;

    try {
      if (isTauri()) {
        await writeText(output);
      } else {
        await navigator.clipboard.writeText(output);
      }

      setRuntime((current) => ({
        ...current,
        lastStatus: { kind: "success", message: "Debug result copied" },
      }));
    } catch (error) {
      setRuntime((current) => ({
        ...current,
        lastStatus: { kind: "error", message: String(error) },
      }));
    }
  };

  const isRunning = runtime.backgroundActive && runtime.shortcutRegistered;

  return (
    <main className="app-shell">
      <div className="title-bar">
        <span className="title-bar-text">Layout Fixer</span>
        <div className="title-bar-controls">
          <button type="button" aria-label="Minimize" tabIndex={-1}>_</button>
        </div>
      </div>

      {/* Header */}
      <div className="group-box">
        <span className="group-box-label">Layout Fixer</span>
        <div className="header-area">
          <div className="header-left">
            <h1>Layout Fixer</h1>
            <p className="tagline">Fix wrong keyboard layouts with one shortcut</p>
          </div>
          <span className={`status-badge ${isRunning ? "running" : "error"}`}>
            <span className={`status-dot ${isRunning ? "on" : "off"}`} />
            {isRunning ? "Running" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Shortcut */}
      <div className="group-box">
        <span className="group-box-label">Shortcut</span>
        <div className="shortcut-display">
          <kbd>{runtime.shortcut}</kbd>
        </div>
        <p className="shortcut-hint">
          Select text in any app and press the shortcut.
        </p>
        {runtime.lastStatus.message && (
          <div className={`operation-status ${runtime.lastStatus.kind}`} role="status">
            {runtime.lastStatus.message}
          </div>
        )}
      </div>

      {/* Layouts */}
      {layouts.length > 0 && (
        <div className="group-box">
          <span className="group-box-label">Layouts</span>
          <ul className="layout-list">
            {layouts.map((layout) => (
              <li key={layout.id} className="layout-item">
                <span className="layout-name">{layout.name}</span>
                <button
                  type="button"
                  className={`layout-toggle ${layout.enabled ? "enabled" : "disabled"}`}
                  onClick={() => void toggleLayout(layout.id)}
                >
                  {layout.enabled ? "ON" : "OFF"}
                </button>
              </li>
            ))}
          </ul>
          {layouts.filter((l) => l.enabled).length === 0 && (
            <p className="shortcut-hint" style={{ marginTop: 6 }}>
              No layouts enabled. Conversion will not work.
            </p>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="group-box">
        <span className="group-box-label">Settings</span>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.restoreClipboard}
            onChange={(e) =>
              void saveSettings({ ...settings, restoreClipboard: e.target.checked })
            }
          />
          <span>Restore previous clipboard after conversion</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.showSettingsOnStartup}
            onChange={(e) =>
              void saveSettings({ ...settings, showSettingsOnStartup: e.target.checked })
            }
          />
          <span>Show settings window on startup</span>
        </label>
      </div>

      {/* Test converter */}
      <div className="group-box">
        <span className="group-box-label">Test Conversion</span>
        <label htmlFor="source">Input</label>
        <textarea
          id="source"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type or paste text, e.g. Ghbdtn"
          spellCheck={false}
        />
        <div className="actions">
          <button type="button" onClick={() => void convertDebugText()}>
            Convert
          </button>
          <button
            type="button"
            onClick={() => void copyResult()}
            disabled={!output}
          >
            Copy Result
          </button>
        </div>
        {output && (
          <div className="result-box" aria-live="polite">
            <span className="result-label">{convertedDirection}</span>
            <p className="result-value">{output}</p>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div className="group-box">
        <span className="group-box-label">Privacy</span>
        <ul className="privacy-list">
          <li>Works locally on your machine</li>
          <li>No cloud, no servers</li>
          <li>No tracking or analytics</li>
          <li>Your text is never sent anywhere</li>
        </ul>
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <div className="status-bar-left">
          <span>v0.1.0</span>
          <span className="status-separator" />
          <span>{isMac ? "macOS" : navigator.platform.includes("Win") ? "Windows" : "Linux"}</span>
        </div>
        <div className="status-bar-right">
          <span>{isTauri() ? "Tauri" : "Browser"}</span>
        </div>
      </div>
    </main>
  );
}
