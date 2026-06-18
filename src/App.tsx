import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  readText,
  writeText,
} from "@tauri-apps/plugin-clipboard-manager";
import {
  register,
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import { convertLayout } from "./lib/convertLayout";
import { detectDirection } from "./lib/detectDirection";

const isMac = navigator.userAgent.includes("Mac");
const shortcut = isMac ? "Command+Shift+L" : "Control+Shift+L";
const shortcutLabel = isMac ? "⌘ ⇧ L" : "Ctrl + Shift + L";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function App() {
  const [input, setInput] = useState("Ghbdsn");
  const [status, setStatus] = useState(
    isTauri() ? "Гарячий клавіш реєструється…" : "Браузерний режим",
  );
  const output = useMemo(() => convertLayout(input), [input]);
  const direction = useMemo(() => detectDirection(input), [input]);

  const convertClipboard = useCallback(async (pasteBack: boolean) => {
    try {
      setStatus(pasteBack ? "Копіювання виділеного тексту…" : "Читання буфера…");

      if (pasteBack) {
        await invoke("simulate_copy");
        await sleep(160);
      }

      const original = await readText();
      const converted = convertLayout(original);
      await writeText(converted);

      if (pasteBack) {
        await sleep(80);
        await invoke("simulate_paste");
      }

      setInput(original);
      setStatus(
        pasteBack
          ? "Текст виправлено та вставлено"
          : "Конвертований текст записано в буфер",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Помилка: ${message}`);
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let active = true;

    register(shortcut, (event) => {
      if (event.state === "Released" && active) {
        void convertClipboard(true);
      }
    })
      .then(() => {
        if (active) setStatus(`Готово: ${shortcutLabel}`);
      })
      .catch((error: unknown) => {
        if (active) setStatus(`Не вдалося зареєструвати shortcut: ${String(error)}`);
      });

    return () => {
      active = false;
      void unregister(shortcut);
    };
  }, [convertClipboard]);

  const copyManualResult = async () => {
    try {
      if (isTauri()) {
        await writeText(output);
      } else {
        await navigator.clipboard.writeText(output);
      }
      setStatus("Результат записано в буфер");
    } catch (error) {
      setStatus(`Помилка буфера: ${String(error)}`);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">LOCAL · PRIVATE · FAST</p>
          <h1>Layout Fixer</h1>
          <p className="subtitle">
            Виправляє текст, набраний не тією розкладкою. Дані не залишають
            ваш комп’ютер.
          </p>
        </div>
        <div className="shortcut" aria-label={`Гарячий клавіш ${shortcutLabel}`}>
          {shortcutLabel}
        </div>
      </section>

      <section className="workspace" aria-label="Ручна перевірка конвертації">
        <label htmlFor="source">Введений текст</label>
        <textarea
          id="source"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Наприклад: Ghbdsn"
          spellCheck={false}
        />

        <div className="direction">
          {direction === "en-to-ua" ? "English → Українська" : "Українська → English"}
        </div>

        <label htmlFor="result">Результат</label>
        <textarea id="result" value={output} readOnly spellCheck={false} />

        <div className="actions">
          <button type="button" onClick={() => void copyManualResult()}>
            Копіювати результат
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => void convertClipboard(false)}
            disabled={!isTauri()}
          >
            Конвертувати буфер
          </button>
        </div>
      </section>

      <p className="status" role="status">{status}</p>
      <p className="hint">
        Виділіть текст в іншій програмі та натисніть <strong>{shortcutLabel}</strong>.
      </p>
    </main>
  );
}
