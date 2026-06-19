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

const isMac = navigator.userAgent.includes("Mac");
const defaultShortcut = isMac ? "⌘ ⇧ L" : "Ctrl + Shift + L";

export default function App() {
  const [input, setInput] = useState("Ghbdsn");
  const [output, setOutput] = useState("");
  const [convertedDirection, setConvertedDirection] = useState("");
  const [layouts, setLayouts] = useState<LayoutInfo[]>([]);
  const [runtime, setRuntime] = useState<RuntimeStatus>({
    backgroundActive: isTauri(),
    shortcut: defaultShortcut,
    shortcutRegistered: false,
    lastStatus: {
      kind: "info",
      message: isTauri() ? "Loading background status…" : "Browser debug mode",
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

  const convertDebugText = async () => {
    if (isTauri()) {
      try {
        const result = await invoke<string>("convert_text", { text: input });
        setOutput(result);
        const direction = detectDirection(input);
        setConvertedDirection(
          direction === "en-to-ua" ? "English → Українська" : "Українська → English",
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
        direction === "en-to-ua" ? "English → Українська" : "Українська → English",
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

  return (
    <main className="app-shell">
      <header className="settings-header">
        <div>
          <p className="eyebrow">BACKGROUND UTILITY</p>
          <h1>Layout Fixer</h1>
        </div>
        <span
          className={`health-dot ${runtime.shortcutRegistered ? "active" : "inactive"}`}
          aria-hidden="true"
        />
      </header>

      <section className="status-card" aria-label="Application status">
        <div className="status-row">
          <span>Status</span>
          <strong>
            {runtime.backgroundActive && runtime.shortcutRegistered
              ? "Running in background"
              : "Shortcut unavailable"}
          </strong>
        </div>
        <div className="status-row">
          <span>Shortcut</span>
          <kbd>{runtime.shortcut}</kbd>
        </div>
        {layouts.length > 0 && (
          <div className="status-row">
            <span>Layouts</span>
            <strong>{layouts.filter((l) => l.enabled).length} active</strong>
          </div>
        )}
        <p className={`operation-status ${runtime.lastStatus.kind}`} role="status">
          {runtime.lastStatus.message}
        </p>
      </section>

      <section className="debug-panel" aria-label="Debug converter">
        <div className="section-heading">
          <div>
            <h2>Debug converter</h2>
            <p>The main workflow does not require this window.</p>
          </div>
        </div>

        <label htmlFor="source">Test input</label>
        <textarea
          id="source"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="For example: Ghbdsn"
          spellCheck={false}
        />

        <div className="actions">
          <button type="button" onClick={() => void convertDebugText()}>
            Convert
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => void copyResult()}
            disabled={!output}
          >
            Copy result
          </button>
        </div>

        {output && (
          <div className="result" aria-live="polite">
            <span>{convertedDirection}</span>
            <p>{output}</p>
          </div>
        )}
      </section>

      <p className="usage-hint">
        Select text in any app, then press <strong>{runtime.shortcut}</strong>.
        Closing this window keeps Layout Fixer running in the tray.
      </p>
    </main>
  );
}
