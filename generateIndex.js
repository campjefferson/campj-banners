const glob = require("glob");
const fs = require("fs-extra");
const path = require("path");
const pkg = require(process.env.PROJECT_DIR + "/package.json");
const config = pkg.config;
const findBannerWidthAndHeight = require("./dev/utils")
  .findBannerWidthAndHeight;

function createBannerList({ title, links }, addCurrent = false) {
  return `<div class="list">${title ? `<h4>${title}</h4>` : ``}<ul>${links
    .map(
      ({ label, filteredButtonLabel, buttonLabel, url, width, height }, idx) =>
        `<li><button${
          idx === 0 && addCurrent ? ' class="current"' : ""
        } data-width="${width}" data-height="${height}" data-label="${buttonLabel}" data-url="${url}" >${filteredButtonLabel ||
          buttonLabel}</button></li>`
    )
    .join("")}</ul></div>`;
}

function renderDownloads(archiveName) {
  if (archiveName) {
    return `<div id="downloads">Downloads: <a title="Package (all)" download href="/${archiveName}.zip">Package (all)</a></div>`;
  }
  return `<div></div>`;
}

function getFilteredLabel(label, filters) {
  label = label.toLowerCase();

  filters.forEach(filter => {
    if (filter.indexOf("!") === 0) {
      filter = filter.substr(1);
    }
    label = label.replace(filter, "");
  });

  return label.trim();
}

module.exports = (archiveName = null) => {
  const now = new Date();
  // load css and js file as text
  const css = fs.readFileSync(path.join(__dirname, "./dev/index.css"));
  const js = fs.readFileSync(path.join(__dirname, "./dev/index.js"));

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
    const arr = dir.split("/");
    let label = arr[arr.length - 2];
    let buttonLabel = label.replace(/_/g, " ");
    const [width, height] = findBannerWidthAndHeight(dir);
    const url = `${label}`;
    return { label, buttonLabel, url, width, height };
  });

  let groups = [];
  if (config.lists) {
    config.lists.forEach(listFilter => {
      let title = listFilter;
      let filter = listFilter;
      let filters;

      if (typeof listFilter === `object`) {
        title = listFilter.title;
        if (listFilter.filter) {
          if (Array.isArray(listFilter.filter)) {
            filters = listFilter.filter;
          } else {
            filter = listFilter.filter;
          }
        } else {
          filter = title;
        }
      }
      if (!filters) {
        filters = [filter];
      }
      groups.push({
        title,
        links: links
          .filter(l => {
            let passes = true;
            for (let i = 0; i < filters.length; i++) {
              let filterToUse = filters[i];
              let isNotFilter = filterToUse.indexOf("!") === 0;
              if (isNotFilter) {
                filterToUse = filterToUse.substr(1);
              }
              let result = l.buttonLabel.toLowerCase().indexOf(filterToUse);
              passes = isNotFilter ? result === -1 : result >= 0;
              if (!passes) {
                return false;
              }
            }
            return true;
          })
          .map(l => ({
            ...l,
            filteredButtonLabel: getFilteredLabel(l.buttonLabel, filters)
          }))
      });
    });
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
    ""
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
