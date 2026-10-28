# ADR-001: Usar Expo Router con rutas protegidas para la navegación y el control de acceso

## Estado

Aceptado.

## Fecha

2026-10-26

## Requisitos relacionados

- **R1**: el técnico debe seguir identificado al reabrir la app y volver a ver el login al cerrar sesión.
- **R8**: el registro de una lectura ocupa varias pantallas y, tras cerrar la app a mitad de camino, debe poder retomarse.
- **R9**: el estado de conexión y el número de lecturas pendientes deben verse en todas las pantallas.

## Contexto

La aplicación tiene tres zonas bien distintas: un login, una pantalla principal con las lecturas del técnico y un registro de lectura dividido en varios pasos (identificar el medidor, indicar estado y lectura, foto y confirmación, resumen). El proyecto se generó con la plantilla por defecto de Expo SDK 57, que ya incluye una carpeta `src/app`.

Tres condiciones limitan la solución:

1. **Control de acceso (R1).** Un técnico sin sesión no debe poder llegar a la pantalla principal ni al registro, tampoco usando el botón atrás después de cerrar sesión. La sesión se lee de forma asíncrona del almacenamiento del teléfono, así que durante unos instantes al abrir la app todavía no se sabe si hay sesión o no.
2. **Registro en varios pasos (R8).** El técnico debe poder volver atrás entre pasos, y al reabrir la app después de un cierre inesperado hay que llevarlo directamente al paso pendiente, sin pasar por los anteriores.
3. **Indicador global (R9).** El estado de conexión y el contador de pendientes tienen que aparecer en todas las pantallas, incluidas las futuras, sin repetir ese componente en cada una.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **Expo Router (navegación por archivos) con rutas protegidas** | Ya viene en la plantilla, así que no agrega dependencias. Las rutas protegidas permiten declarar en un solo lugar quién puede ver qué zona, sin comprobar la sesión pantalla por pantalla. El diseño de `_layout.tsx` raíz da un punto único donde colocar el indicador de conexión de R9. Permite navegar a una ruta concreta desde código, que es lo que necesita R8. | Cualquier archivo dentro de `src/app` se convierte en ruta, lo que obliga a guardar componentes y utilidades en otras carpetas. Agrega una capa sobre React Navigation que hay que conocer cuando algo falla. La protección de rutas solo actúa en el cliente. |
| **React Navigation configurada manualmente** | Control total de cada navegador. El control de acceso se resuelve mostrando u ocultando pantallas según la sesión. | Hay que instalar y configurar varios paquetes que la plantilla ya resuelve, con riesgo de versiones distintas a las que usa Expo Router por debajo. Las rutas viven en código y no se ven en la estructura de carpetas. R8 exige además escribir a mano la lógica para saltar al paso pendiente. |
| **Una sola pantalla que cambia de contenido según el paso (estado interno)** | No necesita ninguna librería de navegación para el registro. | El botón atrás de Android no retrocede entre pasos sin código extra. Toda la lógica de los pasos queda mezclada en un único componente. Con el login y la pantalla principal igual hay que resolver la navegación por otro camino, así que no elimina el problema. |

## Decisión

Se usa **Expo Router**, con las rutas divididas en dos grupos: uno para el login y otro para el resto de la aplicación (inicio y registro). El archivo `_layout.tsx` raíz decide cuál de los dos grupos está disponible según haya sesión o no, usando rutas protegidas, y mientras la sesión se está leyendo se mantiene visible la pantalla de carga de Expo.

El mismo `_layout.tsx` raíz es el lugar donde se coloca el indicador de conexión y de pendientes, de modo que aparece en todas las pantallas sin duplicarse.

Estructura prevista (los nombres pueden ajustarse):

```
src/app/
├── _layout.tsx            ← decide qué grupo se ve; muestra el indicador de R9
├── (auth)/
│   └── login.tsx
└── (app)/
    ├── index.tsx          ← inicio con la lista de lecturas
    └── registro/
        ├── _layout.tsx
        ├── paso-1.tsx
        └── ...
```

## Consecuencias

- No se agrega ninguna dependencia para la navegación.
- Los componentes que no son pantallas deben guardarse fuera de `src/app` (por ejemplo en `src/components`), para que no se conviertan en rutas.
- La navegación decide a qué pantalla se va, pero **no conserva lo que el técnico escribió** en cada paso. Eso se resuelve en otro ADR (estado del registro y almacenamiento).
- Al cerrar sesión hay que reemplazar la ruta actual en lugar de apilar el login encima. Si no, el botón atrás podría volver a pantallas que ya no deberían ser accesibles.
- **Riesgo:** la protección de rutas es solo del lado del cliente. Sirve para organizar la experiencia del técnico con los datos quemados de esta prueba, pero no sería una medida de seguridad en un sistema real, donde la autorización debe validarse en el servidor.
- **Riesgo:** si se decide qué grupo mostrar antes de terminar de leer la sesión guardada, el técnico verá el login por un instante aunque ya estuviera identificado. Por eso la pantalla de carga debe mantenerse hasta que la lectura termine. Lo mismo aplica a la navegación al paso pendiente de R8: solo debe ocurrir cuando el borrador ya esté cargado.

## Verificación

- `src/app` contiene solo pantallas y archivos `_layout.tsx`. Los demás componentes están en otras carpetas.
- En `package.json` no aparecen paquetes de React Navigation instalados manualmente.
- Sin sesión, la app abre en el login. Con sesión, abre en el inicio y no pasa por el login.
- Después de cerrar sesión, el botón atrás de Android no vuelve a la pantalla de inicio.
- El indicador de conexión de R9 está definido en un único lugar (`src/app/_layout.tsx` o un componente que este usa) y se ve en el login, el inicio y cada paso del registro.
- En el teléfono, el botón atrás de Android retrocede de un paso al anterior dentro del registro.

## Uso de IA

Se usó asistencia de IA para comparar alternativas y redactar el borrador. Se decidió con criterio propio usar Expo Router con rutas protegidas porque SDK 57 ya incluye la navegación, no agrega dependencias y permite mantener un indicador global en el layout raíz. La implementación fue revisada contra el flujo real de carga de sesión y acceso al registro; el estudiante debe explicar que las rutas protegidas aplican controles solo en el cliente.
