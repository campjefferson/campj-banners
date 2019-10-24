module.exports = function(title) {
  if (!title || title === undefined) {
    return "";
  }
  var titleToUse = title;
  if (titleToUse.indexOf("_") >= 0) {
    var aTitleToUse = titleToUse.split("_");
    title = aTitleToUse[1];
  }
  return title;
};
