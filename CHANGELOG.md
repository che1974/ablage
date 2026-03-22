# Changelog

## v0.1.0 (2026-03-23)

### Features
- Project scaffold: Electron 41 + React 19 + TypeScript 5 + Vite
- File watcher with 2s debounce, extension filtering, ignore patterns
- Text extraction: PDF (pdf-parse), DOCX (mammoth), images (filename metadata)
- Rule-based document classifier with confidence scoring
- Three rule types: Keywords, Regex, Extension (file type matching)
- Pipeline: watch → extract → classify → suggest → move with full undo
- SQLite storage for rules, history, watch folders, settings
- System tray with dynamic menu, pause/resume, daily stats
- Native + in-app notifications with Accept/Skip actions
- Settings UI: watch folders, target folder, rule editor
- Step-by-step rule creation wizard with explanatory hints
- Rule conflict detection (overlapping extensions or keywords)
- Keep subfolder structure option — preserves relative paths when moving
- Optional filename template — files can be moved without renaming
- Onboarding guide on first launch
- User guide tab with usage examples and template reference
- i18n: English (default), Deutsch, Українська, Français
- 16 document types: Invoice, Contract, Payslip, Bank statement, Receipt, Certificate, Letter, Photos, Videos, Audio, Archives, Spreadsheets, Presentations, E-books, Code, Other
- 7 pre-configured rules (disabled by default)
- History with date grouping and hover-reveal undo
- CI/CD: GitHub Actions for macOS (arm64+x64), Windows, Linux builds
- UI based on Stitch design system: light sidebar, tonal layering, Material Symbols, gradient buttons

### Architecture
- Main process: watcher, extractor, classifier, pipeline, mover, database, tray, notifications
- Renderer: React with sidebar navigation, 5 tabs (Folders, Rules, History, Guide, About)
- Shared: TypeScript types, i18n module with 4 locale files
- Preload: secure IPC bridge with contextBridge
