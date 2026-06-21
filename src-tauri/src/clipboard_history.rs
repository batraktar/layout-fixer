use std::path::Path;

use serde::{Deserialize, Serialize};

const HISTORY_FILE: &str = "clipboard_history.json";
#[allow(dead_code)]
const DEFAULT_MAX_ITEMS: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardEntry {
    pub text: String,
    pub timestamp: u64,
    pub source: String,
}

pub fn history_path(app_data_dir: &Path) -> std::path::PathBuf {
    app_data_dir.join(HISTORY_FILE)
}

pub fn load_history(path: &Path) -> Vec<ClipboardEntry> {
    match std::fs::read_to_string(path) {
        Ok(content) => match serde_json::from_str::<Vec<ClipboardEntry>>(&content) {
            Ok(history) => history,
            Err(e) => {
                eprintln!("Warning: invalid clipboard history file, using empty: {e}");
                Vec::new()
            }
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Vec::new(),
        Err(e) => {
            eprintln!("Warning: cannot read clipboard history: {e}");
            Vec::new()
        }
    }
}

pub fn save_history(path: &Path, history: &[ClipboardEntry]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create history dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(history)
        .map_err(|e| format!("Cannot serialize history: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("Cannot write history: {e}"))
}

pub fn add_entry(
    history: &mut Vec<ClipboardEntry>,
    text: &str,
    source: &str,
    max_items: usize,
) {
    if text.is_empty() {
        return;
    }

    // Don't add duplicates of the most recent entry
    if let Some(last) = history.last() {
        if last.text == text {
            return;
        }
    }

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    history.push(ClipboardEntry {
        text: text.to_string(),
        timestamp,
        source: source.to_string(),
    });

    // Trim to max items (remove oldest)
    while history.len() > max_items {
        history.remove(0);
    }
}

pub fn clear_history(path: &Path) -> Result<(), String> {
    save_history(path, &[])
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    use std::path::PathBuf;

    #[test]
    fn add_entry_stores_text() {
        let mut history = Vec::new();
        add_entry(&mut history, "hello", "test", 10);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].text, "hello");
        assert_eq!(history[0].source, "test");
    }

    #[test]
    fn add_entry_skips_empty() {
        let mut history = Vec::new();
        add_entry(&mut history, "", "test", 10);
        assert!(history.is_empty());
    }

    #[test]
    fn add_entry_skips_duplicate_of_last() {
        let mut history = Vec::new();
        add_entry(&mut history, "hello", "test", 10);
        add_entry(&mut history, "hello", "test", 10);
        assert_eq!(history.len(), 1);
    }

    #[test]
    fn add_entry_trims_to_max() {
        let mut history = Vec::new();
        for i in 0..10 {
            add_entry(&mut history, &format!("item {i}"), "test", 5);
        }
        assert_eq!(history.len(), 5);
        assert_eq!(history[0].text, "item 5");
    }

    #[test]
    fn round_trip_history() {
        let dir = std::env::temp_dir().join("layout_fixer_test_history");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join(HISTORY_FILE);

        let mut history = Vec::new();
        add_entry(&mut history, "hello world", "conversion", 50);
        add_entry(&mut history, "привіт", "manual", 50);

        save_history(&path, &history).unwrap();
        let loaded = load_history(&path);

        assert_eq!(loaded.len(), 2);
        assert_eq!(loaded[0].text, "hello world");
        assert_eq!(loaded[1].text, "привіт");

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn missing_file_returns_empty() {
        let path = PathBuf::from("/nonexistent/history.json");
        let history = load_history(&path);
        assert!(history.is_empty());
    }
}
