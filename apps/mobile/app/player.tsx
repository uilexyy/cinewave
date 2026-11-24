import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams } from "expo-router";
import { secureStorage } from "../services/authStorage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const titleId = params.titleId as string;
  const episodeId = params.episodeId as string | undefined;

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const player = useVideoPlayer(sourceUrl as string, (p) => {
    if (p && typeof p.loop === "boolean") p.loop = false;
  });

  useEffect(() => {
    async function loadSources() {
      try {
        const token = await secureStorage.getToken();
        const query = episodeId ? `?episodeId=${episodeId}` : "";
        const res = await fetch(`${API_BASE}/api/v1/playback/${titleId}${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.data?.sources?.length > 0) {
          setSourceUrl(json.data.sources[0].sourceUrl);
        } else {
          setError("Tidak ada sumber video yang tersedia.");
        }
      } catch {
        setError("Gagal memuat video.");
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, [titleId, episodeId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#8B5CF6" />
      </View>
    );
  }

  if (error || !sourceUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error || "Tidak ada video."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: 250,
  },
  error: {
    color: "#EF4444",
    textAlign: "center",
    padding: 24,
  },
});
