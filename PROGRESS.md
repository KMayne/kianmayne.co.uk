# Progress: hosting clipbox and moon-sim on kianmayne.co.uk

_Last updated 2026-10-11, branch `add-projects`._

## Goal

Serve two Vite/React apps from this site, all from one DigitalOcean App Platform app:

| URL | Source |
| --- | --- |
| `kianmayne.co.uk/` | this repo (`public/`) |
| `kianmayne.co.uk/clipbox/` | `KMayne/clipbox`, built with `BASE_PATH=/clipbox/` |
| `kianmayne.co.uk/moon-sim/` | `KMayne/moon-sim`, built with `BASE_PATH=/moon-sim/` |

Each app is a separate static-site component that builds from its own repo and redeploys on push to its `main`. DO strips the `/clipbox` and `/moon-sim` prefixes before forwarding, which is why each app is built with a matching Vite `base`. The spec is in [`.do/app.yaml`](.do/app.yaml).

## Done (this branch)

- **Site moved into `public/`.** DO builds and serves only that folder (`source_dir: public`; the html buildpack needs `index.html` at the top of the source dir, so `output_dir` alone fails), so `.do/`, `scripts/` and this file aren't published.
- **Homepage**
  - Smaller avatar and titles, and a JetBrains Mono body font.
  - A left-aligned "Projects" section with a screenshot card for each app. The cards open in a new tab.
  - The social icons moved to a small, dimmed footer, and the GitHub icon's missing alt text is fixed.
- **`.do/app.yaml`**: three static sites plus ingress rules.
- **`scripts/screenshots/`**: a Playwright script that regenerates `public/images/{clipbox,moon-sim}.jpg`. It shoots a small viewport at 2× scale so the UI looks big in the cards, and pins moon-sim to a fixed moment with a near-full Moon.

## State of the app repos (as of writing)

These aren't on this branch. They're tracked here because the deploy depends on them.

**clipbox** (`~/Repos/clipbox`, remote `KMayne/clipbox`)
- Subpath support committed in `5a52bbf`:
  - `base: process.env.BASE_PATH` in `vite.config.ts`.
  - The service worker and `modules-manifest.json` resolve relative to the base.
  - Verified that the SW registers with scope `/clipbox/` and works offline.
- Credit at the bottom of the Pastes pane: "KianMayne.co.uk ↗" (links to `/` under `BASE_PATH`) and a GitHub "Source" link, both opening in a new tab, at 4.5:1 contrast or better in every scheme.
- Colour schemes are merged: Nord is the default, with a switcher in Settings → Appearance.
- `"engines": { "node": ">=24" }` is declared (`9462b33`); a clean clone builds on Node 24 with `BASE_PATH=/clipbox/`.
- `main` is pushed to GitHub, and each push redeploys `/clipbox/`. Keep unfinished work off `main`.

**moon-sim** (`~/Repos/moon-sim`)
- Already supported `BASE_PATH`, so no subpath changes were needed.
- Credit in a footer at the bottom of the sidebar (`450b795`); `0ff872a` makes it a "KianMayne.co.uk" link that opens in a new tab, with an arrow icon.
- Small-viewport fix committed in `b7b19d8`: the opening shot no longer throws at 640×400.
- Remote `KMayne/moon-sim` is set up and `main` is pushed.
- The GitHub Pages workflow has been removed.

## Next steps

1. **~~Fill in the DO spec.~~** Done 2026-10-11: matches the live app (`website`, `www` primary with the apex as an alias, and the existing `kianmayne-co-uk` component name kept so DO doesn't recreate it). `doctl apps spec validate` passes. Clipbox now declares `engines.node >=24` and builds cleanly on Node 24 from a fresh clone.
2. **~~Deploy.~~** Done 2026-10-11. DO has GitHub access to both app repos, the spec is applied, and deployment `eadadbef` is active. Fixes on the way:
   - The homepage uses `source_dir: public`, because `output_dir` alone left the html buildpack with no `index.html` to detect.
   - moon-sim uses pnpm only: DO refuses to build a repo with both `package-lock.json` and `pnpm-lock.yaml`.
   - Checked live: `/`, `www`, `/clipbox/`, `/clipbox` and `/moon-sim/` return 200, `/.do/app.yaml` returns 404, the clipbox SW scope is `/clipbox/`, and a browser load shows no errors or failed requests.
3. **Re-apply the spec** so moon-sim's live `build_command` reads `pnpm run build` like `.do/app.yaml` (the live one is still `npm run build`, which also works):
   ```sh
   doctl apps update 6cbcf2a4-6327-4e74-8c9d-db0d5de68b3d --spec .do/app.yaml
   ```
4. **Check the cost** in the dashboard: three static-site components in one app, alongside the account's other apps.
5. **Retake the screenshots** once both credits are live. Optionally drop moon-sim's viewport to 640×400 in `scripts/screenshots/screenshots.mjs`, now that `b7b19d8` makes that size work.

## Local preview (copies the DO routing)

```sh
# from a scratch dir
mkdir -p preview && cp -r <this repo>/public/* preview/
(cd ~/Repos/clipbox  && BASE_PATH=/clipbox/  pnpm exec vite build --outDir "$PWD/../preview/clipbox"  --emptyOutDir)
(cd ~/Repos/moon-sim && BASE_PATH=/moon-sim/ npx vite build --outDir "$PWD/../preview/moon-sim" --emptyOutDir)
python3 -m http.server 8080 -d preview   # then open http://localhost:8080/
```

Adjust the `--outDir` paths to wherever `preview/` lives; Vite's `--outDir` can be any absolute path. Building into a separate folder leaves each app's own `dist/` untouched.

Screenshots: `cd scripts/screenshots && npm install && npx playwright install chromium && npm run screenshots`. With the preview running, it reads from `http://localhost:8080` by default.
