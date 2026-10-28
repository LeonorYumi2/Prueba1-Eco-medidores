# ADR-006: Usar expo-image-picker para capturar la foto y expo-file-system para conservarla en el teléfono

## Estado

Aceptado.

## Fecha

2026-10-28

## Requisitos relacionados

- **R7**: la foto es obligatoria con consumo anómalo o medidor dañado y opcional en los demás casos. Debe conservarse aunque pasen días y se reinicie el teléfono. Si se niega el permiso de cámara, la app explica por qué lo necesita y permite continuar donde la foto no es obligatoria.
- **R8**: la foto forma parte de un registro de varios pasos que puede interrumpirse.
- **R9**: la lectura se envía más tarde, y la foto debe seguir disponible hasta entonces.

## Contexto

La foto es el respaldo del técnico cuando un cliente reclama, así que no puede perderse. Tres condiciones limitan la solución:

1. **Durabilidad.** Una lectura registrada sin señal puede quedar pendiente varios días. Las fotos que entrega la cámara se guardan inicialmente en una carpeta temporal que el sistema puede limpiar, por lo que no sirven como almacenamiento definitivo.
2. **Permiso de cámara.** El técnico puede negarlo. La app debe explicar el motivo y decidir si deja continuar según la foto sea o no obligatoria.
3. **Registro por pasos.** La captura ocurre en medio de un proceso que puede interrumpirse (R8), así que la ruta de la foto debe quedar guardada junto con el resto del borrador.

La interfaz de captura no necesita ser propia: el requisito es obtener la foto y conservarla.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **expo-image-picker (cámara del sistema) + expo-file-system** | Usa la cámara del propio teléfono, así que no hay que construir pantalla de captura. El permiso se solicita con pocas líneas. Ya he usado las dos librerías, por lo que puedo explicar el código en la defensa. `expo-file-system` permite copiar la foto a una carpeta permanente (R7). | Casi no hay control sobre la interfaz de captura. En Android la app puede cerrarse mientras la cámara está abierta y la foto tomarse sin que la app la reciba. |
| **expo-camera** | Control total de la vista previa y de la captura. | Hay que construir la pantalla de cámara, manejar su estado y los permisos. Es más código para un requisito que solo pide obtener la foto. |
| **Dejar la foto en la carpeta temporal o guardarla en AsyncStorage** | Es lo más corto de escribir. | La carpeta temporal puede vaciarse y la foto desaparecería (falla R7). Guardar la imagen como texto en AsyncStorage contradice el ADR-002, que solo guarda datos pequeños y rutas, y sería pesado. |

## Decisión

- **Captura:** `expo-image-picker`, abriendo la cámara del sistema, con calidad reducida para ahorrar espacio [ajusta el valor].
- **Conservación:** justo después de capturarla, la foto se **copia a la carpeta permanente de la app** con `expo-file-system`, con un nombre basado en el `clienteId` de la lectura. En la lectura y en el borrador (ADR-002) se guarda **solo la ruta** de esa copia, nunca la imagen.
- **Interfaz de archivos:** se usa la interfaz actual de SDK 57 (`File` y `Paths` desde `expo-file-system`), no la antigua de `expo-file-system/legacy`.
- **Permiso:** se solicita antes de abrir la cámara. Si se niega, se muestra por qué la app lo necesita, con un botón para ir a los ajustes del teléfono. Si la foto es opcional, el técnico puede continuar sin ella. Si es obligatoria, no puede completar el registro hasta concederlo.
- **Limpieza:** al descartar un borrador se borra su foto. Las fotos de lecturas enviadas se conservan [ajusta si decides lo contrario].
- Si la copia a la carpeta permanente falla, la foto no se da por guardada y, si era obligatoria, no se permite continuar.

## Consecuencias

- La foto sobrevive al cierre de la app y al reinicio del teléfono, que es lo que pide R7.
- El borrador y la lectura solo guardan una ruta, lo que mantiene ligero el almacenamiento del ADR-002.
- Se agregan dos dependencias, ambas del propio ecosistema de Expo.
- Obligación: copiar la foto antes de guardar la ruta, y borrarla cuando se descarta un borrador.
- **Desventaja aceptada:** poco control sobre la pantalla de captura.
- **Riesgo:** Android puede cerrar la app mientras la cámara está abierta y perder la foto tomada [VERIFICAR si la librería permite recuperar el resultado pendiente].
- **Riesgo:** acumular fotos ocupa espacio en el teléfono, y las de lecturas enviadas no se borran.
- **Riesgo:** mezclar la interfaz antigua y la nueva de `expo-file-system` produce errores difíciles de entender.

## Verificación

- `package.json` contiene `expo-image-picker` y `expo-file-system`, instalados con `npx expo install`.
- Consumo anómalo o medidor dañado sin foto: no se puede completar. Con consumo normal, la foto es opcional.
- Tomar una foto, activar modo avión, reiniciar el teléfono y abrir la app: la foto de la lectura pendiente sigue disponible.
- Negar el permiso de cámara: aparece la explicación. Con foto opcional se puede continuar; con foto obligatoria, no.
- Descartar un borrador con foto: el archivo ya no existe en la carpeta de la app.
- El código importa `File` y `Paths` desde `expo-file-system` y no desde `expo-file-system/legacy`.

## Uso de IA

Elegí `expo-image-picker` y `expo-file-system` porque ya los he usado en la materia y puedo explicarlos. Le pedí a una IA que revisara esa elección frente a R7. La IA señaló que la foto debe copiarse a una carpeta permanente y que `expo-file-system` cambió su interfaz en SDK 57; esto último lo contrasté con la documentación de Expo para esa versión. También propuso expo-camera como alternativa, que descarté porque no necesito una pantalla de captura propia. 