use enigo::{Direction, Enigo, Key, Keyboard, Settings};

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

#[tauri::command]
fn simulate_copy() -> Result<(), String> {
    send_shortcut('c')
}

#[tauri::command]
fn simulate_paste() -> Result<(), String> {
    send_shortcut('v')
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![simulate_copy, simulate_paste])
        .run(tauri::generate_context!())
        .expect("error while running layout-fixer");
}
