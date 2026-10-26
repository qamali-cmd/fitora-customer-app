// fix-inputs.js
// Ginagawang MALINAW ang tina-type sa lahat ng input ng app (kahit naka-dark mode ang telepono):
//   1. nilalagyan ng itim na kulay ang teksto ng bawat TextInput
//   2. nilalagyan ng abong kulay ang placeholder ng bawat TextInput
//
// PAANO GAMITIN:
//   1. Ilagay ang file na ito sa folder ng app (kung nasaan ang App.js)
//   2. Sa terminal:   node fix-inputs.js
//   3. Ligtas ito: may kopya ng orihinal sa folder na "inputs-backup", at pwede mo itong patakbuhin ulit (hindi ito nagdodoble)

const fs = require('fs');
const path = require('path');

const TEXT_COLOR = '#1F1F1F'; // EDIT DITO: ang kulay ng tina-type
const PLACEHOLDER_COLOR = '#9A9AA0'; // EDIT DITO: ang kulay ng placeholder

const root = process.cwd();
const backupDir = path.join(root, 'inputs-backup');
const SKIP = ['node_modules', 'theme-backup', 'icons-backup', 'inputs-backup', '.git', '.expo'];

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.includes(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

// hinahanap ang bawat <TextInput ... > (hindi nalilito sa => at sa mga { } sa loob)
function findTags(src) {
  const tags = [];
  let i = 0;
  while ((i = src.indexOf('<TextInput', i)) !== -1) {
    if (!/[\s/>]/.test(src[i + 10])) { i += 10; continue; }
    let j = i + 10, depth = 0, quote = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) { if (c === quote && src[j - 1] !== '\\') quote = null; continue; }
      if (depth > 0 && (c === "'" || c === '"' || c === '`')) { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    tags.push([i, j + 1]);
    i = j + 1;
  }
  return tags;
}

function balanced(text, openIndex) {
  let d = 0;
  for (let k = openIndex; k < text.length; k++) {
    if (text[k] === '{') d++;
    else if (text[k] === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

function fixFile(src) {
  let s = src;
  const keys = new Set();
  let inputs = 0;
  const tags = findTags(s);
  for (let n = tags.length - 1; n >= 0; n--) { // mula sa dulo, para hindi magalaw ang mga naunang posisyon
    const [a, b] = tags[n];
    let tag = s.slice(a, b);
    let changed = false;
    if (!/placeholderTextColor/.test(tag)) {
      tag = tag.replace('<TextInput', `<TextInput placeholderTextColor="${PLACEHOLDER_COLOR}"`);
      changed = true;
    }
    const attr = tag.match(/style=\{/);
    if (attr) {
      const open = attr.index + 6;
      const close = balanced(tag, open);
      const expr = tag.slice(open, close + 1);
      for (const m of expr.matchAll(/styles\.(\w+)/g)) keys.add(m[1]);
      if (expr.startsWith('{{') && !/\bcolor\s*:/.test(expr)) {
        tag = tag.slice(0, open) + `{{ color: '${TEXT_COLOR}',` + expr.slice(2) + tag.slice(close + 1);
        changed = true;
      }
    } else {
      tag = tag.replace('<TextInput', `<TextInput style={{ color: '${TEXT_COLOR}' }}`);
      changed = true;
    }
    if (changed) { s = s.slice(0, a) + tag + s.slice(b); inputs++; }
  }
  // ang mga style (sa StyleSheet) na ginagamit ng mga input ay nilalagyan ng kulay ng teksto
  let styles = 0;
  const sheet = s.indexOf('StyleSheet.create(');
  if (sheet !== -1) {
    for (const key of keys) {
      const re = new RegExp(`(^|[^\\w$.])${key}\\s*:\\s*\\{`, 'm');
      const rest = s.slice(sheet);
      const m = re.exec(rest);
      if (!m) continue;
      const open = sheet + m.index + m[0].length - 1;
      const close = balanced(s, open);
      if (close === -1 || /\bcolor\s*:/.test(s.slice(open, close + 1))) continue;
      s = s.slice(0, open + 1) + ` color: '${TEXT_COLOR}',` + s.slice(open + 1);
      styles++;
    }
  }
  return { out: s, inputs, styles };
}

const files = [];
if (fs.existsSync(path.join(root, 'src'))) walk(path.join(root, 'src'), files);
if (fs.existsSync(path.join(root, 'App.js'))) files.push(path.join(root, 'App.js'));
if (files.length === 0) { console.log('Walang nahanap na src folder. Siguraduhing nasa folder ka ng app (kung nasaan ang App.js).'); process.exit(1); }

let changedFiles = 0, totalInputs = 0, totalStyles = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('<TextInput')) continue;
  const { out, inputs, styles } = fixFile(src);
  if (out === src) continue;
  const rel = path.relative(root, file);
  const backup = path.join(backupDir, rel);
  if (!fs.existsSync(backup)) { fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.writeFileSync(backup, src); }
  fs.writeFileSync(file, out);
  changedFiles++; totalInputs += inputs; totalStyles += styles;
  console.log(`  ${rel}: ${inputs} input, ${styles} style`);
}
console.log(changedFiles === 0
  ? 'Wala nang kailangang baguhin (naayos na ang lahat ng input).'
  : `\nTapos na: ${changedFiles} file, ${totalInputs} input ang naayos. Ang mga orihinal ay nasa folder na "inputs-backup".`);