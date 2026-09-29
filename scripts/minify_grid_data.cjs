const fs = require('fs');

function minifyFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const beforeSize = (raw.length / 1024 / 1024).toFixed(2);
  const data = JSON.parse(raw);
  const minified = JSON.stringify(data);
  const afterSize = (minified.length / 1024 / 1024).toFixed(2);
  fs.writeFileSync(filePath, minified, 'utf8');
  console.log(`${filePath}: ${beforeSize} MB -> ${afterSize} MB (saved ${(beforeSize - afterSize).toFixed(2)} MB)`);
}

minifyFile('public/data/chennai_tneb_grid.json');
minifyFile('public/data/chennai_outage_gold_registry.json');
