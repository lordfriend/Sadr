#/bin/sh

# chrome
npm run build:prod

zip -r chrome ./dist

# firefox
npm run build:prod:firefox
npx web-ext build
npx web-ext sign --api-key $WEB_EXT_API_KEY --api-secret $WEB_EXT_API_SECRET --channel unlisted --id $WEB_EXT_ID

node ./scripts/ff-update-manifest.js