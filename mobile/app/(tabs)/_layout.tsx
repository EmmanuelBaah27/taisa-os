import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../src/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon symbol="○" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Record',
          tabBarIcon: ({ color }) => <TabIcon symbol="●" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="trajectory"
        options={{
          title: 'Trajectory',
          tabBarIcon: ({ color }) => <TabIcon symbol="△" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon symbol="□" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ symbol, color, size = 18 }: { symbol: string; color: string; size?: number }) {
  return (
    <View>
      <View style={[styles.icon, { borderColor: color }]}>
        {/* Placeholder — replace with actual icons (lucide-react-native or similar) */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    height: 80,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  icon: {
    width: 20,
    height: 20,
  },
});
