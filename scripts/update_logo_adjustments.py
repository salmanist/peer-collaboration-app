import os

# 1. Update HomeScreen.tsx
home_path = r"mobile\src\features\home\presentation\HomeScreen.tsx"
with open(home_path, "r", encoding="utf-8") as f:
    c = f.read()

c_norm = c.replace("\r\n", "\n")

target1 = """        <View style={styles.topNavLeft}>
          <FelloLogo size={32} />
          <Text style={styles.topNavBrand}>Fello</Text>
        </View>"""

replacement1 = """        <View style={styles.topNavLeft}>
          <FelloLogo size={18} />
          <Text style={styles.topNavBrand}>Fello</Text>
        </View>"""

target2 = """  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
  },"""

replacement2 = """  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    gap: 6,
  },"""

if target1 in c_norm:
    c_norm = c_norm.replace(target1, replacement1, 1)
    print("Replaced size={32} with size={18} in HomeScreen.tsx")
else:
    print("target1 not found in HomeScreen.tsx")

if target2 in c_norm:
    c_norm = c_norm.replace(target2, replacement2, 1)
    print("Added gap: 6 to topNavLeft in HomeScreen.tsx")
else:
    print("target2 not found in HomeScreen.tsx")

with open(home_path, "w", encoding="utf-8") as f:
    f.write(c_norm)

# 2. Update AppSplashScreen.tsx to reduce extra vertical gap
splash_path = r"mobile\src\core\components\AppSplashScreen.tsx"
with open(splash_path, "r", encoding="utf-8") as f:
    s = f.read()

s_norm = s.replace("\r\n", "\n")

target_splash = """  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  titleFello: {
    fontSize: 48,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: 0.2,
    textAlign: "center",
  },"""

replacement_splash = """  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  titleFello: {
    fontSize: 48,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: 0.2,
    textAlign: "center",
    includeFontPadding: false,
  },"""

if target_splash in s_norm:
    s_norm = s_norm.replace(target_splash, replacement_splash, 1)
    print("Reduced extra gap between logo and Fello in AppSplashScreen.tsx")
else:
    print("target_splash not found in AppSplashScreen.tsx")

with open(splash_path, "w", encoding="utf-8") as f:
    f.write(s_norm)

print("Done updates!")
