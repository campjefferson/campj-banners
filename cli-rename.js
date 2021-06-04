#!/usr/bin/env node
// renames EN folders for FR use

const path = require("path");
const chalk = require("chalk");
const fs = require("fs-extra");
const glob = require("glob");
const argv = require("yargs").argv;

const srcDir = path.resolve(process.cwd(), "./src");
const prefix = argv.p || argv.prefix || "EN";
const suffix = argv.s || argv.suffix || " - Copy";
const prefixReplacement = argv.pr || argv.prefixreplacement || "FR";
const suffixReplacement = argv.sr || argv.suffixreplacement || "";

console.log(argv);
console.log({ prefix, prefixReplacement, suffix, suffixReplacement });

async function rename() {
  // clean folders
  let folders = await glob.sync(`${srcDir}/${prefix || ``}**${suffix || ``}/`);
  for (let i = 0; i < folders.length; i++) {
    console.log(
      chalk.yellow.bold("info"),
      `renaming up the folder ${folders[i]}`
    );
    let newName = folders[i].replace(prefix, prefixReplacement);

    newName = newName.replace(suffix, suffixReplacement);
    await fs.renameSync(folders[i], newName);
  }
  // remove xd.scss files
  let cssFiles = await glob.sync(`${srcDir}/**/xd.scss`);
  for (let i = 0; i < cssFiles.length; i++) {
    await fs.removeSync(cssFiles[i]);
  }
}

(async function () {
  console.log(chalk.black.bold.bgGreen(" Renaming copied folders... "));
  await rename();
  console.log(chalk.black.bold.bgGreen(" Renamed folders! "));
})();
