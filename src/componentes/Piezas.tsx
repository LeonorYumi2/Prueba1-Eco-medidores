// Piezas visuales reutilizables con identidad corporativa EPMAPS ("Clean UI / Alto Contraste").
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '../constants/tema';

export function Aviso({ texto, tipo }: { texto: string; tipo: 'info' | 'aviso' | 'error' }) {
  const configuracion = {
    info: {
      fondo: tema.colores.informacionFondo,
      texto: tema.colores.informacion,
      borde: tema.colores.informacionBorde,
    },
    aviso: {
      fondo: tema.colores.avisoFondo, // #FFF3CD
      texto: tema.colores.aviso, // #856404
      borde: tema.colores.avisoBorde, // #FFEEBA
    },
    error: {
      fondo: tema.colores.errorFondo, // #F8D7DA
      texto: tema.colores.errorTexto, // #721C24
      borde: tema.colores.errorBorde,
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

export function Boton({ texto, onPress, cargando, deshabilitado, variante = 'principal' }: PropsBoton) {
  const fondo = {
    principal: tema.colores.primario, // #00529B
    secundario: tema.colores.superficie, // #FFFFFF
    peligro: '#FFF5F5',
  }[variante];

  const colorTexto = {
    principal: '#FFFFFF',
    secundario: tema.colores.primario,
    peligro: tema.colores.error,
  }[variante];

  const borde = {
    principal: tema.colores.primario,
    secundario: tema.colores.primario,
    peligro: tema.colores.error,
  }[variante];

  const inactivo = Boolean(cargando || deshabilitado);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        {
          backgroundColor: pressed && variante === 'principal' ? tema.colores.primarioOscuro : fondo,
          borderColor: borde,
        },
        pressed && variante !== 'principal' && { opacity: 0.8 },
        inactivo && { opacity: 0.45 },
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
      {onVolver && (
        <Pressable onPress={onVolver} hitSlop={12} style={estilos.volver}>
          <Text style={estilos.textoVolver}>← Volver</Text>
        </Pressable>
      )}
      <Text style={estilos.barraTitulo}>{titulo}</Text>
      {subtitulo ? <Text style={estilos.barraSub}>{subtitulo}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    borderRadius: tema.radio,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textoAviso: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  fila: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 4,
  },
  etiquetaFila: {
    fontSize: 12,
    fontWeight: '700',
    color: tema.colores.textoSuave, // #6C757D
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valorFila: {
    fontSize: 16,
    fontWeight: '600',
    color: tema.colores.texto, // #1A1A1A
    lineHeight: 22,
  },
  tarjeta: {
    backgroundColor: tema.colores.superficie, // #FFFFFF
    borderRadius: tema.radio,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: tema.colores.borde, // #E2E8F0
  },
  boton: {
    borderRadius: tema.radio,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 52,
  },
  textoBoton: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  barra: {
    backgroundColor: tema.colores.primario, // #00529B
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 4,
  },
  volver: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingRight: 10,
    marginBottom: 4,
  },
  textoVolver: {
    color: '#E0ECF8',
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
    color: '#E0ECF8',
    fontSize: 13,
    fontWeight: '500',
  },
});
