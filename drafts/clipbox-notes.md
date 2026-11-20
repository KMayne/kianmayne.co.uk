# Clipbox write-up: notes to write from

Raw material for the post at `public/blog/clipbox/index.html`. Nothing here is published (only
`public/` is served). Facts are from the `KMayne/clipbox` repo as of 19 Nov 2026.

## Your brief (from Hestie, "Write up Clipbox")

> Lead with privacy: free conversions, all local, nothing uploaded. Show it in DevTools network
> tab / offline. List the conversions people search for.

Goal of the post: show off what you built, in an accessible, fun way, and leave the reader with
something valuable.

Possible "something valuable" for the reader, beyond "here's my app":
- **How to check whether any "free online converter" uploads your file** (Network tab, airplane
  mode). That's a skill they keep even if they never use Clipbox.
- A bookmarkable tool that replaces a dozen sketchy converter sites.

## One-liners (from the README and homepage)

- "Paste anything and see what it is."
- "Paste anything (text, JSON, CSV, images, files) and inspect it in the browser."
- "No backend: everything runs in your browser, and pastes are kept on this device."

## Privacy facts you can stand behind

- **No backend.** The app is static files. A search of the source finds no third-party hosts
  being called; the only external URLs are links (GitHub, your site, the Nord theme credit).
- **Works offline.** A service worker caches the app; the heavy modules (PDF, video, HEIC…)
  download from the same site the first time they're needed, and Settings → Modules can
  download them all up front for offline use.
- **History stays on the device**: IndexedDB, 7-day expiry by default, adjustable or off in
  Settings → History. "Clear all" wipes it.
- **Playlists are never fetched**: even an HLS playlist full of URLs is only parsed, nothing it
  names is requested.
- JWT verification keys are a "secret" setting, never shown in labels or results.

### The DIY proof (for the "check it yourself" section)

1. Open `kianmayne.co.uk/clipbox/` and let it load.
2. Open DevTools (F12) → Network tab. Clear it.
3. Drop in something chunky: a video to trim, an iPhone HEIC photo, a big CSV.
4. Watch the Network tab: no request carries your file. (The first time a format needs a module
   you'll see that module's code download from kianmayne.co.uk: code coming *to* you, not your
   data going out. Worth saying explicitly, or pre-download modules before recording.)
5. Bonus: turn on airplane mode and do it again. It still works.

A screen recording of steps 3–5 would be the hero visual for this section.

## Conversions people search for (all done locally in Clipbox)

Images
- HEIC/HEIF → JPG / PNG / WebP (iPhone photos)
- Convert between PNG, JPEG and WebP (also strips metadata), resize, rotate/flip
- Open TIFF, PSD, TGA, PCX, EMF/WMF as images; multi-page TIFF → PNGs
- Read a QR code / barcode from an image
- Image → data URL / base64; extract a colour palette

Audio and video
- Trim audio or video (with a trim bar on the player; fast or exact cut)
- Crop a video (draw a box on the player; 16:9, 9:16, 1:1… presets)
- Convert video to WebM (VP9, AV1 or VP8)
- Convert audio to MP3, M4A/AAC, Ogg/Opus, FLAC or WAV
- Extract the audio track from a video (no re-encode)
- Normalise loudness (EBU R128, e.g. to -14 LUFS for streaming)
- Grab a video frame as PNG; read media metadata/tags

Documents
- Extract images or text from a PDF; PDF page as PNG
- Extract images or text from a PowerPoint (.pptx)
- Excel/ODS sheet → CSV or JSON
- Email (.eml): attachments, body as text/Markdown, Received chain

Data (the developer crowd)
- JSON ↔ CSV, JSON ↔ YAML, XML → JSON, NDJSON ↔ JSON
- CSV → SQL INSERTs, CSV → Markdown table
- JSON → TypeScript types
- Format / minify JSON and XML
- jq and JSONPath queries, Group by / Count by
- HTML → Markdown / plain text; Markdown → HTML; extract tables to CSV
- SQLite file → tables as CSV/JSON, schema as SQL

Small things you paste every day
- Decode a JWT (and verify its signature)
- Base64 encode/decode, URL encode/decode, HTML entities
- Unix timestamp ↔ readable date, any time zone
- UUID/ULID: reformat, pull out the embedded time
- Strip tracking params (utm_*, fbclid, gclid…) from a URL
- Colour hex ↔ rgb ↔ hsl ↔ oklch, WCAG contrast check
- Hash a file (SHA-256 etc.)

Nerdier
- Open zip, tar.gz, 7z, RAR, ISO; list or pull out files
- Peek inside .exe / ELF / Mach-O: icon, imports, strings, signing certs
- Disassemble WebAssembly to text
- Decode TLS certificates (PEM)

## Other features worth a mention

- **Paste anything**: Ctrl+V, drag and drop, open file, or share to it on Android. It reads
  *every* format on the clipboard and works out what the thing is.
- Installable as an app (PWA); phone layout with bottom navigation.
- Command palette (Ctrl+K), keyboard-driven.
- Colour schemes (Nord default), adjustable text size.
- "Open as…": results become new pastes, so you can chain steps (open a zip → a CSV inside it →
  as JSON → jq).
- Chromium only (Chrome, Edge, Brave…). Worth saying up front.

## Numbers and timeline

- First commit 11 Oct 2026; latest 19 Nov 2026 (trim, crop and WebM conversion).
- ~175 commits, ~50,000 lines of TypeScript.
- ~35 libraries, many of them WebAssembly builds of classic tools: jq, 7-Zip, libarchive,
  libheif, LAME (MP3), FFmpeg's AAC encoder, wabt, SQLite (sql.js), pdf.js.
- 314 unit tests and 54 end-to-end tests (as of mid-October).
- MIT licensed.

## Under the hood (if you want a nerdy section)

- Vite + React + TypeScript; Monaco (VS Code's editor) for code previews, plus VS Code's ML
  language detection.
- Everything heavy runs in a Web Worker so the page never freezes; the UI only fetches the slices
  it shows.
- Formats are lazy-loaded modules, so the first load is small.
- Video/audio via WebCodecs and Mediabunny: the browser's own hardware encoders.
- Type-safety rules: no `as` casts, Zod validation at every trust boundary.

## What's next (from the repo's TODO)

- A node graph for chaining transformations visually (in the README as "planned").
- Archives: password-protected zips, nested archives in place, streaming huge files.
- Image cropping (reusing the video crop overlay).

## Structure the page currently suggests

1. Hook (privacy-first)
2. Hero screenshot + "Try Clipbox" button
3. Why I built it
4. Nothing leaves your browser (+ check-it-yourself, + recording)
5. Things you've probably Googled
6. Under the hood (optional)
7. What's next
8. Poll: what should I write up next?

All headings are suggestions: rename, reorder or drop them.
