# Prompt Library

A personal Next.js app for saving, organizing, searching, copying, and optimizing reusable prompts.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## GitHub Pages

This app is configured for static export and GitHub Pages. The workflow in `.github/workflows/pages.yml` builds the app and deploys the `out` folder when changes are pushed to `main`.

For a project site, the workflow sets `NEXT_PUBLIC_BASE_PATH` to the repository name automatically.
