use std::collections::HashMap;

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
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

pub fn load_bundled_layouts() -> Vec<LayoutConfig> {
    let json = include_str!("../layouts/en-us__uk-ua.json");
    let config: LayoutConfig =
        serde_json::from_str(json).expect("Failed to parse bundled layout JSON");
    vec![config]
}

pub fn build_maps(config: &LayoutConfig) -> LayoutMaps {
    let from_chars: Vec<char> = config.latin_keys.chars().collect();
    let to_chars: Vec<char> = config.native_keys.chars().collect();

    assert_eq!(
        from_chars.len(),
        to_chars.len(),
        "Layout {} has mismatched key counts",
        config.id
    );

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

    LayoutMaps { forward, reverse }
}
