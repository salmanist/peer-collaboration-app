import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchDepartments } from "../departments/departmentApi";
import type { Department } from "../departments/department";
import { useDataStore } from "../store/DataStoreContext";

interface DepartmentDropdownProps {
  label?: string;
  selectedDepartment: string; // can be department name, short_name, or "all" / ""
  onSelectDepartment: (deptName: string, deptObj?: Department | null) => void;
  isFilter?: boolean; // If true, includes "All Departments" option
  allLabel?: string;
  placeholder?: string;
  style?: any;
  buttonStyle?: any;
  required?: boolean;
}

export function DepartmentDropdown({
  label,
  selectedDepartment,
  onSelectDepartment,
  isFilter = false,
  allLabel = "All Departments",
  placeholder = "Select Department",
  style,
  buttonStyle,
  required = false,
}: DepartmentDropdownProps) {
  const { departments, setDepartments } = useDataStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Load departments into DataStore cache if not already present
  useEffect(() => {
    if (!departments || departments.length === 0) {
      setLoading(true);
      fetchDepartments()
        .then((data) => {
          setDepartments(data);
        })
        .catch((err) => {
          console.error("Error loading departments:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [departments, setDepartments]);

  const departmentList = departments || [];

  // Filtered list based on search term
  const filteredList = useMemo(() => {
    if (!search.trim()) return departmentList;
    const q = search.toLowerCase();
    return departmentList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.short_name && d.short_name.toLowerCase().includes(q)),
    );
  }, [departmentList, search]);

  // Selected item display text
  const displayLabel = useMemo(() => {
    if (isFilter && (!selectedDepartment || selectedDepartment === "all")) {
      return allLabel;
    }
    if (!selectedDepartment) return placeholder;

    const matched = departmentList.find(
      (d) =>
        d.name.toLowerCase() === selectedDepartment.toLowerCase() ||
        d.short_name.toLowerCase() === selectedDepartment.toLowerCase(),
    );
    if (matched) {
      return matched.short_name
        ? `${matched.name} (${matched.short_name})`
        : matched.name;
    }
    return selectedDepartment;
  }, [selectedDepartment, isFilter, allLabel, placeholder, departmentList]);

  const handleSelect = (dept: Department | null) => {
    if (!dept) {
      onSelectDepartment(isFilter ? "all" : "", null);
    } else {
      // Return name as primary identifier
      onSelectDepartment(dept.name, dept);
    }
    setModalVisible(false);
    setSearch("");
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.labelText}>
          {label} {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.selectorBtn,
          buttonStyle,
          !selectedDepartment && !isFilter && styles.selectorBtnEmpty,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.selectorBtnText,
            !selectedDepartment && !isFilter && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {loading && !departmentList.length ? "Loading departments..." : displayLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#0D3E02" />
      </Pressable>

      {/* Modal Dropdown Selection */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSearch("");
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Grab Handle */}
            <View style={styles.grabHandleWrap}>
              <View style={styles.grabHandle} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isFilter ? "Filter by Department" : "Select Department"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Choose from official university departments
                </Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => {
                  setModalVisible(false);
                  setSearch("");
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color="#070D1F" />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search department (e.g., CS, AI, Management)..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} style={styles.clearSearchBtn}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            {/* List */}
            {loading && !departmentList.length ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color="#0D3E02" />
                <Text style={styles.loadingText}>Fetching department list...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredList}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                  isFilter ? (
                    <Pressable
                      style={[
                        styles.listItem,
                        (!selectedDepartment || selectedDepartment === "all") &&
                          styles.listItemSelected,
                      ]}
                      onPress={() => handleSelect(null)}
                    >
                      <View style={styles.itemTextWrap}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialCommunityIcons name="domain" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
                          <Text
                            style={[
                              styles.itemName,
                              (!selectedDepartment || selectedDepartment === "all") &&
                                styles.itemNameSelected,
                            ]}
                          >
                            {allLabel}
                          </Text>
                        </View>
                        <Text style={styles.itemSub}>Show items from all departments</Text>
                      </View>
                      {(!selectedDepartment || selectedDepartment === "all") && (
                        <MaterialCommunityIcons name="check" size={18} color="#0D3E02" />
                      )}
                    </Pressable>
                  ) : null
                }
                renderItem={({ item }) => {
                  const isSelected =
                    selectedDepartment &&
                    (selectedDepartment.toLowerCase() === item.name.toLowerCase() ||
                      selectedDepartment.toLowerCase() === item.short_name.toLowerCase());

                  return (
                    <Pressable
                      style={[styles.listItem, isSelected && styles.listItemSelected]}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.itemTextWrap}>
                        <View style={styles.nameRow}>
                          {item.short_name ? (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{item.short_name}</Text>
                            </View>
                          ) : null}
                          <Text
                            style={[styles.itemName, isSelected && styles.itemNameSelected]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                        </View>
                      </View>
                      {isSelected && <MaterialCommunityIcons name="check" size={18} color="#0D3E02" />}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyText}>No departments match "{search}"</Text>
                  </View>
                }
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  requiredStar: {
    color: "#EF4444",
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectorBtnEmpty: {
    borderColor: "#CBD5E1",
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 8,
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },
  arrowIcon: {
    fontSize: 10,
    color: "#64748B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  grabHandleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D3E02",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: "#0F172A",
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  listItemSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#0D3E02",
  },
  itemTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDBF1E",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D3E02",
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  itemNameSelected: {
    fontWeight: "800",
    color: "#0D3E02",
  },
  itemSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D3E02",
  },
  emptyList: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  centerLoading: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 8,
  },
});
