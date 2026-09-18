/**
 * Bundles the cash-register notification sound into Android res/raw
 * (as cash_register.ogg — Android resource names must be [a-z0-9_])
 * so killed-state FCM pushes on the "orders" channel play it.
 * Runs at prebuild time; survives `expo prebuild --clean` (CI).
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

function withNotificationSounds(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const src = path.join(projectRoot, 'assets', 'sounds', 'cash-register.ogg');
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw'
      );
      if (!fs.existsSync(src)) {
        console.warn('[withNotificationSounds] missing source file:', src);
        return config;
      }
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'cash_register.ogg'));
      console.log('[withNotificationSounds] cash_register.ogg → res/raw');
      return config;
    },
  ]);
}

module.exports = withNotificationSounds;
