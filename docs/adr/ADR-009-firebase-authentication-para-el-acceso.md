# ADR-009: Usar Firebase Authentication con persistencia en AsyncStorage para la identificación del técnico

## Estado

Aceptado.

## Fecha

2026-11-02

## Requisitos relacionados

- **R1**: el técnico se identifica y la app lo recuerda hasta que cierre sesión. Este ADR cambia cómo se cumple, no lo que exige.
- **R9**: cada lectura enviada debe indicar qué técnico la registró.
- **Tarea de migración del login:** registro con nombre, verificación de correo, recuperar contraseña, cambiar contraseña, cerrar sesión, indicador de seguridad de la contraseña y edición del nombre del perfil.

## Contexto

En la primera versión, R1 se resolvió con credenciales escritas en el código (ADR-001, ADR-002 y ADR-004): dos técnicos fijos, la clave `sesion` en AsyncStorage y un estado de sesión en el contexto. El enunciado lo permitía, pero no sirve para una operación real: nadie puede crear su cuenta, recuperar una contraseña ni verificar su correo.

La nueva tarea pide migrar el acceso a Firebase Authentication con la misma lógica que se trabajó en el taller de clase, y agregar el indicador de seguridad de la contraseña y la edición del nombre.

Condiciones que limitan la solución:

1. **La app debe seguir sirviendo sin señal.** Un técnico que ya inició sesión debe poder abrir la app y registrar lecturas en una zona sin cobertura.
2. Iniciar sesión por primera vez, registrarse, verificar el correo, recuperar o cambiar la contraseña y editar el nombre son operaciones contra un servidor y necesitan internet.
3. Las claves web de Firebase se necesitan también en el APK, y la compilación en la nube no recibe los archivos ignorados por Git.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **Firebase Authentication con el SDK de JavaScript y persistencia en AsyncStorage** | Resuelve de fábrica registro, verificación de correo, recuperación y cambio de contraseña y actualización del perfil. No exige archivos nativos de configuración y funciona en Expo Go. La sesión se guarda en AsyncStorage, que ya usa la app. Es lo que se trabajó en el taller, así que puedo explicarlo en la defensa. | Agrega una dependencia grande. Hay que configurar a mano la persistencia y un alias de tipos para React Native. El registro queda abierto a cualquier correo. |
| **Mantener las credenciales escritas en el código (ADR-001/002/004)** | Cero dependencias y funciona sin ninguna conexión. | No permite crear cuentas ni recuperar contraseñas, y no cumple la tarea. |
| **React Native Firebase (`@react-native-firebase`, librería nativa)** | Es más completa que el SDK web, según el taller de clase. | Obliga a compilar una versión propia de la app (development build) y no funciona en Expo Go. El docente indicó que esta opción existe, pero el curso trabaja con la app web de Firebase, y el SDK web cubre todo lo que pide la tarea. |
| **Guardar usuarios y claves en MockAPI** | No agrega proveedores externos. | Las contraseñas quedarían guardadas sin protección en un servicio de pruebas. Descartada por seguridad. |

## Decisión

Se usa **Firebase Authentication con el SDK web (`firebase`)**, con el proyecto registrado en la consola como **app web**, igual que en el taller. Se instala con `npx expo install firebase@13.1.0`, la versión del taller.

- **Configuración:** `src/config/firebase.ts` inicializa la autenticación con `getReactNativePersistence(AsyncStorage)`. Para que los tipos de `getReactNativePersistence` compilen, `tsconfig.json` lleva el alias de `@firebase/auth` hacia sus tipos de React Native.
- **Variables:** las seis `EXPO_PUBLIC_FIREBASE_*` se leen de `.env.local` en desarrollo. Para el APK se cargan en las variables de entorno de EAS y el perfil de `eas.json` indica el entorno. Estas claves identifican el proyecto y no son secretos.
- **Un solo punto de acceso:** `src/contexto/sesion.tsx` (`ProveedorSesion`) es el único código que habla con Firebase. Expone el usuario, el nombre, la verificación y las acciones: iniciar sesión, registrarse, enviar y comprobar la verificación, recuperar la contraseña, cambiarla (con reautenticación), actualizar el nombre y cerrar sesión.
- **Rutas (ADR-001):** `Stack.Protected` con tres grupos: sin usuario, se ven login, registro y recuperar; con usuario sin verificar, se ve la pantalla de verificación; con usuario verificado, se ve la app.
- **Técnico de cada lectura:** el campo `tecnicoCodigo` envía el **correo** del usuario, que es legible para la oficina.
- **Indicador de seguridad:** función propia `evaluarFuerza` en `src/lib/fuerza-clave.ts`, sin librería, consistente con el ADR-005. Clasifica en débil, media o fuerte y no impide guardar la contraseña, salvo el mínimo de 8 caracteres.
- **Sin conexión:** si el usuario ya inició sesión y verificó su correo, Firebase lo restaura desde AsyncStorage y la app abre sin conexión [VERIFICAR en pruebas con modo avión]. Las operaciones que necesitan servidor muestran un mensaje que lo explica.
- **Cambios sobre ADR anteriores:** la clave `sesion` del ADR-002 deja de usarse, la condición de `Stack.Protected` del ADR-001 pasa a ser el usuario de Firebase y su verificación, y el estado de sesión del ADR-004 sale del contexto de la aplicación y vive en `ProveedorSesion`. El resto de esos ADR no cambia.

## Consecuencias

- Se pueden crear cuentas, recuperar contraseñas, verificar correos y editar el nombre.
- Los técnicos identificados trabajan sin señal.
- Obligación: copiar el alias de tipos de `@firebase/auth` al `tsconfig.json`.
- Obligación: cargar las seis variables en EAS antes de generar el APK, o el APK saldría sin configuración de Firebase y no podría iniciar sesión.
- Obligación: mantener AsyncStorage en la versión 2.2.0 que recomienda Expo para SDK 57, y no la 3.x que usa el taller.
- Obligación: eliminar `src/config/tecnicos.ts` y los usos de la clave `sesion`.
- **Desventaja aceptada:** más dependencias y más configuración, y que la primera sesión en cada teléfono exija internet.
- **Riesgo:** el registro es abierto; cualquier persona con un correo puede crear una cuenta. Restringirlo exigiría crear las cuentas desde la consola o validar el dominio en un servidor.
- **Riesgo:** un técnico con el correo sin verificar no puede usar la app, ni siquiera sin conexión, hasta verificarlo.
- **Riesgo:** `getReactNativePersistence` depende de la versión de AsyncStorage; una versión incompatible puede impedir que la sesión se restaure [VERIFICAR en pruebas].
- **Riesgo:** una versión de Firebase muy reciente puede traer cambios; por eso se fija la 13.1.0.

## Verificación

- `package.json` contiene `firebase` en la versión 13.1.0 y AsyncStorage en la 2.2.0.
- `tsconfig.json` contiene el alias de `@firebase/auth` y el proyecto compila con `npx tsc --noEmit`.
- Registrarse con nombre, correo y contraseña: llega el correo de verificación y se muestra la pantalla de verificación.
- Con el correo verificado, entrar a la app. Cerrar la app, activar el modo avión y abrirla: sigue dentro y se puede registrar una lectura.
- Recuperar contraseña: llega el correo con el enlace. Cambiar contraseña: pide la actual y la nueva.
- Editar el nombre: el nombre cambia en la pantalla y en la consola de Firebase.
- Con el modo avión activo, iniciar sesión muestra el mensaje de que necesita internet.
- Al enviar una lectura, el campo `tecnicoCodigo` del recurso `lecturas` contiene el correo del usuario.
- Un APK generado con las variables de EAS inicia sesión; sin ellas, muestra el aviso de configuración inválida.

## Uso de IA

El taller de clase me dio la estructura del acceso con Firebase. Le pedí a una IA que me ayudara a migrarla a esta app. Revisó el taller y señaló puntos que no se podían copiar tal cual: la versión de AsyncStorage del taller es otra que la que recomienda Expo para SDK 57, el archivo `.env.local` no llega al APK compilado en EAS y el alias de tipos de `@firebase/auth` es obligatorio; este último lo comprobó compilando con y sin el alias. También advirtió que, sin conexión, solo funciona el usuario ya identificado. El docente aclaró que existe una opción nativa de Firebase, pero que el curso trabaja con la app web; por eso esa alternativa quedó descartada. 
