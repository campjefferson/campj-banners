const fs = require("fs");
const path = require("path");
const glob = require("glob");
const chalk = require("chalk");
const puppeteer = require("puppeteer");
const pkg = require(process.env.PROJECT_DIR + "/package.json");

const config = pkg.config;

const backupQuality = config.backupQuality || 80;
const backupQualities = config.backupQualities || {};

const bannerSelector = config.bannerSelector || null;

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureBanner(browser, bannerPath, delay) {
  console.log(
    chalk.yellow.bold(`info`),
    "generating backup image for",
    path.basename(bannerPath),
    "..."
  );
  // get the banner file name
  let fileNamePart = bannerPath;
  fileNamePart = `${path.dirname(fileNamePart)}/${path.basename(fileNamePart)}`;
  const fileName = fileNamePart + ".jpg";
  const pageUrl = `file://${bannerPath}index.html`;
  const bannerName = path.basename(fileNamePart);
  // puppeteer magic
  const page = await browser.newPage();

  await page.goto(pageUrl);
  await page.emulateMedia("screen");

  const screenshotQuality =
    backupQualities[path.basename(fileNamePart)] || backupQuality;
  // console.log({ file: path.basename(fileNamePart), screenshotQuality });

  const [width, height] = await page.evaluate((bannerSelector) => {
    let el = bannerSelector
      ? document.querySelector(bannerSelector)
      : document.getElementById("ad");
    if (el) {
      return [el.clientWidth, el.clientHeight];
    }
    return [false, false];
  }, bannerSelector);

  if (!width || !height) {
    await page.close();
    console.log(
      chalk.red.bold(`warning`),
      "no backup image was generated for",
      bannerName,
      "."
    );
    return Promise.resolve();
  }
  await page.setViewport({
    width: width,
    height: height,
    deviceScaleFactor: 1,
  });
  await timeout(delay);
  await page.screenshot({
    path: fileName,
    type: `jpeg`,
    quality: screenshotQuality,
  });
  await page.close();
  console.log(
    chalk.green.bold(`success`),
    "backup image for",
    bannerName,
    "was generated."
  );

  await timeout(10);
  let stats = fs.statSync(fileName);
  let fileSizeInBytes = stats.size;
  let fileSizeInKilobytes = fileSizeInBytes / 1000.0;
  if (fileSizeInKilobytes > 40) {
    console.log(
      chalk.red.bold(
        `\u2717 The backup image for ${bannerName} is too large! (${fileSizeInKilobytes}kb - should be < 40kb)`
      )
    );
  }
  return Promise.resolve();
}

async function captureAllBanners(banners, delay = 15000) {
  const browser = await puppeteer.launch();
  browser.setMaxListeners(100);
  await Promise.all(banners.map((b) => captureBanner(browser, b, delay)));
  await browser.close();
  return Promise.resolve();
}

module.exports = async (delay = 15000) => {
  let rootPath = path.resolve(process.env.PROJECT_DIR, `./dist`);
  let banners = glob.sync(`${rootPath}/*/`);
  await captureAllBanners(banners, delay);
};
