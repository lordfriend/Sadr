const axios = require('axios');
const env = require('../env');
const manifest = require('../dist/manifest');
const url = require('url');
const path = require('path');
const fs = require('fs');

if (!env.prod.firefox_update_link) {
    throw Error('firefox_update_link doesn\'t exists');
}

let urlObj = url.parse(env.prod.firefox_update_link);

function safeFileName(name) {
    return name.toLowerCase().replace(/[^a-z0-9.-]+/g, '_');
}

axios.get(env.prod.firefox_update_link)
    .then((response) => {
        return response.data;
    }, () => {
        return {
            addons: {
                [env.prod.extension_id]: {
                    updates: []
                }
            }
        };
    })
    .then((data) => {
        console.log(data);

        let updatesArray = data.addons[env.prod.extension_id].updates;
        let version = manifest.version;
        // make this script safe
        let hasVersion = updatesArray.some((v) => {
            return v.version === version;
        });
        if (!hasVersion) {
            // let extensionName = safeFileName(`${env.prod.extension_name}-${manifest.version}`);
            return new Promise((resolve, reject) => {
                fs.readdir(path.join(__dirname, '../web-ext-artifacts'), (err, fileList) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(fileList);
                    }
                });
            })
                .then((fileList) => {

                    const fileMatchRegex = new RegExp('.+?-' + version.replace('.', '\.') + '-.+?\.xpi');
                    let filename = fileList.find((name) => {
                        return fileMatchRegex.test(name);
                    });
                    urlObj.pathname = path.join(path.resolve(urlObj.pathname, '../'), filename);
                    let newVersionPath = url.format(urlObj);
                    updatesArray.push({
                        version: version,
                        update_link: newVersionPath
                    });
                    return new Promise((resolve, reject) => {
                        fs.writeFile(path.join(path.resolve(__dirname, '../'), 'updates.json'), JSON.stringify(data), (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve('OK');
                            }
                        });
                    });
                });


        } else {
            throw new Error('version already exists');
        }
    })
    .then(() => {
        console.log('update.json generated');
    })
    .catch((err) => {
        console.error(err);
    });