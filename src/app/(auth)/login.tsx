// R1: inicio de sesión institucional con datos técnicos.
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tema } from '../../constants/tema';
import { useApp } from '../../contexto/AppContext';

export default function Login() {
  const { iniciarSesion } = useApp();
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setError(null);
    setEntrando(true);
    const mensaje = await iniciarSesion(codigo, clave);
    if (mensaje) {
      setError(mensaje);
      setEntrando(false);
    }
    // Si el inicio fue correcto, esta pantalla se reemplaza sola (ruta protegida).
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.cabecera}>
            <View style={estilos.insigniaInstitucional}>
              <Text style={estilos.textoInsignia}>SISTEMA DE LECTURAS EN CAMPO</Text>
            </View>
            <Text style={estilos.marca}>EcoMedidores</Text>
            <Text style={estilos.subtitulo}>Gestión Técnica EPMAPS</Text>
          </View>

          <View style={estilos.tarjeta}>
            <View style={estilos.encabezadoTarjeta}>
              <Text style={estilos.titulo}>Ingreso de personal</Text>
              <Text style={estilos.descripcion}>
                Ingrese sus credenciales de técnico asignado para acceder a la ruta.
              </Text>
            </View>

            <View style={estilos.bloqueCampo}>
              <Text style={estilos.etiqueta}>Código de empleado</Text>
              <TextInput
                style={estilos.campo}
                value={codigo}
                onChangeText={setCodigo}
                placeholder="EMP-001"
                placeholderTextColor={tema.colores.textoSuave}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={estilos.bloqueCampo}>
              <Text style={estilos.etiqueta}>Clave de acceso</Text>
              <TextInput
                style={estilos.campo}
                value={clave}
                onChangeText={setClave}
                placeholder="••••••••"
                placeholderTextColor={tema.colores.textoSuave}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error && (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                estilos.boton,
                pressed && { backgroundColor: tema.colores.primarioOscuro },
                entrando && { opacity: 0.6 },
              ]}
              onPress={entrar}
              disabled={entrando}
            >
              {entrando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={estilos.textoBoton}>Ingresar a la ruta</Text>
              )}
            </Pressable>
          </View>

          <Text style={estilos.pie}>Versión 1.0.0 · Módulo Offline</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Fondo limpio y luminoso de alto contraste
  },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  cabecera: {
    alignItems: 'center',
    gap: 8,
  },
  insigniaInstitucional: {
    backgroundColor: '#E2E8F0', // Cápsula gris claro elegante
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  textoInsignia: {
    color: '#00529B', // Azul institucional EPMAPS
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  marca: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A', // Texto oscuro de alta legibilidad
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  tarjeta: {
    backgroundColor: tema.colores.superficie, // #FFFFFF
    borderRadius: 16,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Sombra sutil para dar profundidad en dispositivos móviles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  encabezadoTarjeta: {
    gap: 4,
    marginBottom: 4,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: tema.colores.texto, // #1A1A1A
    letterSpacing: 0.2,
  },
  descripcion: {
    fontSize: 14,
    color: tema.colores.textoSuave,
    lineHeight: 20,
  },
  bloqueCampo: {
    gap: 6,
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: tema.colores.texto,
    letterSpacing: 0.2,
  },
  campo: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: tema.radio,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: tema.colores.texto, // #1A1A1A
    backgroundColor: '#F8FAFC',
  },
  error: {
    backgroundColor: tema.colores.errorFondo,
    borderColor: tema.colores.errorBorde,
    borderWidth: 1,
    borderRadius: tema.radio,
    padding: 14,
  },
  textoError: {
    color: tema.colores.errorTexto,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  boton: {
    backgroundColor: tema.colores.primario, // #00529B
    borderRadius: tema.radio,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    shadowColor: '#00529B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pie: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
});