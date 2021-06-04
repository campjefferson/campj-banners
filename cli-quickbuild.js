#!/usr/bin/env node
process.env.NODE_ENV = "production";
process.env.PARCEL_AUTOINSTALL = "false";
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const pkg = require(process.cwd() + "/package.json");
// move config files
const terserConfig = fs.readFileSync(
  path.resolve(__dirname, ".terserrc"),
  "utf-8"
);
fs.writeFileSync(`${process.cwd()}/.terserrc`, terserConfig, "utf-8");

const wd = process.cwd().toString();
process.env.PROJECT_DIR = wd;

const cmd = require("node-cmd");
const Promise = require("bluebird").Promise;

const copyBannerFiles = require("./copyBannerFiles");
const generateIndex = require("./generateIndex");
const generateArchives = require("./generateArchives");

const getAsync = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });
process.chdir(__dirname);

const buildSrc = `${wd}/src/**/index.hbs`;
const buildOutput = `${wd}/dist`;

let allArchiveName;

(async function () {
  const rootDir = wd;
  const cacheDir = `${rootDir}/.cache`;
  const distDir = `${rootDir}/dist`;

  await getAsync(`rm -r ${cacheDir} || true && rm -r ${distDir} || true`);

  console.log(chalk.black.bold.bgGreen(" Copying banner files... "));
  await copyBannerFiles();
  console.log(chalk.black.bold.bgGreen(" Copying banner files complete! "));

  // console.log(chalk.black.bold.bgGreen(" Generating backups... "));
  // await generateBackups(pkg.config ? pkg.config.backupTimeout : null);
  // console.log(chalk.black.bold.bgGreen(" Generating backups complete! "));

  // console.log(chalk.black.bold.bgGreen(" Generating zip archives... "));
  // const allArchiveName = await generateArchives();
  // console.log(chalk.black.bold.bgGreen(" Generating zip archives complete! "));

  console.log(
    chalk.black.bold.bgGreen(" Generating production index file... ")
  );
  generateIndex(allArchiveName);
  console.log(
    chalk.black.bold.bgGreen(" Generating production index file complete!")
  );
  console.log(chalk.black.bold.bgGreen(" All banners built successfully! "));

  const terserPath = path.resolve(wd, ".terserrc");
  await getAsync(`rm -r ${terserPath} || true`);
})();
