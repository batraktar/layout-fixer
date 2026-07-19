#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    path::PathBuf,
    sync::{atomic::{AtomicBool, Ordering}, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

mod clipboard_history;
mod hotkey_validator;
mod layouts;
mod settings;

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Serialize;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State, WebviewWindow, WindowEvent,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const GLOBAL_SHORTCUT: &str = "CommandOrControl+Shift+L";

#[cfg(target_os = "macos")]
const SHORTCUT_LABEL: &str = "⌘ ⇧ L";

#[cfg(not(target_os = "macos"))]
const SHORTCUT_LABEL: &str = "Ctrl + Shift + L";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OperationStatus {
    kind: String,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    background_active: bool,
    shortcut: &'static str,
    shortcut_registered: bool,
    last_status: OperationStatus,
}

struct AppState {
    operation_in_progress: AtomicBool,
    shortcut_registered: AtomicBool,
    last_status: Mutex<OperationStatus>,
    layout_configs: Mutex<Vec<layouts::LayoutConfig>>,
    layout_maps: Mutex<Vec<(String, layouts::LayoutMaps)>>,
    app_settings: Mutex<settings::AppSettings>,
    settings_path: Mutex<PathBuf>,
    clipboard_history: Mutex<Vec<clipboard_history::ClipboardEntry>>,
    history_path: Mutex<PathBuf>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            operation_in_progress: AtomicBool::new(false),
            shortcut_registered: AtomicBool::new(false),
            last_status: Mutex::new(OperationStatus {
                kind: "info".into(),
                message: "Running in the background".into(),
            }),
            layout_configs: Mutex::new(Vec::new()),
            layout_maps: Mutex::new(Vec::new()),
            app_settings: Mutex::new(settings::AppSettings::default()),
            settings_path: Mutex::new(PathBuf::new()),
            clipboard_history: Mutex::new(Vec::new()),
            history_path: Mutex::new(PathBuf::new()),
        }
    }
}

enum ClipboardBackup {
    Text(String),
    Image {
        rgba: Vec<u8>,
        width: u32,
        height: u32,
    },
    Unsupported,
}

#[derive(Clone, Copy)]
enum ConversionDirection {
    EnglishToUkrainian,
    UkrainianToEnglish,
}

fn send_shortcut(key: char) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;

    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    enigo
        .key(modifier, Direction::Press)
        .map_err(|error| error.to_string())?;

    let click_result = enigo.key(Key::Unicode(key), Direction::Click);
    let release_result = enigo.key(modifier, Direction::Release);

    click_result.map_err(|error| error.to_string())?;
    release_result.map_err(|error| error.to_string())?;

    Ok(())
}

fn detect_direction(text: &str) -> ConversionDirection {
    const UKRAINIAN_LETTERS: &str = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя";

    let mut latin_count = 0;
    let mut ukrainian_count = 0;

    for character in text.chars() {
        if character.is_ascii_alphabetic() {
            latin_count += 1;
            continue;
        }

        if character
            .to_lowercase()
            .any(|lowercase| UKRAINIAN_LETTERS.contains(lowercase))
        {
            ukrainian_count += 1;
        }
    }

    if ukrainian_count > latin_count {
        ConversionDirection::UkrainianToEnglish
    } else {
        ConversionDirection::EnglishToUkrainian
    }
}

fn convert_with_maps(text: &str, maps: &layouts::LayoutMaps) -> String {
    text.chars()
        .map(|character| {
            if let Some(&target) = maps.forward.get(&character) {
                return target;
            }
            if character.is_uppercase() {
                if let Some(lowercase) = character.to_lowercase().next() {
                    if let Some(&target) = maps.forward.get(&lowercase) {
                        return target.to_uppercase().next().unwrap_or(target);
                    }
                }
            }
            character
        })
        .collect()
}

fn convert_layout(text: &str, state: &AppState) -> (String, ConversionDirection) {
    let direction = detect_direction(text);

    let maps_guard = state.layout_maps.lock().unwrap();
    let config_guard = state.layout_configs.lock().unwrap();

    for (config, (_id, maps)) in config_guard.iter().zip(maps_guard.iter()) {
        if !config.enabled {
            continue;
        }

        let converted = match direction {
            ConversionDirection::EnglishToUkrainian if config.from == "en" && config.to == "uk" => {
                convert_with_maps(text, maps)
            }
            ConversionDirection::UkrainianToEnglish if config.from == "en" && config.to == "uk" => {
                let reversed = layouts::LayoutMaps {
                    forward: maps.reverse.clone(),
                    reverse: maps.forward.clone(),
                };
                convert_with_maps(text, &reversed)
            }
            _ => continue,
        };

        return (converted, direction);
    }

    (text.to_string(), direction)
}

fn capture_clipboard(app: &AppHandle) -> ClipboardBackup {
    if let Ok(text) = app.clipboard().read_text() {
        return ClipboardBackup::Text(text);
    }

    if let Ok(image) = app.clipboard().read_image() {
        return ClipboardBackup::Image {
            rgba: image.rgba().to_vec(),
            width: image.width(),
            height: image.height(),
        };
    }

    ClipboardBackup::Unsupported
}

fn restore_clipboard(app: &AppHandle, backup: ClipboardBackup) -> Result<(), String> {
    match backup {
        ClipboardBackup::Text(text) => app
            .clipboard()
            .write_text(text)
            .map_err(|error| error.to_string()),
        ClipboardBackup::Image {
            rgba,
            width,
            height,
        } => app
            .clipboard()
            .write_image(&Image::new_owned(rgba, width, height))
            .map_err(|error| error.to_string()),
        ClipboardBackup::Unsupported => app.clipboard().clear().map_err(|error| error.to_string()),
    }
}

fn unique_clipboard_marker() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    format!("__LAYOUT_FIXER_SELECTION_{timestamp}__")
}

fn replace_selected_text(app: &AppHandle) -> Result<ConversionDirection, String> {
    // Let the physical shortcut modifiers return to the released state first.
    thread::sleep(Duration::from_millis(80));

    let backup = capture_clipboard(app);
    let marker = unique_clipboard_marker();

    app.clipboard()
        .write_text(&marker)
        .map_err(|error| format!("Cannot access the clipboard: {error}"))?;

    if let Err(error) = send_shortcut('c') {
        let _ = restore_clipboard(app, backup);
        return Err(format!("Copy failed. Check input permissions: {error}"));
    }

    thread::sleep(Duration::from_millis(180));

    let selected_text = match app.clipboard().read_text() {
        Ok(text) => text,
        Err(error) => {
            let _ = restore_clipboard(app, backup);
            return Err(format!("Selected content is not text: {error}"));
        }
    };

    if selected_text == marker || selected_text.is_empty() {
        let _ = restore_clipboard(app, backup);
        return Err("No text is selected".into());
    }

    let state = app.state::<AppState>();
    let (converted, direction) = convert_layout(&selected_text, &state);

    if let Err(error) = app.clipboard().write_text(&converted) {
        let _ = restore_clipboard(app, backup);
        return Err(format!("Cannot write converted text: {error}"));
    }

    thread::sleep(Duration::from_millis(70));

    if let Err(error) = send_shortcut('v') {
        let _ = restore_clipboard(app, backup);
        return Err(format!("Paste failed. Check input permissions: {error}"));
    }

    // Most applications consume paste synchronously. The delay avoids restoring
    // the clipboard before slower applications have read the converted text.
    thread::sleep(Duration::from_millis(350));

    let should_restore = app
        .state::<AppState>()
        .app_settings
        .lock()
        .map(|s| s.restore_clipboard)
        .unwrap_or(true);

    if should_restore {
        restore_clipboard(app, backup)?;
    }

    // Save to clipboard history
    let state = app.state::<AppState>();
    let max_items = 50;
    if let Ok(mut history) = state.clipboard_history.lock() {
        clipboard_history::add_entry(&mut history, &selected_text, "original", max_items);
        clipboard_history::add_entry(&mut history, &converted, "converted", max_items);
        if let Ok(path) = state.history_path.lock() {
            let _ = clipboard_history::save_history(&path, &history);
        }
    }

    Ok(direction)
}

fn publish_status(app: &AppHandle, kind: &str, message: impl Into<String>) {
    let status = OperationStatus {
        kind: kind.into(),
        message: message.into(),
    };

    if let Ok(mut last_status) = app.state::<AppState>().last_status.lock() {
        *last_status = status.clone();
    }

    let _ = app.emit("operation-status", status);
}

fn run_conversion(app: AppHandle) {
    let state = app.state::<AppState>();
    if state.operation_in_progress.swap(true, Ordering::AcqRel) {
        return;
    }

    thread::spawn(move || {
        publish_status(&app, "info", "Converting selected text…");

        match replace_selected_text(&app) {
            Ok(ConversionDirection::EnglishToUkrainian) => {
                publish_status(&app, "success", "Replaced text: English → Ukrainian");
            }
            Ok(ConversionDirection::UkrainianToEnglish) => {
                publish_status(&app, "success", "Replaced text: Ukrainian → English");
            }
            Err(error) => publish_status(&app, "error", error),
        }

        app.state::<AppState>()
            .operation_in_progress
            .store(false, Ordering::Release);
    });
}

fn show_settings(window: &WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let shortcut_ready = app
        .state::<AppState>()
        .shortcut_registered
        .load(Ordering::Acquire);
    let status_text = if shortcut_ready {
        format!("Active · {SHORTCUT_LABEL}")
    } else {
        format!("Shortcut unavailable · {SHORTCUT_LABEL}")
    };
    let status = MenuItem::with_id(
        app,
        "status",
        status_text,
        false,
        None::<&str>,
    )?;
    let open = MenuItem::with_id(app, "open", "Open Settings", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Layout Fixer", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&status, &open, &separator, &quit])?;

    let mut tray = TrayIconBuilder::with_id("layout-fixer-tray")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Layout Fixer");

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    #[cfg(target_os = "macos")]
    {
        tray = tray.icon_as_template(true);
    }

    tray.on_menu_event(|app, event| match event.id().as_ref() {
        "open" => {
            if let Some(window) = app.get_webview_window("main") {
                show_settings(&window);
            }
        }
        "quit" => app.exit(0),
        _ => {}
    })
    .build(app)?;

    Ok(())
}

fn setup_settings_window(app: &mut tauri::App) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    if let Some(window) = app.get_webview_window("main") {
        let handle = window.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = handle.hide();
            }
        });
    }

    Ok(())
}

fn setup_window_event_handler(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.on_window_event(|window, event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            if window.label() == "main" {
                api.prevent_close();
                let _ = window.hide();
            }
        }
    })
}

fn setup_global_shortcut(app: &tauri::App) {
    let registration = app.global_shortcut().on_shortcut(
        GLOBAL_SHORTCUT,
        |app, _shortcut, event| {
            if event.state == ShortcutState::Released {
                run_conversion(app.clone());
            }
        },
    );

    match registration {
        Ok(()) => {
            app.state::<AppState>()
                .shortcut_registered
                .store(true, Ordering::Release);
            publish_status(app.handle(), "success", "Background shortcut is active");
        }
        Err(error) => {
            publish_status(
                app.handle(),
                "error",
                format!("Could not register {SHORTCUT_LABEL}: {error}"),
            );
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LayoutInfo {
    id: String,
    name: String,
    enabled: bool,
}

#[tauri::command]
fn runtime_status(state: State<'_, AppState>) -> RuntimeStatus {
    let last_status = state
        .last_status
        .lock()
        .map(|status| status.clone())
        .unwrap_or(OperationStatus {
            kind: "error".into(),
            message: "Status unavailable".into(),
        });

    RuntimeStatus {
        background_active: true,
        shortcut: SHORTCUT_LABEL,
        shortcut_registered: state.shortcut_registered.load(Ordering::Acquire),
        last_status,
    }
}

#[tauri::command]
fn convert_text(text: String, state: State<'_, AppState>) -> Result<String, String> {
    if text.is_empty() {
        return Ok(String::new());
    }
    let (converted, _direction) = convert_layout(&text, &state);
    Ok(converted)
}

#[tauri::command]
fn list_layouts(state: State<'_, AppState>) -> Vec<LayoutInfo> {
    state
        .layout_configs
        .lock()
        .map(|configs| {
            configs
                .iter()
                .map(|config| LayoutInfo {
                    id: config.id.clone(),
                    name: config.name.clone(),
                    enabled: config.enabled,
                })
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
fn toggle_layout(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut configs = state.layout_configs.lock().map_err(|e| format!("Lock error: {e}"))?;
    let config = configs
        .iter_mut()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Layout not found: {id}"))?;
    config.enabled = !config.enabled;

    let mut maps = state.layout_maps.lock().map_err(|e| format!("Lock error: {e}"))?;
    if config.enabled {
        if !maps.iter().any(|(mid, _)| mid == &id) {
            let new_maps = layouts::build_maps(config).map_err(|e| e)?;
            maps.push((id.clone(), new_maps));
        }
    } else {
        maps.retain(|(mid, _)| mid != &id);
    }

    // Persist disabled layout state
    let mut settings = state.app_settings.lock().map_err(|e| format!("Lock error: {e}"))?;
    if config.enabled {
        settings.disabled_layouts.retain(|lid| lid != &id);
    } else {
        if !settings.disabled_layouts.contains(&id) {
            settings.disabled_layouts.push(id);
        }
    }
    if let Ok(path) = state.settings_path.lock() {
        let _ = settings::save_settings(&path, &settings);
    }

    Ok(())
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> settings::AppSettings {
    state
        .app_settings
        .lock()
        .map(|s| s.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn update_settings(new_settings: settings::AppSettings, state: State<'_, AppState>) -> Result<(), String> {
    let path = state
        .settings_path
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?
        .clone();
    settings::save_settings(&path, &new_settings)?;
    *state.app_settings.lock().map_err(|e| format!("Lock error: {e}"))? = new_settings;
    Ok(())
}

#[tauri::command]
fn get_clipboard_history(state: State<'_, AppState>) -> Vec<clipboard_history::ClipboardEntry> {
    state
        .clipboard_history
        .lock()
        .map(|h| h.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn clear_clipboard_history(state: State<'_, AppState>) -> Result<(), String> {
    let mut history = state
        .clipboard_history
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    history.clear();
    let path = state
        .history_path
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    clipboard_history::clear_history(&path)
}

#[tauri::command]
fn copy_from_history(text: String, app: AppHandle) -> Result<(), String> {
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Cannot copy to clipboard: {e}"))
}

fn main() {
    let builder = tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            runtime_status,
            convert_text,
            list_layouts,
            toggle_layout,
            get_settings,
            update_settings,
            get_clipboard_history,
            clear_clipboard_history,
            copy_from_history
        ]);

    let builder = setup_window_event_handler(builder);

    builder
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir());

            let settings_file = settings::settings_path(&app_data_dir);
            let app_settings = settings::load_settings(&settings_file);

            if let Err(e) = settings::save_settings(&settings_file, &app_settings) {
                eprintln!("Warning: could not save settings: {e}");
            }

            let history_file = clipboard_history::history_path(&app_data_dir);
            let history = clipboard_history::load_history(&history_file);

            let bundled = layouts::load_bundled_layouts().unwrap_or_else(|error| {
                eprintln!("Warning: {error}");
                Vec::new()
            });

            let state = app.state::<AppState>();
            if let Ok(mut path) = state.settings_path.lock() {
                *path = settings_file;
            }
            if let Ok(mut settings) = state.app_settings.lock() {
                *settings = app_settings.clone();
            }
            if let Ok(mut hp) = state.history_path.lock() {
                *hp = history_file;
            }
            if let Ok(mut ch) = state.clipboard_history.lock() {
                *ch = history;
            }

            let mut maps = Vec::new();
            let mut configs = Vec::new();
            for mut config in bundled {
                if app_settings.disabled_layouts.contains(&config.id) {
                    config.enabled = false;
                }
                if config.enabled {
                    match layouts::build_maps(&config) {
                        Ok(m) => maps.push((config.id.clone(), m)),
                        Err(e) => eprintln!("Warning: skipping layout '{}': {e}", config.id),
                    }
                }
                configs.push(config);
            }

            if let Ok(mut lc) = state.layout_configs.lock() {
                *lc = configs;
            }
            if let Ok(mut lm) = state.layout_maps.lock() {
                *lm = maps;
            }

            setup_settings_window(app)?;
            setup_global_shortcut(app);
            setup_tray(app)?;

            if app_settings.show_settings_on_startup {
                if let Some(window) = app.get_webview_window("main") {
                    show_settings(&window);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running layout-fixer");
}
