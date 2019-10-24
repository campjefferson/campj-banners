const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const GIFEncoder = require('gifencoder');
const PNG = require('png-js');
const puppeteer = require('puppeteer');

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function decode(png) {
  return new Promise(r => {
    png.decode(pixels => r(pixels));
  });
}

async function captureBanner(browser, bannerPath, delay) {
  console.info('generating backup gif for', bannerPath, '...');
  // get the banner file name
  let fileNamePart = bannerPath;
  fileNamePart = `${path.dirname(fileNamePart)}/${path.basename(fileNamePart)}`;
  const fileName = fileNamePart + '.gif';
  const pageUrl = `file://${bannerPath}index.html`;

  // puppeteer magic

  const page = await browser.newPage();
  await page.goto(pageUrl);
  const [width, height] = await page.evaluate(() => {
    return [
      document.getElementById('ad').clientWidth,
      document.getElementById('ad').clientHeight
    ];
  });
  await timeout(delay);

  const pngBuffer = await page.screenshot({
    type: `png`,
    clip: { x: 0, y: 0, width, height }
  });

  // encode gif
  const encoder = new GIFEncoder(width, height);
  const png = new PNG(pngBuffer);

  encoder.start();
  encoder.setRepeat(0);
  encoder.setQuality(10); // default
  encoder.createWriteStream().pipe(fs.createWriteStream(fileName));

  await decode(png).then(pixels => encoder.addFrame(pixels));
  encoder.finish();

  await page.close();
  console.info('backup gif for', bannerPath, 'was generated.');
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
