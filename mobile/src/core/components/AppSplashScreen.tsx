import React, { useEffect, useRef } from "react";
import {
  Animated,
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
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence of animations: Entrance -> Subtitle -> 10s Hold -> Exit
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 35,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.delay(20000), // Stay for 20 seconds
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 500,
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

        {/* Small university subtitle directly under FELLOo */}
        <Text style={styles.subtitleLGU}>Lahore Garrison University</Text>

        <Animated.View style={{ opacity: subtitleFade, alignItems: "center" }}>
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>Campus Peer Collaboration</Text>
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    marginBottom: 2,
  },
  titleFellOo: {
    fontSize: 48,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  subtitleLGU: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D99000",
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 14,
  },
  taglineBadge: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  taglineText: {
    color: "#0D3E02",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
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
