const fs = require("fs-extra");
const path = require("path");
const phantom = require("phantom");
const glob = require("glob");
const gm = require("gm").subClass({ imageMagick: true });

const ORIGINAL_FORMAT = "jpg";

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture(page, targetFile, clipRect) {
  let width, height;
  const fileName = path.basename(targetFile);
  const aFileName = fileName.split("_");
  const aSize = aFileName[0].split("x");
  width = parseInt(aSize[0]);
  height = parseInt(aSize[1]);
  await page.property("viewportSize", { width: width, height: height });
  var clipRect = { top: 0, left: 0, width: width, height: height };
  console.log("Capturing page to " + targetFile, width, height);
  await page.render(targetFile, { format: ORIGINAL_FORMAT, quality: "100" });
  return new Promise(resolve => resolve());
}

async function captureSelector(page, targetFile, selector) {
  const clipRect = await page.evaluate(
    function(selector) {
      try {
        var clipRect = document.querySelector(selector).getBoundingClientRect();
        return {
          top: clipRect.top,
          left: clipRect.left,
          width: clipRect.width,
          height: clipRect.height
        };
      } catch (e) {
        console.log(
          "Unable to fetch bounds for element " + selector,
          "warning"
        );
      }
    },
    { selector: selector }
  );
  await capture(page, targetFile, clipRect);
  return Promise.resolve();
}

async function convertImage(fileName) {
  const dirName = path.dirname(fileName);
  let newFileName = path.basename(fileName);
  const aFileName = newFileName.split(".");
  newFileName = aFileName[0];

  gm(fileName).setFormat("gif");

  fs.move(fileName, path.resolve("./dist/" + newFileName + ".gif"), err => {
    if (err) console.error(err);
  });
  return Promise.resolve();
}

async function captureBanner(page, link, bannerDelay = 15000) {
  const fileNamePart = link.substr(0, link.length - 1);
  const fileName = path.resolve(
    "./dist/" + fileNamePart + "." + ORIGINAL_FORMAT
  );
  await page.open(link + "/index.html");
  await page.includeJs(path.resolve("./_common/dev/jquery.min.js"));

  await timeout(bannerDelay);
  await captureSelector(page, fileName, "#ad");
  await convertImage(fileName);
  return Promise.resolve();
}

async function captureAllBanners(page, list, bannerDelay = 15000) {
  for (let i = 0; i < list.length; i++) {
    await captureBanner(page, list[i], bannerDelay);
  }
  return Promise.resolve();
}

module.exports = async (timeout = 15000) => {
  const banners = glob.sync(`./dist/*/`);

  const instance = await phantom.create();
  const page = await instance.createPage();

  page.on("onResourceRequested", function(requestData) {
    console.info("Requesting", requestData.url);
  });

  await captureAllBanners(page, banners, timeout);
  await instance.exit();
  await fs.removeSync("./dist/dist");
};
