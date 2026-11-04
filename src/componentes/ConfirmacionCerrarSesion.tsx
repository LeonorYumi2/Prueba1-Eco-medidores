import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, Text, View } from 'react-native';
import { tema } from '../constants/tema';

type PropsConfirmacionCerrarSesion = {
  visible: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ConfirmacionCerrarSesion({
  visible,
  onCancelar,
  onConfirmar,
}: PropsConfirmacionCerrarSesion) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancelar}
    >
      <View className="flex-1 items-center justify-center bg-black/55 px-6">
        <Pressable
          className="absolute inset-0"
          onPress={onCancelar}
          accessibilityRole="button"
          accessibilityLabel="Cancelar cierre de sesión"
        />
        <View
          className="w-full max-w-[420px] items-center rounded-3xl border-[1.5px] border-neutro bg-superficie p-6"
          accessibilityViewIsModal
        >
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-error-borde bg-error-fondo">
            <SymbolView
              name={{
                ios: 'rectangle.portrait.and.arrow.right',
                android: 'logout',
                web: 'logout',
              }}
              tintColor={tema.colores.critico}
              size={26}
            />
          </View>

          <Text className="text-center text-xl font-extrabold text-tinta">
            Cerrar sesión
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-tinta-suave">
            ¿Estás seguro de que deseas cerrar sesión de tu cuenta en EcoMedidores?
          </Text>

          <View className="mt-6 w-full flex-row gap-3">
            <Pressable
              className="min-h-[50px] flex-1 items-center justify-center rounded-boton border-[1.5px] border-neutro bg-lienzo px-3 py-3"
              onPress={onCancelar}
              accessibilityRole="button"
            >
              <Text className="text-sm font-extrabold text-tinta">Cancelar</Text>
            </Pressable>
            <Pressable
              className="min-h-[50px] flex-1 items-center justify-center rounded-boton border-[1.5px] border-critico bg-critico px-3 py-3"
              onPress={onConfirmar}
              accessibilityRole="button"
            >
              <Text className="text-sm font-extrabold text-white">Sí, cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
