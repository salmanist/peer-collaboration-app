import { Alert, Platform } from "react-native";

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmLabel = "Confirm",
  destructive = false,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      void onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => void onConfirm(),
      },
    ]);
  }
}
