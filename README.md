This is a browser extension project for [Deneb](https://github.com/lordfriend/Deneb). It must work with Deneb 3.0.0 and above together to get work.

Currently support Chrome, Firefox and Edge.

## Overview

This project add some magic bridge between Deneb and bgm.tv, which allow Deneb project add a lot of social features by
using a bgm.tv account.

## Development

Require Nodejs >= v8.5

1. Clone this project

2. `yarn install`

3. rename `env.example.js` to `env.js`, change this file's prod object, with your domain and site name.

4. use `npm start` to development and `npm run build:prod` to build a release.