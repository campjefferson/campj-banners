const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird').Promise;
const Spritesmith = require('spritesmith');
const camelCase = require('camelcase');

const spriteSmithRunAsync = Promise.promisify(Spritesmith.run, {
  multiArgs: true
});

function getProjectAssets(bannerId) {
  const projectFilePath = `${process.env.PROJECT_DIR}/.bannerproject`;
  if (!fs.existsSync(projectFilePath)) {
    return null;
  }
  const projectSettings = fs.readJSONSync(projectFilePath);
  let bannerSettings = null;
  if (projectSettings.banners) {
    bannerSettings = projectSettings.banners[bannerId];
  }
  if (
    !bannerSettings ||
    !bannerSettings.artboards ||
    bannerSettings.artboards.length === 0
  ) {
    return null;
  }
  const artboards = bannerSettings.artboards;
  let result = {};
  artboards.forEach(ab => {
    const assets = projectSettings.assets[ab];
    if (!assets) {
      return;
    }
    assets.forEach(asset => {
      result[asset.name] = asset;
    });
  });
  return result;
}

function getNameAndResolution(n, list) {
  let fileName = path.basename(n);
  let baseFilename = fileName.replace(path.extname(fileName), '');
  let res = 1;
  if (baseFilename.lastIndexOf(`@`) >= 0) {
    let resNameArr = baseFilename.split(`@`);
    res = resNameArr.pop();
    res = res.replace('x', '');
    res = parseFloat(res);
    baseFilename = resNameArr.join('');
  }
  let assetName = baseFilename.trim();
  let name = camelCase(baseFilename);
  const existing = list.filter(item => item.name === name);
  if (existing.length > 0) {
    name = `${name}-${existing.length}`;
  }
  return [name, res, assetName];
}

function outputSassForSprite(item, spriteWidth, spriteHeight) {
  // console.log(item.assetProps);
  const res = item.assetProps ? item.assetProps.exportScale : item.resolution;
  const w = Math.ceil(item.width / res);
  const h = Math.ceil(item.height / res);
  const bw = Math.ceil(spriteWidth / res);
  const bh = Math.ceil(spriteHeight / res);
  const width = `width:${w}px`;
  const height = `height:${h}px`;
  const backgroundPosition = `background-position:-${Math.ceil(
    item.x / res
  )}px -${Math.ceil(item.y / res)}px`;

  const css = `&.${
    item.name
  }{display:block;${width};${height};${backgroundPosition};background-size:${bw}px ${bh}px; ${
    item.assetProps
      ? `top:${Math.round(item.assetProps.y)}px; left:${Math.round(
          item.assetProps.x
        )}px;`
      : ``
  }}`;

  return css;
}

async function generate(globPattern) {
  if (!globPattern) {
    globPattern = `${process.env.PROJECT_DIR}/src/*/`;
  }
  console.log(`generating css for assets...`);
  const dirs = glob.sync(globPattern, { absolute: false });
  if (!Array.isArray(dirs)) {
    dirs = [dirs];
  }
  for (let i = 0; i < dirs.length; i++) {
    let dir = dirs[i];
    if (dir.charAt(dir.length - 1) === `/`) {
      dir = dir.substr(0, dir.length - 1);
    }
    let spriteFileName = dirs[i]
      .substr(dirs[i].indexOf('src'))
      .replace(/\//g, '-');
    spriteFileName = spriteFileName.substr(0, spriteFileName.length - 1);
    spriteFileName = spriteFileName.replace(/(\.-src)/g, '');
    spriteFileName = spriteFileName.replace(/src/g, '');
    const bannerId = spriteFileName.substr(1);

    const projectAssets = getProjectAssets(bannerId);
    const spriteName = `sprite${spriteFileName.toLowerCase()}.png`;
    let sass = `.sprite{background:url("./img/${spriteName}") no-repeat top left;`;
    let images = glob.sync(`${dir}/sprite/*.png`);

    if (!fs.existsSync(`${dir}/img`)) {
      fs.mkdirSync(`${dir}/img`);
    }

    if (images.length > 0) {
      const [result] = await spriteSmithRunAsync({ src: images });
      const ref = [];
      const names = Object.keys(result.coordinates);
      names.forEach(n => {
        let props = result.coordinates[n];
        let [name, resolution, assetName] = getNameAndResolution(n, ref);

        ref.push({
          name,
          resolution,
          assetProps: projectAssets ? projectAssets[assetName] : null,
          ...props
        });
      });
      sass = `${sass}${ref
        .map(item =>
          outputSassForSprite(
            item,
            result.properties.width,
            result.properties.height
          )
        )
        .join('')}}`;
      fs.writeFileSync(path.resolve(`${dir}/img/${spriteName}`), result.image);
      console.log(`generated the spritesheet ${spriteName}`);
    }

    images = glob.sync(`${dir}/img/*.*`);
    if (images.length > 0) {
      images.forEach(imgFileName => {
        const assetName = path.basename(imgFileName);
        const assetId = assetName.substr(0, assetName.length - 4);
        const assetSettings = projectAssets[assetId];
        if (assetSettings && assetSettings.addCss) {
          sass = `${sass}.${assetId}{background:url(./img/${assetName}) no-repeat top left; display:block; width:${assetSettings.width}px; height:${assetSettings.height}px; background-size:100% 100%; }`;
          console.log(`generated the css for ${dir}/img/${assetName}`);
        }
      });
    }

    fs.writeFileSync(path.resolve(`${dir}/xd.scss`), sass);
  }
  console.log(`css for assets generated!`);
}

module.exports = generate;
