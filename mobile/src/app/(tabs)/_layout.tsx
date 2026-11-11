import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) => {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  }
  return TabIcon;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand700 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.brand700,
        tabBarInactiveTintColor: '#64748b',
        sceneStyle: { backgroundColor: colors.sand },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'My Ummah', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="umrah" options={{ title: 'Umrah', tabBarIcon: icon('moon') }} />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarIcon: icon('chatbubbles') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
