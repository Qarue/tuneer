# Tuneer

Tuneer is a professional, privacy-first toolkit for document, text, and media utilities that run entirely in the browser. Every feature is implemented with modern web APIs, ensuring fast performance without sending files or data to a server.

## Tech Stack

- **Framework**: React 19 + Vite (TypeScript)
- **UI**: Mantine component library, Tailwind utility layer, Tabler icons
- **State**: Zustand (persisted color scheme toggle)
- **Tooling**: ESLint (type-aware), Prettier, Vitest + Testing Library, Playwright E2E tests

## Getting Started

```bash
npm install
npm run dev
```

The app starts on [http://localhost:5173](http://localhost:5173).

## Available Scripts

- `npm run dev` – Start the Vite dev server
- `npm run build` – Type-check and produce an optimized production build
- `npm run preview` – Preview the built app locally
- `npm run lint` – Run ESLint with the custom flat config
- `npm run typecheck` – Strict TypeScript compilation without emit
- `npm run test` / `test:watch` / `test:coverage` – Vitest unit tests and coverage
- `npm run e2e` / `e2e:ui` – Playwright end-to-end test suites
- `npm run format` / `format:fix` – Prettier with Tailwind-aware ordering

## Project Structure

```
src/
  app/          # App shell, routing, layout, providers, registry
  components/   # Reusable UI elements (e.g., theme toggle)
  features/     # Domain-specific tools (Base64 and future modules)
  state/        # Zustand stores
  styles/       # Global Tailwind entrypoint and tokens
```

## Current Features

- **Base64 Encode / Decode** – Runs in a dedicated worker, supports copy, swap, and metrics.

Additional PDF and media tooling will be added incrementally using the same modular structure.

## Testing & Quality

- Unit coverage for critical utilities with Vitest
- Playwright smoke tests for key user journeys
- Type-aware ESLint rules with automatic import sorting and Tailwind linting

## Licensing

This project is currently private. Ensure that any third-party packages comply with your licensing requirements before release.
