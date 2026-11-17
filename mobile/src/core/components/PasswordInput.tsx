import React, { useState } from "react";
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TextInput } from "../ui/AppText";
import { colors as appColors } from "../ui/theme";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  editable?: boolean;
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder = "Enter password",
  placeholderTextColor = appColors.textMuted,
  containerStyle,
  inputStyle,
  editable = true,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        editable={editable}
      />
      <Pressable
        onPress={() => setVisible((prev) => !prev)}
        style={styles.eyeButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <MaterialCommunityIcons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={appColors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: appColors.text,
  },
  eyeButton: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
