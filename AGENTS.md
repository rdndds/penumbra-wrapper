# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript frontend. Entry points are `src/main.tsx` and `src/App.tsx`.
- `src/components/`, `src/pages/`, `src/hooks/`, `src/services/`, `src/store/`, and `src/types/` keep UI, routing, state, and domain types organized.
- `src/assets/` and `public/` contain static assets used by the UI.
- `src-tauri/` contains the Tauri Rust backend (`src-tauri/src/`) plus configuration in `src-tauri/tauri.conf.json`.
- `dist/` is the Vite build output (generated).

## Build, Test, and Development Commands
- `npm install` installs frontend dependencies.
- `npm run dev` starts the Vite dev server for the web UI.
- `npm run build` runs TypeScript build mode and produces the Vite production bundle.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint across the workspace.
- `npm run tauri:dev` runs the desktop app in development mode.
- `npm run tauri:build` builds the Tauri desktop bundles.

## Coding Style & Naming Conventions
- TypeScript/React is the primary UI stack; prefer functional components and hooks.
- Naming patterns: `PascalCase` for components and pages, `camelCase` for hooks, utilities, and functions, and `kebab-case` for file names when appropriate.
- Keep modules focused and colocate related files in `src/components/` or `src/pages/`.
- Use ESLint to enforce style consistency (`npm run lint`).
- Rust code in `src-tauri/src/` should follow standard `rustfmt` conventions.

## Testing Guidelines
- No automated test suite is currently present. If adding tests, document the framework and add a matching npm script.
- Keep test files in `src/` using `*.test.ts(x)` or `*.spec.ts(x)` naming.

## Commit & Pull Request Guidelines
- Use conventional commit-style messages like `feat:`, `fix:`, `ci:`, `docs:`, `revert:`, or `cleanup`.
- Pull requests should include a concise summary, relevant issue links, and screenshots for UI changes.
- Note any build or platform-specific considerations for Tauri (Windows/macOS/Linux).

## Security & Configuration Tips
- Do not commit secrets; keep machine-specific settings out of `src-tauri/tauri.conf.json`.
- When touching native features or file system access, review Tauri capabilities in `src-tauri/capabilities/`.
