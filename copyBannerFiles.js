const glob = require("glob");
const fs = require("fs-extra");
const path = require("path");

async function copyBannerFiles() {
  const banners = glob.sync(`${process.env.PROJECT_DIR}/src/*/`, {
    absolute: false,
  });
  for (let i = 0; i < banners.length; i++) {
    let dirName = banners[i];
    let folderName = path.basename(dirName);
    await fs.copySync(
      dirName,
      path.resolve(process.env.PROJECT_DIR, `./dist/${folderName}`)
    );
  }
}

module.exports = copyBannerFiles;
