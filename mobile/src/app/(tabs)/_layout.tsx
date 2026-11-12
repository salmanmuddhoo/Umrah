import type { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/Gradient';
import { TabIcon, TAB_LIFT } from '@/components/TabIcon';
import { colors } from '@/theme';

/** Height of the tab bar above the phone's bottom safe area. */
const TAB_BAR_HEIGHT = 62;

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) => {
  function Icon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <TabIcon name={name} focused={focused} color={color} size={size} />;
  }
  return Icon;
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand800 },
        headerBackground: () => <GradientFill name="brand" />,
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.brand700,
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontWeight: '600' },
        // A slightly taller bar, so the label still fits under an icon that has room to rise.
        tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingTop: TAB_LIFT / 2, overflow: 'visible' },
        sceneStyle: { backgroundColor: colors.sand },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'One Ummah', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="umrah" options={{ title: 'Umrah', tabBarIcon: icon('moon') }} />
      {/* The planner sits in the middle of the bar. */}
      <Tabs.Screen name="planner" options={{ title: 'Planner', headerTitle: 'Umrah planner', tabBarIcon: icon('checkbox') }} />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarIcon: icon('chatbubbles') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
