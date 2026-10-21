// Generates build/icons.js (inline lucide SVGs) and build/timing.js
// (timing.json wrapped for the page) so index.html works from file://.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconDir = path.join(root, 'node_modules/lucide-static/icons');

const ICONS = [
  'laptop', 'briefcase', 'moon', 'flame', 'heart-crack', 'graduation-cap', 'drama', 'shirt',
  'pen-line', 'users', 'book-open', 'door-closed', 'triangle-alert', 'brain', 'eye', 'hand',
  'heart', 'sparkles', 'trending-up', 'stethoscope', 'megaphone', 'activity', 'heart-pulse',
  'wind', 'thermometer', 'droplets', 'globe', 'user', 'dna', 'layers', 'circle-help', 'x',
  'check', 'scale', 'search', 'file-search', 'clock', 'repeat', 'lock', 'unlink', 'bookmark',
  'pill', 'house', 'ban', 'equal-not', 'user-check', 'heart-handshake', 'gamepad-2',
  'scan-face', 'users-round', 'link-2-off', 'split', 'file-text', 'library', 'map-pin',
  'circle-x', 'circle-check', 'messages-square', 'hourglass', 'frown', 'target', 'focus',
  'refresh-cw', 'zap', 'message-circle-warning', 'compass', 'gauge', 'link', 'music-4',
];

const out = {};
for (const name of ICONS) {
  let svg = fs.readFileSync(path.join(iconDir, name + '.svg'), 'utf8');
  svg = svg.replace(/<!--.*?-->\s*/s, '').replace(/\s+/g, ' ')
    .replace(/ class="[^"]*"/, '').replace(/ width="24"/, '').replace(/ height="24"/, '').trim();
  out[name] = svg;
}
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/icons.js'), 'window.ICONS = ' + JSON.stringify(out) + ';\n');

const timing = fs.readFileSync(path.join(root, 'build/timing.json'), 'utf8');
fs.writeFileSync(path.join(root, 'build/timing.js'), 'window.TIMING = ' + timing + ';\n');
console.log('icons', Object.keys(out).length, 'timing ok');
