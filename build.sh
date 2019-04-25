#/bin/sh

# chrome
npm run build:prod

zip -r chrome ./dist

# firefox
npm run build:prod:firefox
cd dist
zip -r firefox .
mv firefox.zip ../
cd ..