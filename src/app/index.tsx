// @ts-nocheck
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { checkHasOnboarded } from "../services/StorageService";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function determineInitialRoute() {
      const hasOnboarded = await checkHasOnboarded();
      setIsChecking(false);
      
      if (hasOnboarded) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/onboarding");
      }
    }
    
    void determineInitialRoute();
  }, []);

  return (
    <View style={styles.container}>
      {isChecking && <ActivityIndicator size="large" color="#00F0FF" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
});
