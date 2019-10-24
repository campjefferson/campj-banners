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

function outputSass(item, spriteWidth, spriteHeight) {
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
  console.log(`generating sprites...`);
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
    const images = glob.sync(`${dir}/sprite/*.png`);
    if (!fs.existsSync(`${dir}/img`)) {
      fs.mkdirSync(`${dir}/img`);
    }

    // if (projectAssets) {
    //   console.log(bannerId, projectAssets);
    // }

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
      const sass = `.sprite{background:url("./img/${spriteName}") no-repeat top left;${ref
        .map(item =>
          outputSass(item, result.properties.width, result.properties.height)
        )
        .join('')}}`;
      fs.writeFileSync(path.resolve(`${dir}/img/${spriteName}`), result.image);
      fs.writeFileSync(path.resolve(`${dir}/sprite.scss`), sass);

      console.log(`generated the spritesheet ${spriteName}`);
    }
  }
  console.log(`sprites generated!`);
}

module.exports = generate;
