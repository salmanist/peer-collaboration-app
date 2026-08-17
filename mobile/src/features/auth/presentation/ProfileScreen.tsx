import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { updateMe } from "../data/authApi";

export default function ProfileScreen() {
  const user = useSessionStore((state) => state.user);
  const updateUser = useSessionStore((state) => state.updateUser);

  const [department, setDepartment] = useState(user?.department ?? "");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateMe({ department: department.trim() });
      updateUser(updated);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user.full_name}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.meta}>{user.role} · {user.enrollment_year ?? "—"}</Text>

      <TextInput
        style={styles.input}
        placeholder="Department"
        value={department}
        onChangeText={setDepartment}
      />

      <Pressable style={styles.button} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
      </Pressable>

      <Pressable
        style={styles.resourcesButton}
        onPress={() => router.push("/resources")}
      >
        <Text style={styles.resourcesButtonText}>Browse Resources</Text>
      </Pressable>

      <Pressable
        style={styles.resourcesButton}
        onPress={() => router.push("/resources/mine")}
      >
        <Text style={styles.resourcesButtonText}>My Resources</Text>
      </Pressable>

      <Pressable
        style={styles.resourcesButton}
        onPress={() => router.push("/resources/wanted")}
      >
        <Text style={styles.resourcesButtonText}>Request Resources</Text>
      </Pressable>

      <Pressable
        style={styles.resourcesButton}
        onPress={() => router.push("/resources/requests")}
      >
        <Text style={styles.resourcesButtonText}>Interest Requests</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: "700" },
  email: { color: "#666" },
  meta: { color: "#666", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#1d4ed8", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  resourcesButton: {
    borderWidth: 1,
    borderColor: "#1d4ed8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  resourcesButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
});
