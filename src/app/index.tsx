import { Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
export default function Index() {
  const UseRouter = router;
  return (
    <View style={styles.container}>
      <Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
