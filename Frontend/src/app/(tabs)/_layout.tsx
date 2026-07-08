import { Tabs } from 'expo-router';
import { Home, Search, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0F172A', // App background color
          shadowColor: 'transparent', // Removes header border on iOS
          elevation: 0, // Removes header border on Android
        },
        headerTitleStyle: {
          color: '#E2E8F0', // Light text color
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#FF7F50', // Brand color for active tab
        tabBarInactiveTintColor: '#94A3B8', // Muted text for inactive tabs
        tabBarStyle: {
          backgroundColor: '#1E293B', // Slightly lighter dark background for the tab bar
          borderTopWidth: 0, // Removes the top border line
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
