const { execSync } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const crossZip = require('cross-zip');
const packageJson = require('../package.json');

const target = process.argv[2] || 'all';

async function packageChrome() {
  console.log('Packaging Chrome extension...');
  execSync('node ./scripts/chrome.js', { stdio: 'inherit' });
  await fs.mkdir(path.resolve(__dirname, '../dist'), { recursive: true });
  const inPath = path.resolve(__dirname, '../public');
  const outFile = path.resolve(__dirname, `../dist/better-snapchat-chrome-v${packageJson.version}.zip`);
  crossZip.zipSync(inPath, outFile);
  console.log(`Created ${outFile}`);
}

async function packageFirefox() {
  console.log('Packaging Firefox extension...');
  execSync('node ./scripts/firefox.js', { stdio: 'inherit' });
  await fs.mkdir(path.resolve(__dirname, '../dist'), { recursive: true });
  const inPath = path.resolve(__dirname, '../public');
  const outFile = path.resolve(__dirname, `../dist/better-snapchat-firefox-v${packageJson.version}.zip`);
  crossZip.zipSync(inPath, outFile);
  console.log(`Created ${outFile}`);
}

async function packageUserscript() {
  console.log('Packaging Userscript...');
  execSync('node ./scripts/userscript.js', { stdio: 'inherit' });
  await fs.mkdir(path.resolve(__dirname, '../dist'), { recursive: true });
  const inFile = path.resolve(__dirname, '../public/build/userscript.js');
  const outFile = path.resolve(__dirname, `../dist/better-snapchat-userscript-v${packageJson.version}.js`);
  await fs.copyFile(inFile, outFile);
  console.log(`Created ${outFile}`);
}

(async () => {
  try {
    if (target === 'chrome') {
      await packageChrome();
    } else if (target === 'firefox') {
      await packageFirefox();
    } else if (target === 'userscript') {
      await packageUserscript();
    } else if (target === 'all') {
      await packageChrome();
      await packageFirefox();
      await packageUserscript();
    } else {
      console.error(`Unknown target: ${target}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Packaging failed:', err);
    process.exit(1);
  }
})();
