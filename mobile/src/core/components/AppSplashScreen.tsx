import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface AppSplashScreenProps {
  onFinish?: () => void;
}

export function AppSplashScreen({ onFinish }: AppSplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence of animations: Entrance -> Subtitle -> Exit
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, [fadeAnim, scaleAnim, subtitleFade, exitFade, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: exitFade }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D3E02" />
      
      {/* Centered Brand Content */}
      <Animated.View
        style={[
          styles.brandWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="school" size={48} color="#0D3E02" />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.titleFellOo}>FELLOo</Text>
        </View>

        <Animated.View style={{ opacity: subtitleFade, alignItems: "center" }}>
          <Text style={styles.tagline}>CAMPUS PEER COLLABORATION</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>Lahore Garrison University</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Subtle Footer Note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Learn • Share • Connect</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
  },
  brandWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FDBF1E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  titleFellOo: {
    fontSize: 46,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  tagline: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E2E8F0",
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 10,
    textAlign: "center",
  },
  badgePill: {
    backgroundColor: "rgba(253, 191, 30, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(253, 191, 30, 0.4)",
    marginTop: 4,
  },
  badgePillText: {
    color: "#FDBF1E",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 44 : 28,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
});
