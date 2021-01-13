const path = require("path");
const glob = require("glob");
const chalk = require("chalk");
const puppeteer = require("puppeteer");

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

  // puppeteer magic
  const page = await browser.newPage();

  await page.goto(pageUrl);
  await page.emulateMedia("screen");
  await page.setViewport({
    width: 1024,
    height: 768,
    deviceScaleFactor: 1,
  });

  const [width, height] = await page.evaluate(() => {
    let el = document.getElementById("ad");
    if (el) {
      return [el.clientWidth, el.clientHeight];
    }
    return [false, false];
  });

  if (!width || !height) {
    await page.close();
    console.log(
      chalk.red.bold(`warning`),
      "no backup image was generated for",
      bannerPath,
      "."
    );
    return Promise.resolve();
  }
  await timeout(delay);
  await page.screenshot({
    path: fileName,
    type: `jpeg`,
    quality: 80,
    clip: { x: 0, y: 0, width, height },
  });
  await page.close();
  console.log(
    chalk.green.bold(`success`),
    "backup image for",
    bannerPath,
    "was generated."
  );
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
