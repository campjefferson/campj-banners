const generateIndex = require('./generateIndex');
const reorganizeProductionFiles = require('./reorganizeProductionFiles');
const generateBackups = require('./generateBackups');
const generateArchives = require('./generateArchives');
const pkg = require(process.cwd() + '/package.json');

(async function() {
  console.log('reorganizing production files...');
  await reorganizeProductionFiles();
  console.log('reorganizing production files complete!');

  console.log('generating backups...');
  await generateBackups(pkg.config ? pkg.config.backupTimeout : null);
  console.log('generating backups complete!');

  console.log('generating zip archives...');
  const allArchiveName = await generateArchives();
  console.log('generating zip archives complete!');

  console.log('generating production index file...');
  generateIndex(allArchiveName);
  console.log('generating production index file complete!');
})();
