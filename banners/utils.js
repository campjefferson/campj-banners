let bannerElements = {};

const domReady = callback => {
  document.readyState === 'interactive' || document.readyState === 'complete'
    ? callback()
    : document.addEventListener('DOMContentLoaded', callback);
};

const getElements = (selector = '.sprite') => {
  let obj = bannerElements;
  Array.prototype.slice
    .call(document.querySelectorAll(selector))
    .forEach(element => {
      Array.prototype.slice.call(element.classList).forEach(elClass => {
        if (!obj[elClass]) {
          obj[elClass] = [element];
        } else {
          obj[elClass].push(element);
        }
      });
    });
  const keys = Object.keys(obj);
  keys.forEach(key => {
    if (obj[key].length === 1) {
      obj[key] = obj[key][0];
    }
  });
  return obj;
};

const getElement = id => {
  return bannerElements[id];
};

module.exports = { domReady, getElements, getElement };
