import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'src');
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function pngSize(relativePath) {
  const file = path.join(root, relativePath);
  const bytes = fs.readFileSync(file);
  expect(bytes.subarray(1, 4).toString('ascii') === 'PNG', `${relativePath}: PNG 파일이 아닙니다.`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function expectPng(relativePath, width, height) {
  const size = pngSize(relativePath);
  expect(size.width === width && size.height === height,
    `${relativePath}: ${width}×${height} PNG가 필요합니다. (현재 ${size.width}×${size.height})`);
}

expect(manifest.manifest_version === 3, 'Manifest V3가 필요합니다.');
expect(/^\d+\.\d+\.\d+$/.test(manifest.version), 'manifest version은 MAJOR.MINOR.PATCH 형식이어야 합니다.');
expect(manifest.name.length <= 75, 'manifest name은 75자 이하여야 합니다.');
expect(manifest.description.length <= 132, 'manifest description은 132자 이하여야 합니다.');
expect(JSON.stringify(manifest.permissions) === JSON.stringify(['activeTab', 'downloads']),
  '필요 최소 권한(activeTab, downloads)만 선언해야 합니다.');

for (const relativePath of ['manifest.json', 'popup.html', 'popup.js', 'background.js', 'content/eolma.js', 'eolma/api.js']) {
  expect(fs.existsSync(path.join(src, relativePath)), `패키지 필수 파일 누락: ${relativePath}`);
}

expectPng('src/icons/icon16.png', 16, 16);
expectPng('src/icons/icon48.png', 48, 48);
expectPng('src/icons/icon128.png', 128, 128);
expectPng('screenshots/promo-tile-440x280.png', 440, 280);
for (const name of ['naverpay', 'coupang', 'browser']) {
  expectPng(`screenshots/store-ko-${name}.png`, 1280, 800);
}

for (const relativePath of ['src/eolma/api.js', 'src/content/eolma.js']) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  expect(!/chrome\.storage|localStorage|access_token/.test(source),
    `${relativePath}: 인증 토큰·웹 저장소 접근이 남아 있습니다.`);
}

if (failures.length > 0) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

console.log(`Chrome Web Store package checks passed (v${manifest.version}).`);
