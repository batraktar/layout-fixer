export type Language = "en" | "uk";

interface Translations {
  appName: string;
  tagline: string;
  running: string;
  inactive: string;
  shortcutLabel: string;
  shortcutHint: string;
  layouts: string;
  noLayoutsEnabled: string;
  settings: string;
  restoreClipboard: string;
  showOnStartup: string;
  interfaceLanguage: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  testConversion: string;
  inputLabel: string;
  inputPlaceholder: string;
  convert: string;
  copyResult: string;
  enToUa: string;
  uaToEn: string;
  privacy: string;
  privacyLocal: string;
  privacyNoCloud: string;
  privacyNoTracking: string;
  privacyNoSend: string;
  debugCopied: string;
}

const en: Translations = {
  appName: "Layout Fixer",
  tagline: "Fix wrong keyboard layouts with one shortcut",
  running: "Running",
  inactive: "Inactive",
  shortcutLabel: "Shortcut",
  shortcutHint: "Select text in any app and press the shortcut.",
  layouts: "Layouts",
  noLayoutsEnabled: "No layouts enabled. Conversion will not work.",
  settings: "Settings",
  restoreClipboard: "Restore previous clipboard after conversion",
  showOnStartup: "Show settings window on startup",
  interfaceLanguage: "Interface language",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  testConversion: "Test Conversion",
  inputLabel: "Input",
  inputPlaceholder: "Type or paste text, e.g. Ghbdtn",
  convert: "Convert",
  copyResult: "Copy Result",
  enToUa: "English \u2192 Ukrainian",
  uaToEn: "Ukrainian \u2192 English",
  privacy: "Privacy",
  privacyLocal: "Works locally on your machine",
  privacyNoCloud: "No cloud, no servers",
  privacyNoTracking: "No tracking or analytics",
  privacyNoSend: "Your text is never sent anywhere",
  debugCopied: "Debug result copied",
};

const uk: Translations = {
  appName: "Layout Fixer",
  tagline: "\u0412\u0438\u043f\u0440\u0430\u0432\u043b\u044f\u0454 \u043d\u0435\u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0443 \u0440\u043e\u0437\u043a\u043b\u0430\u0434\u043a\u0443 \u0437\u0430 \u043e\u0434\u043d\u0438\u043c \u0441\u0442\u043e\u0440\u043e\u0442\u043d\u0438\u043a\u043e\u043c",
  running: "\u041f\u0440\u0430\u0446\u044e\u0454",
  inactive: "\u0412\u0438\u043c\u043a\u043d\u0435\u043d\u043e",
  shortcutLabel: "\u0421\u0442\u043e\u0440\u0442\u043e\u0432\u0438\u0439 \u043a\u043e\u043c\u0431\u0456\u043d\u0430\u0446\u0456\u044f",
  shortcutHint: "\u0412\u0438\u0434\u0456\u043b\u0456\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0432 \u0431\u0443\u0434\u044f-\u044f\u043a\u043e\u043c\u0443 \u0434\u043e\u0434\u0430\u0442\u043a\u0443 \u0456 \u043d\u0430\u0442\u0438\u0441\u043d\u0456\u0442\u044c \u0441\u0442\u043e\u0440\u0442\u043e\u0432\u0438\u0439 \u043a\u043e\u043c\u0431\u0456\u043d\u0430\u0446\u0456\u044e.",
  layouts: "\u0420\u043e\u0437\u043a\u043b\u0430\u0434\u043a\u0438",
  noLayoutsEnabled: "\u0416\u043e\u0434\u043d\u0430 \u0440\u043e\u0437\u043a\u043b\u0430\u0434\u043a\u0430 \u043d\u0435 \u0443\u0432\u0456\u043c\u043a\u043d\u0435\u043d\u043e. \u041a\u043e\u043d\u0432\u0435\u0440\u0442\u0430\u0446\u0456\u044f \u043d\u0435 \u043f\u0440\u0430\u0446\u044e\u0432\u0430\u0442\u0438\u043c\u0435.",
  settings: "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f",
  restoreClipboard: "\u0412\u0456\u0434\u043d\u043e\u0432\u043b\u044e\u0432\u0430\u0442\u0438 \u043f\u043e\u043f\u0435\u0440\u0435\u0434\u043d\u0456\u0439 \u0431\u0443\u0444\u0435\u0440 \u043e\u0431\u043c\u0456\u043d\u0443 \u043f\u0456\u0441\u043b\u044f \u043a\u043e\u043d\u0432\u0435\u0440\u0442\u0430\u0446\u0456\u0457",
  showOnStartup: "\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u043a\u043d\u043e \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u044c \u043f\u0440\u0438 \u0437\u0430\u043f\u0443\u0441\u043a\u0443",
  interfaceLanguage: "\u041c\u043e\u0432\u0430 \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443",
  theme: "\u0422\u0435\u043c\u0430",
  themeLight: "\u0421\u0432\u0456\u0442\u043b\u0430",
  themeDark: "\u0422\u0435\u043c\u043d\u0430",
  testConversion: "\u0422\u0435\u0441\u0442 \u043a\u043e\u043d\u0432\u0435\u0440\u0442\u0430\u0446\u0456\u0457",
  inputLabel: "\u0412\u0432\u0456\u0434",
  inputPlaceholder: "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0430\u0431\u043e \u0432\u0441\u0442\u0430\u0432\u0442\u0435 \u0442\u0435\u043a\u0441\u0442, \u043d\u0430\u043f\u0440. Ghbdtn",
  convert: "\u041a\u043e\u043d\u0432\u0435\u0440\u0442\u0443\u0432\u0430\u0442\u0438",
  copyResult: "\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  enToUa: "English \u2192 \u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
  uaToEn: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430 \u2192 English",
  privacy: "\u041a\u043e\u043d\u0444\u0456\u0434\u0435\u043d\u0446\u0456\u0439\u043d\u0456\u0441\u0442\u044c",
  privacyLocal: "\u041f\u0440\u0430\u0446\u044e\u0454 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u043d\u0430 \u0432\u0430\u0448\u043e\u043c\u0443 \u043f\u0440\u0438\u0441\u0442\u0440\u043e\u0457",
  privacyNoCloud: "\u0411\u0435\u0437 \u043e\u0431\u043b\u0430\u043a\u043d\u0443, \u0431\u0435\u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u0456\u0432",
  privacyNoTracking: "\u0411\u0435\u0437 \u0432\u0456\u0434\u0441\u043b\u0456\u0436\u043a\u0438 \u0442\u0430 \u0430\u043d\u0430\u043b\u0456\u0442\u0438\u043a\u0438",
  privacyNoSend: "\u0412\u0430\u0448 \u0442\u0435\u043a\u0441\u0442 \u043d\u0456\u043a\u043e\u043b\u0438 \u043d\u0435 \u043d\u0430\u0434\u0441\u0438\u043b\u0430\u0454\u0442\u044c\u0441\u044f",
  debugCopied: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e",
};

const translations: Record<Language, Translations> = { en, uk };

export function t(lang: Language, key: keyof Translations): string {
  return translations[lang]?.[key] ?? translations.en[key];
}

export default translations;
