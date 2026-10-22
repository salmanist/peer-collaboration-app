import os

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(script_dir)
home_path = os.path.join(root_dir, "mobile", "src", "features", "home", "presentation", "HomeScreen.tsx")

with open(home_path, "r", encoding="utf-8") as f:
    c = f.read().replace("\r\n", "\n")

# 1. Update LGU banner image import to use the exact framed banner asset
old_import = """const LGU_CAMPUS_IMAGE = require("../../../../assets/lgu_campus.png");"""
new_import = """const LGU_BANNER_IMAGE = require("../../../../assets/lgu_banner.png");"""

if old_import in c:
    c = c.replace(old_import, new_import, 1)
    print("Updated LGU banner image import")

# 2. Update LGU banner source in JSX
c = c.replace("source={LGU_CAMPUS_IMAGE}", "source={LGU_BANNER_IMAGE}")

# 3. Update icon colors in campus services to exact preview hex #364A41
c = c.replace('name="school-outline" size={26} color="#1E293B"', 'name="school-outline" size={28} color="#364A41"')
c = c.replace('name="storefront-outline" size={26} color="#1E293B"', 'name="storefront-outline" size={28} color="#364A41"')
c = c.replace('name="book-open-variant" size={26} color="#1E293B"', 'name="bookshelf" size={28} color="#364A41"')
c = c.replace('name="magnify" size={26} color="#1E293B"', 'name="magnify" size={28} color="#364A41"')
c = c.replace('name="car-outline" size={26} color="#1E293B"', 'name="car-multiple" size={28} color="#364A41"')
c = c.replace('name="printer-outline" size={26} color="#1E293B"', 'name="printer-outline" size={28} color="#364A41"')

# 4. Update Your Activity icons to #364A41
c = c.replace('name="school-outline" size={22} color="#1E293B"', 'name="school-outline" size={24} color="#364A41"')
c = c.replace('name="storefront-outline" size={22} color="#1E293B"', 'name="storefront-outline" size={24} color="#364A41"')

# 5. Update styles for exact preview visual match
old_styles = """  // Global Search Bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchPlaceholderText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#94A3B8",
  },

  // LGU Campus Banner (Photo only)
  lguBannerContainer: {
    width: "100%",
    height: 165,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
    backgroundColor: "#F1F5F9",
  },
  lguBannerImage: {
    width: "100%",
    height: "100%",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSeeAll: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  // Campus Services Grid with Lines
  servicesGridBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 24,
  },
  servicesGridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridCell: {
    flex: 1,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  gridCellTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 6,
    textAlign: "center",
  },
  verticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E2E8F0",
  },
  horizontalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E2E8F0",
  },"""

new_styles = """  // Global Search Bar matching exact preview
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchPlaceholderText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#94A3B8",
  },

  // LGU Campus Banner (Photo with exact 2.03 aspect ratio framing, zero text overlay)
  lguBannerContainer: {
    width: "100%",
    height: 168,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#F1F5F9",
  },
  lguBannerImage: {
    width: "100%",
    height: "100%",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSeeAll: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  // Campus Services Grid with Soft Lines & Exact Preview Colors
  servicesGridBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#EFF0EF",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 24,
  },
  servicesGridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridCell: {
    flex: 1,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  gridCellTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#38404B",
    marginTop: 6,
    textAlign: "center",
  },
  verticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#EFF0EF",
  },
  horizontalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#EFF0EF",
  },"""

if old_styles in c:
    c = c.replace(old_styles, new_styles, 1)
    print("Updated styles for exact preview visual match")
else:
    print("old_styles not found")

with open(home_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Applied exact preview adjustments to HomeScreen.tsx successfully!")
