const glob = require("glob");
const fs = require("fs-extra");
const path = require("path");
const pkg = require(process.env.PROJECT_DIR + "/package.json");
const config = pkg.config;
const findBannerWidthAndHeight = require("./dev/utils")
  .findBannerWidthAndHeight;

const useLists = config.useLists === true;

function createBannerList({ title, links }, addCurrent = false) {
  if (!title || !links || links.length === 0) {
    return ``;
  }
  return `<div class="list">${title ? `<h4>${title}</h4>` : ``}<ul>${links
    .map(
      ({ label, filteredButtonLabel, buttonLabel, url, width, height }, idx) =>
        `<li><button${
          idx === 0 && addCurrent ? ' class="current"' : ""
        } data-width="${width}" data-height="${height}" data-label="${buttonLabel}" data-url="${url}" data-title="${title} - ${
          filteredButtonLabel || buttonLabel
        }">${filteredButtonLabel || buttonLabel}</button></li>`
    )
    .join("")}</ul></div>`;
}

function createBannerOptions({ title, links }, addCurrent = true) {
  if (!title || !links || links.length === 0) {
    return ``;
  }
  const arr = links.map(
    ({ label, filteredButtonLabel, buttonLabel, url, width, height }, idx) =>
      `<option${
        idx === 0 && addCurrent ? ' selected="selected"' : ""
      } value="${url}" data-width="${width}" data-height="${height}" data-label="${buttonLabel}" data-url="${url}" data-title="${title} - ${
        filteredButtonLabel || buttonLabel
      }">${title} - ${filteredButtonLabel || buttonLabel}</option>`
  );

  arr.unshift(
    `<option style="background-color: #cccccc;" disabled>${title}</option>`
  );
  return arr.join("");
}

function renderDownloads(archiveName) {
  if (archiveName) {
    return `<div id="downloads">Downloads: <a title="Package (all)" download href="/${archiveName}.zip">Package (all)</a></div>`;
  }
  return `<div></div>`;
}

function getFilteredLabel(label, filters) {
  label = label.toLowerCase();

  filters.forEach((filter) => {
    if (filter.indexOf("!") === 0 || filter.indexOf("=") === 0) {
      filter = filter.substr(1);
    }
    label = label.replace(filter, "");
    label = label.replace(filter.toLowerCase(), "");
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
  let links = dirs.map((dir) => {
    const arr = dir.split("/");
    let label = arr[arr.length - 2];
    let buttonLabel = label.replace(/_/g, " ");
    const [width, height] = findBannerWidthAndHeight(dir);
    const url = `${label}`;
    return { label, buttonLabel, url, width, height };
  });

  let groups = [];
  if (config.lists) {
    config.lists.forEach((listFilter) => {
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
          .filter((l) => {
            let passes = true;
            for (let i = 0; i < filters.length; i++) {
              let filterToUse = filters[i];
              let isNotFilter = filterToUse.indexOf("!") === 0;
              let isExactFilter = filterToUse.indexOf("=") === 0;
              if (isNotFilter || isExactFilter) {
                filterToUse = filterToUse.substr(1);
              }
              let result;
              if (isExactFilter) {
                result = l.buttonLabel
                  .toLowerCase()
                  .split(" ")
                  .includes(filterToUse.toLowerCase());
                passes = result;
              } else {
                result = l.buttonLabel.toLowerCase().indexOf(filterToUse);
                passes = isNotFilter ? result === -1 : result >= 0;
              }
              if (!passes) {
                return false;
              }
            }
            return true;
          })
          .map((l) => ({
            ...l,
            filteredButtonLabel: getFilteredLabel(l.buttonLabel, filters),
          })),
      });
    });
  } else {
    groups = [{ title: null, links }];
  }

  const bannerLists = groups.map((group, idx) =>
    createBannerList(group, idx === 0)
  );
  const bannerOptions = groups.map((group, idx) =>
    createBannerOptions(group, idx === 0)
  );

  const firstList = groups[0];
  const firstLink = firstList.links[0];

  // output html
  const html = `<html><head><title>${
    pkg.description
  } | Camp Jefferson</title><style>${css}</style></head><body><div id="wrap"><header><h1>${
    pkg.description
  }</h1><h2 id="banner-title">${firstList.title} - ${
    firstLink.filteredButtonLabel || firstLink.buttonLabel
  }</h2></header><main${useLists ? `` : ` class="wrap"`}><div id="banner-select-container">${
    useLists
      ? `<div id="list-container">${bannerLists.join("")}</div>`
      : `<div id="select-container"><span id="hidden-select-value">${
          firstList.title
        } - ${
          firstLink.filteredButtonLabel || firstLink.buttonLabel
        }</span><div class="select"><select id="banner-select">${bannerOptions}</select></div></div>`
  }<button id="replay" title="Replay"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
</svg><span </button></div><iframe id="banner-frame" src="/${firstLink.url}/index.html" style="width:${
    firstLink.width
  }px;height:${firstLink.height}px" width="${firstLink.width}" height="${
    firstLink.height
  }"></iframe></main><footer><div>${renderDownloads(
    archiveName
  )}<aside>Build: ${now.toLocaleDateString()}</aside></div></footer></div><script>${js}</script></body></html>`;
  fs.writeFileSync(`${process.env.PROJECT_DIR}/dist/index.html`, html, `utf-8`);
};
