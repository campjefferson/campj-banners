const glob = require('glob');
const fs = require('fs');
const matter = require('gray-matter');
const YAMLFrontMatter = /^---(.|\n)*?---/;

module.exports = () => {
  const entryFiles = glob.sync(`./src/**/*.hbs`);

  for (let i = 0; i < entryFiles.length; i++) {
    let filePath = entryFiles[i];
    let file = fs.readFileSync(filePath, `utf-8`);
    let fileArr = filePath.split(`/`);
    let name = fileArr.pop();

    let dir = fileArr.pop();
    const whString = dir.split('_')[0];
    const [width, height] = whString.split('x').map(numStr => parseInt(numStr));

    let group = fileArr.pop();
    let lang = group.indexOf(`fr`) >= 0 ? `fr` : `en`;
    let fm = matter(file);
    let data = { lang, dir, name, width, height };

    if (fm.data) {
      data = Object.assign(fm.data, data);
    }

    let newFrontMatter = `${matter.stringify(``, data)}`;
    newFrontMatter = newFrontMatter.trim();
    let hasFrontMatter = file.search(YAMLFrontMatter) >= 0;

    if (hasFrontMatter) {
      file = file.replace(YAMLFrontMatter, newFrontMatter);
      fs.writeFileSync(filePath, file, `utf-8`);
    } else {
      fs.writeFileSync(filePath, `${newFrontMatter}\n${file}`);
    }
  }
};
