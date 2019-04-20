const fs = require('fs');
const path = require('path');
const prodEnv = require('../env').prod;
const rimraf = require('rimraf');
const manifestPath = path.join(__dirname, '../dist/manifest.json');

let manifest = JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf8'}));

// copy files
const chromePath = path.join(__dirname, '../chrome');
const otherPath = path.join(__dirname, '../other');
try {
    fs.mkdirSync(chromePath);
} catch(e) {
    if (e.code !== 'EEXIST') {
        console.warn(e);
    }
}
try {
    fs.mkdirSync(otherPath);
} catch (e) {
    if (e.code !== 'EEXIST') {
        console.warn(e);
    }
}

rimraf.sync(chromePath + '/*');
rimraf.sync(otherPath + '/*');
let fileList = fs.readdirSync(path.join(__dirname, '../dist'));
fileList.forEach((filename) => {
    fs.copyFileSync(path.join(__dirname, '../dist/' + filename), path.join(chromePath, filename));
    fs.copyFileSync(path.join(__dirname, '../dist/' + filename), path.join(otherPath, filename));
});


let localHostUrlIndex = manifest.permissions.findIndex((entry) => {
    return entry === 'http://localhost:3000/*';
});

manifest.permissions[localHostUrlIndex] = `${prodEnv.albireo_host}/*`;

manifest.name = prodEnv.extension_name;
manifest.description = prodEnv.extension_description;

let chromeManifest = Object.assign({}, manifest);
let otherManifest = Object.assign({}, manifest);
chromeManifest.externally_connectable.matches = [`${prodEnv.albireo_host}/*`];
otherManifest.externally_connectable = undefined;

// write to chrome manifest
fs.writeFileSync(path.join(chromePath, 'manifest.json'), JSON.stringify(chromeManifest, null, 2), {encoding: 'utf8'});
fs.writeFileSync(path.join(otherPath, 'manifest.json'), JSON.stringify(otherManifest, null, 2), {encoding: 'utf8'});