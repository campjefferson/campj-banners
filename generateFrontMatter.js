const glob = require("glob");
const fs = require("fs");
const matter = require("gray-matter");
const chalk = require("chalk");
const { getBannerAttributes } = require("./dev/utils");

const YAMLFrontMatter = /^---(.|\n)*---/;
// const YAMLFrontMatter2 = /---(.|\n)*?---/g;

module.exports = () => {
  console.log(chalk.black.bold.bgGreen(" Generating frontMatter... "));
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
    let hasFrontMatter = matter.test(file);
    // console.log({ filePath, hasFrontMatter });
    if (hasFrontMatter) {
      fs.writeFileSync(filePath, `${newFrontMatter}\n${fm.content}`);
    }
  }
  console.log(chalk.black.bold.bgGreen(" Done generating frontMatter! "));
};
