import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { secureStorage } from "../../services/authStorage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface AddonItem {
  id: string;
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  healthStatus?: string;
}

export default function AddonsScreen() {
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manifestUrl, setManifestUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAddons() {
    try {
      const token = await secureStorage.getToken();
      const res = await fetch(`${API_BASE}/api/v1/addons`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAddons(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall() {
    if (!manifestUrl.trim()) {
      setMessage("Masukkan URL manifest.");
      return;
    }
    setInstalling(true);
    setMessage("");
    try {
      const token = await secureStorage.getToken();
      // Preview first
      const previewRes = await fetch(`${API_BASE}/api/v1/addons/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ manifestUrl: manifestUrl.trim() }),
      });
      const previewJson = await previewRes.json();
      if (!previewJson.success) {
        setMessage(previewJson.message || "Manifest tidak valid.");
        setInstalling(false);
        return;
      }
      // Install
      const installRes = await fetch(`${API_BASE}/api/v1/addons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ manifestUrl: manifestUrl.trim() }),
      });
      const installJson = await installRes.json();
      if (installJson.success) {
        setMessage("Add-on berhasil dipasang.");
        setManifestUrl("");
        await loadAddons();
      } else {
        setMessage(installJson.message || "Gagal memasang add-on.");
      }
    } catch {
      setMessage("Gagal memasang add-on.");
    } finally {
      setInstalling(false);
    }
  }

  async function toggleAddon(addon: AddonItem) {
    try {
      const token = await secureStorage.getToken();
      await fetch(`${API_BASE}/api/v1/addons/${addon.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled: !addon.enabled }),
      });
      await loadAddons();
    } catch {
      // ignore
    }
  }

  async function removeAddon(addonId: string) {
    try {
      const token = await secureStorage.getToken();
      await fetch(`${API_BASE}/api/v1/addons?id=${addonId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await loadAddons();
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAddons();
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
      <Text style={styles.title}>Add-ons</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="URL Manifest Add-on"
          placeholderTextColor="#71717A"
          value={manifestUrl}
          onChangeText={setManifestUrl}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleInstall} disabled={installing}>
          <Text style={styles.buttonText}>{installing ? "..." : "Install"}</Text>
        </TouchableOpacity>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {addons.length === 0 ? (
        <Text style={styles.empty}>Belum ada add-on terpasang.</Text>
      ) : (
        <FlatList
          data={addons}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.description || "Tidak ada deskripsi"}</Text>
              <Text style={styles.cardStatus}>{item.enabled ? "Aktif" : "Nonaktif"}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleAddon(item)}>
                  <Text style={styles.actionText}>{item.enabled ? "Nonaktifkan" : "Aktifkan"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={() => removeAddon(item.id)}>
                  <Text style={styles.actionText}>Hapus</Text>
                </TouchableOpacity>
              </View>
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
  inputRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#18181B",
    color: "#FAFAFA",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  button: {
    backgroundColor: "#8B5CF6",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: {
    color: "#FAFAFA",
    fontWeight: "bold",
  },
  message: {
    color: "#A1A1AA",
    marginHorizontal: 16,
    marginBottom: 12,
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
  cardDesc: {
    color: "#A1A1AA",
    marginTop: 4,
    fontSize: 14,
  },
  cardStatus: {
    color: "#10B981",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "bold",
  },
  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    backgroundColor: "#27272A",
    padding: 8,
    borderRadius: 6,
  },
  removeBtn: {
    backgroundColor: "#7F1D1D",
  },
  actionText: {
    color: "#FAFAFA",
    fontSize: 12,
  },
});
