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
            {estaConectado ? 'En línea' : 'Modo sin conexión'}
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
            {pendientes === 1
              ? '1 por enviar'
              : `${pendientes} por enviar`}
          </Text>
        </View>
      </View>

      {!estaConectado && (
        <View style={estilos.avisoOffline}>
          <Text style={estilos.textoAvisoOffline}>
            {pendientes > 0
              ? `${pendientes} lectura${pendientes === 1 ? '' : 's'} pendiente${pendientes === 1 ? '' : 's'} de sincronizar con el servidor`
              : 'Las lecturas se guardan localmente hasta recuperar la señal.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  barraOnline: {
    backgroundColor: tema.colores.superficie,
    borderTopColor: tema.colores.borde,
  },
  barraOffline: {
    backgroundColor: tema.colores.avisoFondo, // #FFF3CD
    borderTopColor: tema.colores.avisoBorde, // #FFEEBA
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
    backgroundColor: tema.colores.exito, // #28A745
  },
  puntoOffline: {
    backgroundColor: '#D39E00',
  },
  textoConexion: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textoOnline: {
    color: tema.colores.texto,
  },
  textoOffline: {
    color: tema.colores.aviso, // #856404
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeOnlinePendiente: {
    backgroundColor: tema.colores.informacionFondo,
    borderWidth: 1,
    borderColor: tema.colores.informacionBorde,
  },
  badgeOnlineLimpio: {
    backgroundColor: '#F1F5F9',
  },
  badgeOffline: {
    backgroundColor: '#FFEBAA',
    borderWidth: 1,
    borderColor: '#E0A800',
  },
  textoBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  textoBadgeOnlinePendiente: {
    color: tema.colores.primario,
  },
  textoBadgeOnlineLimpio: {
    color: tema.colores.textoSuave,
  },
  textoBadgeOffline: {
    color: tema.colores.aviso,
  },
  avisoOffline: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(133, 100, 4, 0.15)',
  },
  textoAvisoOffline: {
    fontSize: 12,
    fontWeight: '600',
    color: tema.colores.aviso,
    lineHeight: 16,
  },
});
