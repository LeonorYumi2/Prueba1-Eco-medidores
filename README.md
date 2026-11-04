# EcoMedidores – Sistema de Registro de Lecturas en Campo

**Prueba I Técnica de Desarrollo Móvil — ESFOT (Escuela Politécnica Nacional)**
**Estudiante:** Leonor Elizabeth Yumi Lopez

---

## Descripción del Proyecto

**EcoMedidores** es una aplicación móvil desarrollada en **React Native (Expo SDK 57)** con **TypeScript** y **Expo Router**, diseñada para los técnicos de la empresa de agua potable **EPMAPS** (Quito).

La aplicación resuelve el problema de la **falta de conectividad celular** en parroquias rurales (Nono, Lloa, Pacto, Nanegalito, Calacalí) y zonas confinadas (sótanos o cajas bajo la calzada). Permite registrar lecturas de medidores de agua en campo con respaldo fotográfico, operar sin conexión (con caché por jornada) y sincronizar los datos de forma automática al recuperar la señal, sin duplicados.

---

## Novedades de esta versión (migración del Login)

| Mejora | Implementación |
| :--- | :--- |
| **Autenticación con Firebase Authentication** | Registro, inicio de sesión, verificación de correo, recuperación y cambio de contraseña, y cierre de sesión (ADR-009). |
| **Indicador de seguridad de la contraseña** | Muestra *Débil / Media / Fuerte* mientras se escribe, con una barra animada (`evaluarFuerza` + `IndicadorFuerza`). |
| **Edición del nombre del perfil** | Pantalla `Perfil` que actualiza el `displayName` con `updateProfile` de Firebase. |
| **Animaciones con React Native Reanimated** | Seis animaciones (detalle más abajo). |
| **Estilos con Uniwind (Tailwind 4)** | Reemplaza a `StyleSheet`; la paleta institucional EPMAPS vive en `src/global.css` (ADR-010). |

---

## Autenticación (Firebase)

- **Proveedor:** Correo y contraseña, con el SDK web de Firebase (`firebase` 13.1.0).
- **Persistencia:** `initializeAuth` con `getReactNativePersistence(AsyncStorage)`; la sesión se mantiene al cerrar la app y **funciona sin conexión** si el técnico ya había iniciado sesión.
- **Un solo punto de acceso:** `src/contexto/sesion.tsx` (`ProveedorSesion`) es el único código que habla con Firebase. Expone `iniciarSesion`, `registrarse`, `enviarVerificacion`, `comprobarVerificacion`, `enviarCorreoRecuperacion`, `cambiarClave` (con reautenticación), `actualizarNombre` y `cerrarSesion`.
- **Rutas protegidas:** `Stack.Protected` con tres grupos: sin usuario (`(auth)`), usuario sin verificar (`verificar-correo`) y usuario verificado (`(app)`).
- **Trazabilidad:** el campo `tecnicoCodigo` de cada lectura enviada contiene el **correo** del técnico.
- **Mensajes de error en español:** `src/validacion/errores-firebase.ts`.

### Funciones de Firebase utilizadas

`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `onAuthStateChanged`, `updateProfile`, `sendEmailVerification`, `sendPasswordResetEmail`, `reauthenticateWithCredential`, `updatePassword`, `signOut`.

> El registro es abierto: cualquier persona con un correo puede crear una cuenta. Restringirlo requeriría validación en un servidor.

---

## Animaciones (React Native Reanimated)

| # | Animación | Técnica | Dónde |
| :-: | :--- | :--- | :--- |
| 1 | Entrada escalonada de tarjetas | `FadeInDown` con `delay` | Todas las pantallas (`Tarjeta`, `Entrada`) |
| 2 | Escala al presionar un botón | `useSharedValue` + `withSpring` | Todos los botones |
| 3 | Aviso con rebote | `BounceInDown` / `FadeOut` | Avisos y errores |
| 4 | Zoom del escudo | `ZoomIn` con resorte | Login |
| 5 | Sacudida del formulario ante un error | `withSequence` + `withTiming` | Login |
| 6 | Barra de seguridad de contraseña | `withTiming` + `interpolateColor` | Registro y cambio de contraseña |

Los componentes reutilizables están en `src/componentes/Animados.tsx`.

---

## Estilos (Uniwind)

- `src/global.css` importa Tailwind y Uniwind y declara en `@theme` los colores EPMAPS (por ejemplo `primario`, `tinta`, `agua`) y los radios.
- `metro.config.js` envuelve la configuración con `withUniwindConfig`.
- Los componentes de terceros (`SafeAreaView`, `expo-image`) se envuelven con `withUniwind` para aceptar `className`.
- Las animaciones de Reanimated usan `useAnimatedStyle`: el movimiento va en el estilo animado y el aspecto en las clases.

---

## Simulación del Sistema de Oficina (MockAPI)

El sistema corporativo se simula con dos recursos en **MockAPI** (en dos cuentas, por el límite del plan gratuito):

- **Medidores:** consulta de la información técnica de cada suministro.
- **Lecturas:** recepción de los registros enviados por los técnicos.

---

## Tecnologías y Decisiones Arquitectónicas (ADR)

Cada dependencia responde a un requisito y está documentada en `docs/adr/`:

| ADR | Decisión |
| :--- | :--- |
| 001 | `expo-router` con rutas protegidas. |
| 002 | `@react-native-async-storage/async-storage` con una clave por registro. |
| 003 | `fetch` con tiempo máximo y **TanStack Query** con persistencia en AsyncStorage para la caché de medidores. |
| 004 | `React Context` + `useReducer` para el estado compartido (borrador, pendientes, conexión). |
| 005 | Validación con funciones propias en TypeScript, sin librería de esquemas. |
| 006 | `expo-image-picker` + `expo-file-system` para capturar y conservar la foto. |
| 007 | `expo-network` y cola de envío que comprueba el servidor antes de enviar. |
| 008 | Formulario de registro con `useState`, sin librería de formularios. |
| 009 | **Firebase Authentication** con persistencia en AsyncStorage. |
| 010 | **Uniwind (Tailwind 4)** en lugar de `StyleSheet`. |

---

## Resumen de Requisitos (R1 – R10)

| N° | Requisito del Cliente | Implementación Técnica |
| :--- | :--- | :--- |
| **R1** | Identificación del técnico y sesión persistente. | Firebase Authentication con persistencia en AsyncStorage y rutas protegidas de Expo Router (ADR-009). |
| **R2** | Formato de código de medidor (`MED-` + 6 dígitos). | Expresión regular en `validacion.ts`; con un código inválido no se hace ninguna consulta. |
| **R3** | Caché de medidores y modo avión. | TanStack Query persistido en AsyncStorage, vigencia por día calendario (`esDeHoy`). |
| **R4** | Registro sin señal "pendiente de verificar". | Bandera `verificada` y recálculo al reconectar. |
| **R5** | Reglas por estado (normal, inaccesible, dañado). | Validación dinámica de campos obligatorios. |
| **R6** | Consumo anómalo (> triple del promedio). | Cálculo automático, advertencia y confirmación obligatoria. |
| **R7** | Foto obligatoria o recomendada y conservada. | Cámara del sistema y copia a la carpeta permanente con `expo-file-system`. |
| **R8** | Recuperar un registro interrumpido. | Borrador persistido en cada cambio y al pasar a segundo plano (`AppState`). |
| **R9** | Envío automático sin duplicar y estado visible en todas las pantallas. | Cola FIFO con comprobación por `clienteId`; `IndicadorEstado` en el layout raíz. |
| **R10** | Corregir pendientes, no las enviadas; una lectura por medidor y mes. | Clave `lectura:{codigo}:{mes}` y comprobación local y en el servidor. |

---

## Guía de Instalación y Ejecución

### Prerrequisitos

- Node.js y npm.
- Dispositivo Android (Expo Go o el APK instalado) o emulador de Android Studio.
- Un proyecto de **Firebase** con **Correo/Contraseña** habilitado en *Authentication → Sign-in method*, registrado como **app web**.

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/eco-medidores.git
cd eco-medidores
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz con los datos de tu proyecto de Firebase (el prefijo `EXPO_PUBLIC_` es obligatorio):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=tu-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
```

Opcionalmente, un `.env` con las URL de MockAPI (si no existe, `src/config/api.ts` usa valores por defecto):

```env
EXPO_PUBLIC_URL_MEDIDORES=https://tu-cuenta-medidores.mockapi.io/medidores
EXPO_PUBLIC_URL_LECTURAS=https://tu-cuenta-lecturas.mockapi.io/lecturas
```

> `.env.local` está en `.gitignore`: no se sube al repositorio.

### 4. Ejecutar en desarrollo

```bash
npx expo start -c
```

El `-c` limpia la caché de Metro; es necesario cada vez que cambie `src/global.css`. Escanea el QR con **Expo Go** o presiona `a` para el emulador.

### 5. Generar el APK con EAS

`.env.local` **no llega a EAS**, por lo que las variables de Firebase deben cargarse en el entorno `preview`:

```bash
npx eas-cli@latest login
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_FIREBASE_API_KEY --value "VALOR" --visibility plaintext --non-interactive
# Repetir para AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID y APP_ID
npx eas-cli@latest build --platform android --profile preview
```

El perfil `preview` de `eas.json` usa `"environment": "preview"` y genera un `.apk`. Al ser cambios con dependencias nativas (Reanimated, Uniwind), se requiere un **build nuevo**; `eas update` no es suficiente.

---

## Estructura del Proyecto

```text
eco-medidores/
├── docs/
│   └── adr/                  # Registros de Decisiones de Arquitectura (ADR-001 al ADR-010)
├── src/
│   ├── app/                  # Rutas (Expo Router)
│   │   ├── _layout.tsx       # Proveedores, pantalla de carga y rutas protegidas
│   │   ├── verificar-correo.tsx
│   │   ├── (auth)/           # login, registro, recuperar
│   │   └── (app)/            # inicio, perfil, cambiar-clave, registro/ (estado, foto, resumen)
│   ├── componentes/          # Piezas, Animados, IndicadorEstado, ConfirmacionCerrarSesion,
│   │                         # SafeAreaViewEstilizada, ImagenEstilizada
│   ├── config/               # api.ts (MockAPI) y firebase.ts
│   ├── constants/            # tema.ts (paleta para props que no admiten clases)
│   ├── contexto/             # AppContext (borrador, pendientes, conexión) y sesion (Firebase)
│   ├── servicios/            # calculos, clienteConsultas, conexion, envio, http, lecturas, medidores
│   ├── storage/              # Acceso a AsyncStorage (una clave por registro)
│   ├── validacion/           # validacion.ts (incluye evaluarFuerza) y errores-firebase.ts
│   └── global.css            # Tema de Uniwind (colores y radios EPMAPS)
├── metro.config.js           # withUniwindConfig
├── eas.json                  # Perfiles de compilación (preview = APK)
└── package.json
```

---

## Licencia y uso académico

Proyecto desarrollado con fines académicos para la ESFOT – EPN.
