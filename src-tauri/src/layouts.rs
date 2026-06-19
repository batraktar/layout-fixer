use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutConfig {
    pub id: String,
    pub name: String,
    pub from: String,
    pub to: String,
    pub latin_keys: String,
    pub native_keys: String,
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub struct LayoutMaps {
    pub forward: HashMap<char, char>,
    pub reverse: HashMap<char, char>,
}

pub fn load_bundled_layouts() -> Result<Vec<LayoutConfig>, String> {
    let json = include_str!("../layouts/en-us__uk-ua.json");
    let config: LayoutConfig =
        serde_json::from_str(json).map_err(|e| format!("Failed to parse bundled layout JSON: {e}"))?;
    Ok(vec![config])
}

pub fn build_maps(config: &LayoutConfig) -> Result<LayoutMaps, String> {
    let from_chars: Vec<char> = config.latin_keys.chars().collect();
    let to_chars: Vec<char> = config.native_keys.chars().collect();

    if from_chars.len() != to_chars.len() {
        return Err(format!(
            "Layout '{}' has mismatched key counts: {} latin vs {} native",
            config.id,
            from_chars.len(),
            to_chars.len()
        ));
    }

    let mut forward = HashMap::new();
    let mut reverse = HashMap::new();

    for (&from, &to) in from_chars.iter().zip(to_chars.iter()) {
        forward.insert(from, to);
        reverse.insert(to, from);

        if from.is_ascii_alphabetic() && to.is_alphabetic() {
            forward.insert(from.to_ascii_uppercase(), to.to_uppercase().next().unwrap_or(to));
            reverse.insert(to.to_uppercase().next().unwrap_or(to), from.to_ascii_uppercase());
        }
    }

    Ok(LayoutMaps { forward, reverse })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_bundled_layout_json() {
        let layouts = load_bundled_layouts().expect("bundled layout should parse");
        assert_eq!(layouts.len(), 1);

        let config = &layouts[0];
        assert_eq!(config.id, "en-us__uk-ua");
        assert_eq!(config.from, "en");
        assert_eq!(config.to, "uk");
        assert!(config.enabled);

        let latin_count = config.latin_keys.chars().count();
        let native_count = config.native_keys.chars().count();
        assert_eq!(latin_count, native_count, "key counts must match");
        assert_eq!(latin_count, 34, "EN↔UA layout should have 34 key pairs");
    }

    #[test]
    fn build_maps_from_bundled_layout() {
        let layouts = load_bundled_layouts().unwrap();
        let config = &layouts[0];
        let maps = build_maps(config).expect("build_maps should succeed");

        assert_eq!(maps.forward[&'g'], 'п');
        assert_eq!(maps.forward[&'G'], 'П');
        assert_eq!(maps.forward[&'h'], 'р');
        assert_eq!(maps.forward[&'b'], 'и');
        assert_eq!(maps.forward[&'d'], 'в');
        assert_eq!(maps.forward[&'s'], 'і');
        assert_eq!(maps.forward[&'t'], 'е');
        assert_eq!(maps.forward[&'n'], 'т');

        assert_eq!(maps.reverse[&'п'], 'g');
        assert_eq!(maps.reverse[&'р'], 'h');
        assert_eq!(maps.reverse[&'т'], 'n');
        assert_eq!(maps.reverse[&'і'], 's');
    }

    #[test]
    fn ghbdtn_converts_to_privet() {
        let layouts = load_bundled_layouts().unwrap();
        let config = &layouts[0];
        let maps = build_maps(config).unwrap();

        let input = "Ghbdtn";
        let result: String = input
            .chars()
            .map(|c| maps.forward.get(&c).copied().unwrap_or(c))
            .collect();
        assert_eq!(result, "Привет");
    }

    #[test]
    fn ghbdsn_converts_to_privit() {
        let layouts = load_bundled_layouts().unwrap();
        let config = &layouts[0];
        let maps = build_maps(config).unwrap();

        let input = "Ghbdsn";
        let result: String = input
            .chars()
            .map(|c| maps.forward.get(&c).copied().unwrap_or(c))
            .collect();
        assert_eq!(result, "Привіт");
    }

    #[test]
    fn mismatched_key_counts_return_error() {
        let config = LayoutConfig {
            id: "bad".into(),
            name: "Bad".into(),
            from: "en".into(),
            to: "xx".into(),
            latin_keys: "abc".into(),
            native_keys: "абвг".into(),
            enabled: true,
        };
        let result = build_maps(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("mismatched"));
    }
}
