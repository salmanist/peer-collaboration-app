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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
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
          <MaterialCommunityIcons name="school" size={44} color="#0D3E02" />
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
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  brandWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  titleFellOo: {
    fontSize: 46,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  tagline: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1.8,
    marginTop: 4,
    marginBottom: 8,
    textAlign: "center",
  },
  badgePill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  badgePillText: {
    color: "#0D3E02",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 44 : 28,
    alignItems: "center",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
});
