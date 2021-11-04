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

const selectorsToHide = config.backupSelectorsToHide || null;
const selectorsToShow = config.backupSelectorsToShow || null;
const selectorStyles = config.backupSelectorStyles || null;

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

  let bSelectorsToHide = null;
  let bSelectorsToShow = null;
  let foundSelectors;

  if (selectorsToHide) {
    foundSelectors = selectorsToHide.find(
      (item) => item.name && bannerPath.indexOf(item.name) >= 0
    );
    bSelectorsToHide = foundSelectors
      ? foundSelectors.selectors
      : selectorsToHide.filter((item) => typeof item === `string`);
  }
  foundSelectors = null;
  if (selectorsToShow) {
    foundSelectors = selectorsToShow.find(
      (item) => item.name && bannerPath.indexOf(item.name) >= 0
    );
    // if (foundSelectors) {
    //   console.log({ bannerPath, selectors: foundSelectors.selectors });
    // }
    bSelectorsToShow = foundSelectors
      ? foundSelectors.selectors
      : selectorsToShow.filter((item) => typeof item === `string`);
  }

  const backupSelectorStyles = selectorStyles
    ? selectorStyles.find((item) => bannerPath.indexOf(item.name) >= 0)
    : null;

  // console.log({ bannerPath, bSelectorsToHide, bSelectorsToShow });

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

  if (bSelectorsToHide || bSelectorsToShow || backupSelectorStyles) {
    const [errors] = await page.evaluate(
      (bannerSelector, selectorsToHide, selectorsToShow, selectorStyles) => {
        let el = bannerSelector
          ? document.querySelector(bannerSelector)
          : document.getElementById("ad");

        let errors = [];
        try {
          if (selectorsToHide) {
            Array.from(
              document.querySelectorAll(selectorsToHide.join(","))
            ).forEach((el) => {
              el.style.visibility = `hidden`;
            });
          }
          if (selectorsToShow) {
            Array.from(
              document.querySelectorAll(selectorsToShow.join(","))
            ).forEach((el) => {
              el.style.visibility = `visible`;
              el.style.opacity = 1;
              el.style.transform = `translate3d(0, 0, 0)`;
            });
          }
          if (selectorStyles) {
            for (let i = 0; i < selectorStyles.styles.length; i++) {
              let s = selectorStyles.styles[i];
              let el = document.querySelector(s.selector);
              let keys = Object.keys(s.style);
              for (let k = 0; k < keys.length; k++) {
                let key = keys[k];
                el.style[key] = s.style[key];
              }
            }
          }
        } catch (e) {
          errors.push(e);
        }
        if (errors.length) {
          return [errors];
        }
        return [true];
      },
      bannerSelector,
      bSelectorsToHide,
      bSelectorsToShow,
      backupSelectorStyles
    );

    if (errors.length) {
      console.log({ errors });
    }
  }

  let screenshotError = false;

  await page
    .screenshot({
      path: fileName,
      type: `jpeg`,
      quality: screenshotQuality,
      captureBeyondViewport: false,
      fullPage: false,
    })
    .catch((e) => {
      screenshotError = true;
      console.log(
        chalk.red.bold(`error`),
        "backup image for",
        bannerName,
        "was not generated due to an error:"
      );
      console.log(e);
    });

  await page.close();

  if (!screenshotError) {
    console.log(
      chalk.green.bold(`success`),
      "backup image for",
      bannerName,
      "was generated."
    );
  }

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
  const browser = await puppeteer.launch({
    args: ["--disable-dev-shm-usage"],
  });
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
