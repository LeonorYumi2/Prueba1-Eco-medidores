import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { IndicadorEstado } from '../componentes/IndicadorEstado';
import { AppProvider, useApp } from '../contexto/AppContext';
import { opcionesPersistencia, queryClient } from '../servicios/clienteConsultas';

// La pantalla de carga se mantiene hasta saber si hay sesión guardada y terminar la restauración de la caché (ADR-001, ADR-003).
SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { estado } = useApp();
  // useIsRestoring indica si PersistQueryClientProvider sigue leyendo la caché desde AsyncStorage.
  const restaurandoCache = useIsRestoring();

  const cargando = estado.cargandoSesion || restaurandoCache;

  useEffect(() => {
    if (!cargando) SplashScreen.hideAsync();
  }, [cargando]);

  if (cargando) return null;

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
    <PersistQueryClientProvider client={queryClient} persistOptions={opcionesPersistencia}>
      <AppProvider>
        <Navegacion />
      </AppProvider>
    </PersistQueryClientProvider>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
});
