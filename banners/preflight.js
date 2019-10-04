const generateSprites = require('./generateSprites');
const generateFrontMatter = require('./generateFrontMatter');

(async function() {
  await generateFrontMatter();
  await generateSprites();
})();
