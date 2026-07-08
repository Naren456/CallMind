import { Text, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Mic, CheckCircle, Calendar } from "lucide-react-native";
import CallMindLogo from "../components/CallMindLogo";
import PrimaryButton from "../components/PrimaryButton";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View entering={FadeInDown.duration(800).delay(300)} style={styles.logoWrapper}>
        <CallMindLogo size={120} color="#FF7F50" showText={false} />
      </Animated.View>
      
      <Animated.View entering={FadeInDown.duration(800).delay(500)} style={styles.textWrapper}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.brand}>CallMind</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(800).delay(700)} style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Mic size={24} color="#FF7F50" />
          <Text style={styles.featureText}>Record & Transcribe Meetings</Text>
        </View>
        <View style={styles.featureItem}>
          <CheckCircle size={24} color="#FF7F50" />
          <Text style={styles.featureText}>Extract Smart Action Items</Text>
        </View>
        <View style={styles.featureItem}>
          <Calendar size={24} color="#FF7F50" />
          <Text style={styles.featureText}>Never Miss a Deadline</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(800).delay(1000)} style={styles.buttonWrapper}>
        <PrimaryButton 
          title="Get Started" 
          onPress={() => router.replace('/(tabs)')} 
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#0F172A',
    padding: 24,
  },
  logoWrapper: {
    marginBottom: 16,
    marginTop: -40, // Shift up slightly to balance the button
  },
  textWrapper: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 24,
    color: '#94A3B8',
    marginBottom: 4,
  },
  brand: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF7F50',
    letterSpacing: 1,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 64,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 20,
    // Add subtle depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  featureText: {
    color: '#E2E8F0',
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonWrapper: {
    position: 'absolute',
    bottom: 64,
    width: '100%',
    alignItems: 'center',
  }
});
