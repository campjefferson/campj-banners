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

let baseDir = (
  baseDirName ? path.resolve(process.cwd(), baseDirName) : process.cwd()
).replace(/\\/g, "/");

const wrapperId =
  process.argv.indexOf("--wrapper") >= 0
    ? process.argv[process.argv.indexOf("--wrapper") + 1]
    : `ad`;

const wrapperClass =
  process.argv.indexOf("--wrapperclass") >= 0
    ? process.argv[process.argv.indexOf("--wrapperclass") + 1]
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

const platform =
  process.platform && process.platform.indexOf(`dar`) >= 0 ? `mac` : `windows`;

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
  const pageUrl = `${
    platform === `mac` ? `http://localhost:8080` : `file://${baseDir}`
  }${serverBannerPath}index.html`;
  // puppeteer magic
  let page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36"
    );
    await page.goto(pageUrl, { waitUntil: ["load", "networkidle0"] });
    await page.emulateMedia("screen");
    await page.setViewport({
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
    });

    const [width, height, errors] = await page.evaluate(
      (wrapperId, wrapperClass, selectorsToHide) => {
        let el = wrapperId
          ? document.getElementById(wrapperId)
          : wrapperClass
          ? document.querySelector(`.${wrapperClass}`)
          : null;
        let errors;
        try {
          if (selectorsToHide) {
            selectorsToHide.forEach((selector) => {
              document.querySelector(selector).style.display = `none`;
              document.querySelector(selector).style.visibility = `hidden`;
            });
          }
        } catch (e) {
          errors = e;
        }
        if (el) {
          return [el.clientWidth, el.clientHeight, errors];
        }
        return [false, false, errors];
      },
      wrapperId,
      wrapperClass,
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
      console.log(chalk.red.bold(`errors`), errors);
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
      quality: quality,
    });

    await page.close();
    console.log(
      chalk.green.bold(`success`),
      "backup image for",
      bannerPath,
      "was generated."
    );
  } catch (e) {
    console.log(
      chalk.red.bold(`warning`),
      "no backup gif was generated for",
      bannerPath,
      "."
    );
    console.log(chalk.red.bold(`errors`), e);
  }
}

async function captureAllBanners(banners, delay = 15000) {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      "--window-size=1920x1080",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-gpu",
      "--no-sandbox",
      "--enable-logging",
      "--disable-dev-shm-usage",
      "--ignore-certificate-errors",
      "--disable-dev-shm-usage",
    ],
    executablePath:
      platform === `mac`
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "C:\\Program Files\\Google\\Chrome\\Application\\chrome",
  });
  browser.setMaxListeners(100);
  await Promise.all(banners.map((b) => captureBanner(browser, b, delay)));
  // await captureBanner(browser, banners[0], delay)
  await browser.close();
  return Promise.resolve();
}

async function generate(dir, delay = 20000) {
  console.log("generating banners for the directory", dir);
  // console.log("running", `node_modules/.bin/http-server ${dir}`);
  cmd.run(`node_modules/.bin/http-server ${dir}`);
  console.log("opened server");
  // await timeout(30000)
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
