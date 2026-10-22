import os

path = r"mobile/src/core/ui/TopBar.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read().replace("\r\n", "\n")

old_account = '<MaterialCommunityIcons name="account-outline" size={26} color={colors.surface} />'
new_account = '<MaterialCommunityIcons name="account-outline" size={26} color={colors.text} />'

c = c.replace(old_account, new_account)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("Updated TopBar.tsx account icon color")
