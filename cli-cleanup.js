#!/usr/bin/env node
// cleans up folders copy / pasted from a previous project
// remove all images and "xd.scss" files from source folders
const path = require("path");
const chalk = require("chalk");
const fs = require("fs-extra");
const glob = require("glob");
const argv = require("yargs").argv;
const srcDir = path.resolve(process.cwd(), "./src");
const outputOnly = argv.o || argv.output;
const prefix = argv.p || argv.prefix;
const suffix = argv.s || argv.suffix;

async function cleanup() {
  // clean folders
  let folders = await glob.sync(
    outputOnly
      ? `${srcDir}/${prefix || ``}**${suffix || ``}/img/`
      : `${srcDir}/${prefix || ``}**${suffix || ``}/{img,sprite}/`
  );
  for (let i = 0; i < folders.length; i++) {
    console.log(
      chalk.yellow.bold("info"),
      `cleaning up the folder ${folders[i]}`
    );
    await fs.emptyDirSync(folders[i]);
  }
  // remove xd.scss files
  let cssFiles = await glob.sync(`${srcDir}/**/xd.scss`);
  for (let i = 0; i < cssFiles.length; i++) {
    await fs.removeSync(cssFiles[i]);
  }
}

(async function () {
  console.log(chalk.black.bold.bgGreen(" Cleaning up image folders... "));
  await cleanup();
  console.log(chalk.black.bold.bgGreen(" Cleaned up all image folders! "));
})();
