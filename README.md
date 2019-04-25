This is a browser extension project for [Deneb](https://github.com/lordfriend/Deneb). It must work with Deneb 3.0.0 and above together to get work.

Currently support Chrome, Firefox and Edge.

## Overview

This project add some magic bridge between Deneb and bgm.tv, which allow Deneb project add a lot of social features by
using a bgm.tv account.

## Development

Require Nodejs >= v8.5

1. Clone this project

2. `yarn install`

3. rename `env.example.js` to `env.js`, change some values in the object of this file, with your domain and site name.

4. development

- For Chrome development use `npm start` to build an unpacked extension and in Chrome extension page (chrome://extensions)
toggle **Developer mode** on. then you will see a new toolbar appeared. click **Load unpacked**, choose the `dist` folder.
you will load this extension successfully.

- For firefox development use `npm run start:firefox` to build an unpacked extension. in Firefox debugging page (about:debugging),
check the **Enable add-on debugging**, then click Load Temporary Add-on. Choose `dist/manifest.json` file. add-on will be load.

5. publish your own extension to Chrome Webstore and Firefox AMO

run `build.sh` will build all extensions to zip files. upload your extension to each browser's distribution platform.