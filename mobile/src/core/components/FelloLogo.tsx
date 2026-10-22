import React from "react";
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "../ui/AppText";

interface FelloLogoProps {
  size?: number;
  showText?: boolean;
  variant?: "yellow" | "green" | "white";
  tintColor?: string;
  textColor?: string;
  textSize?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export function FelloLogo({
  size = 32,
  showText = false,
  variant = "yellow",
  tintColor,
  textColor = "#0D3E02",
  textSize,
  style,
  imageStyle,
}: FelloLogoProps) {
  const source =
    variant === "white"
      ? require("../../../assets/fello-logo-white.png")
      : variant === "green"
      ? require("../../../assets/fello-logo-green.png")
      : require("../../../assets/fello-logo-yellow.png");

  const computedTextSize = textSize ?? Math.round(size * 0.95);
  const logoWidth = Math.round(size * (868 / 1024));

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={[
          {
            width: logoWidth,
            height: size,
            resizeMode: "contain",
          },
          tintColor ? { tintColor } : undefined,
          imageStyle,
        ]}
      />
      {showText && (
        <Text
          style={[
            styles.brandText,
            {
              fontSize: computedTextSize,
              color: textColor,
              marginLeft: Math.round(size * 0.25),
            },
          ]}
        >
          Fello
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandText: {
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
