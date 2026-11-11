import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { QueryState } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Screens />
    </AuthProvider>
  );
}

/**
 * Screens only mount once the saved sign-in has been checked, so no screen
 * ever loads data as "signed out" and then has to correct itself.
 */
function Screens() {
  const { ready } = useAuth();
  if (!ready) return <QueryState loading error={null} onRetry={() => {}} />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand700 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "600" },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.sand },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="packages/[id]" options={{ title: "Package" }} />
      <Stack.Screen name="transport/[id]" options={{ title: "Transport" }} />
      <Stack.Screen name="community/[id]" options={{ title: "Discussion" }} />
      <Stack.Screen
        name="community/new"
        options={{ title: "New post", presentation: "modal" }}
      />
      <Stack.Screen
        name="login"
        options={{ title: "Sign in", presentation: "modal" }}
      />
      <Stack.Screen
        name="register"
        options={{ title: "Create account", presentation: "modal" }}
      />
      <Stack.Screen name="bookings" options={{ title: "My bookings" }} />
      <Stack.Screen
        name="provider/index"
        options={{ title: "Provider dashboard" }}
      />
      <Stack.Screen
        name="provider/listings"
        options={{ title: "My listings" }}
      />
      <Stack.Screen
        name="provider/package-form"
        options={{ title: "Package" }}
      />
      <Stack.Screen
        name="provider/service-form"
        options={{ title: "Transport service" }}
      />
      <Stack.Screen name="provider/bookings" options={{ title: "Bookings" }} />
      <Stack.Screen
        name="provider/profile"
        options={{ title: "Company profile" }}
      />
    </Stack>
  );
}
