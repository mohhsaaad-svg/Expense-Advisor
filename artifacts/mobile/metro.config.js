const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep Metro from watching/crashing on the API server's openid-client cache
// (written at runtime inside the monorepo).
config.resolver.blockList = /\.cache\/openid-client\/.*/;

module.exports = config;
