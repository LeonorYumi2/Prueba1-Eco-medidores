// Piezas visuales reutilizables.
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '../constants/tema';

export function Aviso({ texto, tipo }: { texto: string; tipo: 'info' | 'aviso' | 'error' }) {
  const colores = {
    info: { fondo: tema.colores.informacionFondo, texto: tema.colores.informacion },
    aviso: { fondo: tema.colores.avisoFondo, texto: tema.colores.aviso },
    error: { fondo: tema.colores.errorFondo, texto: tema.colores.error },
  }[tipo];
  return (
    <View style={[estilos.aviso, { backgroundColor: colores.fondo }]}>
      <Text style={{ color: colores.texto, fontSize: 14 }}>{texto}</Text>
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
    principal: tema.colores.acento,
    secundario: tema.colores.superficie,
    peligro: tema.colores.superficie,
  }[variante];
  const colorTexto = {
    principal: '#fff',
    secundario: tema.colores.primario,
    peligro: tema.colores.error,
  }[variante];
  const borde = variante === 'principal' ? fondo : variante === 'peligro' ? tema.colores.error : tema.colores.primario;
  const inactivo = Boolean(cargando || deshabilitado);
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: fondo, borderColor: borde },
        pressed && { opacity: 0.85 },
        inactivo && { opacity: 0.5 },
      ]}
    >
      {cargando ? <ActivityIndicator color={colorTexto} /> : <Text style={[estilos.textoBoton, { color: colorTexto }]}>{texto}</Text>}
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
          <Text style={estilos.textoVolver}>‹ Volver</Text>
        </Pressable>
      )}
      <Text style={estilos.barraTitulo}>{titulo}</Text>
      {subtitulo ? <Text style={estilos.barraSub}>{subtitulo}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: { borderRadius: 10, padding: 12 },
  fila: { borderTopWidth: 1, borderTopColor: tema.colores.borde, paddingTop: 10, gap: 2 },
  etiquetaFila: { fontSize: 12, fontWeight: '600', color: tema.colores.textoSuave, textTransform: 'uppercase' },
  valorFila: { fontSize: 16, color: tema.colores.texto },
  tarjeta: {
    backgroundColor: tema.colores.superficie,
    borderRadius: tema.radio,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: tema.colores.borde,
  },
  boton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5 },
  textoBoton: { fontSize: 16, fontWeight: '700' },
  barra: { backgroundColor: tema.colores.primario, paddingHorizontal: 20, paddingVertical: 14, gap: 2 },
  volver: { alignSelf: 'flex-start', paddingBottom: 4 },
  textoVolver: { color: '#CFE7F3', fontSize: 15, fontWeight: '600' },
  barraTitulo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  barraSub: { color: '#CFE7F3', fontSize: 13 },
});
