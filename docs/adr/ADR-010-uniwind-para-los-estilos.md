# ADR-010: Usar Uniwind (Tailwind 4) para los estilos en lugar de StyleSheet

## Estado
Aceptado.

## Fecha

2026-11-02

## Requisitos relacionados

- **Tarea de migración del login:** el diseño visual de la app se implementa con Uniwind en lugar de `StyleSheet`.
- **Diseño visual:** la interfaz no debe verse genérica y debe usar la paleta institucional de EPMAPS.
- **R9:** el indicador de conexión y de pendientes debe verse en todas las pantallas con un estilo coherente.

## Contexto

Toda la interfaz está escrita con `StyleSheet.create` y un objeto de tema (`src/constants/tema.ts`) con la paleta de EPMAPS y sus derivados. Funciona, pero cada pantalla repite medidas y combinaciones de color en un bloque de estilos separado de su estructura, y la tarea pide cambiar a Uniwind.

Condiciones que limitan la solución:

1. La app usa React Compiler y Reanimated 4, y las animaciones necesitan estilos que cambian en cada cuadro.
2. Durante el desarrollo se prueba en Expo Go además del APK.
3. Se debe seguir usando la paleta de EPMAPS con sus derivados ya aprobados, sin colores sueltos en las pantallas.
4. Cada dependencia nueva necesita justificación.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **Uniwind, versión gratuita** | Permite escribir los estilos como clases junto a la estructura de cada componente. Funciona en Expo Go. Los componentes de `react-native` y los de Reanimated ya aceptan `className`. Los colores y radios se definen una vez en `global.css` y se usan por nombre. Es lo que pide la tarea. | Solo funciona con Tailwind 4. Las animaciones por clase no están en la versión gratuita, así que se escriben con la API de Reanimated. Cada clase debe aparecer completa en el código, sin armarla por partes. Los componentes de terceros, como `expo-image`, necesitan un envoltorio. Exige configurar Metro. |
| **StyleSheet con `tema.ts`** (estado actual) | Cero dependencias, tipado y ya funciona. | No cumple la tarea. Los estilos viven lejos de la estructura y se repiten valores entre pantallas. |
| **Uniwind Pro** | Trae animaciones por clase de Reanimated 4. | Es de pago y exige una compilación de desarrollo; no funciona en Expo Go. Las animaciones que necesito se pueden escribir directamente con Reanimated, así que no justifica el costo. |

## Decisión

Se usa **Uniwind gratuito con Tailwind 4** y se elimina `StyleSheet` de la aplicación.

- **Paquetes:** `uniwind` 1.13.1 y `tailwindcss` 4.3.3, instalados con `npx expo install`. Se fija Tailwind en la 4.3.3, la versión de la que depende Uniwind, y no la 4.3.4, que se publicó hoy.
- **Archivo de estilos:** `src/global.css` es el punto de entrada. Importa Tailwind y Uniwind y declara en `@theme` los colores de la paleta de EPMAPS, sus derivados aprobados y los radios.
- **Importación:** `global.css` se importa una sola vez, en `src/app/_layout.tsx`, y no en el archivo de entrada de la app.
- **Metro:** `metro.config.js` envuelve la configuración con `withUniwindConfig`, que debe ser el envoltorio más externo, con la ruta de `cssEntryFile` relativa.
- **Colores:** las pantallas usan solo los nombres del tema (por ejemplo `bg-primario` o `text-tinta`), nunca un valor hexadecimal. Para propiedades que no son de estilo, como el color del marcador de un campo, se usan las propiedades `...ClassName` que ofrece Uniwind.
- **Clases:** ninguna se arma por concatenación. Cuando el estilo depende de un estado, se elige entre dos clases escritas completas.
- **Componentes de terceros:** `expo-image` se envuelve con `withUniwind`. Los componentes de Reanimated no.
- **Safe areas:** `SafeAreaView` de `react-native-safe-area-context` se envuelve una vez en `src/componentes/SafeAreaViewEstilizada.tsx`; la imagen de `expo-image` se comparte desde `src/componentes/ImagenEstilizada.tsx`.
- **Estilos animados:** los valores que cambian en cada cuadro (escala, opacidad, desplazamiento) se definen con `useAnimatedStyle` de Reanimated. Es la única excepción al uso de clases.
- **Props de color:** propiedades nativas que no son estilos (por ejemplo, el indicador de carga y el placeholder) usan las props `...ClassName` de Uniwind. La paleta TS se conserva para `Switch.trackColor` y la interpolación animada de la fuerza de contraseña.
- **Tipografía:** fuente del sistema, sin paquetes de fuentes.

## Consecuencias

- Los estilos quedan junto a la estructura de cada componente y el tema se cambia en un solo archivo.
- Se agregan dos dependencias.
- Obligación: reiniciar Metro con `npx expo start -c` cada vez que cambie `global.css`.
- Obligación: dejar fuera de `src` ningún componente con clases, porque Tailwind solo escanea desde la carpeta donde está `global.css`.
- Todas las pantallas y componentes, incluido el indicador de conexión, se migran a `className`; no quedan usos de `StyleSheet` en `src`.
- **Desventaja aceptada:** más configuración inicial y menos animaciones declarativas que con la versión Pro.
- **Riesgo:** una clase armada por partes no se generaría y el elemento quedaría sin estilo, sin error visible.
- **Riesgo:** Uniwind 1.13.1 es reciente (de hace pocos días); por eso se fija la versión.
- **Riesgo:** una migración incompleta dejaría dos sistemas de estilos conviviendo.
- **Riesgo:** el diseño usa solo la paleta clara; si el teléfono está en modo oscuro, los componentes nativos pueden verse distintos.

## Verificación

- `package.json` contiene `uniwind` en 1.13.1 y `tailwindcss` en 4.3.3.
- `metro.config.js` usa `withUniwindConfig` como envoltorio más externo.
- Con Metro iniciado se genera `src/uniwind-types.d.ts` y `className` no marca errores de tipos.
- `grep -r "StyleSheet" src` no devuelve resultados.
- `grep -rE "#[0-9A-Fa-f]{6}" src` solo encuentra el archivo `global.css`.
- El bundle Android se genera correctamente con `npx expo export --platform android`.
- Ninguna clase se construye con una variable dentro del texto (`text-${algo}`).
- El `tsc --noEmit` y el lint pasan sin errores nuevos.

## Uso de IA

La tarea pedía usar Uniwind. Le pedí a una IA que revisara su documentación para decidir cómo integrarlo. Comprobó que la versión gratuita funciona en Expo Go y que las animaciones por clase son de la versión Pro, por lo que se decidió escribirlas con Reanimated. También se verificó que Uniwind solo admite Tailwind 4, que `withUniwindConfig` va como envoltorio más externo y que la ruta del archivo de estilos debe ser relativa, y comprobó que las clases del tema (por ejemplo `bg-primario`) se generan con Tailwind 4.3.3.
