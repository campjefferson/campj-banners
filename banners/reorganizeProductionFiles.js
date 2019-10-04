const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');

module.exports = async () => {
  const rootDir = path.resolve('./dist');
  const files = glob.sync('./dist/*/*.html');
  for (let i = 0; i < files.length; i++) {
    let file = fs.readFileSync(files[i], `utf-8`);
    let dir = path.dirname(files[i]);
    let cssUrlMatches = file.match(/url\(.*?\)/gi);

    for (let j = 0; j < cssUrlMatches.length; j++) {
      let match = cssUrlMatches[j];
      let imageFileName = match.substr(4, match.length - 5);
      let fileName = `${rootDir}/${imageFileName}`;
      let newFileName = `${dir}/${imageFileName}`;

      fs.moveSync(fileName, newFileName);
    }
  }

  const filesToRemove = glob.sync(`${rootDir}/*.{js,css}`);
  for (let i = 0; i < filesToRemove.length; i++) {
    let file = filesToRemove[i];
    fs.removeSync(file);
  }
};
