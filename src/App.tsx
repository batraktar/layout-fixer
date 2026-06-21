import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { convertLayout } from "./lib/convertLayout";
import { detectDirection } from "./lib/detectDirection";
import { t, type Language } from "./lib/i18n";

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
  language: Language;
  theme: "light" | "dark";
}

interface ClipboardEntry {
  text: string;
  timestamp: number;
  source: string;
}

const isMac = navigator.userAgent.includes("Mac");
const defaultShortcut = isMac ? "\u2318 \u21E7 L" : "Ctrl + Shift + L";

const defaultSettings: AppSettings = {
  restoreClipboard: true,
  showSettingsOnStartup: false,
  disabledLayouts: [],
  language: "en",
  theme: "light",
};

export default function App() {
  const [input, setInput] = useState("Ghbdsn");
  const [output, setOutput] = useState("");
  const [convertedDirection, setConvertedDirection] = useState("");
  const [layouts, setLayouts] = useState<LayoutInfo[]>([]);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardEntry[]>([]);
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

  const lang = settings.language;

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

    void invoke<ClipboardEntry[]>("get_clipboard_history")
      .then((h) => {
        if (!disposed) setClipboardHistory(h);
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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(settings.theme);
  }, [settings.theme]);

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

  const refreshHistory = async () => {
    if (isTauri()) {
      try {
        const h = await invoke<ClipboardEntry[]>("get_clipboard_history");
        setClipboardHistory(h);
      } catch {}
    }
  };

  const clearHistory = async () => {
    if (isTauri()) {
      try {
        await invoke("clear_clipboard_history");
        setClipboardHistory([]);
      } catch {}
    }
  };

  const copyFromHistory = async (text: string) => {
    try {
      if (isTauri()) {
        await invoke("copy_from_history", { text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setRuntime((current) => ({
        ...current,
        lastStatus: { kind: "success", message: t(lang, "clipboardHistoryCopied") },
      }));
    } catch (error) {
      setRuntime((current) => ({
        ...current,
        lastStatus: { kind: "error", message: String(error) },
      }));
    }
  };

  const convertDebugText = async () => {
    if (isTauri()) {
      try {
        const result = await invoke<string>("convert_text", { text: input });
        setOutput(result);
        const direction = detectDirection(input);
        setConvertedDirection(direction === "en-to-ua" ? t(lang, "enToUa") : t(lang, "uaToEn"));
      } catch (error) {
        setRuntime((current) => ({
          ...current,
          lastStatus: { kind: "error", message: String(error) },
        }));
      }
    } else {
      const direction = detectDirection(input);
      setOutput(convertLayout(input, direction));
      setConvertedDirection(direction === "en-to-ua" ? t(lang, "enToUa") : t(lang, "uaToEn"));
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
        lastStatus: { kind: "success", message: t(lang, "debugCopied") },
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
        <span className="title-bar-text">{t(lang, "appName")}</span>
        <div className="title-bar-controls">
          <button type="button" aria-label="Minimize" tabIndex={-1}>_</button>
        </div>
      </div>

      {/* Header */}
      <div className="group-box">
        <span className="group-box-label">{t(lang, "appName")}</span>
        <div className="header-area">
          <div className="header-left">
            <h1>{t(lang, "appName")}</h1>
            <p className="tagline">{t(lang, "tagline")}</p>
          </div>
          <span className={`status-badge ${isRunning ? "running" : "error"}`}>
            <span className={`status-dot ${isRunning ? "on" : "off"}`} />
            {isRunning ? t(lang, "running") : t(lang, "inactive")}
          </span>
        </div>
      </div>

      {/* Shortcut */}
      <div className="group-box">
        <span className="group-box-label">{t(lang, "shortcutLabel")}</span>
        <div className="shortcut-display">
          <kbd>{runtime.shortcut}</kbd>
        </div>
        <p className="shortcut-hint">{t(lang, "shortcutHint")}</p>
        {runtime.lastStatus.message && (
          <div className={`operation-status ${runtime.lastStatus.kind}`} role="status">
            {runtime.lastStatus.message}
          </div>
        )}
      </div>

      {/* Layouts */}
      {layouts.length > 0 && (
        <div className="group-box">
          <span className="group-box-label">{t(lang, "layouts")}</span>
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
              {t(lang, "noLayoutsEnabled")}
            </p>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="group-box">
        <span className="group-box-label">{t(lang, "settings")}</span>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.restoreClipboard}
            onChange={(e) =>
              void saveSettings({ ...settings, restoreClipboard: e.target.checked })
            }
          />
          <span>{t(lang, "restoreClipboard")}</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.showSettingsOnStartup}
            onChange={(e) =>
              void saveSettings({ ...settings, showSettingsOnStartup: e.target.checked })
            }
          />
          <span>{t(lang, "showOnStartup")}</span>
        </label>
        <div className="select-row">
          <span className="select-label">{t(lang, "interfaceLanguage")}</span>
          <select
            className="win95-select"
            value={settings.language}
            onChange={(e) =>
              void saveSettings({ ...settings, language: e.target.value as Language })
            }
          >
            <option value="en">English</option>
            <option value="uk">\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430</option>
          </select>
        </div>
        <div className="select-row">
          <span className="select-label">{t(lang, "theme")}</span>
          <select
            className="win95-select"
            value={settings.theme}
            onChange={(e) =>
              void saveSettings({ ...settings, theme: e.target.value as "light" | "dark" })
            }
          >
            <option value="light">{t(lang, "themeLight")}</option>
            <option value="dark">{t(lang, "themeDark")}</option>
          </select>
        </div>
      </div>

      {/* Test converter */}
      <div className="group-box">
        <span className="group-box-label">{t(lang, "testConversion")}</span>
        <label htmlFor="source">{t(lang, "inputLabel")}</label>
        <textarea
          id="source"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t(lang, "inputPlaceholder")}
          spellCheck={false}
        />
        <div className="actions">
          <button type="button" onClick={() => void convertDebugText()}>
            {t(lang, "convert")}
          </button>
          <button
            type="button"
            onClick={() => void copyResult()}
            disabled={!output}
          >
            {t(lang, "copyResult")}
          </button>
        </div>
        {output && (
          <div className="result-box" aria-live="polite">
            <span className="result-label">{convertedDirection}</span>
            <p className="result-value">{output}</p>
          </div>
        )}
      </div>

      {/* Clipboard History */}
      <div className="group-box">
        <span className="group-box-label">{t(lang, "clipboardHistory")}</span>
        {clipboardHistory.length === 0 ? (
          <p className="shortcut-hint">{t(lang, "clipboardHistoryEmpty")}</p>
        ) : (
          <>
            <ul className="history-list">
              {[...clipboardHistory].reverse().map((entry, i) => (
                <li
                  key={`${entry.timestamp}-${i}`}
                  className="history-item"
                  onClick={() => void copyFromHistory(entry.text)}
                  title={t(lang, "clipboardHistoryCopied")}
                >
                  <span className={`history-badge ${entry.source}`}>
                    {entry.source === "original" ? t(lang, "original") : t(lang, "converted")}
                  </span>
                  <span className="history-text">{entry.text}</span>
                </li>
              ))}
            </ul>
            <div className="actions" style={{ marginTop: 6 }}>
              <button type="button" onClick={() => void clearHistory()}>
                {t(lang, "clipboardHistoryClear")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Privacy */}
      <div className="group-box">
        <span className="group-box-label">{t(lang, "privacy")}</span>
        <ul className="privacy-list">
          <li>{t(lang, "privacyLocal")}</li>
          <li>{t(lang, "privacyNoCloud")}</li>
          <li>{t(lang, "privacyNoTracking")}</li>
          <li>{t(lang, "privacyNoSend")}</li>
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
