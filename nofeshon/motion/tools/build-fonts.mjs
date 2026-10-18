// יוצר את src/fonts.css מקובצי Rubik שב־assets/fonts (מוטמעים כ־base64,
// כך שהעמוד לא תלוי בטעינת קבצים חיצוניים בזמן רינדור)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const subsets = [
  ['rubik-hebrew', 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F'],
  ['rubik-latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
];
let css = '/* נוצר אוטומטית ע"י tools/build-fonts.mjs — אין לערוך ידנית */\n';
for (const [file, range] of subsets) {
  for (const w of [400, 500, 700, 800, 900]) {
    const b64 = readFileSync(join(root, 'assets/fonts', `${file}-${w}-normal.woff2`)).toString('base64');
    css += `@font-face{font-family:'Rubik';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range};}\n`;
  }
}
writeFileSync(join(root, 'src/fonts.css'), css);
console.log('src/fonts.css written', css.length, 'bytes');
