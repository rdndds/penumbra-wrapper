# Agent Guide

This file orients coding agents to the Antumbra GUI repo. Keep changes aligned with existing conventions.

## Quick Context
- App type: Tauri desktop app with a React + TypeScript frontend.
- Frontend entry points: `src/main.tsx`, `src/App.tsx`.
- Tauri backend: `src-tauri/` (Rust + config).
- UI styling: Tailwind CSS in `src/index.css` and component className strings.

## Build, Lint, and Run
- Install deps: `npm install`.
- Web dev server: `npm run dev` (Vite).
- Production build: `npm run build` (TypeScript build mode + Vite build).
- Preview build: `npm run preview`.
- Lint: `npm run lint` (ESLint).
- Tauri dev: `npm run tauri:dev`.
- Tauri build: `npm run tauri:build` (uses env vars in script).

## Tests
- There is no test runner configured (no `test` script, no Vitest/Jest deps).
- Single-test workflow is therefore not available yet.
- If you introduce tests, also add an npm script and document the single-test command here.

## Repo Structure
- `src/components/`: shared UI components.
- `src/pages/`: routed pages (Dashboard, Flasher, Tools).
- `src/hooks/`: reusable hooks and providers.
- `src/store/`: Zustand stores for UI, device, operations, etc.
- `src/services/`: API layer, dialogs, operations, and utilities.
- `src/types/`: shared TypeScript types.
- `src/assets/` and `public/`: static assets.
- `dist/`: Vite build output (generated).

## Lint Rules You Must Respect
- ESLint is configured in `eslint.config.js`.
- Restricted imports:
  - Do not import `@tauri-apps/api/core` directly; use the API layer in `src/services/api/`.
  - Do not import `@tauri-apps/plugin-dialog` directly; use `FileDialogService` in `src/services/dialogs/`.
  - Exceptions are only in `src/services/api/**` and `src/services/dialogs/**`.

## TypeScript Configuration Notes
- `strict: true` is enabled for app and node configs.
- `noUnusedLocals` and `noUnusedParameters` are enforced.
- `noUncheckedSideEffectImports` is enabled; keep side-effect imports minimal and explicit.
- `verbatimModuleSyntax` is enabled; prefer `import type` for type-only imports.
- `moduleResolution: "bundler"` with `allowImportingTsExtensions`.

## Code Style Guidelines

### Imports
- Prefer type-only imports: `import type { AppError } from '../types';`.
- Keep import paths relative to module boundary conventions already used.
- Preserve local file ordering if it has an established pattern.

### Formatting
- Existing files use 2-space indentation.
- Semicolon usage is mixed (some files with, some without). Preserve the style of the file you touch.
- Keep JSX formatting readable; break long props onto multiple lines.
- Tailwind className strings are the primary styling mechanism.

### Naming
- Components: `PascalCase` (e.g., `LogPanel`).
- Hooks: `useX` with `camelCase` names (e.g., `useSettings`).
- Utilities and functions: `camelCase`.
- Types and interfaces: `PascalCase`.
- File names: follow existing naming (mostly `PascalCase` for components, `camelCase` for hooks/utils).

### Types and Data Flow
- Prefer `unknown` in `catch` and narrow via helpers (see `ErrorHandler`).
- Use the centralized API services in `src/services/api/` for Tauri invokes.
- Use Zustand stores for shared state (`src/store/`).
- Avoid non-null assertions unless already established and justified.

### Error Handling
- Use `ErrorHandler.handle(...)` for consistent toast/log behavior.
- For Windows-specific suggestions, use `WindowsErrorHandler.getErrorSuggestion(...)`.
- When calling Tauri, wrap failures and report via `ErrorHandler` rather than raw `console.error`.

### UI and Tailwind
- Tailwind is the standard for styling (`src/index.css` defines base styles).
- Use the `cn` helper in `src/lib/utils.ts` to merge classes.
- Keep UI consistent with the existing dark Zinc palette unless the design explicitly changes.

### Comments and Docs
- Only add comments for non-obvious logic.
- Keep JSDoc-style comments on shared services when they provide real value.

## API and Service Layer Conventions
- Tauri invocations live in `src/services/api/*` classes (e.g., `DeviceApi`).
- Dialog access goes through `src/services/dialogs/fileDialogService.ts`.
- Utility functions live under `src/services/utils/`.
- `ErrorHandler` is the canonical way to surface errors and add operation logs.

## State Management
- Zustand stores are used for device state, UI state, and operations.
- Update store state via defined actions; avoid ad-hoc state mutation.
- When adding store fields, update any derived logic in hooks that read the store.

## Routing
- `src/App.tsx` sets up routes for `/`, `/flasher`, and `/tools`.
- Add new pages in `src/pages/` and wire them in `src/App.tsx`.

## Tailwind/CSS
- Base Tailwind layers are defined in `src/index.css`.
- Prefer Tailwind utilities over custom CSS; add custom CSS only when utilities are insufficient.
- Animation keyframes live in `src/index.css` (e.g., `modalEnter`, `shimmer`).

## Quality Checklist Before You Finish
- Lint passes: `npm run lint`.
- Build passes for web UI: `npm run build`.
- Tauri build/dev only if you touched native-facing code.

## Cursor/Copilot Rules
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot rules found in `.github/copilot-instructions.md`.

## If You Add Tests
- Add a `test` script to `package.json`.
- Document the single-test command here (e.g., by file path or test name).

## When in Doubt
- Follow established patterns in the nearest file.
- Keep UI consistent with existing layouts and styling.
- Prefer small, well-scoped changes.
