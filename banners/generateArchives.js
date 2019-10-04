const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yazl = require('yazl');
const pkg = require(process.cwd() + '/package.json');

let completed = 0;

async function bannerArchives(allZipFileName) {
  const banners = glob.sync('./dist/*/');

  for (let i = 0; i < banners.length; i++) {
    let dirName = banners[i];
    let zipFilename = dirName.substr(0, dirName.length - 1);
    let files = glob.sync(`${dirName}/*`);
    let zipFile = new yazl.ZipFile();

    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      const aFile = f.split('/');
      const fileNameInZipFile = aFile[aFile.length - 1];
      const prefix = zipFilename.replace('/dist', '');
      zipFile.addFile(f, `${prefix}/${fileNameInZipFile}`);
    }

    zipFile.outputStream
      .pipe(fs.createWriteStream(`${zipFilename}.zip`))
      .on('close', function() {
        completed++;
        console.log(
          `created ${zipFilename}.zip (${completed} of ${banners.length})`
        );
        if (completed === banners.length) {
          allArchive(allZipFileName);
        }
      });
    zipFile.end();
  }
}

async function allArchive(allZipFileName) {
  const files = glob.sync(`./dist/*.zip`);
  let zipFile = new yazl.ZipFile();

  for (let i = 0; i < files.length; i++) {
    let fileName = path.basename(files[i]);
    let gifPath = `${files[i].substr(0, files[i].length - 3)}gif`;
    let gifFileName = path.basename(gifPath);

    zipFile.addFile(files[i], fileName);
    zipFile.addFile(gifPath, gifFileName);
  }

  zipFile.outputStream
    .pipe(fs.createWriteStream(`./dist/${allZipFileName}.zip`))
    .on('close', function() {
      console.log(`created ${allZipFileName}.zip`);
    });

  zipFile.end();
}

module.exports = async () => {
  const now = new Date();
  const allZipFileName = `${
    pkg.name
  }-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  console.log('archiving banners...');
  await bannerArchives(allZipFileName);

  return allZipFileName;
};
