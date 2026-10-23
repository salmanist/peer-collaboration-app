const { withAndroidStyles } = require("expo/config-plugins");

// Android requires a native launch surface. Leave it white so only the
// full Fello branding rendered by AppSplashScreen appears during startup.
module.exports = function withSingleAndroidSplash(config) {
  return withAndroidStyles(config, (result) => {
    const theme = result.modResults.resources.style?.find(
      (style) => style.$.name === "Theme.App.SplashScreen"
    );
    if (!theme) throw new Error("Expected expo-splash-screen to configure the launch theme first.");
    const icon = theme.item?.find(
      (item) => item.$.name === "windowSplashScreenAnimatedIcon"
    );
    if (!icon) throw new Error("Expected Android launch icon resource.");
    icon._ = "@android:color/transparent";
    return result;
  });
};
