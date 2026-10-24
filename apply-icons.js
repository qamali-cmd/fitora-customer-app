// apply-icons.js
// Changes the emoji icons of the OLDER screens (Me, Notifications, Cart, Login, ...) to modern line icons,
// the same style as the new Home. It works on your real files and saves a backup first.
//
// HOW TO USE:
//   1. Put the new files in place first: src/components/Icon.js and src/theme.js
//   2. Open a terminal in the fitora-customer-app folder (the one with App.js) and run:   node apply-icons.js
// The old copy of every file it changes is saved in the folder "icons-backup". Running it twice is safe.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
if (!fs.existsSync(path.join(root, 'App.js')) || !fs.existsSync(path.join(root, 'src'))) {
  console.log('Please run this script inside the fitora-customer-app folder (the one with App.js).');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'src', 'components', 'Icon.js'))) {
  console.log('First put Icon.js in src/components (and theme.js in src), then run this script again.');
  process.exit(1);
}

const PINK = '#FC408C';
const GREY = '#8A8A8A';
const eye = (variable) => [
  `<Text style={styles.eyeIcon}>{${variable} ? '\u{1F648}' : '\u{1F441}\uFE0F'}</Text>`,
  `<Icon name={${variable} ? 'eye-off-outline' : 'eye-outline'} size={21} color="${GREY}" />`,
];
const E = (find, replace, all) => ({ find, replace, all: !!all });
const pair = (p, all) => E(p[0], p[1], all);

// What is changed, screen by screen. If a line is not found (because that file was changed), it is skipped.
const EDITS = {
  'MeScreen.js': [
    E("icon: '\u{1F4E6}'", "icon: 'cube-outline'"),
    E("icon: '\u{1F69A}'", "icon: 'car-outline'"),
    E("icon: '\u2B50'", "icon: 'star-outline'"),
    E("icon: '\u21A9\uFE0F'", "icon: 'close-circle-outline'"),
    E('<Text style={styles.shortcutIcon}>{item.icon}</Text>', `<Icon name={item.icon} size={28} color="${PINK}" />`),
    E('<Text style={styles.gear}>\u2699\uFE0F</Text>', `<Icon name="settings-outline" size={22} color="${GREY}" style={{ marginLeft: 8 }} />`),
    E('icon="\u{1F464}"', 'icon="person-outline"'),
    E('icon="\u{1F4CD}"', 'icon="location-outline"'),
    E('icon="\u{1F512}"', 'icon="lock-closed-outline"'),
    E('icon="\u{1F465}"', 'icon="people-outline"'),
    E('<Text style={styles.menuIcon}>{icon}</Text>', `<View style={{ width: 34 }}><Icon name={icon} size={20} color="${PINK}" /></View>`),
  ],
  'NotificationsScreen.js': [E('<Text style={styles.emptyIcon}>\u{1F514}</Text>', `<Icon name="notifications-outline" size={52} color="${PINK}" style={{ marginBottom: 6 }} />`)],
  'CartScreen.js': [E('<Text style={{ fontSize: 20 }}>\u{1F6CD}\uFE0F</Text>', `<Icon name="bag-handle-outline" size={22} color="${PINK}" />`)],
  'AddressesScreen.js': [E('<Text style={styles.emptyIcon}>\u{1F4CD}</Text>', `<Icon name="location-outline" size={52} color="${PINK}" style={{ marginBottom: 6 }} />`)],
  'AccountScreen.js': [E('<Text style={styles.cameraIcon}>\u{1F4F7}</Text>', '<Icon name="camera" size={16} color="#fff" />')],
  'LoginScreen.js': [pair(eye('showPassword'))],
  'RegisterScreen.js': [pair(eye('visible'))],
  'ChangePasswordScreen.js': [pair(eye('visible'))],
  'ForgotPasswordScreen.js': [
    pair(eye('visible')),
    E('<Text style={styles.icon}>\u{1F511}</Text>', `<Icon name="key-outline" size={44} color="${PINK}" />`),
    E('<Text style={styles.icon}>\u2709\uFE0F</Text>', `<Icon name="mail-outline" size={44} color="${PINK}" />`),
    E('<Text style={styles.icon}>\u2705</Text>', '<Icon name="checkmark-circle" size={48} color="#1E8E4F" />'),
  ],
  'VerifyEmailScreen.js': [E('<Text style={styles.icon}>\u2709\uFE0F</Text>', `<Icon name="mail-outline" size={44} color="${PINK}" />`)],
  'CheckoutScreen.js': [E('<Text style={styles.emptyScreenIcon}>\u{1F6D2}</Text>', `<Icon name="cart-outline" size={56} color="${PINK}" />`)],
  'ProductDetailScreen.js': [E('<Text style={styles.imageEmoji}>\u{1F6CD}\uFE0F</Text>', `<Icon name="image-outline" size={56} color="${PINK}" />`)],
  'WriteReviewScreen.js': [
    E("<Text style={[styles.star, n <= rating && styles.starOn]}>{n <= rating ? '\u2605' : '\u2606'}</Text>", "<Icon name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? '#FFB400' : '#C9C9D0'} />"),
    E('<Text style={styles.pickText}>\u{1F4F7} Add photos ({photos.length}/{MAX_PHOTOS})</Text>', `<View style={{ flexDirection: 'row', alignItems: 'center' }}><Icon name="camera-outline" size={18} color="${PINK}" /><Text style={[styles.pickText, { marginLeft: 6 }]}>Add photos ({photos.length}/{MAX_PHOTOS})</Text></View>`),
    E("<Text style={styles.pickText}>\u{1F3AC} {video ? 'Change video' : 'Add video'}</Text>", `<View style={{ flexDirection: 'row', alignItems: 'center' }}><Icon name="videocam-outline" size={18} color="${PINK}" /><Text style={[styles.pickText, { marginLeft: 6 }]}>{video ? 'Change video' : 'Add video'}</Text></View>`),
    E('<Text style={styles.removeText}>\u2715</Text>', '<Icon name="close" size={14} color="#fff" />', true),
    E('<Text style={styles.videoIcon}>\u{1F3AC}</Text>', '<Icon name="videocam" size={28} color="#fff" />'),
  ],
};

const screens = path.join(root, 'src', 'screens');
const backup = path.join(root, 'icons-backup');
let changedFiles = 0, changedLines = 0, skipped = 0;

for (const [file, edits] of Object.entries(EDITS)) {
  const full = path.join(screens, file);
  if (!fs.existsSync(full)) { console.log(`- ${file}: not found, skipped`); continue; }
  const original = fs.readFileSync(full, 'utf8');
  const crlf = original.includes('\r\n');
  let text = original.replace(/\r\n/g, '\n');
  const rnImport = text.match(/import\s*\{([^}]*)\}\s*from 'react-native';/);
  const hasView = !!rnImport && /\bView\b/.test(rnImport[1]);
  let done = 0, missing = 0;

  for (const edit of edits) {
    const count = text.split(edit.find).length - 1;
    if (count === 0) { if (!text.includes(edit.replace)) missing++; continue; } // 0 and not yet changed = the line is different in this file
    if (count > 1 && !edit.all) { missing++; continue; }
    if (edit.replace.includes('<View') && !hasView) { missing++; continue; }
    text = text.split(edit.find).join(edit.replace);
    done += count;
  }

  if (done > 0) {
    if (!/from '\.\.\/components\/Icon'/.test(text)) {
      const m = text.match(/import[\s\S]*?from 'react-native';\n/);
      if (!m) { console.log(`- ${file}: no react-native import found, skipped`); continue; }
      text = text.replace(m[0], m[0] + "import Icon from '../components/Icon';\n");
    }
    fs.mkdirSync(backup, { recursive: true });
    const saved = path.join(backup, file);
    if (!fs.existsSync(saved)) fs.writeFileSync(saved, original);
    fs.writeFileSync(full, crlf ? text.replace(/\n/g, '\r\n') : text);
    changedFiles++; changedLines += done;
    console.log(`- ${file}: ${done} icon${done === 1 ? '' : 's'} changed${missing ? `, ${missing} line(s) not found (left as they were)` : ''}`);
  } else {
    console.log(`- ${file}: ${missing ? `${missing} line(s) not found (left as they were)` : 'nothing to change (already done)'}`);
  }
  skipped += missing;
}

console.log(`\nDone. ${changedLines} icon(s) changed in ${changedFiles} file(s).${skipped ? ` ${skipped} line(s) were not found and were left as they were.` : ''}`);
if (changedFiles) console.log('The old files are saved in the folder "icons-backup".');