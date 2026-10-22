import os

def update_file(filepath, import_str, search_block, replace_block):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Normalize line breaks for search
    content_lf = content.replace("\r\n", "\n")
    search_lf = search_block.replace("\r\n", "\n")
    replace_lf = replace_block.replace("\r\n", "\n")

    if search_lf in content_lf:
        content_lf = content_lf.replace(search_lf, replace_lf, 1)
        # Add import if needed
        if import_str not in content_lf:
            # Place after first import line
            first_newline = content_lf.find("\n")
            content_lf = content_lf[:first_newline+1] + import_str + "\n" + content_lf[first_newline+1:]
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content_lf)
        print(f"Updated {filepath}")
    else:
        print(f"Block not found in {filepath}")

# 1. LoginScreen.tsx
update_file(
    r"mobile\src\features\auth\presentation\LoginScreen.tsx",
    'import { FelloLogo } from "../../../core/components/FelloLogo";',
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>Fello</Text>
          <Text style={styles.brandSub}>Lahore Garrison University</Text>
        </View>""",
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FelloLogo size={32} />
            <Text style={styles.brandTitle}>Fello</Text>
          </View>
          <Text style={styles.brandSub}>Lahore Garrison University</Text>
        </View>"""
)

# 2. RegisterScreen.tsx
update_file(
    r"mobile\src\features\auth\presentation\RegisterScreen.tsx",
    'import { FelloLogo } from "../../../core/components/FelloLogo";',
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>Fello</Text>
          <Text style={styles.brandSub}>Lahore Garrison University</Text>
        </View>""",
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FelloLogo size={32} />
            <Text style={styles.brandTitle}>Fello</Text>
          </View>
          <Text style={styles.brandSub}>Lahore Garrison University</Text>
        </View>"""
)

# 3. ForgotPasswordScreen.tsx
update_file(
    r"mobile\src\features\auth\presentation\ForgotPasswordScreen.tsx",
    'import { FelloLogo } from "../../../core/components/FelloLogo";',
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>Fello</Text>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>""",
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FelloLogo size={32} />
            <Text style={styles.brandTitle}>Fello</Text>
          </View>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>"""
)

# 4. VerifyEmailScreen.tsx
update_file(
    r"mobile\src\features\auth\presentation\VerifyEmailScreen.tsx",
    'import { FelloLogo } from "../../../core/components/FelloLogo";',
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>Fello</Text>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>""",
    """        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FelloLogo size={32} />
            <Text style={styles.brandTitle}>Fello</Text>
          </View>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>"""
)
