const BLOCKED_SHORTCUTS: &[&str] = &[
    // Windows system
    "Ctrl+C",
    "Ctrl+V",
    "Ctrl+X",
    "Ctrl+Z",
    "Ctrl+Y",
    "Ctrl+A",
    "Ctrl+S",
    "Ctrl+P",
    "Ctrl+N",
    "Ctrl+O",
    "Ctrl+W",
    "Ctrl+F",
    "Ctrl+H",
    "Ctrl+R",
    "Ctrl+T",
    "Ctrl+Tab",
    "Ctrl+Shift+Tab",
    "Ctrl+Alt+Delete",
    "Alt+Tab",
    "Alt+F4",
    "Win+L",
    "Win+D",
    "Win+E",
    "Win+R",
    "Win+I",
    "Win+Space",
    // macOS system
    "Cmd+C",
    "Cmd+V",
    "Cmd+X",
    "Cmd+Z",
    "Cmd+Y",
    "Cmd+A",
    "Cmd+S",
    "Cmd+P",
    "Cmd+N",
    "Cmd+O",
    "Cmd+W",
    "Cmd+F",
    "Cmd+H",
    "Cmd+R",
    "Cmd+T",
    "Cmd+Q",
    "Cmd+M",
    "Cmd+Space",
    "Cmd+Tab",
    "Cmd+Shift+Tab",
    "Cmd+Option+Escape",
    "Cmd+Shift+3",
    "Cmd+Shift+4",
    "Cmd+Shift+5",
    "Cmd+Shift+6",
    // Chrome / browser
    "Ctrl+Shift+N",
    "Ctrl+Shift+T",
    "Ctrl+Shift+Delete",
    "Ctrl+Shift+I",
    "Ctrl+Shift+J",
    "Ctrl+Shift+C",
    "Ctrl+Shift+R",
    "Ctrl+Shift+P",
    "Ctrl+Shift+G",
    "Cmd+Shift+N",
    "Cmd+Shift+T",
    "Cmd+Shift+Delete",
    "Cmd+Shift+I",
    "Cmd+Shift+J",
    "Cmd+Shift+C",
    "Cmd+Shift+R",
    "Cmd+Shift+P",
    "F5",
    "F11",
    "F12",
    "Ctrl+F5",
    "Ctrl+F12",
    // CommandOrControl variants
    "CommandOrControl+C",
    "CommandOrControl+V",
    "CommandOrControl+X",
    "CommandOrControl+Z",
    "CommandOrControl+Y",
    "CommandOrControl+A",
    "CommandOrControl+S",
    "CommandOrControl+P",
    "CommandOrControl+N",
    "CommandOrControl+O",
    "CommandOrControl+W",
    "CommandOrControl+F",
    "CommandOrControl+H",
    "CommandOrControl+R",
    "CommandOrControl+T",
    "CommandOrControl+Q",
    "CommandOrControl+M",
    "CommandOrControl+Space",
    "CommandOrControl+Tab",
    "CommandOrControl+Shift+N",
    "CommandOrControl+Shift+T",
    "CommandOrControl+Shift+Delete",
    "CommandOrControl+Shift+I",
    "CommandOrControl+Shift+J",
    "CommandOrControl+Shift+C",
    "CommandOrControl+Shift+R",
    "CommandOrControl+Shift+P",
];

pub fn validate_hotkey(hotkey: &str) -> Result<(), String> {
    let trimmed = hotkey.trim();
    if trimmed.is_empty() {
        return Err("Hotkey cannot be empty".into());
    }

    let normalized = normalize_shortcut(trimmed);

    for &blocked in BLOCKED_SHORTCUTS {
        if normalize_shortcut(blocked) == normalized {
            return Err(format!(
                "Hotkey \"{hotkey}\" is reserved. It conflicts with a standard shortcut ({blocked})"
            ));
        }
    }

    let parts: Vec<&str> = trimmed.split('+').collect();
    if parts.len() < 2 {
        return Err(format!(
            "Invalid hotkey \"{hotkey}\": must include at least one modifier and a key (e.g. Ctrl+Shift+L)"
        ));
    }

    let key = parts.last().unwrap().trim();
    if key.is_empty() {
        return Err(format!("Invalid hotkey \"{hotkey}\": missing key after modifier"));
    }

    Ok(())
}

fn normalize_shortcut(s: &str) -> String {
    s.trim()
        .to_lowercase()
        .replace("commandorcontrol", "ctrl")
        .replace("command", "ctrl")
        .replace("meta", "ctrl")
        .replace("ctrl", "ctrl")
        .replace("control", "ctrl")
        .replace("alt", "alt")
        .replace("option", "alt")
        .replace("shift", "shift")
        .replace("win", "ctrl")
        .replace("super", "ctrl")
        .replace(" ", "")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_hotkey_is_invalid() {
        assert!(validate_hotkey("").is_err());
    }

    #[test]
    fn single_key_without_modifier_is_invalid() {
        assert!(validate_hotkey("A").is_err());
        assert!(validate_hotkey("Enter").is_err());
    }

    #[test]
    fn blocked_ctrl_c() {
        let result = validate_hotkey("Ctrl+C");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("reserved"));
    }

    #[test]
    fn blocked_cmd_space() {
        let result = validate_hotkey("Cmd+Space");
        assert!(result.is_err());
    }

    #[test]
    fn blocked_command_or_control_t() {
        let result = validate_hotkey("CommandOrControl+T");
        assert!(result.is_err());
    }

    #[test]
    fn blocked_f5() {
        let result = validate_hotkey("F5");
        assert!(result.is_err());
    }

    #[test]
    fn custom_hotkey_is_valid() {
        assert!(validate_hotkey("Ctrl+Shift+L").is_ok());
    }

    #[test]
    fn ctrl_alt_letter_is_valid() {
        assert!(validate_hotkey("Ctrl+Alt+K").is_ok());
    }

    #[test]
    fn ctrl_shift_l_not_in_blocklist() {
        assert!(validate_hotkey("CommandOrControl+Shift+L").is_ok());
    }
}
