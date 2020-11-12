const fs = require("fs");
const path = require("path");
const glob = require("glob");
const yazl = require("yazl");
const pkg = require(process.env.PROJECT_DIR + "/package.json");
const chalk = require("chalk");
let completed = 0;

async function bannerArchives(allZipFilename) {
  // get banner folders
  const banners = glob.sync(`${process.env.PROJECT_DIR}/dist/*/`, {
    absolute: false,
  });

  // create individual banner zip files
  for (let i = 0; i < banners.length; i++) {
    let dirName = banners[i];

    let zipFilename = dirName.substr(0, dirName.length - 1);
    let files = glob.sync(`${dirName}/*`);
    let zipFile = new yazl.ZipFile();

    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      const aFile = f.split("/");
      const filenameInZipFile = aFile[aFile.length - 1];
      zipFile.addFile(f, filenameInZipFile);
    }

    zipFile.outputStream
      .pipe(fs.createWriteStream(`${zipFilename}.zip`))
      .on("close", function () {
        completed++;
        console.log(
          chalk.green.bold(`success`),
          `created ${path.basename(zipFilename)}.zip (${completed} of ${
            banners.length
          })`
        );
        // check the file size of the zip file to give us
        // an idea of the gzipped banner size
        let zipFileStats = fs.statSync(`${zipFilename}.zip`);
        let zipFileSizeInBytes = zipFileStats["size"];
        let zipFileSizeInKilobytes = zipFileSizeInBytes / 1000.0;
        console.log(
          chalk.yellow.bold(`File Size: `),
          `${zipFileSizeInKilobytes}KB`,
          zipFileSizeInKilobytes > 150
            ? chalk.red.bold(`\u2717 potentially too large!`)
            : chalk.green.bold(`\u2713 good!`)
        );
        if (completed === banners.length) {
          allArchive(allZipFilename);
        }
      });
    zipFile.end();
  }
}

async function allArchive(allZipFilename) {
  const files = glob.sync(
    path.resolve(process.env.PROJECT_DIR, `./dist/*.zip`)
  );
  let zipFile = new yazl.ZipFile();

  for (let i = 0; i < files.length; i++) {
    let filename = path.basename(files[i]);
    let backupImagePath = `${files[i].substr(0, files[i].length - 3)}jpg`;
    let backupImageFilename = path.basename(backupImagePath);
    if (fs.existsSync(backupImagePath)) {
      zipFile.addFile(files[i], filename);
      zipFile.addFile(backupImagePath, backupImageFilename);
    }
  }

  zipFile.outputStream
    .pipe(
      fs.createWriteStream(
        path.resolve(process.env.PROJECT_DIR, `./dist/${allZipFilename}.zip`)
      )
    )
    .on("close", function () {
      console.log(chalk.green.bold(`success`), `created ${allZipFilename}.zip`);
    });

  zipFile.end();
}

module.exports = async () => {
  const now = new Date();

  const allZipFilename = `${
    pkg.name
  }-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  await bannerArchives(allZipFilename);
  return allZipFilename;
};
