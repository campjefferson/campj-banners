const fs = require("fs-extra");
const Promise = require("bluebird").Promise;
const path = require("path");
const glob = require("glob");
const chalk = require("chalk");
const cmd = require("node-cmd");
const getPixels = require("get-pixels");
const puppeteer = require("puppeteer");

const getAsync = Promise.promisify(cmd.get, { multiArgs: true, context: cmd });
const baseDir = process.argv[process.argv.indexOf("--dir") + 1];

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  // const fileName = fileNamePart + ".jpg";
  const fileName = `${fileNamePart}/assets/images/fallback.jpg`;
  const serverBannerPath = bannerPath.replace(baseDir, "");
  const pageUrl = `http://localhost:8080${serverBannerPath}index.html`;
  console.log(`capturing banner at ${pageUrl}`);
  // puppeteer magic
  const page = await browser.newPage();

  await page.goto(pageUrl, { waitUntil: ["load", "networkidle0"] });
  await page.emulateMedia("screen");
  await page.setViewport({
    width: 1024,
    height: 768,
    deviceScaleFactor: 1
  });
  const [width, height] = await page.evaluate(() => {
    let el = document.getElementById("wrapper");
    try {
      document.querySelector("#replay-button").style.display = `none`;
      document.querySelector("#replay-button").style.visibility = `hidden`;
      document.querySelector("#replay-button").style.visibility = `hidden`;
    } catch (e) {}

    if (el) {
      return [el.clientWidth, el.clientHeight];
    }
    return [false, false];
  });
  if (!width || !height) {
    await page.close();
    console.log(
      chalk.red.bold(`warning`),
      "no backup gif was generated for",
      bannerPath,
      "."
    );
    return Promise.resolve();
  }
  await timeout(delay);
  await page.screenshot({
    path: fileName,
    type: `jpeg`,
    quality: 70,
    clip: { x: 0, y: 0, width, height }
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
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--headless", "--hide-scrollbars", "--mute-audio"],
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  browser.setMaxListeners(100);
  await Promise.all(banners.map(b => captureBanner(browser, b, delay)));
  await browser.close();
  return Promise.resolve();
}

async function generate(dir, delay = 20000) {
  console.log("dir", dir);
  cmd.run(`node_modules/.bin/http-server ${dir}`);
  console.log("opened server");
  let rootPath = path.resolve(dir);
  let banners = glob.sync(`${rootPath}/*/`);
  await captureAllBanners(banners, delay);
  console.log("all backups created");
  cmd.run(`kill -9 8080`);
}

generate(baseDir);
