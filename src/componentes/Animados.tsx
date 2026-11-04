// Animaciones reutilizables con react-native-reanimated.
import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  BounceInDown,
  FadeInDown,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// 1) Entrada escalonada: fade + deslizamiento con resorte.
export function Entrada({
  children,
  orden = 0,
  style,
  className,
}: {
  children: ReactNode;
  orden?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(orden * 180).duration(700).springify().damping(12).stiffness(90)}
      className={className}
      style={style}>
      {children}
    </Animated.View>
  );
}

// 2) Escala al presionar: devuelve el estilo animado y los handlers.
export function useEscalaAlPresionar(escalaPresionada = 0.88) {
  const escala = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return {
    estilo,
    onPressIn: () => {
      // eslint-disable-next-line react-hooks/immutability
      escala.value = withSpring(escalaPresionada, { damping: 15, stiffness: 300 });
    },
    onPressOut: () => {
      // eslint-disable-next-line react-hooks/immutability
      escala.value = withSpring(1, { damping: 12, stiffness: 250 });
    },
  };
}

// 3) Aviso/error: entra con rebote desde abajo y se desvanece al salir.
export function AvisoAnimado({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  return (
    <Animated.View
      entering={BounceInDown.duration(600)}
      exiting={FadeOut.duration(250)}
      className={className}
      style={style}>
      {children}
    </Animated.View>
  );
}

// 4) Zoom de entrada (escudo/logo).
export function LogoZoom({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  return (
    <Animated.View entering={ZoomIn.duration(900).springify().damping(8)} className={className} style={style}>
      {children}
    </Animated.View>
  );
}
