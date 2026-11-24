import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Image, Text, View, ActivityIndicator } from "react-native";
import { fetchCatalogHome, CatalogItem } from "@/services/catalog";
import { secureStorage } from "../../services/authStorage";

export default function HomeScreen() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await secureStorage.getToken();
        const data = await fetchCatalogHome(token);
        setItems(data);
      } finally {
        setLoading(false);
      }
    }
    load();
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
      <Text style={styles.title}>CineWave</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>Belum ada konten. Pasang add-on di tab Add-ons.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.posterUrl ? (
                <Image source={{ uri: item.posterUrl }} style={styles.poster} alt={item.title} />
              ) : null}
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.addonName ? <Text style={styles.cardType}>{item.addonName}</Text> : null}
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
    marginHorizontal: 16,
    marginBottom: 16,
  },
  poster: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#18181B",
  },
  cardTitle: {
    color: "#FAFAFA",
    marginTop: 8,
    fontSize: 16,
  },
  cardType: {
    color: "#A1A1AA",
    fontSize: 12,
  },
});
