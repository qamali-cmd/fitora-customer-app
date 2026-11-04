// add-checkout-photos.js
// Nilalagyan ng LARAWAN ng produkto ang "Order summary" sa Checkout. Wala itong ibang ginagalaw.
//
// PAANO GAMITIN:
//   1. Ilagay ang file na ito sa folder ng app (kung nasaan ang App.js)
//   2. Sa terminal:   node add-checkout-photos.js
//   3. Ligtas ito: may kopya ng orihinal sa "checkout-backup", at pwede mo itong patakbuhin ulit (hindi ito nagdodoble)

const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'screens', 'CheckoutScreen.js');
if (!fs.existsSync(file)) {
  console.log('Hindi nahanap ang src/screens/CheckoutScreen.js. Siguraduhing nasa folder ka ng app (kung nasaan ang App.js).');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('itemPhoto')) {
  console.log('Naayos na ito dati (may larawan na ang Order summary). Wala nang babaguhin.');
  process.exit(0);
}

const problems = [];
function replaceOnce(label, from, to) {
  const count = s.split(from).length - 1;
  if (count !== 1) { problems.push(`${label} (nahanap ${count} beses, dapat 1)`); return; }
  s = s.replace(from, () => to);
}

// 1) "Image" is added to the imports of react-native
const rn = s.match(/import \{([^}]*)\} from 'react-native';/);
if (!rn) problems.push('ang import ng react-native');
else if (!/\bImage\b/.test(rn[1])) s = s.replace(rn[0], () => `import {${rn[1].replace(/\s*$/, '')}, Image } from 'react-native';`);

// 2) the helper that makes the photo small
replaceOnce("ang import ng useCart", "import { useCart } from '../context/CartContext';", "import { useCart } from '../context/CartContext';\nimport { thumb } from '../utils/productUtils';");

// 3) the photo of a product (the first photo; it can be saved as a link or as an object)
replaceOnce('ang OrderSummary', 'export function OrderSummary(', `// ang larawan ng produkto sa order summary
function photoOf(product) {
  if (product.image) return product.image;
  const first = Array.isArray(product.images) ? product.images[0] : null;
  if (!first) return null;
  return typeof first === 'string' ? first : first.image_url || first.url || null;
}

export function OrderSummary(`);

// 4) every item: the photo on the left, and the name, price, and quantity on the right
replaceOnce('ang simula ng item', '<View key={i.product.product_id} style={styles.itemBlock}>', `<View key={i.product.product_id} style={styles.itemBlock}>
            <View style={styles.itemWithPhoto}>
              {photoOf(i.product) ? (
                <Image source={{ uri: thumb(photoOf(i.product), 200) }} style={styles.itemPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.itemPhoto, styles.itemPhotoEmpty]} />
              )}
              <View style={styles.itemMain}>`);
replaceOnce('ang dulo ng item', '            </View>\n          </View>\n        );\n      })}', '            </View>\n              </View>\n            </View>\n          </View>\n        );\n      })}');

// 5) the styles
replaceOnce('ang styles', '  summaryCard: {', `  itemWithPhoto: { flexDirection: 'row' },
  itemMain: { flex: 1 },
  itemPhoto: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#f2f2f2', marginRight: 12 },
  itemPhotoEmpty: { backgroundColor: '#FFE8F1' },
  summaryCard: {`);

if (problems.length > 0) {
  console.log('Walang binago, dahil hindi nahanap ang mga bahaging ito sa CheckoutScreen.js mo:');
  problems.forEach((p) => console.log('  - ' + p));
  console.log('Ipadala mo ang file na ito sa akin at gagawan ko ng ayos.');
  process.exit(1);
}

const backup = path.join(process.cwd(), 'checkout-backup', 'CheckoutScreen.js');
if (!fs.existsSync(backup)) { fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.writeFileSync(backup, raw); }
fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Tapos na: may larawan na ang bawat item sa Order summary ng Checkout.');
console.log('Ang orihinal ay nasa checkout-backup/CheckoutScreen.js');