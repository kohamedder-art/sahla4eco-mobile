const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ogg Vorbis (cash-register notification sound) isn't in Metro's default
// asset extensions — without this the release bundle fails to resolve it.
if (!config.resolver.assetExts.includes('ogg')) {
  config.resolver.assetExts.push('ogg');
}

module.exports = config;
