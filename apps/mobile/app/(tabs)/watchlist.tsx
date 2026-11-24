import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { secureStorage } from "../../services/authStorage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface WatchlistItem {
  id: string;
  title: string;
  type: string;
  posterUrl: string | null;
  rating: number | null;
}

export default function WatchlistScreen() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWatchlist() {
      try {
        const token = await secureStorage.getToken();
        const res = await fetch(`${API_BASE}/api/v1/watchlist`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.data) {
          setItems(json.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadWatchlist();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Watchlist Saya</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>Belum ada item dalam watchlist.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardType}>{item.type}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: "#09090B",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FAFAFA",
    marginLeft: 16,
    marginBottom: 16,
  },
  empty: {
    color: "#A1A1AA",
    marginLeft: 16,
  },
  card: {
    backgroundColor: "#18181B",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  cardTitle: {
    color: "#FAFAFA",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardType: {
    color: "#A1A1AA",
    marginTop: 4,
    fontSize: 12,
  },
});
