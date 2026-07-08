import { Stack } from "expo-router";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";

export default function RootLayout() {
  return (
    <AnimatedSplashScreen>
      <Stack screenOptions={{ headerShown: false }} />
    </AnimatedSplashScreen>
  );
}
