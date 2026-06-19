use std::path::PathBuf;

use serde::{Deserialize, Serialize};

const SETTINGS_FILE: &str = "settings.json";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub restore_clipboard: bool,
    pub show_settings_on_startup: bool,
    pub disabled_layouts: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            restore_clipboard: true,
            show_settings_on_startup: false,
            disabled_layouts: Vec::new(),
        }
    }
}

pub fn settings_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join(SETTINGS_FILE)
}

pub fn load_settings(path: &PathBuf) -> AppSettings {
    match std::fs::read_to_string(path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

pub fn save_settings(path: &PathBuf, settings: &AppSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Cannot create settings dir: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(settings).map_err(|e| format!("Cannot serialize settings: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("Cannot write settings: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn default_settings_are_sensible() {
        let s = AppSettings::default();
        assert!(s.restore_clipboard);
        assert!(!s.show_settings_on_startup);
        assert!(s.disabled_layouts.is_empty());
    }

    #[test]
    fn round_trip_settings() {
        let dir = std::env::temp_dir().join("layout_fixer_test_settings");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join(SETTINGS_FILE);

        let mut settings = AppSettings::default();
        settings.restore_clipboard = false;
        settings.show_settings_on_startup = true;
        settings.disabled_layouts.push("en-us__uk-ua".into());

        save_settings(&path, &settings).unwrap();
        let loaded = load_settings(&path);

        assert!(!loaded.restore_clipboard);
        assert!(loaded.show_settings_on_startup);
        assert_eq!(loaded.disabled_layouts, vec!["en-us__uk-ua"]);

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn missing_file_returns_defaults() {
        let path = PathBuf::from("/nonexistent/settings.json");
        let settings = load_settings(&path);
        assert_eq!(settings, AppSettings::default());
    }
}
