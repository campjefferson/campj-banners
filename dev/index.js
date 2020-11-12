var bannerSelectContainer;
var listContainer;

var buttons;
var select;
var hiddenSelectContainer;
var storedIframeProps = {};

function setIframeTo(url, width, height, title) {
  storedIframeProps.url = url;
  storedIframeProps.width = width;
  storedIframeProps.height = height;
  storedIframeProps.title = title;

  var frame = document.getElementById("banner-frame");
  frame.setAttribute("src", "/" + url + "/index.html");
  frame.style.width = width + "px";
  frame.style.height = height + "px";
  frame.setAttribute("width", width);
  frame.setAttribute("height", height);
  var h2 = document.getElementById("banner-title");
  h2.innerHTML = title;

  if (hiddenSelectContainer) {
    hiddenSelectContainer.innerHTML = title;
  }
}

function handleButtonClick(e) {
  var btn = e.target;
  var data = btn.dataset;
  window.location.hash = data.url;
}

function handleSelectChange(e) {
  window.location.hash = select.value;
}

function onHashChange() {
  var hash = window.location.hash.substr(1);

  if (hash) {
    if (buttons) {
      var btn = document.querySelector('button[data-url="' + hash + '"]');
      if (btn) {
        var data = btn.dataset;
        setIframeTo(data.url, data.width, data.height, data.title);
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove("current");
        }
        btn.classList.add("current");
      }
    }
    if (select) {
      select.value = hash;
      var opt = document.querySelector('option[value="' + hash + '"]');
      var data = opt.dataset;
      setIframeTo(data.url, data.width, data.height, data.title);
    }
  }
}

function handleReplay() {
  var frame = document.getElementById("banner-frame");
  frame.contentWindow.location.reload();
}

document.addEventListener("DOMContentLoaded", function () {
  window.addEventListener("hashchange", onHashChange);
  bannerSelectContainer = document.getElementById("banner-select-container");
  listContainer = document.getElementById("list-container");
  select = document.querySelector("select");

  if (listContainer) {
    buttons = document.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", handleButtonClick);
    }
  }

  if (select) {
    hiddenSelectContainer = document.getElementById("hidden-select-value");
    select.addEventListener("change", handleSelectChange);
  }

  replayButton = document.getElementById("replay");
  replayButton.addEventListener("click", handleReplay);

  onHashChange();
});
