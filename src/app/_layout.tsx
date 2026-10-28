import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { IndicadorEstado } from '../componentes/IndicadorEstado';
import { AppProvider, useApp } from '../contexto/AppContext';

// La pantalla de carga se mantiene hasta saber si hay sesión guardada.
SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { estado } = useApp();

  useEffect(() => {
    if (!estado.cargandoSesion) SplashScreen.hideAsync();
  }, [estado.cargandoSesion]);

  if (estado.cargandoSesion) return null;

  const haySesion = estado.sesion !== null;
  return (
    <View style={estilos.contenedor}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={haySesion}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!haySesion}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <IndicadorEstado />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <Navegacion />
    </AppProvider>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
});
