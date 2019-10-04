const glob = require("glob");
const fs = require("fs-extra");
const path = require("path");
const Spritesmith = require("spritesmith");
const camelCase = require("camelcase");

function getNameAndResolution(n, list) {
  const aName = n.split("/");
  let fileName = aName.pop();
  fileName = fileName.substr(0, fileName.length - 3);
  let resName = fileName.split(`@`);
  let name = resName[0];
  let res = resName[1] ? parseInt(resName[1]) : 1;
  // name = name.replace(/\./g, '');
  // name = name.replace(/\s/g, '-');
  // name = name.toLowerCase();
  name = camelCase(name);
  // console.log(name);
  const existing = list.filter(item => item.name === name);
  if (existing.length > 0) {
    name = `${name}-${existing.length}`;
  }
  return [name, res];
}

function outputSass(item, spriteWidth, spriteHeight) {
  const w = Math.ceil(item.width / item.resolution);
  const h = Math.ceil(item.height / item.resolution);
  const bw = Math.ceil(spriteWidth / item.resolution);
  const bh = Math.ceil(spriteHeight / item.resolution);
  const width = `width:${w}px`;
  const height = `height:${h}px`;
  const backgroundPosition = `background-position:-${Math.ceil(
    item.x / item.resolution
  )}px -${Math.ceil(item.y / item.resolution)}px`;

  const css = `&.${item.name}{display:block;${width};${height};${backgroundPosition};background-size:${bw}px ${bh}px}`;

  return css;
}

async function generate() {
  console.log(`generating sprites...`);
  const dirs = glob.sync("./src/*/*", { absolute: false });
  for (let i = 0; i < dirs.length; i++) {
    let dir = dirs[i];
    let dirName = dir.split("/").pop();
    let spriteFileName = dir.replace(/\//g, "-");
    spriteFileName = spriteFileName.replace(/(\.-src)/g, "");
    let spriteName = `sprite${spriteFileName.toLowerCase()}.png`;
    let images = glob.sync(`${dir}/sprite/*.png`);
    fs.removeSync(`${dir}/img`);
    fs.mkdirSync(`${dir}/img`);
    if (images.length > 0) {
      Spritesmith.run({ src: images }, (err, result) => {
        const ref = [];
        const names = Object.keys(result.coordinates);
        names.forEach(n => {
          let props = result.coordinates[n];
          let [name, resolution] = getNameAndResolution(n, ref);
          ref.push({ name, resolution, ...props });
        });
        const sass = `.sprite{background:url("./img/${spriteName}") no-repeat top left;${ref
          .map(item =>
            outputSass(item, result.properties.width, result.properties.height)
          )
          .join("")}}`;
        fs.writeFileSync(
          path.resolve(`${dir}/img/${spriteName}`),
          result.image
        );
        fs.writeFileSync(path.resolve(`${dir}/sprite.scss`), sass);

        console.log(`generated the spritesheet ${dir}/img/${spriteName}`);
      });
    }
  }
}

module.exports = generate;
