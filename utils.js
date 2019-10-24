var bannerElements = {};

function domReady(callback) {
  function handleReadyChange() {
    if (
      document.readyState === 'interactive' ||
      document.readyState === 'complete'
    ) {
      document.removeEventListener('readystatechange', handleReadyChange);
      callback();
    }
  }
  if (document.readyState !== 'undefined') {
    document.addEventListener('readystatechange', handleReadyChange);
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

function getElements(selector) {
  if (selector === undefined) {
    selector = '.sprite';
  }
  var obj = bannerElements;
  var elements = Array.prototype.slice.call(
    document.querySelectorAll(selector)
  );

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var classes = Array.prototype.slice.call(element.classList);
    for (var j = 0; j < classes.length; j++) {
      var elClass = classes[j];
      if (!obj[elClass]) {
        obj[elClass] = [element];
      }
      obj[elClass].push(element);
    }
  }

  var keys = Object.keys(obj);

  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    if (obj[key].length === 1) {
      obj[key] = obj[key][0];
    }
  }
  return obj;
}

function getElement(id) {
  return bannerElements[id];
}

module.exports = { domReady, getElements, getElement };
