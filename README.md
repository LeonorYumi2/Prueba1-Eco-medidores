# EcoMedidores – Sistema de Registro de Lecturas en Campo
**Prueba I Técnica de Desarrollo Móvil — ESFOT (Escuela Politécnica Nacional)**  
**Estudiante:** Leonor Elizabeth Yumi Lopez   

---

##  Descripción del Proyecto
**EcoMedidores** es una aplicación móvil desarrollada en **React Native (Expo SDK 57)** con **TypeScript** y **Expo Router**, diseñada específicamente para los técnicos de la empresa de agua potable **EPMAPS** (Quito). 

La aplicación resuelve el problema crítico de la **falta de conectividad celular** en parroquias rurales (Nono, Lloa, Pacto, Nanegalito, Calacalí) y zonas confinadas (sótanos o cajas bajo la calzada). Permite registrar lecturas de medidores de agua en campo con respaldo fotográfico, operar de forma completamente offline (con caché inteligente) y sincronizar los datos de manera automática al recuperar la señal, garantizando trazabilidad y evitando duplicados.

---

## 🌐 Simulación del Sistema de Oficina (MockAPI)
El backend corporativo está simulado mediante dos recursos independientes alojados en **MockAPI** (para optimizar los límites del plan gratuito):
* **Recurso Medidores:** Consulta de información técnica de los suministros.
* **Recurso Lecturas:** Recepción y almacenamiento de los registros de campo enviados por los técnicos.

---

## 🔑 Credenciales de Acceso (Datos Quemados)
Para iniciar sesión en la aplicación (Requisito R1), utilice cualquiera de las siguientes credenciales de técnico asignado a ruta[cite: 3, 7]:

* **Técnico 1:**
  * **Código de empleado:** `EMP-001`
  * **Clave de acceso:** `agua2026`
* **Técnico 2:**
  * **Código de empleado:** `EMP-002`
  * **Clave de acceso:** `quito2026`

---

##  Tecnologías y Decisiones Arquitectónicas (ADR)
Siguiendo las directrices de la prueba, **no se han instalado librerías innecesarias** para evitar penalizaciones en la rúbrica. Cada dependencia está estrictamente justificada por un requisito del cliente y documentada mediante **Architecture Decision Records (ADR)** ubicados en la carpeta `docs/adr/`:

* **Navegación:** `expo-router` (rutas protegidas y estructuradas por archivos).
* **Almacenamiento Local:** `@react-native-async-storage/async-storage` (gestión mediante clave por registro, optimizado para resiliencia offline).
* **Comunicación HTTP:** `fetch` nativo con `AbortController` (tiempo límite estricto de 8s para evitar bloqueos por mala señal) y caché propia por jornada.
* **Estado Global:** `React Context` + `useReducer` (copia en memoria sincronizada con la fuente de verdad en AsyncStorage).
* **Validación:** Funciones puras en TypeScript para formatos estrictos (`MED-` + 6 dígitos) y reglas de negocio por estado del medidor.
* **Multimedia y Archivos:** `expo-image-picker` y `expo-file-system` (copia permanente de fotos al almacenamiento local de la app).
* **Conectividad:** `expo-network` (detección en tiempo real y disparador de cola de sincronización).

---

## 📋 Resumen de Requisitos Cumplidos (R1 – R10)

| N° | Requisito del Cliente | Implementación Técnica |
| :--- | :--- | :--- |
| **R1** | Identificación de técnico y sesión persistente. | Credenciales técnicas quemadas en `src/config/tecnicos.ts` y controladas mediante rutas protegidas de Expo Router. |
| **R2** | Formato de código de medidor (`MED-` + 6 dígitos). | Validación estricta con expresiones regulares (`validacion.ts`) que bloquea consultas con códigos incompletos. |
| **R3** | Caché de medidores consultados y modo offline. | Almacenamiento local por jornada (`esDeHoy`), permitiendo reconsultar sin conexión de red. |
| **R4** | Registro sin señal marcado como "pendiente de verificar". | Persistencia local con bandera de estado offline y recalculo automático al reconectar. |
| **R5** | Reglas estrictas por estado (Normal, Inaccesible, Dañado). | Validación dinámica de campos obligatorios (lectura, motivo de acceso, descripción de daño). |
| **R6** | Control de consumo anómalo (mayor al triple del promedio). | Cálculo automático, advertencia visual y confirmación de revisión obligatoria por parte del técnico. |
| **R7** | Obligatoriedad y conservación de foto de respaldo. | Captura mediante cámara del sistema y copiado inmediato a la carpeta permanente de archivos (`expo-file-system`). |
| **R8** | Recuperación de borradores ante cierres inesperados. | Persistencia instantánea de cambios de estado y eventos de ciclo de vida (`AppState`). |
| **R9** | Sincronización automática al recuperar la señal sin duplicar. | Cola de envío FIFO con comprobación previa de existencia en el servidor mediante `clienteId` único. |
| **R10**| Restricción de corrección y unicidad mensual por medidor. | Bloqueo de registros duplicados en el mismo mes (`AAAA-MM`) a nivel local y remoto. |

---

## 🚀 Guía de Instalación y Ejecución

### Prerrequisitos
* Node.js y npm instalados.
* Expo CLI (`npx expo`).
* Dispositivo móvil Android (con la app *Expo Go* o mediante el APK instalado) o emulador de Android Studio.

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/eco-medidores.git
cd eco-medidores
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno (Opcional)
Crea un archivo `.env` en la raíz basado en los endpoints de MockAPI (el proyecto incluye respaldos seguros por defecto en `api.ts`):
```env
EXPO_PUBLIC_URL_MEDIDORES=https://tu-cuenta-medidores.mockapi.io/medidores
EXPO_PUBLIC_URL_LECTURAS=https://tu-cuenta-lecturas.mockapi.io/lecturas
```

### 4. Ejecutar el servidor de desarrollo
```bash
npx expo start
```
* Escanea el código QR con la aplicación **Expo Go** en tu dispositivo Android o presiona `a` para abrir el emulador de Android.

---

## 📂 Estructura del Proyecto

```text
eco-medidores/
├── docs/
│   └── adr/                  # Registros de Decisiones de Arquitectura (ADR-001 al ADR-008)
├── src/
│   ├── app/                  # Enrutamiento basado en archivos (Expo Router)
│   │   ├── (app)/            # Pantallas protegidas (Inicio, Registro [estado, foto, resumen])
│   │   └── (auth)/           # Pantalla de Login institucional
│   ├── componentes/          # Elementos visuales globales (Indicador de estado, etc.)
│   ├── components/           # Piezas reutilizables (Tarjetas, Botones, Avisos, Filas)
│   ├── config/               # Configuración de API (MockAPI) y técnicos
│   ├── constants/            # Sistema de temas, colores corporativos y radios
│   ├── contexto/             # Estado global (React Context + useReducer)
│   ├── servicios/            # Lógica de negocio (Cálculos, red, http, persistencia de lecturas y envío)
│   ├── storage/              # Interfaz de AsyncStorage (Claves por registro)
│   └── validacion/           # Funciones puras de validación y tipos TypeScript
└── package.json              # Dependencias optimizadas para SDK 57
```

---
