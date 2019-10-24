module.exports = function(key, { data }) {
  const lang = data.root.lang || `en`;
  const strings = data.root[lang];
  return strings[key];
};
