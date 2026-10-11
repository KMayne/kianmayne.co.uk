/*
 * Takes the project screenshots shown on the homepage (public/images/<name>.jpg).
 *
 *   cd scripts/screenshots && npm install && npx playwright install chromium
 *   npm run screenshots                        # against http://localhost:8080
 *   npm run screenshots -- https://kianmayne.co.uk
 *
 * Each page is captured in a small viewport at 2x pixel density: the UI looks
 * large in a homepage card but stays sharp.
 */
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? 'http://localhost:8080').replace(/\/$/, '');
const OUT = path.resolve(import.meta.dirname, '../../public/images');

// Output is SCALE times each shot's viewport (CSS pixels). Smaller viewports make the UI look
// bigger; keep them 16:10 to match the homepage cards.
const SCALE = 2;

const SAMPLE_JSON = JSON.stringify({
  mission: 'Artemis II',
  launch: '2026-04-01T22:35:00Z',
  crew: [
    { name: 'Reid Wiseman', role: 'Commander' },
    { name: 'Victor Glover', role: 'Pilot' },
    { name: 'Christina Koch', role: 'Mission Specialist' },
    { name: 'Jeremy Hansen', role: 'Mission Specialist' },
  ],
  vehicle: { rocket: 'SLS Block 1', capsule: 'Orion' },
  durationDays: 10,
});

const shots = [
  {
    name: 'clipbox',
    path: '/clipbox/',
    viewport: { width: 640, height: 400 },
    async prepare(page) {
      // Paste some JSON so the screenshot shows more than the empty state
      await page.evaluate(text => navigator.clipboard.writeText(text), SAMPLE_JSON);
      await page.locator('body').click({ position: { x: 320, y: 200 } });
      await page.keyboard.press('Control+V');
      await page.getByText('durationDays').waitFor();
      await page.mouse.move(0, 399); // no hover highlight on the tree
    },
  },
  {
    name: 'moon-sim',
    // A fixed, paused moment with a near-full Moon, so reruns give the same picture
    path: '/moon-sim/?loc=tromso&t=2026-10-26T20:00Z&speed=1&paused=1',
    viewport: { width: 880, height: 550 }, // narrower and its opening camera shot doesn't fit
    async prepare(page) {
      await page.waitForTimeout(4000); // let the textures and atmosphere load
    },
  },
];

const browser = await chromium.launch({
  // Software WebGL, so moon-sim also renders on machines without a GPU
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: SCALE,
    colorScheme: 'dark',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));

  await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
  await shot.prepare(page);
  const file = path.join(OUT, `${shot.name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 80 });

  console.log(`${shot.name}: ${path.relative(process.cwd(), file)}`);
  for (const e of errors) console.warn(`  ! ${e}`);
  await context.close();
}

await browser.close();
