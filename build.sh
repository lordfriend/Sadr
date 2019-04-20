#/bin/sh

npm run build:prod

zip -r chrome ./chrome
zip -r other ./other