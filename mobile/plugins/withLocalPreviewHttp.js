const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

// Only the local preview build needs HTTP access to the laptop's Django server.
module.exports = function withLocalPreviewHttp(config) {
  if (process.env.FELLO_ALLOW_LOCAL_HTTP !== "1") return config;
  return withAndroidManifest(config, (result) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(result.modResults);
    application.$["android:usesCleartextTraffic"] = "true";
    return result;
  });
};
