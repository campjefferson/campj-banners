#!/usr/bin/env node
process.env.NODE_ENV = 'production';
process.env.PARCEL_AUTOINSTALL = 'false';
const path = require('path');
const fs = require('fs');
const pkg = require(process.cwd() + '/package.json');
// move config files
const terserConfig = fs.readFileSync(
  path.resolve(__dirname, '.terserrc'),
  'utf-8'
);
fs.writeFileSync(`${process.cwd()}/.terserrc`, terserConfig, 'utf-8');

const wd = process.cwd().toString();
process.env.PROJECT_DIR = wd;

const cmd = require('node-cmd');
const Promise = require('bluebird').Promise;

const generateFrontMatter = require('./generateFrontMatter');
const generateIndex = require('./generateIndex');
const generateSprites = require('./generateSprites');
const reorganizeProductionFiles = require('./reorganizeProductionFiles');
const generateBackups = require('./generateBackups');
const generateArchives = require('./generateArchives');

const getAsync = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });
process.chdir(__dirname);

const buildSrc = `${wd}/src/**/index.hbs`;
const buildOutput = `${wd}/dist`;

(async function() {
  const rootDir = wd;
  const cacheDir = `${rootDir}/.cache`;
  const distDir = `${rootDir}/dist`;

  await getAsync(`rm -r ${cacheDir} || true && rm -r ${distDir} || true`);
  await generateFrontMatter();
  await generateSprites();
  await getAsync(
    `parcel build ${buildSrc} --out-dir ${buildOutput} --public-url ./ --no-source-maps`
  );

  console.log('reorganizing production files...');
  await reorganizeProductionFiles();
  console.log('reorganizing production files complete!');

  console.log('generating backups...');
  await generateBackups(pkg.config ? pkg.config.backupTimeout : null);
  console.log('generating backups complete!');

  console.log('generating zip archives...');
  const allArchiveName = await generateArchives();
  console.log('generating zip archives complete!');

  console.log('generating production index file...');
  generateIndex(allArchiveName);
  console.log('generating production index file complete!');
  console.log('all banners built successfully.');

  const terserPath = path.resolve(wd, '.terserrc');
  await getAsync(`rm -r ${terserPath} || true`);
})();
