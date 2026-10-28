// Indicador de conexión y lecturas pendientes en tiempo real (R9, ADR-007).
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tema } from '../constants/tema';
import { useApp } from '../contexto/AppContext';

export function IndicadorEstado() {
  const { estado } = useApp();
  const insets = useSafeAreaInsets();

  const colorConexion = estado.conexion ? tema.colores.exito : tema.colores.error;
  const textoConexion = estado.conexion ? 'Con conexión' : 'Sin conexión';
  const textoPendientes = `${estado.pendientes} por enviar`;

  return (
    <View style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={estilos.fila}>
        <View style={estilos.indicador}>
          <View style={[estilos.punto, { backgroundColor: colorConexion }]} />
          <Text style={[estilos.textoConexion, { color: colorConexion }]}>{textoConexion}</Text>
        </View>
        <Text style={estilos.textoPendientes}>{textoPendientes}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    backgroundColor: tema.colores.superficie,
    borderTopWidth: 1,
    borderTopColor: tema.colores.borde,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textoConexion: {
    fontSize: 14,
    fontWeight: '700',
  },
  textoPendientes: {
    fontSize: 14,
    fontWeight: '600',
    color: tema.colores.textoSuave,
  },
});

