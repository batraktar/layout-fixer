# Contributing

Thanks for your interest in Layout Fixer!

## Getting started

```bash
npm install
npm run tauri dev
```

## Running checks

```bash
npm run typecheck
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Adding a new layout

1. Create a JSON file in `src-tauri/layouts/` following the format of `en-us__uk-ua.json`
2. Register the layout in `src-tauri/src/layouts.rs` by adding it to `load_bundled_layouts()`
3. Add corresponding TypeScript mappings in `src/lib/layouts.ts` (for debug/fallback mode)
4. Add tests for the new layout in `src/test/`

## Pull requests

- Keep PRs small and focused
- One feature or fix per PR
- Run all checks before submitting
- Include a clear description of what changed and why

## Issues

- Check existing issues before creating a new one
- Use the bug report or feature request template
- Include steps to reproduce for bugs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
