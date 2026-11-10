# Guía de demostración académica

Esta guía prepara un recorrido manual para el backend existente. **No se
ejecutaron solicitudes ni se crearon datos al preparar el documento.** Las
solicitudes `POST` y `PUT` de este recorrido escriben datos permanentes si se
envían a la base de desarrollo. Úsalas solo en una base aprobada para la
demostración o después de confirmar que se acepta conservar esos registros.

## Preparación

1. Configura `.env` y confirma que apunta a la base destinada a la demostración.
2. Inicia el servidor con `npm start`; espera el mensaje de conexión y puerto.
3. Usa ese puerto como `{{BASE_URL}}` (por defecto `http://localhost:3000`).
4. Sustituye cada marcador `{{...}}` con datos reales obtenidos de una respuesta
   o con valores aprobados. Los marcadores no son JSON ejecutable.
5. Usa `Content-Type: application/json` en cuerpos JSON. IDs son enteros JSON;
   las cantidades y decimales de configuración se envían como cadenas.

Los nombres de estado de vales y traslados no están definidos como enum en el
esquema ni confirmados como reglas de negocio. Sustituye
`{{ESTADO_VALIDO_CONFIRMADO}}` únicamente por un estado previamente acordado
para la demostración.

## Recorrido principal

### 1. Comprobar el servidor y obtener IDs existentes

**HTTP:** `GET {{BASE_URL}}/api/health`

Esperado: `200` con `{"status":"ok","database":"connected"}`.

**HTTP:** `GET {{BASE_URL}}/api/ubicaciones`

Esperado: `200` y una lista con `id_ubicacion` y nombres de ubicaciones.
Selecciona el ID real de la ubicación que servirá de origen/bodega y, para el
traslado, otro ID real distinto como destino.

**HTTP:** `GET {{BASE_URL}}/api/usuarios`

Esperado: `200` y una lista con `id_usuario`. Selecciona de la respuesta el
usuario real que realizará los movimientos y la actualización de parámetros.
No uses IDs asumidos.

### 2. Crear un material

Antes de enviar, verifica que `codigo` sea nuevo; el código es único.

**HTTP:** `POST {{BASE_URL}}/api/materiales`

```json
{
  "codigo": "{{CODIGO_UNICO_DEMO}}",
  "nombre": "{{NOMBRE_DEL_MATERIAL}}",
  "descripcion": "Material para demostración académica",
  "unidad_medida": "{{UNIDAD}}",
  "activo": true
}
```

Esperado: `201` con el material creado. Guarda el `id_material` devuelto como
`{{ID_MATERIAL}}`; se usará en todas las solicitudes siguientes.

### 3. Registrar la apertura y consultar existencias

El documento debe ser identificable y no haberse usado ya. No se envía
ubicación de origen. Planea la apertura de modo que el saldo cubra la suma de
la salida del vale y el despacho posterior.

**HTTP:** `POST {{BASE_URL}}/api/inventario/aperturas`

```json
{
  "id_material": {{ID_MATERIAL}},
  "id_ubicacion_destino": {{ID_UBICACION_ORIGEN}},
  "id_usuario": {{ID_USUARIO}},
  "cantidad": "{{CANTIDAD_APERTURA}}",
  "fecha_movimiento": "{{FECHA_ISO}}",
  "documento_apertura": "{{DOCUMENTO_APERTURA_UNICO}}"
}
```

Esperado: `201` con `movimiento` y `existencia`. Guarda `id_movimiento` si se
requiere mostrar el registro; confirma que `stock_disponible` coincide con la
cantidad enviada.

**HTTP:** `GET {{BASE_URL}}/api/inventario/existencias?id_material={{ID_MATERIAL}}&id_ubicacion={{ID_UBICACION_ORIGEN}}`

Esperado: `200` con `stock_disponible` y `cantidad_en_transito`, ambas cadenas
con tres decimales.

### 4. Crear un vale y registrar la salida

La cantidad solicitada debe ser menor que el stock disponible. Para este
recorrido, la entrega del detalle debe ser completa y ocurrir una sola vez.

**HTTP:** `POST {{BASE_URL}}/api/inventario/vales`

```json
{
  "codigo": "{{CODIGO_UNICO_VALE}}",
  "id_ubicacion": {{ID_UBICACION_ORIGEN}},
  "id_solicitante": {{ID_USUARIO}},
  "fecha_solicitud": "{{FECHA_ISO}}",
  "motivo": "Demostración académica",
  "estado": "{{ESTADO_VALIDO_CONFIRMADO}}",
  "detalles": [
    {
      "id_material": {{ID_MATERIAL}},
      "cantidad_solicitada": "{{CANTIDAD_VALE}}"
    }
  ]
}
```

Esperado: `201` con `vale` y `detalles`. Guarda `vale.id_vale` y el
`id_detalle_vale` del detalle retornado.

**HTTP:** `POST {{BASE_URL}}/api/inventario/vales/{{ID_VALE}}/entregas`

```json
{
  "id_usuario_entrega": {{ID_USUARIO}},
  "fecha_entrega": "{{FECHA_ISO}}",
  "detalles": [
    {
      "id_detalle_vale": {{ID_DETALLE_VALE}},
      "cantidad_entregada": "{{CANTIDAD_VALE}}"
    }
  ]
}
```

Esperado: `201` con entrega y movimiento `SALIDA_VALE`. El movimiento descuenta
stock del origen. Una segunda entrega para ese mismo detalle será rechazada.

### 5. Crear y despachar un traslado

El origen y destino deben ser distintos. La cantidad solicitada debe caber en
el stock restante del origen. En la implementación actual, el despacho debe
igualar la cantidad total del detalle y solo puede hacerse una vez.

**HTTP:** `POST {{BASE_URL}}/api/inventario/traslados`

```json
{
  "codigo": "{{CODIGO_UNICO_TRASLADO}}",
  "id_origen": {{ID_UBICACION_ORIGEN}},
  "id_destino": {{ID_UBICACION_DESTINO}},
  "id_solicitante": {{ID_USUARIO}},
  "fecha_solicitud": "{{FECHA_ISO}}",
  "estado": "{{ESTADO_VALIDO_CONFIRMADO}}",
  "motivo": "Demostración de traslado",
  "detalles": [
    {
      "id_material": {{ID_MATERIAL}},
      "cantidad_solicitada": "{{CANTIDAD_TRASLADO}}"
    }
  ]
}
```

Esperado: `201` con `traslado` y `detalles`. Guarda
`traslado.id_traslado` e `id_detalle_traslado`.

**HTTP:** `POST {{BASE_URL}}/api/inventario/traslados/{{ID_TRASLADO}}/despachos`

```json
{
  "id_usuario": {{ID_USUARIO}},
  "fecha_despacho": "{{FECHA_ISO}}",
  "detalles": [
    {
      "id_detalle_traslado": {{ID_DETALLE_TRASLADO}},
      "cantidad": "{{CANTIDAD_TRASLADO}}"
    }
  ]
}
```

Esperado: `201` con despacho y movimiento `TRASLADO_SALIDA`. Guarda
`despacho.id_despacho` e `id_detalle_despacho`.

### 6. Consultar el tránsito y recibir parcialmente

Antes de la recepción, consulta destino: el despacho descuenta el stock
disponible del origen y aparece en `cantidad_en_transito` del destino, no en
su stock disponible.

**HTTP:** `GET {{BASE_URL}}/api/inventario/existencias?id_material={{ID_MATERIAL}}&id_ubicacion={{ID_UBICACION_DESTINO}}`

Esperado: `200`; el saldo disponible no incluye el despacho y
`cantidad_en_transito` refleja lo enviado menos lo recibido.

**HTTP:** `POST {{BASE_URL}}/api/inventario/despachos/{{ID_DESPACHO}}/recepciones`

```json
{
  "id_usuario": {{ID_USUARIO}},
  "fecha_recepcion": "{{FECHA_ISO}}",
  "detalles": [
    {
      "id_detalle_despacho": {{ID_DETALLE_DESPACHO}},
      "cantidad": "{{CANTIDAD_RECIBIDA_PARCIAL}}"
    }
  ]
}
```

La cantidad recibida debe ser positiva y no superar el pendiente despachado.
Esperado: `201` con movimiento `TRASLADO_ENTRADA`.

Consulta nuevamente existencias en destino. El stock disponible aumenta por la
cantidad recibida y el tránsito disminuye en esa misma cantidad. Para demostrar
un tránsito restante, la cantidad recibida debe ser menor a la despachada.

### 7. Configurar parámetros y consultar reorden

Los valores deben provenir de una fuente aprobada para la demostración; no son
valores sugeridos por esta guía. Usa el usuario y el material/ubicación reales
obtenidos antes. Se acepta que `POST` cree o actualice por la clave natural.

**HTTP:** `POST {{BASE_URL}}/api/inventario/parametros-inventario`

```json
{
  "id_material": {{ID_MATERIAL}},
  "id_ubicacion": {{ID_UBICACION_ORIGEN}},
  "stock_minimo": "{{STOCK_MINIMO_APROBADO}}",
  "stock_maximo": "{{STOCK_MAXIMO_APROBADO}}",
  "demanda_diaria_promedio": "{{DEMANDA_PROMEDIO_APROBADA}}",
  "demanda_diaria_maxima": "{{DEMANDA_MAXIMA_APROBADA}}",
  "tiempo_reposicion_dias": {{DIAS_REPOSICION_APROBADOS}},
  "activo": true,
  "id_usuario": {{ID_USUARIO}},
  "motivo": "Configuración aprobada para demostración"
}
```

Esperado: `201` si creó o `200` si actualizó. La respuesta incluye el ID de
parámetros; la operación también agrega una fila al historial de parámetros.
Las validaciones requieren valores no negativos, stock máximo al menos igual al
mínimo y demanda máxima al menos igual al promedio.

Fórmulas usadas:

- `SS = (demanda_diaria_maxima - demanda_diaria_promedio) × tiempo_reposicion_dias`
- `PR = demanda_diaria_promedio × tiempo_reposicion_dias + SS`

**HTTP:** `GET {{BASE_URL}}/api/inventario/reorden/alertas`

Esperado: `200`; incluye el material/ubicación si su stock actual es menor que
el punto de reorden calculado. Los parámetros inactivos se omiten.

### 8. Configurar control de compras

Usa valores de días/tolerancia aprobados, no valores elegidos por esta guía. El
servicio requiere una única configuración activa para que la detección de
duplicados funcione. Si ya hay una, actualízala con su ID real en vez de crear
otra. El backend no ofrece un GET para enumerar configuraciones; verifica
previamente el ID/estado mediante una consulta de solo lectura autorizada a la
base.

**HTTP:** `POST {{BASE_URL}}/api/inventario/configuracion-control-compras`

```json
{
  "dias_duplicado": {{DIAS_DUPLICADO_APROBADOS}},
  "tolerancia_cantidad_porcentaje": "{{TOLERANCIA_APROBADA}}",
  "dias_fraccionamiento": {{DIAS_FRACCIONAMIENTO_APROBADOS}},
  "activo": true,
  "id_usuario_actualiza": {{ID_USUARIO}}
}
```

Esperado: `201`. Para una configuración existente, usa
`PUT /api/inventario/configuracion-control-compras/{{ID_CONFIGURACION}}` con el
mismo cuerpo; se espera `200`.

### 9. Crear orden y cotización de compra

Las cantidades y precios deben enviarse como cadenas decimales. El total no se
envía: se calcula en el backend con aritmética decimal exacta.

**HTTP:** `POST {{BASE_URL}}/api/inventario/ordenes-compra`

```json
{
  "codigo": "OC-DEMO-001",
  "id_solicitante": {{ID_USUARIO}},
  "id_ubicacion_destino": {{ID_UBICACION}},
  "fecha_creacion": "2026-11-10T14:30:00Z",
  "detalles": [
    { "id_material": {{ID_MATERIAL}}, "cantidad": "10.500", "precio_unitario": "12.35" }
  ]
}
```

Conserva `version.id_version` y `detalles[0].id_material` de la respuesta.
La orden y su versión inicial se crean en estado `PENDIENTE` en una transacción;
el total de ejemplo es `129.68`.

**HTTP:** `POST {{BASE_URL}}/api/inventario/versiones-orden-compra/{{ID_VERSION}}/cotizaciones`

```json
{
  "id_proveedor": {{ID_PROVEEDOR}},
  "codigo": "COT-DEMO-001",
  "fecha_cotizacion": "2026-11-10T15:00:00Z",
  "vigencia_hasta": "2026-11-30",
  "detalles": [
    { "id_material": {{ID_MATERIAL}}, "cantidad": "10.500", "precio_unitario": "12.20" }
  ]
}
```

Los detalles de cotización deben coincidir exactamente con los materiales y
cantidades solicitados. Cada proveedor puede cotizar una sola vez por versión.
Conserva `cotizacion.id_cotizacion` de la respuesta.

**HTTP:** `PUT {{BASE_URL}}/api/inventario/versiones-orden-compra/{{ID_VERSION}}/cotizacion-elegida`

```json
{ "id_cotizacion": {{ID_COTIZACION}} }
```

La cotización debe pertenecer a la misma versión. La orden no puede modificarse
ni cambiar de cotización después de seleccionarla. La selección también crea
una solicitud `AprobacionCompra` en estado `PENDIENTE`, con una cotización
requerida y el monto de la cotización seleccionada.

### 10. Registrar la decisión administrativa

El rol real consultado en MySQL es `Administrador`, ID `1`. El usuario activo
ID `5` tiene asignados `Administrador` y `Encargado de Bodega`; debe ser distinto
del solicitante para aprobar o rechazar. La API no crea usuarios, roles ni
asignaciones.

El aprobador debe ser distinto del solicitante. El ID del rol y la fecha se
resuelven/generan en el servidor; el cliente solo envía usuario, decisión y
motivo:

**HTTP:** `POST {{BASE_URL}}/api/inventario/versiones-orden-compra/{{ID_VERSION}}/decisiones-aprobacion`

```json
{
  "id_usuario": {{ID_USUARIO_ADMINISTRADOR}},
  "decision": "APROBADO",
  "motivo": "Cotización seleccionada revisada."
}
```

Para rechazar, usa `"decision": "RECHAZADO"`. Cada solicitud admite exactamente
una decisión; una decisión aprobatoria cambia orden, versión y solicitud a
`APROBADA`, y un rechazo cambia los tres estados a `RECHAZADA`. La integración
de compras aprobadas se probó previamente con el usuario 5; para nuevas pruebas
usa IDs y registros disponibles en la base destinada a la demostración.

### 11. Recepción y consulta de posibles duplicados

La recepción exige estados `APROBADA` en orden y versión, y la única decisión
formal de un aprobador administrador activo, distinto del solicitante. Antes de
la decisión, la operación debe responder HTTP `409` (`PURCHASE_APPROVAL_REQUIRED`)
y no crear recepción, detalle ni movimiento. No se deben cambiar los estados
manualmente para forzar la operación.

Una recepción parcial conserva el estado `APROBADA`. Solo cantidades aceptadas
que completen el total autorizado cambian la versión a `RECIBIDA`; la orden
cambia cuando todas sus versiones están recibidas. La cantidad entregada
acumulada no puede superar la autorizada. No hay reposición automática de
cantidades rechazadas; estas pueden dejar la compra sin poder completarse dentro
del límite autorizado.

Con datos existentes autorizados, se puede consultar el proveedor, material y
fecha:

Usa el proveedor/material/fecha/cantidad reales del documento candidato:

**HTTP:** `GET {{BASE_URL}}/api/inventario/compras/posibles-duplicados?id_proveedor={{ID_PROVEEDOR}}&id_material={{ID_MATERIAL}}&cantidad={{CANTIDAD_CANDIDATA}}&fecha={{FECHA_ISO}}`

Esperado: `200` con `posibles_duplicados`; sin coincidencias, la lista es
vacía. La detección requiere exactamente una configuración activa. Compara
órdenes dentro de `dias_duplicado`, proveedor de la cotización elegida, material
y cantidad dentro de la tolerancia configurada. Es un indicador, no una
decisión automática ni una detección de fraccionamiento.

#### Evidencia de prueba transaccional (2026-11-10)

Se validó la lógica del detector usando el servicio existente dentro de una
transacción MySQL que se revirtió. La prueba usó temporalmente CEM-001
(`id_material=58`), una orden y cotización con cantidad `10`, fecha
`2026-11-10`, ventana de `7` días y tolerancia de `10.00%`. El detector encontró
una coincidencia para el proveedor y material de prueba. `dias_fraccionamiento`
se configuró en `15`, pero no intervino en el resultado porque el detector no lo
usa actualmente.

El proveedor de la prueba tuvo la identificación sintética
`DEMO-ROLLBACK-20261110-01`, exclusivamente como dato temporal de prueba; no es
una identificación fiscal ni representa un proveedor real. Después del
`ROLLBACK`, consultas de solo lectura confirmaron que no quedaron filas de
proveedor, configuración, orden, versión, detalles, cotización ni aprobación
de prueba. No se alteró el material ni su existencia.

**Alcance de la evidencia:** se llamó directamente al servicio del detector para
que pudiera compartir la transacción con los datos temporales. No se probó la
ruta HTTP con esos fixtures; una solicitud HTTP independiente no puede leer
filas no confirmadas por esa transacción. Tampoco hay proveedor ni configuración
permanentes para ejecutar ahora el detector mediante HTTP. MySQL puede conservar
saltos en `AUTO_INCREMENT` aun cuando las filas de la transacción se reviertan.

**HTTP:** `GET {{BASE_URL}}/api/inventario/materiales/{{ID_MATERIAL}}/historial`

Esperado: `200` con movimientos cronológicos. Un movimiento
`ENTRADA_COMPRA` solo aparece después de una recepción completa y formalmente
aprobada; su trazabilidad se enlaza por las asociaciones reales.

## Dependencias y precauciones

- Los IDs de material, usuario y ubicaciones salen de las respuestas de las
  consultas o creaciones anteriores; no están fijados en esta guía.
- Vale y traslado requieren códigos únicos, material existente y estado no
  vacío. Como el esquema no define valores válidos de estado, confirma esos
  valores antes de la sesión.
- La apertura requiere documento; los documentos/códigos de la demostración
  deben ser únicos y no reutilizados.
- Vale y despacho verifican stock. Planea cantidades para que el saldo cubra
  ambas operaciones antes de ejecutarlas.
- La recepción se referencia al detalle del despacho, no directamente al
  traslado; conserva los IDs devueltos en cada paso.
- Recepción parcial no tiene clave de idempotencia: no repitas una solicitud
  si hay duda de si fue procesada.
- Reorden requiere parámetros activos. Detección de compras requiere
  exactamente una configuración activa y documentos candidatos existentes.
- `POST` y `PUT` escriben permanentemente. Para una demostración desechable,
  utiliza una base aislada preparada previamente. No existe una reversión
  segura automática de movimientos históricos.
- Esta guía no crea usuarios, ubicaciones, ni aprobaciones. No activa permisos
  ni permite cambiar manualmente los estados de compra.
