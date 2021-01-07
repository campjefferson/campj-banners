#!/usr/bin/env node
process.env.NODE_ENV = "development";
process.env.PARCEL_AUTOINSTALL = "false";

const fs = require("fs");
const wd = process.cwd().toString();
process.env.PROJECT_DIR = wd;
const chalk = require("chalk");
const path = require("path");
const glob = require("glob");
const watch = require("glob-watcher");
const Bundler = require("parcel-bundler");
const cmd = require("node-cmd");
const opn = require("opn");
const Promise = require("bluebird").Promise;

const generateFrontMatter = require("./generateFrontMatter");
const generateIndex = require("./generateIndex");
const generateAssetCss = require("./generateAssetCss");
const setup = require("./setup");
const normalizePath = require("normalize-path");
const { normalize } = require("path");

const getAsync = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });
process.chdir(__dirname);

const bundles = [
  `${wd}/src/**/index.hbs`,
  `${wd}/src/**/sprite-*.png`,
  `!${wd}/src/**/sprite/*`,
];

const bundler = new Bundler(bundles, {
  cache: false,
  detailedReport: true,
  autoInstall: false,
  outDir: `${wd}/dist`,
  hmr: true,
});

let regenTimeout = {};
let reloadTimeout;

bundler.on("bundled", async (bundle) => {
  console.log(chalk.yellow.bold("info"), "bundle complete.");
  try {
    console.log(chalk.yellow.bold("info"), "generating dev index file...");
    generateIndex();
    console.log(chalk.green.bold("success"), "index file generated!");
  } catch (e) {
    console.log(chalk.red.bold("error"), "error generating dev index file");
    console.log(e);
  }
});

async function run() {
  await bundler.serve(3000, false);
  await fixWindowsCSSPathnames();
  await fixWindowsFrontMatter();
  runWatcher(bundler);
  opn("http://localhost:3000/index.html");
}

async function regenerateAssetCss(filepath) {
  const spriteFolderPath = path.dirname(filepath);
  const bannerFolderPath = path.dirname(spriteFolderPath);
  generateAssetCss(`${bannerFolderPath}/`);
  clearTimeout(regenTimeout[bannerFolderPath]);
  regenTimeout[filepath] = null;
}

const YAMLFrontMatter = /^---(.|\n)*?---/;

function fixWindowsFrontMatter() {
  const files = glob.sync(`${wd}/dist/*.html`);
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let loadedFile = fs.readFileSync(file, `utf-8`);
    loadedFile = loadedFile.replace(YAMLFrontMatter, "");
    fs.writeFileSync(file, loadedFile, `utf-8`);
  }
}

function fixWindowsCSSPathnames() {
  const files = glob.sync(`${wd}/dist/*.css`);
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let loadedFile = fs.readFileSync(file, `utf-8`);
    loadedFile = loadedFile.replace(/\\/g, "/");
    fs.writeFileSync(file, loadedFile, `utf-8`);
  }
}

function regen(msg, filepath) {
  console.warn(chalk.yellow.bold("info"), msg, filepath);
  const spriteFolderPath = path.dirname(filepath);
  const bannerFolderPath = path.dirname(spriteFolderPath);
  if (regenTimeout[bannerFolderPath]) {
    clearTimeout(regenTimeout[bannerFolderPath]);
  }
  regenTimeout[bannerFolderPath] = setTimeout(() => {
    regenerateAssetCss(filepath);
    regenTimeout[bannerFolderPath] = setTimeout(() => {
      fixWindowsCSSPathnames();
    }, 600);
  }, 600);
}

function runWatcher(bundler) {
  const watcher = watch([normalizePath(`${wd}/src/*/img/*.{png,gif,jpg,svg}`)]);
  watcher.on("add", (file) => {
    if (file.indexOf("sprite-") === -1) {
      regen("image added", file);
      return;
    }
    reloadBrowsers(bundler);
  });

  watcher.on("change", (file) => {
    if (file.indexOf("sprite-") === -1) {
      regen("image changed", file);
      return;
    }
    reloadBrowsers(bundler);
  });

  watcher.on("unlink", (file) => {
    if (file.indexOf("sprite-") === -1) {
      regen("image removed", file);
      return;
    }
    reloadBrowsers(bundler);
  });

  const spriteWatcher = watch([
    normalizePath(`${wd}/src/*/sprite/*.{png,gif,jpg}`),
  ]);
  spriteWatcher.on("add", (filepath) => {
    regen("sprite image added", filepath);
  });
  spriteWatcher.on("change", (filepath) => {
    regen("sprite image changed", filepath);
  });
  spriteWatcher.on("unlink", (filepath) => {
    regen("sprite image removed", filepath);
  });
}

function reloadBrowsers(bundler) {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    try {
      bundler.hmr.broadcast({
        type: "reload",
      });
    } catch (e) {
      console.log(chalk.red.bold("error reloading"), e);
    }
  }, 500);
}

(async function () {
  const rootDir = wd;
  const cacheDir = `${rootDir}/.cache`;
  const distDir = `${rootDir}/dist`;

  await getAsync(`rm -r ${cacheDir} || true && rm -r ${distDir} || true`);
  await setup();
  await generateFrontMatter();
  await generateAssetCss();

  run();
})();
