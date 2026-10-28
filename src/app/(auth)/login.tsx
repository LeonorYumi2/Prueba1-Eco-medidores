// R1: inicio de sesión con datos quemados.
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
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.cabecera}>
            <Text style={estilos.marca}>EcoMedidores</Text>
            <Text style={estilos.subtitulo}>Lecturas de agua en campo</Text>
          </View>

          <View style={estilos.tarjeta}>
            <Text style={estilos.titulo}>Ingreso del técnico</Text>

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

            <Text style={estilos.etiqueta}>Clave</Text>
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

            {error && (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [estilos.boton, pressed && { opacity: 0.85 }, entrando && { opacity: 0.6 }]}
              onPress={entrar}
              disabled={entrando}
            >
              {entrando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBoton}>Ingresar</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: tema.colores.primario },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
  cabecera: { alignItems: 'center', gap: 4 },
  marca: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  subtitulo: { fontSize: 15, color: '#CFE7F3' },
  tarjeta: {
    backgroundColor: tema.colores.superficie,
    borderRadius: tema.radio,
    padding: 22,
    gap: 8,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: tema.colores.texto, marginBottom: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: tema.colores.textoSuave, marginTop: 6 },
  campo: {
    borderWidth: 1,
    borderColor: tema.colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: tema.colores.texto,
    backgroundColor: tema.colores.fondo,
  },
  error: { backgroundColor: tema.colores.errorFondo, borderRadius: 10, padding: 12, marginTop: 6 },
  textoError: { color: tema.colores.error, fontSize: 14 },
  boton: {
    backgroundColor: tema.colores.acento,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  textoBoton: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
