const fs = require('fs');
const path = require('path');
const prodEnv = require('../env').prod;
const manifestPath = path.join(__dirname, '../dist/manifest.json');

let manifest = JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf8'}));

manifest.externally_connectable.matches = [`${prodEnv.albireo_host}/*`];
let localHostUrlIndex = manifest.permissions.findIndex((entry) => {
    return entry === 'http://localhost:3000/*';
});

manifest.permissions[localHostUrlIndex] = `${prodEnv.albireo_host}/*`;

manifest.name = prodEnv.extension_name;
manifest.description = prodEnv.extension_description;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), {encoding: 'utf8'});