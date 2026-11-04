// Indicador de conexión y lecturas pendientes en tiempo real (R9, ADR-007).
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexto/AppContext';

export function IndicadorEstado() {
  const { estado } = useApp();
  const insets = useSafeAreaInsets();

  const estaConectado = Boolean(estado.conexion);
  const pendientes = estado.pendientes;

  return (
    <View
      className={`border-t-[1.5px] px-5 pt-2.5 ${estaConectado ? 'border-neutro bg-superficie' : 'border-aviso-borde bg-aviso-fondo'}`}
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className={`h-2.5 w-2.5 rounded-full ${estaConectado ? 'bg-exito' : 'bg-critico'}`} />
          <Text className={`text-sm font-extrabold tracking-[0.2px] ${estaConectado ? 'text-tinta' : 'text-aviso-texto'}`}>
            {estaConectado ? 'En línea' : 'Sin señal'}
          </Text>
        </View>

        <View
          className={`rounded-full border-[1.5px] px-3 py-1 ${estaConectado
            ? pendientes > 0
              ? 'border-primario bg-agua'
              : 'border-neutro bg-lienzo'
            : 'border-aviso-borde bg-aviso-fondo'}`}
        >
          <Text
            className={`text-[13px] font-extrabold ${estaConectado
              ? pendientes > 0
                ? 'text-tinta'
                : 'text-tinta-suave'
              : 'text-aviso-texto'}`}
          >
            {pendientes === 1 ? '↑ 1 por enviar' : `↑ ${pendientes} por enviar`}
          </Text>
        </View>
      </View>

      {!estaConectado && (
        <View className="mt-1.5 border-t border-aviso-borde pt-1.5">
          <Text className="text-xs font-semibold leading-4 text-aviso-texto">
            {pendientes > 0
              ? `${pendientes} lectura${pendientes === 1 ? '' : 's'} guardada${pendientes === 1 ? '' : 's'} en el teléfono. Se enviará${pendientes === 1 ? '' : 'n'} al recuperar la señal.`
              : 'Modo sin conexión activo. Las lecturas se guardan en el teléfono.'}
          </Text>
        </View>
      )}
    </View>
  );
}
