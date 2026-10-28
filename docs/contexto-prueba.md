# Contexto de la prueba: registro de lecturas de medidores de agua

> Archivo de contexto para asistentes de IA. Resume el enunciado de la Prueba I (ESFOT, desarrollo móvil).
> La IA redacta y ayuda; **las decisiones técnicas son del estudiante**, quien debe defenderlas oralmente sin apoyo de IA.

## Problema

Técnicos de EPMAPS (Quito) registran cada mes la lectura de medidores de agua. Muchas rutas están en zonas rurales (Nono, Lloa, Pacto, Nanegalito, Calacalí) o en lugares sin señal (cajas bajo la calzada, sótanos). Hoy se usa WhatsApp y digitación manual, con errores y sin trazabilidad. Se necesita una app para registrar lecturas en campo, con foto de respaldo, que **funcione sin señal** y envíe los datos a la oficina cuando haya conexión.

## Restricciones

- React Native + **Expo SDK 57** + TypeScript. Proyecto en `src/app` (Expo Router).
- El sistema de la oficina se simula con **MockAPI**, con los recursos `medidores` y `lecturas` (en dos cuentas distintas por el límite del plan gratuito).
- **Cada dependencia agregada debe corresponder a un requisito**; una librería sin requisito resta puntos.
- Se debe **elegir tecnologías adecuadas, no las más genéricas que suele elegir la IA**, y poder justificarlas.
- Un diseño visual genérico o básico resta 5 puntos sobre 20.
- Se defiende desde un **APK instalado** (si no, la nota máxima es 8/20). Defensa oral: 10 minutos, sin IA, miércoles 28 de octubre de 2026, 14:00.
- La rúbrica es **cumple / no cumple** por criterio; no hay puntajes parciales.
- Pasar código entre estudiantes con cambios leves = nota cero y sanción por deshonestidad académica.

## Requisitos del cliente (escritos sin mencionar tecnologías)

| N° | Requisito | Puntos |
| --- | --- | --- |
| R1 | El técnico se identifica con código de empleado y clave (datos quemados). La app lo recuerda hasta que cierre sesión. | 1 |
| R2 | El código del medidor tiene formato `MED-` + 6 dígitos. Con un código incompleto o de otro formato se muestra el error y **no se consulta** nada. | 1 |
| R3 | Con señal se consultan y muestran 7 datos: dirección, sector, número de cuenta, estado, última lectura con su fecha y consumo promedio mensual. Una segunda consulta del mismo medidor **en modo avión** debe mostrar los datos sin error (caché). | 2 |
| R4 | Sin señal se puede completar el registro. La lectura queda **pendiente de verificar** y se compara con la anterior cuando vuelve la conexión. | 1 |
| R5 | Estados del medidor: **normal** (lectura obligatoria), **inaccesible** (motivo obligatorio, sin lectura), **dañado** (descripción del daño obligatoria, lectura opcional). | 2 |
| R6 | Consumo = lectura actual − lectura anterior. Si supera el **triple** del promedio mensual: advertencia, el técnico debe **confirmar** que revisó el medidor y la foto pasa a ser obligatoria. | 1 |
| R7 | Foto obligatoria solo con consumo anómalo o medidor dañado; opcional en los demás casos. Debe conservarse en el teléfono **aunque pasen días y se reinicie el teléfono**. Si se niega el permiso de cámara, explicar por qué se necesita y permitir continuar donde la foto no es obligatoria. | 2 |
| R8 | El registro ocupa varias pantallas. Si la app se cierra a la mitad, al reabrirla **ofrece continuar o descartar**, y al continuar conserva los datos ya ingresados. | 2 |
| R9 | Al recuperar la conexión, las lecturas pendientes se envían **solas**, **sin duplicarse** aunque la señal se corte a mitad del envío. En **todas las pantallas** se ve el estado de conexión y cuántas lecturas faltan por enviar. | 2 |
| R10 | Una lectura pendiente puede corregirse; una enviada, no. No se puede registrar dos veces el mismo medidor en el mismo mes. | 2 |
| Defensa | Justificación de decisiones y explicación del código. | 4 |

Requisito opcional: subir la foto a un servicio externo de imágenes y guardar su URL pública en la lectura.

## Modelo de datos en MockAPI

**`medidores`**: `codigo`, `direccion`, `sector`, `numeroCuenta`, `estado`, `ultimaLectura` (número), `fechaUltimaLectura` (timestamp Unix en **segundos**), `consumoPromedio` (número).

**`lecturas`**: `clienteId` (identificador generado en el teléfono, para evitar duplicados), `medidorCodigo`, `tecnicoCodigo`, `estadoMedidor` (`normal` | `inaccesible` | `danado`), `lectura` (puede ser nula), `lecturaAnterior`, `consumo`, `anomalo`, `confirmoRevision`, `motivo`, `descripcionDanio`, `fotoUrl`, `mes` (formato `AAAA-MM`), `registradaSinConexion`, `fechaRegistro` (timestamp Unix en segundos).

URL base sin `/api/v1/`: `https://<id-cuenta-1>.mockapi.io/medidores` y `https://<id-cuenta-2>.mockapi.io/lecturas`.

## Decisiones abiertas (casos que el enunciado no define)

Cada una debe resolverse en algún ADR y poder explicarse en la defensa:

1. Registrar sin señal un medidor que nunca se consultó: no hay lectura anterior ni promedio para comparar.
2. Lectura actual **menor** que la anterior.
3. Cómo detectar el "mismo medidor, mismo mes" en R10: solo en el teléfono, también en el servidor, o ambos.
4. Si el código del medidor se acepta en minúsculas (`med-123456`) o se exige exacto.
5. Si la foto es obligatoria y se negó el permiso de cámara: el técnico no puede continuar.
6. Qué hace la app si el envío falla por un error del servidor distinto a la falta de señal (reintentos).
7. Vigencia de la caché de medidores: si vale toda la jornada, hasta cerrar sesión, o por un tiempo fijo; y si se muestra un dato viejo cuando no hay señal.

## Reglas para redactar los ADR

- Carpeta: `docs/adr/`. Archivo: `ADR-00N-titulo-corto-con-guiones.md`. Plantilla: `docs/adr/ADR-000-plantilla.md`.
- Un ADR por decisión. Una decisión nueva que cambie una anterior es un ADR nuevo; no se edita el anterior.
- El ADR se commitea **antes** que la instalación de la librería que justifica (el historial de Git es evidencia).
- No usar una librería también es una decisión y se registra.
- Cada ventaja y desventaja debe estar vinculada a un requisito (R1 a R10), no ser un elogio genérico de la librería.
- El apartado "Uso de IA" debe describir solo lo que realmente ocurrió.
