const Promise = require("bluebird").Promise;
const path = require("path");
const glob = require("glob");
const chalk = require("chalk");
const cmd = require("node-cmd");
const puppeteer = require("puppeteer");
const baseDirName =
  process.argv.indexOf("--dir") >= 0
    ? process.argv[process.argv.indexOf("--dir") + 1]
    : null;

const baseDir = baseDirName
  ? path.resolve(process.cwd(), baseDirName)
  : process.cwd();

const wrapperId =
  process.argv.indexOf("--wrapper") >= 0
    ? process.argv[process.argv.indexOf("--wrapper") + 1]
    : `ad`;

const quality =
  process.argv.indexOf("--quality") >= 0
    ? parseInt(process.argv[process.argv.indexOf("--quality") + 1])
    : 70;

const selectorsToHideString =
  process.argv.indexOf("--hide") >= 0
    ? process.argv[process.argv.indexOf("--hide") + 1]
    : null;

let fallbackPath =
  process.argv.indexOf("--fallbackpath") >= 0
    ? process.argv[process.argv.indexOf("--fallbackpath") + 1]
    : "";
if (
  fallbackPath &&
  fallbackPath.length > 1 &&
  fallbackPath.charAt(fallbackPath.length - 1) !== "/"
) {
  fallbackPath = `${fallbackPath}/`;
}

let selectorsToHide = null;
if (selectorsToHideString) {
  selectorsToHide = selectorsToHideString
    .split(",")
    .map((s) => (s.charAt(0) !== "." ? `#${s}` : s));
}

console.log("hiding", selectorsToHide);

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
  // const fileName = fileNamePart + ".jpg";
  const fileName = `${fileNamePart}/${fallbackPath}fallback.jpg`;
  const serverBannerPath = bannerPath.replace(baseDir, "");
  const pageUrl = `http://localhost:8080${serverBannerPath}index.html`;
  // puppeteer magic
  let page = await browser.newPage();
  try {
    await page.goto(pageUrl, { waitUntil: ["load", "networkidle0"] });

    await page.emulateMedia("screen");
    await page.setViewport({
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
    });

    const [width, height] = await page.evaluate(
      (wrapperId, selectorsToHide) => {
        let el = document.getElementById(wrapperId);
        try {
          if (selectorsToHide) {
            selectorsToHide.forEach((selector) => {
              document.querySelector(selector).style.display = `none`;
              document.querySelector(selector).style.visibility = `hidden`;
            });
          }
        } catch (e) {}
        if (el) {
          return [el.clientWidth, el.clientHeight];
        }
        return [false, false];
      },
      wrapperId,
      selectorsToHide
    );
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
      quality: quality,
      clip: { x: 0, y: 0, width, height },
    });

    await page.close();
    console.log(
      chalk.green.bold(`success`),
      "backup image for",
      bannerPath,
      "was generated."
    );
  } catch {
    console.log(
      chalk.red.bold(`warning`),
      "no backup gif was generated for",
      bannerPath,
      "."
    );
    return Promise.resolve();
  } finally {
    return Promise.resolve();
  }
}

async function captureAllBanners(banners, delay = 15000) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--headless",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-gpu",
      "--no-sandbox",
      "--enable-logging",
    ],
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  browser.setMaxListeners(100);
  await Promise.all(banners.map((b) => captureBanner(browser, b, delay)));
  await browser.close();
  return Promise.resolve();
}

async function generate(dir, delay = 20000) {
  console.log("generating banners for the directory", dir);
  cmd.run(`node_modules/.bin/http-server ${dir}`);
  console.log("opened server");
  let rootPath = path.resolve(dir);
  let banners = glob.sync(`${rootPath}/*/`, {
    ignore: ["./node_modules", `${rootPath}/node_modules`],
  });
  await timeout(1000);
  await captureAllBanners(banners, delay);
  console.log("all backups created");
  cmd.run(`kill -9 $(lsof -t -i tcp:8080)`);
}

generate(baseDir);
