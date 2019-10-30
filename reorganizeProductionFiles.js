const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');

const rootDir = `${process.env.PROJECT_DIR}/dist`;

module.exports = async () => {
  const files = glob.sync(`${rootDir}/*/*.html`);
  for (let i = 0; i < files.length; i++) {
    let file = fs.readFileSync(files[i], `utf-8`);
    let dir = path.dirname(files[i]);
    let cssUrlMatches = file.match(/url\(.*?\)/gi);
    if (cssUrlMatches) {
      for (let j = 0; j < cssUrlMatches.length; j++) {
        let match = cssUrlMatches[j];
        let imageFileName = match.substr(4, match.length - 5);
        let fileName = `${rootDir}/${imageFileName}`;
        let newFileName = `${dir}/${imageFileName}`;
        fs.moveSync(fileName, newFileName);
      }
    }
  }

  const filesToRemove = glob.sync(`${rootDir}/*.{js,css}`);
  for (let i = 0; i < filesToRemove.length; i++) {
    let file = filesToRemove[i];
    fs.removeSync(file);
  }
};
