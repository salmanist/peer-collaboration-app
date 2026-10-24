import { colors as appColors } from "../ui/theme";
import { Text } from "../ui/AppText";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export interface ImageSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (image: { uri: string; name?: string; type?: string }) => void;
  title?: string;
  aspect?: [number, number];
  allowsEditing?: boolean;
}

export const ImageSourceModal: React.FC<ImageSourceModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  title = "Add a Photo",
  aspect = [4, 3],
  allowsEditing = true,
}) => {
  const handleCamera = async () => {
    onClose();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to take pictures directly from the app."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch {
      Alert.alert("Error", "Could not open camera. Please try again.");
    }
  };

  const handleGallery = async () => {
    onClose();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to select photos from your device."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch {
      Alert.alert("Error", "Could not open photo gallery. Please try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Top drag handle indicator */}
              <View style={styles.handle} />

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Choose how you want to upload your photo</Text>

              <View style={styles.optionsContainer}>
                {/* Option 1: Camera */}
                <Pressable
                  style={({ pressed }) => [
                    styles.optionCard,
                    pressed && styles.optionCardPressed,
                  ]}
                  onPress={handleCamera}
                >
                  <View style={[styles.iconBox, styles.cameraIconBox]}>
                    <MaterialCommunityIcons
                      name="camera"
                      size={28}
                      color={appColors.primary}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Take Photo</Text>
                    <Text style={styles.optionSubtitle}>Capture a new picture using camera</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={appColors.textMuted} />
                </Pressable>

                {/* Option 2: Gallery */}
                <Pressable
                  style={({ pressed }) => [
                    styles.optionCard,
                    pressed && styles.optionCardPressed,
                  ]}
                  onPress={handleGallery}
                >
                  <View style={[styles.iconBox, styles.galleryIconBox]}>
                    <MaterialCommunityIcons
                      name="image-multiple"
                      size={28}
                      color={appColors.icon}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Choose from Gallery</Text>
                    <Text style={styles.optionSubtitle}>Select an existing image from library</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={appColors.textMuted} />
                </Pressable>
              </View>

              {/* Cancel Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.inkA45,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: appColors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  optionCardPressed: {
    backgroundColor: appColors.border,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 48,
    height: 48,

    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cameraIconBox: {

  },
  galleryIconBox: {

  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: appColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonPressed: {
    backgroundColor: appColors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
});
