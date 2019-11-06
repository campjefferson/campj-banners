const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const GIFEncoder = require('gifencoder');
const getPixels = require('get-pixels');
const puppeteer = require('puppeteer');

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// function decode(png) {
//   return new Promise(r => {
//     png.decode(pixels => r(pixels));
//   });
// }

function decode(png) {
  return new Promise(r => {
    getPixels(png, `image/png`, (err, pixels) => r(pixels.data));
  });
}

async function captureBanner(browser, bannerPath, delay) {
  console.log(
    chalk.yellow.bold(`info`),
    'generating backup gif for',
    path.basename(bannerPath),
    '...'
  );
  // get the banner file name
  let fileNamePart = bannerPath;
  fileNamePart = `${path.dirname(fileNamePart)}/${path.basename(fileNamePart)}`;
  const fileName = fileNamePart + '.gif';
  const pageUrl = `file://${bannerPath}index.html`;

  // puppeteer magic

  const page = await browser.newPage();
  await page.goto(pageUrl);
  const [width, height] = await page.evaluate(() => {
    let el = document.getElementById('ad');
    if (el) {
      return [el.clientWidth, el.clientHeight];
    }
    return [false, false];
  });
  if (!width || !height) {
    await page.close();
    console.log(
      chalk.red.bold(`warning`),
      'no backup gif was generated for',
      bannerPath,
      '.'
    );
    return Promise.resolve();
  }
  await timeout(delay);

  const pngBuffer = await page.screenshot({
    type: `png`,
    clip: { x: 0, y: 0, width, height }
  });

  // encode gif
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setQuality(1);
  encoder.createWriteStream().pipe(fs.createWriteStream(fileName));

  await decode(pngBuffer).then(pixels => encoder.addFrame(pixels));
  encoder.finish();

  await page.close();
  console.log(
    chalk.green.bold(`success`),
    'backup gif for',
    bannerPath,
    'was generated.'
  );
  return Promise.resolve();
}

async function captureAllBanners(banners, delay = 15000) {
  const browser = await puppeteer.launch();
  browser.setMaxListeners(100);
  await Promise.all(banners.map(b => captureBanner(browser, b, delay)));
  await browser.close();
  return Promise.resolve();
}

module.exports = async (delay = 15000) => {
  let rootPath = path.resolve(process.env.PROJECT_DIR, `./dist`);
  let banners = glob.sync(`${rootPath}/*/`);
  await captureAllBanners(banners, delay);
};
