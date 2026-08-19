import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { fetchResourceListings } from "../data/resourcesApi";
import { useSessionStore } from "../../../core/auth/session";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { useResourceNotificationStore } from "../resourceNotifications";
import type { ResourceListing } from "../resources";

function getImageUrl(imagePath: string | null) {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
    }
    const host = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function getExchangeLabel(listing: ResourceListing) {
    if (listing.exchange_type === "sell" && listing.price) {
        return `Rs. ${listing.price}`;
    }

    return listing.exchange_type.replace("_", " ");
}

export default function ResourceFeedScreen() {
    const [listings, setListings] = useState<ResourceListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const user = useSessionStore((state) => state.user);
    const markResourcesRead = useResourceNotificationStore((state) => state.markResourcesRead);

    const loadListings = async (refresh = false) => {
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        setErrorMessage("");

        try {
            const response = await fetchResourceListings({
                status: "active",
                page: 1,
            });
            setListings(response.results);
            setPage(1);
            setHasNextPage(Boolean(response.next));
            if (user) void markResourcesRead(user.id);
        } catch {
            setErrorMessage("Could not load resources. Please try again.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const loadMoreListings = async () => {
        if (!hasNextPage || isLoadingMore || isLoading || isRefreshing) return;

        setIsLoadingMore(true);
        const nextPage = page + 1;

        try {
            const response = await fetchResourceListings({
                status: "active",
                page: nextPage,
            });
            setListings((current) => [...current, ...response.results]);
            setPage(nextPage);
            setHasNextPage(Boolean(response.next));
        } catch {
            // Silently retain current page if next fails
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        void loadListings();
    }, [user, markResourcesRead]);

    const renderItem = useCallback(({ item }: { item: ResourceListing }) => {
        const thumbUrl = getImageUrl(item.image);
        return (
            <Pressable
                style={styles.card}
                onPress={() => router.push(`/resources/${item.id}`)}
            >
                {thumbUrl ? (
                    <Image source={{ uri: thumbUrl }} style={styles.cardThumb} />
                ) : null}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.price}>{getExchangeLabel(item)}</Text>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>

                    <Text style={styles.meta}>
                        {item.category.replace("_", " ")} · {item.condition} · Posted by{" "}
                        {item.owner_name}
                    </Text>
                </View>
            </Pressable>
        );
    }, []);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1d4ed8" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Resource Sharing</Text>
                    <Text style={styles.subtitle}>Find useful items from LGU students.</Text>
                </View>
            </View>

            {errorMessage ? (
                <View style={styles.messageBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <Pressable onPress={() => void loadListings()}>
                        <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={(item) => String(item.id)}
                    refreshing={isRefreshing}
                    onRefresh={() => void loadListings(true)}
                    onEndReached={() => void loadMoreListings()}
                    onEndReachedThreshold={0.4}
                    initialNumToRender={8}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === "android"}
                    contentContainerStyle={
                        listings.length === 0 ? styles.emptyList : styles.list
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No active resources are available yet.
                        </Text>
                    }
                    ListFooterComponent={
                        isLoadingMore ? (
                            <ActivityIndicator
                                size="small"
                                color="#1d4ed8"
                                style={{ marginVertical: 12 }}
                            />
                        ) : null
                    }
                    renderItem={renderItem}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 20,
        paddingTop: 60,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        color: "#0f172a",
    },
    subtitle: {
        marginTop: 4,
        color: "#64748b",
    },
    list: {
        gap: 12,
        paddingBottom: 24,
    },
    emptyList: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    cardThumb: {
        width: "100%",
        height: 160,
        resizeMode: "cover",
    },
    cardContent: {
        padding: 16,
        gap: 8,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    cardTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#0f172a",
    },
    price: {
        color: "#1d4ed8",
        fontWeight: "700",
        textTransform: "capitalize",
    },
    description: {
        color: "#475569",
        lineHeight: 20,
    },
    meta: {
        color: "#64748b",
        textTransform: "capitalize",
    },
    messageBox: {
        backgroundColor: "#fef2f2",
        borderRadius: 10,
        padding: 16,
        gap: 8,
    },
    errorText: {
        color: "#b91c1c",
    },
    retryText: {
        color: "#1d4ed8",
        fontWeight: "700",
    },
    emptyText: {
        color: "#64748b",
        textAlign: "center",
    },
});
