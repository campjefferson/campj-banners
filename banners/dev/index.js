var buttons;

function setIframeTo(url, width, height, title) {
  var frame = document.getElementById("banner-frame");
  frame.setAttribute("src", "/" + url + "/index.html");
  frame.style.width = width + "px";
  frame.style.height = height + "px";
  frame.setAttribute("width", width);
  frame.setAttribute("height", height);
  var h2 = document.getElementById("banner-title");
  h2.innerHTML = title;
}

function handleButtonClick(e) {
  var btn = e.target;
  var data = btn.dataset;

  window.location.hash = data.url;
}

function onHashChange() {
  var hash = window.location.hash.substr(1);

  if (hash) {
    var btn = document.querySelector('button[data-url="' + hash + '"]');
    if (btn) {
      var data = btn.dataset;
      setIframeTo(data.url, data.width, data.height, data.label);
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("current");
      }
      btn.classList.add("current");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("hashchange", onHashChange);
  buttons = document.querySelectorAll("button");

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", handleButtonClick);
  }

  onHashChange();
});
