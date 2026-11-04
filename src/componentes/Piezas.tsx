// Piezas visuales reutilizables con identidad institucional EPMAPS.
import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tema } from '../constants/tema';
import { evaluarFuerza } from '../validacion/validacion';
import { AvisoAnimado, Entrada, useEscalaAlPresionar } from './Animados';
import { SafeAreaViewEstilizada } from './SafeAreaViewEstilizada';

export function Aviso({ texto, tipo }: { texto: string; tipo: 'info' | 'aviso' | 'error' }) {
  const configuraciones = {
    info: {
      clases: 'bg-info-fondo border-info-borde text-info-texto',
      acento: 'bg-info-texto',
      texto: 'text-info-texto',
    },
    aviso: {
      clases: 'bg-aviso-fondo border-aviso-borde text-aviso-texto',
      acento: 'bg-aviso-texto',
      texto: 'text-aviso-texto',
    },
    error: {
      clases: 'bg-error-fondo border-error-borde text-error-texto',
      acento: 'bg-error-texto',
      texto: 'text-error-texto',
    },
  };
  const configuracion = configuraciones[tipo];

  return (
    <AvisoAnimado className={`flex-row items-start gap-3 rounded-tarjeta border-[1.5px] px-4 py-3.5 ${configuracion.clases}`}>
      <View className={`mt-1 h-5 w-1 shrink-0 rounded-full ${configuracion.acento}`} />
      <Text className={`flex-1 text-sm font-semibold leading-5 ${configuracion.texto}`}>{texto}</Text>
    </AvisoAnimado>
  );
}

export function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="gap-1 border-t border-agua pt-2.5">
      <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-tinta-suave">{etiqueta}</Text>
      <Text className="text-base font-bold leading-[22px] text-tinta">{valor}</Text>
    </View>
  );
}

export function Tarjeta({ children }: { children: ReactNode }) {
  return <Entrada className="gap-3.5 rounded-tarjeta border-[1.5px] border-neutro bg-superficie p-5">{children}</Entrada>;
}

type PropsBoton = {
  texto: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  variante?: 'principal' | 'secundario' | 'peligro';
};

export function Boton({
  texto,
  onPress,
  cargando,
  deshabilitado,
  variante = 'principal',
}: PropsBoton) {
  const clases = {
    principal: 'min-h-[52px] items-center justify-center rounded-boton border-[1.5px] border-primario bg-primario px-5 py-[15px] text-white',
    secundario: 'min-h-[52px] items-center justify-center rounded-boton border-[1.5px] border-primario bg-superficie px-5 py-[15px] text-tinta',
    peligro: 'min-h-[52px] items-center justify-center rounded-boton border-[1.5px] border-critico bg-error-fondo px-5 py-[15px] text-critico',
  }[variante];
  const clasesInactivas = {
    principal: 'min-h-[52px] items-center justify-center rounded-boton border-[1.5px] border-neutro bg-primario px-5 py-[15px] text-white opacity-45',
    secundario: 'min-h-[52px] items-center justify-center rounded-boton border-[1.5px] border-neutro bg-superficie px-5 py-[15px] text-tinta opacity-45',
    peligro: 'min-h-[52px] items-center justify-center rounded-boton border-[1.5px] border-neutro bg-error-fondo px-5 py-[15px] text-critico opacity-45',
  }[variante];

  const inactivo = Boolean(cargando || deshabilitado);
  const { estilo: estiloEscala, onPressIn, onPressOut } = useEscalaAlPresionar();

  return (
    <Animated.View style={estiloEscala}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inactivo}
        className={inactivo ? clasesInactivas : clases}
        style={({ pressed }) => pressed && !inactivo ? { opacity: 0.84 } : undefined}
      >
        {cargando ? (
          <ActivityIndicator
            colorClassName={
              variante === 'principal'
                ? 'accent-white'
                : variante === 'secundario'
                  ? 'accent-tinta'
                  : 'accent-critico'
            }
          />
        ) : (
          <Text className={`text-base font-extrabold tracking-[0.3px] ${variante === 'principal' ? 'text-white' : variante === 'secundario' ? 'text-tinta' : 'text-critico'}`}>{texto}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function BarraSuperior({
  titulo,
  subtitulo,
  onVolver,
}: {
  titulo: string;
  subtitulo?: string;
  onVolver?: () => void;
}) {
  return (
    <View className="relative overflow-hidden rounded-b-[24px] bg-primario px-5 pb-4 pt-3">
      {/* Círculos translúcidos decorativos inspirados en ondas de agua */}
      <View className="absolute -right-5 -top-5 h-[110px] w-[110px] rounded-full bg-white/10" />
      <View className="absolute -bottom-[30px] left-1/4 h-[90px] w-[90px] rounded-full bg-agua/10" />

      <View className="z-10 gap-1">
        {onVolver && (
          <Pressable onPress={onVolver} hitSlop={12} className="mb-1 self-start py-1 pr-2.5">
            <Text className="text-sm font-bold text-white">← Volver</Text>
          </Pressable>
        )}
        <Text className="text-xl font-extrabold tracking-[0.2px] text-white">{titulo}</Text>
        {subtitulo ? <Text className="text-[13px] font-semibold text-agua">{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

type PropsCampo = TextInputProps & {
  etiqueta: string;
  error?: string | null;
  esClave?: boolean;
};

export function CampoTexto({ etiqueta, error, esClave = false, style, ...props }: PropsCampo) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">{etiqueta.toUpperCase()}</Text>
      <View className={`flex-row items-center rounded-boton border-[1.5px] bg-superficie px-4 ${error ? 'border-critico' : 'border-neutro'}`}>
        <TextInput
          {...props}
          className="flex-1 py-3.5 text-base font-semibold text-tinta"
          style={style}
          placeholderTextColorClassName="accent-neutro"
          secureTextEntry={esClave && !visible}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          autoCorrect={false}
          accessibilityLabel={etiqueta}
        />
        {esClave && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Text className="text-xs font-extrabold tracking-[0.5px] text-primario">{visible ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text className="text-xs font-bold text-critico">{error}</Text> : null}
    </View>
  );
}

export function IndicadorFuerza({ clave }: { clave: string }) {
  const f = evaluarFuerza(clave);
  const ancho = useSharedValue(0);
  const progreso = useSharedValue(0);
  useEffect(() => {
    ancho.value = withTiming(f.progreso * 100, { duration: 350 });
    progreso.value = withTiming(f.progreso, { duration: 350 });
  }, [f.progreso, ancho, progreso]);
  const estiloBarra = useAnimatedStyle(() => ({
    width: `${ancho.value}%`,
    backgroundColor: interpolateColor(
      progreso.value,
      [0, 0.5, 1],
      [tema.colores.critico, tema.colores.calido, tema.colores.enviada],
    ),
  }));
  if (f.nivel === 'vacia') return null;
  return (
    <View className="mt-[-4px] gap-1.5" accessibilityLabel={`Seguridad de la contraseña: ${f.etiqueta}`}>
      <View className="h-1.5 overflow-hidden rounded-full bg-agua">
        <Animated.View className="h-full rounded-full" style={estiloBarra} />
      </View>
      <Text className="text-xs font-bold text-tinta-suave">Seguridad: {f.etiqueta}</Text>
    </View>
  );
}

// Plantilla de las pantallas de formulario nuevas (con el encabezado institucional).
export function PantallaFormulario({
  titulo,
  subtitulo,
  onVolver,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onVolver?: () => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaViewEstilizada className="flex-1 bg-lienzo" edges={['top', 'left', 'right']}>
      <BarraSuperior titulo={titulo} subtitulo={subtitulo} onVolver={onVolver} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow gap-4 p-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaViewEstilizada>
  );
}