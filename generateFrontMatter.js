const glob = require('glob');
const fs = require('fs');
const matter = require('gray-matter');
const chalk = require('chalk');
const { getBannerAttributes } = require('./dev/utils');

const YAMLFrontMatter = /^---(.|\n)*?---/;

module.exports = () => {
  console.log(chalk.black.bold.bgGreen(' Generating frontMatter... '));
  const entryFiles = glob.sync(`${process.env.PROJECT_DIR}/src/**/*.hbs`);

  for (let i = 0; i < entryFiles.length; i++) {
    let filePath = entryFiles[i];
    let file = fs.readFileSync(filePath, `utf-8`);
    let data = getBannerAttributes(filePath);
    let fm = matter(file);

    if (fm.data) {
      // console.log('existing fm:', fm.data, 'new data', data);
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
  console.log(chalk.black.bold.bgGreen(' Done generating frontMatter! '));
};
