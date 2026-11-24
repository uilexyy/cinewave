import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { secureStorage } from "../../services/authStorage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface HistoryItem {
  id: string;
  title: string;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const token = await secureStorage.getToken();
        const res = await fetch(`${API_BASE}/api/v1/history`, {
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
    loadHistory();
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
      <Text style={styles.title}>Riwayat Tontonan</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>Belum ada riwayat tontonan.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>
                Posisi: {item.positionSeconds}s {item.completed ? "(Selesai)" : ""}
              </Text>
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
  cardDetail: {
    color: "#A1A1AA",
    marginTop: 4,
    fontSize: 12,
  },
});
