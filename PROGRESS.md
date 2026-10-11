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

- **Site moved into `public/`.** DO serves only that folder (`output_dir: public`), so `.do/`, `scripts/` and this file aren't published.
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
- Credit on `main` (`09feb2e`): a faint "KianMayne.co.uk ↗" at the bottom of the Pastes pane, opening in a new tab. Under `BASE_PATH` it links to `/`. It always renders.
- Nord colour scheme and a scheme switcher in Settings are on **`feat/theme-switcher`** (`7c8d378`), **not merged yet**. That branch was cut before the credit commits, and `main` still uses Gruvbox. Merge it if the deployed app should be Nord.
- ⚠️ **Nothing is pushed to GitHub yet.** Local `main` is well ahead of `origin/main`, so push before deploying.

**moon-sim** (`~/Repos/moon-sim`)
- Already supported `BASE_PATH`, so no subpath changes were needed.
- "by Kian Mayne" credit committed in `450b795`, as a footer at the bottom of the sidebar.
- Small-viewport fix committed in `b7b19d8`: the opening shot no longer throws at 640×400.
- ⚠️ **No git remote is configured.** Create `KMayne/moon-sim` on GitHub and push `main` before DO can build it.
- ⚠️ `.github/workflows/deploy.yml` (GitHub Pages) was restored. Delete it once you've committed to DigitalOcean; that change was left for you to confirm.
- Its credit only renders when `BASE_URL !== '/'`, whereas clipbox's always renders. The wording differs too ("by Kian Mayne" vs "KianMayne.co.uk ↗"). Decide whether to make them match.

## Next steps

1. **Push the app repos:** clipbox `main` (merge `feat/theme-switcher` first if you want Nord); moon-sim needs a GitHub repo and a remote first.
2. **Fill in the DO spec.** `name: kianmayne-co-uk` and `region: lon` in `.do/app.yaml` are guesses. Copy the real values from the existing app (Settings → App Spec, or `doctl apps spec get <id>`).
3. **Grant the DigitalOcean GitHub app access** to `clipbox` and `moon-sim`.
4. **Check the cost.** Make sure the Starter tier covers three static-site components in one app.
5. **Apply the spec before (or together with) merging this branch to `main`.** The live app currently serves the repo root, so merging the move into `public/` first would break the homepage.
   ```sh
   doctl apps update <app-id> --spec .do/app.yaml   # or paste it into the dashboard
   ```
6. **If clipbox's build fails on Node,** add `"engines": { "node": ">=24" }` to its `package.json` (CI uses 24). Moon-sim declares `>=26`.
7. **Verify the live site:**
   - `/`, `/clipbox/`, `/moon-sim/` and `/clipbox` (no slash) load with no 404s.
   - `/.do/app.yaml` returns 404.
   - The clipbox SW scope is `/clipbox/`.
   - A push to one repo redeploys only its component.
8. **Retake the screenshots** once both credits are live. Optionally drop moon-sim's viewport to 640×400 in `scripts/screenshots/screenshots.mjs`, now that `b7b19d8` makes that size work.

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
