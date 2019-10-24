#!/usr/bin/env node
process.env.NODE_ENV = 'development';
process.env.PARCEL_AUTOINSTALL = 'false';
const wd = process.cwd().toString();
process.env.PROJECT_DIR = wd;

const path = require('path');
const watch = require('glob-watcher');
const Bundler = require('parcel-bundler');
const cmd = require('node-cmd');
const Promise = require('bluebird').Promise;

const generateFrontMatter = require('./generateFrontMatter');
const generateIndex = require('./generateIndex');
const generateSprites = require('./generateSprites');

const getAsync = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });
process.chdir(__dirname);

const bundles = [
  `${wd}/src/**/index.hbs`,
  `!${wd}/src/**/sprite-*.png`,
  `!${wd}/src/**/sprite/*`
];

const bundler = new Bundler(bundles, {
  cache: false,
  detailedReport: true,
  autoInstall: false,
  outDir: `${wd}/dist`
});

let regenTimeout = {};
let reloadTimeout;

bundler.on('bundled', async bundle => {
  console.log('bundle complete.');
  try {
    console.log('generating dev index file...');
    generateIndex();
    console.log('index file generated!');
  } catch (e) {
    console.log('error generating dev index file');
    console.log(e);
  }
});

async function run() {
  console.log('run', process.env.NODE_ENV);
  await bundler.serve(3000);
  runWatcher(bundler);
}

async function regenerateSpritesheet(filepath) {
  const spriteFolderPath = path.dirname(filepath);
  const bannerFolderPath = path.dirname(spriteFolderPath);
  generateSprites(`${bannerFolderPath}/`);
  clearTimeout(regenTimeout[bannerFolderPath]);
  regenTimeout[filepath] = null;
}

function regen(msg, filepath) {
  console.warn(msg, filepath);
  const spriteFolderPath = path.dirname(filepath);
  const bannerFolderPath = path.dirname(spriteFolderPath);
  if (regenTimeout[bannerFolderPath]) {
    clearTimeout(regenTimeout[bannerFolderPath]);
  }
  regenTimeout[bannerFolderPath] = setTimeout(() => {
    regenerateSpritesheet(filepath);
  }, 300);
}

function runWatcher(bundler) {
  const watcher = watch([`${wd}/src/*/img/*.{png,gif,jpg,svg}`]);
  watcher.on('add', () => {
    console.warn('image added');
    reloadBrowsers(bundler);
  });

  watcher.on('change', () => {
    console.warn('image changed');
    reloadBrowsers(bundler);
  });

  watcher.on('unlink', () => {
    console.warn('image removed');
    reloadBrowsers(bundler);
  });

  const spriteWatcher = watch([`${wd}/src/*/sprite/*.{png,gif,jpg}`]);
  spriteWatcher.on('add', filepath => {
    regen('sprite image added', filepath);
  });
  spriteWatcher.on('change', filepath => {
    regen('sprite image changed', filepath);
  });
  spriteWatcher.on('unlink', filepath => {
    regen('sprite image removed', filepath);
  });
}

function reloadBrowsers(bundler) {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    try {
      bundler.hmr.broadcast({
        type: 'reload'
      });
    } catch (e) {
      console.log(e);
    }
  }, 500);
}

(async function() {
  const rootDir = wd;
  const cacheDir = `${rootDir}/.cache`;
  const distDir = `${rootDir}/dist`;

  await getAsync(`rm -r ${cacheDir} || true && rm -r ${distDir} || true`);
  await generateFrontMatter();
  await generateSprites();

  run();
})();
