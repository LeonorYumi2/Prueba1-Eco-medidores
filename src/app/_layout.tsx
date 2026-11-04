import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { IndicadorEstado } from '../componentes/IndicadorEstado';
import { AppProvider, useApp } from '../contexto/AppContext';
import { ProveedorSesion, useSesion } from '../contexto/sesion';
import { opcionesPersistencia, queryClient } from '../servicios/clienteConsultas';
import '../global.css';


// La pantalla de carga se mantiene hasta saber si hay sesión guardada y terminar la restauración de la caché (ADR-001, ADR-003, ADR-009).
SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { estado } = useApp();
  const { usuario, verificado, cargando: cargandoSesion } = useSesion();
  // useIsRestoring indica si PersistQueryClientProvider sigue leyendo la caché desde AsyncStorage.
  const restaurandoCache = useIsRestoring();

  const cargando = estado.cargandoSesion || cargandoSesion || restaurandoCache;

  useEffect(() => {
    if (!cargando) SplashScreen.hideAsync();
  }, [cargando]);

  if (cargando) return null;

  const autenticado = usuario !== null;
  const accesoPermitido = autenticado && verificado;
  const necesitaVerificar = autenticado && !verificado;

  return (
    <View className="flex-1">
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={accesoPermitido}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={necesitaVerificar}>
          <Stack.Screen name="verificar-correo" />
        </Stack.Protected>
        <Stack.Protected guard={!autenticado}>
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
      <ProveedorSesion>
        <AppProvider>
          <Navegacion />
        </AppProvider>
      </ProveedorSesion>
    </PersistQueryClientProvider>
  );
}
