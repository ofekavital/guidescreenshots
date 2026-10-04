// יוצר את src/fonts.css מקובצי הגופנים שב־assets/fonts (מוטמעים כ־base64,
// כך שהתצוגה המקדימה עובדת גם בפתיחה ישירה של index.html מהדיסק)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const faces = [
  ['Roboto', 'roboto-latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Noto Sans Hebrew', 'noto-sans-hebrew-hebrew', 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F'],
];
let css = '/* נוצר אוטומטית ע"י tools/build-fonts.mjs — אין לערוך ידנית */\n';
for (const [family, file, range] of faces) {
  for (const w of [400, 500, 700]) {
    const b64 = readFileSync(join(root, 'assets/fonts', `${file}-${w}-normal.woff2`)).toString('base64');
    css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range};}\n`;
  }
}
writeFileSync(join(root, 'src/fonts.css'), css);
console.log('src/fonts.css written', css.length, 'bytes');
