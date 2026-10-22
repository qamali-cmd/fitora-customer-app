// apply-theme.js
// Changes the colors of the app to the Fitora logo colors: hot pink (#FC408C), black, and white.
//
// HOW TO USE (it works on your real files and saves a backup first):
//   1. Mobile app: open a terminal in the fitora-customer-app folder (the one with App.js) and run:   node apply-theme.js
//   2. Admin website: open a terminal in the admin-web folder (the one with style.css) and run:       node apply-theme.js
// Running it twice is safe.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const isMobile = fs.existsSync(path.join(root, 'App.js')) && fs.existsSync(path.join(root, 'src'));
const isAdmin = fs.existsSync(path.join(root, 'style.css')) && fs.existsSync(path.join(root, 'index.html'));

if (!isMobile && !isAdmin) {
  console.log('Please run this script inside the fitora-customer-app folder (where App.js is) or inside the admin-web folder (where style.css is).');
  process.exit(1);
}

// ---- the colors we know about (old purple -> new Fitora colors) ----
const EXACT = {
  '#6c5ce7': '#fc408c', // main color
  '#5a4bd4': '#e22e78', // darker main color (button hover)
  '#2b2140': '#111111', // dark text
  '#241c38': '#0d0d0d', // admin sidebar
  '#a29bd6': '#ff8fbb', // small label in the sidebar
  '#a29bfe': '#ff8fbb',
  '#cfcbe0': '#d9d9d9', // menu text in the sidebar
  '#4a4064': '#3a3a3a', // sidebar button border
  '#f1effd': '#ffe8f1', // light tints
  '#edeafb': '#ffe8f1',
  '#f4f2ff': '#fff0f6',
  '#f0eefc': '#fff0f6',
  '#e4e0fb': '#ffd1e3',
  '#d9d4fa': '#ffc2dc',
  '#b8b0f0': '#fda6c6', // disabled buttons
};

function hexToHsl(hex) {
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

// Any other purple we did not list is moved to pink (or to a neutral dark if it was very dark)
function recolor(text) {
  let count = 0;
  let out = text.replace(/#([0-9a-fA-F]{6})\b/g, (match, hex) => {
    const known = EXACT['#' + hex.toLowerCase()];
    if (known) { count++; return known; }
    const [h, s, l] = hexToHsl(hex);
    if (h >= 235 && h <= 290 && s >= 0.25) {
      count++;
      return l < 0.3 ? hslToHex(0, 0, l * 0.6) : hslToHex(338, s, l);
    }
    return match;
  });
  out = out.replace(/rgba\(\s*108\s*,\s*92\s*,\s*231/g, () => { count++; return 'rgba(252, 64, 140'; });
  return { out, count };
}

// ---- which files to change ----
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.expo', '.git', 'theme-backup'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|css|html)$/.test(entry.name)) files.push(full);
  }
}
if (isMobile) {
  walk(path.join(root, 'src'));
  files.push(path.join(root, 'App.js'));
} else {
  for (const name of ['style.css', 'script.js', 'index.html']) {
    if (fs.existsSync(path.join(root, name))) files.push(path.join(root, name));
  }
}

// ---- extra styles for the admin website (logo + black login background) ----
const ADMIN_EXTRA = `
/* FITORA THEME: logo and branded login */
.login-screen { background: #0d0d0d; }
.login-logo { display: block; width: 96px; height: 96px; margin: 0 auto 12px; border-radius: 50%; }
.sidebar-brand { display: flex; align-items: center; gap: 10px; }
.sidebar-logo { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
`;

let changedFiles = 0;
let totalChanges = 0;
for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const { out, count } = recolor(original);
  let result = out;
  if (isAdmin && path.basename(file) === 'style.css' && !result.includes('FITORA THEME')) {
    result += ADMIN_EXTRA;
  }
  if (result !== original) {
    const backup = path.join(root, 'theme-backup', path.relative(root, file));
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, original); // keep the very first original only
    fs.writeFileSync(file, result);
    changedFiles++;
    totalChanges += count;
    console.log(`  changed ${path.relative(root, file)} (${count} colors)`);
  }
}

console.log(`\nDone. ${changedFiles} file(s) updated, ${totalChanges} colors changed.`);
console.log('A copy of the original files is in the "theme-backup" folder.');
if (isMobile) console.log('Next: press r in the Expo terminal to reload the app.');
else console.log('Next: push to GitHub and Manual Deploy the admin website on Render.');