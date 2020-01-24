This is a browser extension project for [Deneb](https://github.com/lordfriend/Deneb). It must work with Deneb 3.0.0 and above together to get work.

Currently support Chrome, Firefox and Edge.

## Overview

This project add some magic bridge between Deneb and bgm.tv, which allow Deneb project add a lot of social features by
using a bgm.tv account.

## Development

Require Nodejs >= v8.5

1. Clone this project

2. `yarn install`

4. Set the Environment Variables used in env.js or use the default value.

    - `ALBIREO_HOST`
    - `EXTENSION_NAME`
    - `EXTENSION_DESCRIPTION`
    - `EXTENSION_ID`
    - `FIREFOX_UPDATE_LINK` (firefox only)
    - `WEB_EXT_API_KEY` (firefox only) used by `web-ext` to sign the extension. you need visit your [Developer Hub at AMO](https://addons.mozilla.org/en-US/developers/addon/api/key/) to acquire `api key` and `api secret`
    - `WEB_EXT_API_SECRET` (firefox only) used by `web-ext` to sign the extension
    - `WEB_EXT_ID` (firefox only) used by `web-ext` same as EXTENSION_ID

4. development

- For Chrome development use `npm start` to build an unpacked extension and in Chrome extension page (chrome://extensions)
toggle **Developer mode** on. then you will see a new toolbar appeared. click **Load unpacked**, choose the `dist` folder.
you will load this extension successfully.

- For firefox development use `npm run start:firefox` to build an unpacked extension. in Firefox debugging page (about:debugging),
check the **Enable add-on debugging**, then click Load Temporary Add-on. Choose `dist/manifest.json` file. add-on will be load.

5. publish your own extension to Chrome Webstore and Firefox AMO

run `build.sh` will build all extensions to zip files. upload your extension to each browser's distribution platform.

Note for Firefox extension: Due to Albireo service is private and AMO policy, you need self-distribute your extension. the building script
will help you generate an proper update manifest. you need create the following files in order to work with `build.sh` script

2. setup your static file server, and make sure your can access static file via the `firefox_update_link` in the env.js prod section.

3. After run build.sh, upload your update.json and newest built firefox extension zip file resided in the web-ext-artifacts directory.
