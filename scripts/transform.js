const env = require('../env');

const CHROME = 'Chrome';

module.exports = function (manifest, browserType, isProd) {
    let manifestObj = JSON.parse(manifest);
    if (browserType === CHROME) {
        manifestObj.browser_specific_settings = undefined;
    } else {
        manifestObj.externally_connectable = undefined;
        manifestObj.background.persistent = undefined;
        manifestObj.browser_specific_settings.gecko.id = `${env.dev.extension_id}`;
    }

    if (isProd) {

        let localHostUrlIndex = manifestObj.permissions.findIndex((entry) => {
            return entry === 'http://localhost/*';
        });

        manifestObj.permissions[localHostUrlIndex] = `${env.prod.albireo_host}/*`;

        manifestObj.name = env.prod.extension_name;
        manifestObj.description = env.prod.extension_description;
        manifestObj.content_scripts[0].matches = [`${env.prod.albireo_host}/*`];

        if (browserType === CHROME) {
            manifestObj.externally_connectable.matches = [`${env.prod.albireo_host}/*`];
        } else {
            manifestObj.browser_specific_settings.gecko.id = `${env.prod.extension_id}`;
            manifestObj.browser_specific_settings.gecko.update_url = `${env.prod.firefox_update_link}`;
        }
    }

    return JSON.stringify(manifestObj, null, 2);
};