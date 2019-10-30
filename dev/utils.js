const path = require('path');

function findBannerWidthAndHeight(fileName) {
  const matches = fileName.match(/\d{2,3}x\d{2,3}/g);
  if (matches) {
    const result = matches[0].match(/\d{2,3}/g);
    return result;
  }
  console.warn(
    `Error: could not find width and height from the filename`,
    fileName
  );

  return [0, 0];
}

function findBannerLang(fileName) {
  let hasFrench =
    fileName.search(/fr_/gi) >= 0
      ? `fr`
      : `en` >= 0 || fileName.search(/_fr/gi) >= 0
      ? `fr`
      : `en` >= 0;
  return hasFrench ? `fr` : `en`;
}

function getBannerAttributes(fileName) {
  const dir = path.dirname(fileName);
  const name = dir.split('/').pop();
  const [width, height] = findBannerWidthAndHeight(fileName);
  const lang = findBannerLang(fileName);
  return { name, width, height, lang };
}

module.exports = { getBannerAttributes, findBannerWidthAndHeight };
