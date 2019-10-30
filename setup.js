const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

function getHbsDefaults() {
  return `
{{#> banner }}

<div id="banner">
    <div id="clickarea">
    </div>
</div>

{{/banner}}`;
}

function getJsDefaults() {
  return `import { domReady, getElements } from '@campj/banners/utils';

const animate = () => {
  // animation stuff
  // get all elements
  const els = getElements('.sprite');
  // create animation timeline
  const tl = new TimelineMax({ paused: true });
};
  
domReady(animate);`;
}

function getScssDefaults() {
  return `@import '~@campj/banners/scss/global.scss';
@import './xd.scss';

#ad {
  background: #fff;
}`;
}

module.exports = async () => {
  console.log(
    chalk.black.bold.bgGreen(' Ensuring folders are set up properly... ')
  );
  const entryFolders = glob.sync(`${process.env.PROJECT_DIR}/src/*/`);
  entryFolders.forEach(dir => {
    const baseDirName = path.basename(dir);
    const hbsPath = path.resolve(`${dir}/index.hbs`);
    const jsPath = path.resolve(`${dir}/banner.js`);
    const scssPath = path.resolve(`${dir}/banner.scss`);
    const xdScssPath = path.resolve(`${dir}/xd.scss`);

    const paths = [hbsPath, jsPath, scssPath];
    paths.forEach(file => {
      if (!fs.existsSync(file)) {
        const ext = path.extname(file);
        let defaults = ``;
        switch (ext) {
          case '.hbs':
            defaults = getHbsDefaults();
            break;
          case '.scss':
            defaults = getScssDefaults();
            break;
          case '.js':
            defaults = getJsDefaults();
            break;
        }
        fs.writeFileSync(file, defaults, `utf-8`);
        console.log(
          chalk.yellow.bold('info'),
          `created the file ${path.basename(file)} in ${baseDirName}`
        );
      }
    });
    if (!fs.existsSync(xdScssPath)) {
      fs.writeFileSync(xdScssPath, ``, `utf-8`);
      console.log(
        chalk.yellow.bold('info'),
        `created the file ${path.basename(xdScssPath)} in ${baseDirName}`
      );
    }
  });

  console.log(chalk.black.bold.bgGreen(' Setup complete. '));
};
