const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');
const pkg = require(process.env.PROJECT_DIR + '/package.json');
const config = pkg.config;
const findBannerWidthAndHeight = require('./dev/utils')
  .findBannerWidthAndHeight;

function createBannerList({ title, links }, addCurrent = false) {
  return `<div class="list">${title ? `<h4>${title}</h4>` : ``}<ul>${links
    .map(
      ({ label, filteredButtonLabel, buttonLabel, url, width, height }, idx) =>
        `<li><button${
          idx === 0 && addCurrent ? ' class="current"' : ''
        } data-width="${width}" data-height="${height}" data-label="${buttonLabel}" data-url="${url}" >${filteredButtonLabel ||
          buttonLabel}</button></li>`
    )
    .join('')}</ul></div>`;
}

function renderDownloads(archiveName) {
  if (archiveName) {
    return `<div id="downloads">Downloads: <a title="Package (all)" download href="/${archiveName}.zip">Package (all)</a></div>`;
  }
  return `<div></div>`;
}

module.exports = (archiveName = null) => {
  const now = new Date();
  // load css and js file as text
  const css = fs.readFileSync(path.join(__dirname, './dev/index.css'));
  const js = fs.readFileSync(path.join(__dirname, './dev/index.js'));

  // get published banner directories
  const rootPath = path.resolve(process.env.PROJECT_DIR, `./dist`);
  const rootSrc = path.resolve(process.env.PROJECT_DIR, `./src`);
  let dirs = glob.sync(`${rootPath}/*/`);
  let srcDirs = glob.sync(`${rootSrc}/*/`);
  if (dirs.length === 0) {
    const folderName = path.basename(srcDirs[0]);
    fs.moveSync(
      `${rootPath}/index.html`,
      `${rootPath}/${folderName}/index.html`
    );
    dirs = glob.sync(`${rootPath}/*/`);
  }

  // generate links to banners
  let links = dirs.map(dir => {
    const arr = dir.split('/');
    let label = arr[arr.length - 2];
    let buttonLabel = label.replace(/_/g, ' ');
    const whString = label.split('_')[0];
    const [width, height] = findBannerWidthAndHeight(dir);
    const url = `${label}`;
    return { label, buttonLabel, url, width, height };
  });

  let groups = [];
  if (config.lists) {
    config.lists.forEach(listFilter =>
      groups.push({
        title: listFilter,
        links: links
          .filter(l => l.buttonLabel.toLowerCase().indexOf(listFilter) >= 0)
          .map(l => ({
            ...l,
            filteredButtonLabel: l.buttonLabel
              .toLowerCase()
              .replace(listFilter, '')
              .trim()
          }))
      })
    );
  } else {
    groups = [{ title: null, links }];
  }

  const bannerLists = groups.map((group, idx) =>
    createBannerList(group, idx === 0)
  );

  // output html
  const html = `<html><head><title>${
    pkg.description
  } | Camp Jefferson</title><style>${css}</style></head><body><div id="wrap"><header><h1>${
    pkg.description
  }</h1><h2 id="banner-title">${
    links[0].buttonLabel
  }</h2></header><main><div id="list-container">${bannerLists.join(
    ''
  )}</div><iframe id="banner-frame" src="/${
    links[0].url
  }/index.html" style="width:${links[0].width}px;height:${
    links[0].height
  }px" width="${links[0].width}" height="${
    links[0].height
  }"></iframe></main><footer><div>${renderDownloads(
    archiveName
  )}<aside>Build: ${now.toLocaleDateString()}</aside></div></footer></div><script>${js}</script></body></html>`;
  fs.writeFileSync(`${process.env.PROJECT_DIR}/dist/index.html`, html, `utf-8`);
};