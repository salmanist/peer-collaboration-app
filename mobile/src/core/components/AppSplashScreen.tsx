import React, { useEffect, useState } from "react";
import { Image, StatusBar, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

interface AppSplashScreenProps {
  onFinish?: () => void;
  ready?: boolean;
}

export function AppSplashScreen({ onFinish, ready = true }: AppSplashScreenProps) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    // Count the splash time while fonts and session load, not after they finish.
    const timer = setTimeout(() => setMinimumElapsed(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!imageLoaded) return;
    // The identical branded image is already mounted before releasing native launch.
    const frame = requestAnimationFrame(() => { void SplashScreen.hideAsync().catch(() => {}); });
    return () => cancelAnimationFrame(frame);
  }, [imageLoaded]);
  useEffect(() => {
    if (ready && imageLoaded && minimumElapsed) onFinish?.();
  }, [ready, imageLoaded, minimumElapsed, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Image source={require("../../../assets/fello-launch.png")} style={styles.brand} resizeMode="contain" onLoad={() => setImageLoaded(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, zIndex: 99999, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  brand: { width: 320, height: 160, maxWidth: "90%" },
});
