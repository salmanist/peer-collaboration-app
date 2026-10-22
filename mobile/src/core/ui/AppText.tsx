import React, { forwardRef } from "react";
import { Text as NativeText, TextInput as NativeTextInput, Platform, StyleSheet, type TextProps, type TextInputProps, type TextStyle } from "react-native";
import { FONTS } from "../theme/typography";

export type Text = NativeText;
export type TextInput = NativeTextInput;

function fontStyle(style: TextProps["style"]): TextStyle {
  const flat = StyleSheet.flatten(style) || {};
  const weight = flat.fontWeight === "bold" ? 700 : Number(flat.fontWeight || 400);
  const family = flat.fontFamily || (weight >= 700 ? FONTS.bold : weight >= 600 ? FONTS.semiBold : weight >= 500 ? FONTS.medium : FONTS.regular);
  return {
    fontFamily: flat.fontStyle === "italic" ? `${family}_Italic` : family,
    fontWeight: "normal",
    fontStyle: "normal",
  };
}

export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  return <NativeText {...props} ref={ref} style={[style, fontStyle(style)]} />;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return (
    <NativeTextInput
      {...props}
      ref={ref}
      style={[
        Platform.OS === "web" ? ({ outlineStyle: "none", outlineWidth: 0 } as any) : null,
        style,
        fontStyle(style),
      ]}
    />
  );
});
