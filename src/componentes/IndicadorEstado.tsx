// Indicador de conexión y lecturas pendientes en tiempo real (R9, ADR-007).
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tema } from '../constants/tema';
import { useApp } from '../contexto/AppContext';

export function IndicadorEstado() {
  const { estado } = useApp();
  const insets = useSafeAreaInsets();

  const estaConectado = Boolean(estado.conexion);
  const pendientes = estado.pendientes;

  return (
    <View
      style={[
        estilos.barra,
        estaConectado ? estilos.barraOnline : estilos.barraOffline,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={estilos.fila}>
        <View style={estilos.indicador}>
          <View
            style={[
              estilos.punto,
              estaConectado ? estilos.puntoOnline : estilos.puntoOffline,
            ]}
          />
          <Text
            style={[
              estilos.textoConexion,
              estaConectado ? estilos.textoOnline : estilos.textoOffline,
            ]}
          >
            {estaConectado ? 'En línea' : 'Sin señal'}
          </Text>
        </View>

        <View
          style={[
            estilos.badge,
            estaConectado
              ? pendientes > 0
                ? estilos.badgeOnlinePendiente
                : estilos.badgeOnlineLimpio
              : estilos.badgeOffline,
          ]}
        >
          <Text
            style={[
              estilos.textoBadge,
              estaConectado
                ? pendientes > 0
                  ? estilos.textoBadgeOnlinePendiente
                  : estilos.textoBadgeOnlineLimpio
                : estilos.textoBadgeOffline,
            ]}
          >
            {pendientes === 1 ? '↑ 1 por enviar' : `↑ ${pendientes} por enviar`}
          </Text>
        </View>
      </View>

      {!estaConectado && (
        <View style={estilos.avisoOffline}>
          <Text style={estilos.textoAvisoOffline}>
            {pendientes > 0
              ? `${pendientes} lectura${pendientes === 1 ? '' : 's'} guardada${pendientes === 1 ? '' : 's'} en el teléfono. Se enviará${pendientes === 1 ? '' : 'n'} al recuperar la señal.`
              : 'Modo sin conexión activo. Las lecturas se guardan en el teléfono.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    borderTopWidth: 1.5,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  barraOnline: {
    backgroundColor: tema.colores.superficie,
    borderTopColor: tema.colores.neutro,
  },
  barraOffline: {
    backgroundColor: tema.colores.calidoFondo,
    borderTopColor: tema.colores.calidoBorde,
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
  puntoOnline: {
    backgroundColor: tema.colores.enviada,
  },
  puntoOffline: {
    backgroundColor: tema.colores.critico,
  },
  textoConexion: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textoOnline: {
    color: tema.colores.textoPrincipal,
  },
  textoOffline: {
    color: tema.colores.calidoTexto,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: tema.radioPill,
    borderWidth: 1.5,
  },
  badgeOnlinePendiente: {
    backgroundColor: tema.colores.fondoSuave,
    borderColor: tema.colores.primario,
  },
  badgeOnlineLimpio: {
    backgroundColor: tema.colores.fondo,
    borderColor: tema.colores.neutro,
  },
  badgeOffline: {
    backgroundColor: '#EFE7D2',
    borderColor: tema.colores.calidoBorde,
  },
  textoBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  textoBadgeOnlinePendiente: {
    color: tema.colores.textoPrincipal,
  },
  textoBadgeOnlineLimpio: {
    color: tema.colores.textoSecundario,
  },
  textoBadgeOffline: {
    color: tema.colores.calidoTexto,
  },
  avisoOffline: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: tema.colores.calidoBorde,
  },
  textoAvisoOffline: {
    fontSize: 12,
    fontWeight: '600',
    color: tema.colores.calidoTexto,
    lineHeight: 16,
  },
});
