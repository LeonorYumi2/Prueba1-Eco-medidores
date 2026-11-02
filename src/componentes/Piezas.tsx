// Piezas visuales reutilizables con identidad institucional EPMAPS.
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '../constants/tema';

export function Aviso({ texto, tipo }: { texto: string; tipo: 'info' | 'aviso' | 'error' }) {
  const configuracion = {
    info: {
      fondo: tema.colores.infoFondo,
      texto: tema.colores.infoTexto,
      borde: tema.colores.infoBorde,
      icono: 'ℹ',
    },
    aviso: {
      fondo: tema.colores.calidoFondo,
      texto: tema.colores.calidoTexto,
      borde: tema.colores.calidoBorde,
      icono: '▲',
    },
    error: {
      fondo: tema.colores.criticoFondo,
      texto: tema.colores.criticoTexto,
      borde: tema.colores.criticoBorde,
      icono: '✕',
    },
  }[tipo];

  return (
    <View
      style={[
        estilos.aviso,
        {
          backgroundColor: configuracion.fondo,
          borderColor: configuracion.borde,
        },
      ]}
    >
      <Text style={[estilos.iconoAviso, { color: configuracion.texto }]}>
        {configuracion.icono}
      </Text>
      <Text style={[estilos.textoAviso, { color: configuracion.texto }]}>{texto}</Text>
    </View>
  );
}

export function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.etiquetaFila}>{etiqueta}</Text>
      <Text style={estilos.valorFila}>{valor}</Text>
    </View>
  );
}

export function Tarjeta({ children }: { children: ReactNode }) {
  return <View style={estilos.tarjeta}>{children}</View>;
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
  const fondo = {
    principal: tema.colores.primario,
    secundario: tema.colores.superficie,
    peligro: tema.colores.criticoFondo,
  }[variante];

  const colorTexto = {
    principal: '#FFFFFF',
    secundario: tema.colores.textoPrincipal,
    peligro: tema.colores.critico,
  }[variante];

  const borde = {
    principal: tema.colores.primario,
    secundario: tema.colores.primario,
    peligro: tema.colores.critico,
  }[variante];

  const fondoPresionado = {
    principal: tema.colores.primarioPresionado,
    secundario: tema.colores.infoFondo,
    peligro: '#FCE0E5',
  }[variante];

  const inactivo = Boolean(cargando || deshabilitado);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        {
          backgroundColor: pressed ? fondoPresionado : fondo,
          borderColor: borde,
        },
        inactivo && estilos.botonDeshabilitado,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Text style={[estilos.textoBoton, { color: colorTexto }]}>{texto}</Text>
      )}
    </Pressable>
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
    <View style={estilos.barra}>
      {/* Círculos translúcidos decorativos inspirados en ondas de agua */}
      <View style={estilos.gotaOnda1} />
      <View style={estilos.gotaOnda2} />

      <View style={estilos.contenidoBarra}>
        {onVolver && (
          <Pressable onPress={onVolver} hitSlop={12} style={estilos.volver}>
            <Text style={estilos.textoVolver}>← Volver</Text>
          </Pressable>
        )}
        <Text style={estilos.barraTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.barraSub}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    borderRadius: tema.radio,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconoAviso: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  textoAviso: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  fila: {
    borderTopWidth: 1,
    borderTopColor: tema.colores.fondoSuave,
    paddingTop: 10,
    gap: 3,
  },
  etiquetaFila: {
    fontSize: 11,
    fontWeight: '700',
    color: tema.colores.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  valorFila: {
    fontSize: 16,
    fontWeight: '700',
    color: tema.colores.textoPrincipal,
    lineHeight: 22,
  },
  tarjeta: {
    backgroundColor: tema.colores.superficie,
    borderRadius: tema.radio,
    padding: 20,
    gap: 14,
    borderWidth: 1.5,
    borderColor: tema.colores.neutro,
  },
  boton: {
    borderRadius: tema.radioBoton,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 52,
  },
  botonDeshabilitado: {
    opacity: 0.45,
    borderColor: tema.colores.neutro,
  },
  textoBoton: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  barra: {
    backgroundColor: tema.colores.primario,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  gotaOnda1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  gotaOnda2: {
    position: 'absolute',
    bottom: -30,
    left: '25%',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(212, 230, 243, 0.1)',
  },
  contenidoBarra: {
    zIndex: 1,
    gap: 4,
  },
  volver: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingRight: 10,
    marginBottom: 4,
  },
  textoVolver: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  barraTitulo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  barraSub: {
    color: tema.colores.fondoSuave,
    fontSize: 13,
    fontWeight: '600',
  },
});
