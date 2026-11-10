# Quiz Backend 2

## Documentación de demostración y entrega

- [Guía de demostración](./GUIA_DEMOSTRACION.md): secuencia de API, validaciones
  y evidencia transaccional del detector con rollback.
- [Preparación de entrega](./ENTREGA_QUIZ2.md): resumen académico, guion de video
  de cinco minutos y esquema de presentación de diez minutos.
- [.env.example](./.env.example): plantilla de configuración sin credenciales.

## Conexión a MySQL

La configuración de Sequelize y Sequelize CLI se carga desde las variables de
entorno definidas en `.env`. Usa `.env.example` como referencia para las
variables requeridas.

Para verificar la conexión sin ejecutar migraciones:

```powershell
npm run test:db
```

## Servidor Express

El servidor verifica la conexión a MySQL antes de empezar a escuchar. Usa la
variable de entorno `PORT` cuando está definida; si no está definida, escucha
en el puerto `3000`.

```powershell
npm start
```

Durante el desarrollo, usa:

```powershell
npm run dev
```

La ruta `GET /api/health` informa el estado de la conexión a la base de datos.

## API REST

Los recursos disponibles son:

- `GET|POST /api/materiales`
- `GET|PUT|DELETE /api/materiales/:id`
- `GET|POST /api/proveedores`
- `GET|PUT|DELETE /api/proveedores/:id`
- `GET /api/ubicaciones`
- `GET /api/ubicaciones/:id`
- `GET|POST /api/usuarios`
- `GET|PUT|DELETE /api/usuarios/:id`
- `GET /api/roles`
- `GET /api/roles/:id`
- `GET /api/inventario/movimientos`
- `GET /api/inventario/movimientos/:id`
- `GET /api/inventario/existencias`
- `POST /api/inventario/aperturas`
- `POST /api/inventario/vales`
- `POST /api/inventario/vales/:id/entregas`
- `POST /api/inventario/traslados`
- `POST /api/inventario/traslados/:id/despachos`
- `POST /api/inventario/despachos/:id/recepciones`
- `POST /api/inventario/ordenes-compra`
- `POST /api/inventario/versiones-orden-compra/:id/cotizaciones`
- `PUT /api/inventario/versiones-orden-compra/:id/cotizacion-elegida`
- `POST /api/inventario/versiones-orden-compra/:id/decisiones-aprobacion`
- `POST /api/inventario/ordenes-compra/:id/recepciones`
- `POST /api/inventario/ajustes/solicitudes`
- `POST /api/inventario/ajustes/solicitudes/:id/decisiones`
- `GET /api/inventario/reorden/alertas`
- `GET /api/inventario/compras/posibles-duplicados`
- `GET /api/inventario/materiales/:id/historial`
- `POST|PUT /api/inventario/parametros-inventario`
- `POST|PUT /api/inventario/configuracion-control-compras`

### Consulta de movimientos de inventario

`GET /api/inventario/movimientos` y `/api/inventario/movimientos/` listan los
movimientos existentes, en orden ascendente por fecha e identificador. Se
pueden combinar estos filtros:

| Parámetro | Uso |
|---|---|
| `id_material` | ID positivo del material |
| `id_ubicacion` | ID positivo que coincide con la ubicación de origen o destino |
| `fecha_desde` | Fecha `YYYY-MM-DD` inclusiva o timestamp ISO con zona horaria |
| `fecha_hasta` | Fecha `YYYY-MM-DD` inclusiva o timestamp ISO con zona horaria |

Ejemplo: `/api/inventario/movimientos?id_material=1&id_ubicacion=2&fecha_desde=2026-01-01&fecha_hasta=2026-01-31`.
Parámetros desconocidos, IDs no válidos y fechas inválidas se rechazan con
HTTP 400 y una respuesta JSON. Una búsqueda sin coincidencias responde HTTP 200
con una lista vacía. `GET /api/inventario/movimientos/:id` consulta un movimiento
por ID positivo; un ID inválido responde HTTP 400 y un movimiento inexistente,
HTTP 404. Ambas respuestas de error usan JSON.

`GET /api/inventario/existencias?id_material=1&id_ubicacion=2` devuelve el saldo
calculado para un material y una ubicación existentes. Ambos IDs son
obligatorios y positivos. `stock_disponible` y `cantidad_en_transito` se
devuelven como cadenas decimales con tres posiciones, evitando pérdida de
precisión JSON. Si el material no tiene movimientos, el saldo es `0.000`. Un
tipo o una combinación de fuente/ubicación no soportados producen error en vez
de un saldo parcial o engañoso.

### Cálculo de existencias: reglas y matriz

**Confirmado por los requisitos compartidos en la conversación:**

- `MovimientoInventario` es la fuente del stock actual.
- `cantidad` es siempre positiva; el tipo determina el efecto contable.
- Un movimiento debe tener una sola fuente documental.
- Se requieren entradas, salidas, traslados y ajustes.
- El stock se consulta por material y ubicación.
- El despacho de un traslado no es una entrada recibida en destino.
- El punto de reorden es `demanda_promedio_diaria × tiempo_reposición +
  stock_seguridad`; el stock de seguridad es
  `(demanda_diaria_máxima − demanda_promedio_diaria) × tiempo_reposición`.

**Confirmado por modelos/migraciones:** `cantidad` es `DECIMAL(14,3)`;
`id_ubicacion_origen` y `id_ubicacion_destino` son nullable. Existen fuentes
documentales para apertura, entrega de vale, despacho/recepción de traslado,
recepción de compra, decisiones de ajuste/corrección e incidencias. Cada columna
de referencia documental del movimiento tiene restricción UNIQUE individual.
La recepción de compra se vincula mediante el detalle de recepción con el
detalle de versión de orden y la versión conserva `id_orden`; los FKs permiten
seguir esa trazabilidad. El esquema no enumera valores válidos de `tipo` ni
obliga una única fuente documental.

**Decisión de implementación (nombres propuestos, no literales confirmados del
enunciado ni `ENUM` del DBML):**

| `tipo` propuesto | Fuente única requerida | Efecto |
|---|---|---|
| `APERTURA` | `documento_apertura` | Suma al destino |
| `ENTRADA_COMPRA` | `id_detalle_recepcion_compra` | Suma al destino |
| `SALIDA_VALE` | `id_detalle_entrega_vale` | Resta del origen |
| `TRASLADO_SALIDA` | `id_detalle_despacho` | Resta del origen; mantiene pendiente la recepción |
| `TRASLADO_ENTRADA` | `id_detalle_recepcion_traslado` | Suma al destino y reduce lo pendiente del despacho enlazado |
| `AJUSTE_ENTRADA` | `id_decision_ajuste` | Suma al destino, solo con decisión `APROBADO` |
| `AJUSTE_SALIDA` | `id_decision_ajuste` | Resta del origen, solo con decisión `APROBADO` |

`tipo` desconocido, varias fuentes o una fuente que no corresponde al tipo
producen error y no saldo. La matriz se concentra en el servicio de cálculo
aislado para que las etiquetas puedan cambiar mediante decisión explícita.
`id_decision_correccion` e `id_incidencia` están en el esquema, pero su efecto
no está definido por las reglas confirmadas y por tanto no se contabilizan.

**Fórmula implementada:** para un material/ubicación, suma de entradas a esa
ubicación menos suma de salidas desde ella. Un despacho resta de origen y no
suma en destino. Una recepción vinculada al detalle despachado suma en destino.
`cantidad_en_transito` es suma despachada para ese destino menos las recepciones
enlazadas; una recepción sin despacho conocido, en destino distinto o que exceda
lo enviado invalida el cálculo. El saldo disponible final negativo también se
rechaza. Los valores se convierten a milésimas enteras con `BigInt`, sin
aritmética de punto flotante.

**Pendientes de confirmación antes de tratar el resto de la matriz como
contrato:** los nombres exactos de `tipo`; si correcciones e incidencias deben
generar efecto adicional; si el DBML original impone otras reglas; y una
restricción UNIQUE persistente para `documento_apertura` (hoy el esquema no la
impone). Para ajustes se adoptan las decisiones de negocio `APROBADO` y
`RECHAZADO` confirmadas por el usuario del proyecto. La consulta calcula solo
movimientos registrados y no los modifica; los movimientos son inmutables por
esta API.

**Punto de reorden:** `GET /api/inventario/reorden/alertas` calcula en lectura
los parámetros activos y devuelve solo pares material/ubicación con stock
actual inferior al punto de reorden. Usa aritmética entera a milésimas:
`SS = (demanda_diaria_maxima - demanda_diaria_promedio) ×
tiempo_reposicion_dias`; `PR = demanda_diaria_promedio ×
tiempo_reposicion_dias + SS`. Los datos vienen de `ParametrosInventario`;
parámetros inactivos se omiten, no se crean valores por defecto ni se escriben
filas en `AlertaReorden`. Una demanda máxima menor al promedio o datos activos
inválidos generan error de configuración en vez de una alerta engañosa.

### Pruebas del motor de existencias

Las pruebas unitarias usan movimientos simulados sin conexión a MySQL:

```powershell
npm test
```

La integración opcional consulta directamente el servicio en una transacción
MySQL, no por HTTP: una petición independiente no puede compartir de forma
segura la transacción que contiene los fixtures. El script prueba aperturas,
duplicados, cantidades e IDs inválidos, saldos, movimientos de vale y traslado,
y el rollback cuando el cálculo falla. Los datos se crean dentro de
transacciones que se revierten; después se comprueba que no persistan.

```powershell
npm run test:inventory:integration
```

La integración requiere las filas iniciales aprobadas del usuario de Obras y
las ubicaciones Obras y Bodega Central. Se niega a ejecutarse contra una base
cuyo nombre no sea `constructora_del_valle`. No modifica filas preexistentes.

### Aperturas de inventario

`POST /api/inventario/aperturas` registra un movimiento `APERTURA` nuevo. No
actualiza ni elimina movimientos existentes. El cuerpo JSON acepta únicamente:

```json
{
  "id_material": 1,
  "id_ubicacion_destino": 2,
  "id_usuario": 3,
  "cantidad": "12.750",
  "fecha_movimiento": "2026-11-09",
  "documento_apertura": "ACTA-INICIAL-001"
}
```

Los IDs deben ser enteros positivos existentes; la cantidad debe ser positiva,
ajustarse a `DECIMAL(14,3)` y tener como máximo tres decimales. La fecha admite
`YYYY-MM-DD` o timestamp ISO con zona horaria. El documento es obligatorio y
está limitado a 80 caracteres. No se admite ubicación de origen ni ningún otro
campo. Una creación exitosa devuelve HTTP 201 con el movimiento y el saldo
calculado; valores inválidos devuelven HTTP 400, referencias inexistentes HTTP
404 y duplicados HTTP 409, todos en JSON.

La comprobación de duplicado busca el mismo documento, material y ubicación
destino. El servicio bloquea la fila del material dentro de la transacción
MySQL para serializar aperturas concurrentes del mismo material a través de
este servicio. El esquema no impone una restricción UNIQUE para ese triplete;
escritores externos que no tomen el mismo bloqueo podrían eludir la regla. No
se añadió una restricción ni tabla nueva. El servicio y su cálculo de saldo se
ejecutan en una única transacción; si el cálculo falla, se revierte el
movimiento.

### Vales de salida

`POST /api/inventario/vales` crea la solicitud y sus detalles. `estado` se
requiere porque el esquema lo exige, pero no se normaliza ni se interpreta: el
esquema no define enumeración de estados ni reglas de aprobación confirmadas.
El texto `VALOR_DE_ESTADO_DEFINIDO_POR_EL_PROYECTO` de los ejemplos es solo un
marcador y debe sustituirse; no se afirma que sea un estado válido.
Ejemplo:

```json
{
  "codigo": "VALE-OBRA-001",
  "id_ubicacion": 2,
  "id_solicitante": 3,
  "fecha_solicitud": "2026-11-09",
  "motivo": "Material para obra",
  "estado": "VALOR_DE_ESTADO_DEFINIDO_POR_EL_PROYECTO",
  "detalles": [
    { "id_material": 1, "cantidad_solicitada": "5.000" }
  ]
}
```

`POST /api/inventario/vales/:id/entregas` entrega líneas de un vale existente
y crea `EntregaVale`, `DetalleEntregaVale` y movimientos `SALIDA_VALE` en una
transacción:

```json
{
  "id_usuario_entrega": 3,
  "fecha_entrega": "2026-11-09T15:00:00Z",
  "detalles": [
    { "id_detalle_vale": 1, "cantidad_entregada": "2.500" }
  ]
}
```

Cada detalle se entrega una sola vez y por la cantidad total solicitada; no se
implementa entrega parcial de vales en esta fase. El stock se comprueba bajo
bloqueo por material; si no es suficiente, se revierte toda la operación. Los
detalles repetidos dentro de un mismo request se rechazan.

### Traslados

`POST /api/inventario/traslados` crea el traslado y sus detalles; `estado` se
requiere porque la columna real es NOT NULL, pero se conserva como lo envía el
cliente sin interpretar estados o aprobaciones. Ejemplo:

```json
{
  "codigo": "TRAS-001",
  "id_origen": 2,
  "id_destino": 3,
  "id_solicitante": 3,
  "fecha_solicitud": "2026-11-09",
  "estado": "VALOR_DE_ESTADO_DEFINIDO_POR_EL_PROYECTO",
  "detalles": [
    { "id_material": 1, "cantidad_solicitada": "4.500" }
  ]
}
```

`POST /api/inventario/traslados/:id/despachos` crea el despacho y movimientos
`TRASLADO_SALIDA`. Esta implementación despacha cada línea completa, una sola
vez, para hacer detectable una repetición con el esquema actual. Comprueba el
stock en origen bajo bloqueo. Ejemplo:

```json
{
  "id_usuario": 3,
  "fecha_despacho": "2026-11-09T16:00:00Z",
  "detalles": [
    { "id_detalle_traslado": 1, "cantidad": "4.500" }
  ]
}
```

El despacho parcial de una línea no está expuesto: el esquema no aporta una
clave de idempotencia para distinguir con seguridad un segundo despacho
parcial legítimo de un reintento. Para esta primera fase se requiere despachar
la cantidad completa del detalle una sola vez; la recepción sí puede ser
parcial.

`POST /api/inventario/despachos/:id/recepciones` permite recepciones parciales
referidas a los detalles despachados. Solo crea movimiento de entrada por
cantidad efectivamente recibida, y no puede superar lo despachado acumulado:

```json
{
  "id_usuario": 3,
  "fecha_recepcion": "2026-11-09T17:00:00Z",
  "detalles": [
    { "id_detalle_despacho": 1, "cantidad": "1.500" }
  ]
}
```

El saldo en tránsito sigue siendo despacho menos recepciones enlazadas; un
despacho no incrementa stock en destino. Todas las operaciones de escritura
usan transacciones InnoDB, bloquean materiales en orden estable y revierten
encabezados, detalles y movimientos juntos ante errores. No hay rutas para
editar o borrar movimientos.

**Límite de idempotencia:** el esquema no ofrece una clave de idempotencia para
un request de recepción parcial. El servicio impide exceder lo despachado y
serializa las operaciones, pero si el cliente reintenta una recepción parcial
idéntica que aún cabe en el saldo pendiente, el esquema no permite distinguir
el reintento de una segunda recepción real. La operación debe enviarse una vez;
garantía estricta requeriría una clave/tabla de idempotencia o una regla
documental aprobada, lo cual no se añadió.

### Alertas de reorden

`GET /api/inventario/reorden/alertas` no recibe parámetros ni escribe en la
tabla de alertas. Calcula con los parámetros activos y devuelve
`stock_disponible`, `stock_seguridad`, `punto_reorden` y
`requiere_reorden: true` para las filas retornadas. Sin parámetros activos
devuelve `[]`. No se calcula demanda histórica: usa los valores previamente
registrados en `ParametrosInventario`.

### Configuración de inventario y compras

Las siguientes rutas guardan solo valores enviados explícitamente; no hay
valores de demanda, reposición, tolerancia ni períodos aplicados
automáticamente:

- `POST /api/inventario/parametros-inventario` crea o actualiza por la clave
  natural única `(id_material, id_ubicacion)`.
- `PUT /api/inventario/parametros-inventario/:id` actualiza el registro indicado
  y exige que material y ubicación coincidan con los del registro existente.
- `POST /api/inventario/configuracion-control-compras` crea configuración.
- `PUT /api/inventario/configuracion-control-compras/:id` actualiza por ID.

Ejemplo para crear/actualizar parámetros (los números decimales se envían como
cadenas para preservar precisión):

```json
{
  "id_material": 1,
  "id_ubicacion": 2,
  "stock_minimo": "5.000",
  "stock_maximo": "50.000",
  "demanda_diaria_promedio": "2.000",
  "demanda_diaria_maxima": "4.000",
  "tiempo_reposicion_dias": 7,
  "activo": true,
  "id_usuario": 3,
  "motivo": "Parámetros confirmados por planificación"
}
```

Los valores de ejemplo son ilustrativos, no semilla ni recomendación. Los
campos deben sustituirse por datos reales validados por el negocio. Se
rechazan IDs inválidos o FKs inexistentes, cantidades negativas o fuera de
`DECIMAL(14,3)`, `stock_maximo < stock_minimo`,
`demanda_diaria_maxima < demanda_diaria_promedio`, tipos inválidos y motivos
vacíos. Días acepta enteros no negativos dentro de `INTEGER`. Cada alta o
cambio de parámetros registra actor, fecha y motivo en
`HistorialParametrosInventario`, usando `valores_anteriores`/`valores_nuevos`.

Ejemplo de configuración de control de compras:

```json
{
  "dias_duplicado": 3,
  "tolerancia_cantidad_porcentaje": "10.00",
  "dias_fraccionamiento": 7,
  "activo": true,
  "id_usuario_actualiza": 3
}
```

Los valores son solo formato ilustrativo y no se aplican hasta que un usuario
autorizado envíe los valores aprobados. `fecha_actualizacion` se registra con
la hora del servidor. La tolerancia debe ser una cadena dentro del rango de
`DECIMAL(5,2)`; los días son enteros no negativos. Se permite como máximo una
configuración activa a través del servicio; el esquema no contiene una
restricción UNIQUE que haga cumplir esa regla ante escritores concurrentes o
externos. El endpoint de detección de duplicados exige exactamente una fila
activa y falla cerrado si no existe o hay más de una. No se crean datos al
iniciar el backend.

### Estado de la Opción 2

No hay un archivo del enunciado oficial ni DBML en el directorio del proyecto.
La siguiente comparación se limita a los requisitos expresamente disponibles
en esta conversación y el README, no sustituye una cotejación con el documento
completo:

| Área documentada | Estado | Alcance / pendiente |
|---|---|---|
| Lectura de movimientos y existencias | Completo según requisitos aquí disponibles | Motor decimal, saldo por material/ubicación y tránsito por recepción enlazada |
| Aperturas, salidas por vale y traslados | Parcial | Apertura, salida y recepción transaccionales; despacho entero por detalle; estados y algunas reglas idempotentes no especificados |
| Punto de reorden | Completo para cálculo/consulta | Usa parámetros activos; requiere que la organización capture valores reales |
| Configuración de parámetros | Implementado en esta entrega | Persistencia validada y registro de cambios; sin valores de negocio precargados |
| Detección de compras duplicadas | Parcial | Criterio implementado con configuración activa; candidato informativo, sin fraccionamiento ni conclusión automática |
| Trazabilidad de compra por movimiento | Modelada, integración positiva pendiente | Recepción → detalle versión → versión/orden y proveedor por cotización seleccionada; no se puede generar una recepción nueva hasta definir la política de aprobación |
| Ajustes de inventario | Implementado | Solicitud, decisión y movimiento transaccional; las decisiones aprobadas son la única fuente de ajustes |
| Correcciones de recepción | Pendiente | Las tablas existen, pero no se expone el flujo de corrección |
| Requisitos exactos de evaluación académica | No verificable | Hace falta el enunciado oficial completo para confirmar criterios no presentes en el repositorio/conversación |

### Detección de compras posiblemente duplicadas

`GET /api/inventario/compras/posibles-duplicados?id_proveedor=1&id_material=1&cantidad=10.000&fecha=2026-11-09`
es una consulta previa, no crea ni cambia órdenes. Requiere exactamente una
fila activa de `ConfiguracionControlCompra`; si falta o hay más de una, falla
con HTTP 409 en lugar de aplicar valores supuestos. Busca órdenes cuya
`fecha_creacion` dista como máximo `dias_duplicado` días de la fecha candidata,
versiones con cotización elegida del proveedor solicitado y detalle de orden
del material solicitado. La cantidad se compara con la cantidad ordenada de
`DetalleVersionOrdenCompra`; se marca candidata si
`abs(ordenada - candidata) / candidata × 100` no supera
`tolerancia_cantidad_porcentaje`. La operación es solo lectura y usa las
relaciones reales Orden → Versión → Cotización elegida/Proveedor y detalle
versionado. No prueba fraude ni equivalencia comercial, no incluye cotizaciones
no elegidas, ni detecta fraccionamiento a través de `dias_fraccionamiento`;
es un indicador para revisión humana.

### Historial de un material

`GET /api/inventario/materiales/:id/historial` retorna sus movimientos en
orden cronológico. Para movimientos `ENTRADA_COMPRA`, incluye el detalle de
recepción, recepción, detalle de la versión, versión, orden y cotización
elegida/proveedor mediante las asociaciones existentes. No crea una relación
directa que el esquema no tenga.

### Flujo mínimo de compras

Las operaciones disponibles crean la orden con su versión 1 y detalles en una
transacción; luego registran cotizaciones completas y permiten seleccionar una
cotización perteneciente a la misma versión. Los montos se calculan con
aritmética entera de punto fijo a partir de `cantidad × precio_unitario`; no se
acepta `monto_total` en las solicitudes. En JSON, cantidades y precios deben
enviarse como cadenas decimales para evitar pérdida de precisión.

1. `POST /api/inventario/ordenes-compra`
2. `POST /api/inventario/versiones-orden-compra/{{ID_VERSION}}/cotizaciones`
   (repetir por proveedor; máximo una por proveedor y versión)
3. `PUT /api/inventario/versiones-orden-compra/{{ID_VERSION}}/cotizacion-elegida`
   Esta llamada también registra la solicitud formal `AprobacionCompra` en estado
   `PENDIENTE`, referida a la cotización seleccionada.
4. `POST /api/inventario/versiones-orden-compra/{{ID_VERSION}}/decisiones-aprobacion`
5. Si la decisión fue `APROBADO`, recepción con
   `POST /api/inventario/ordenes-compra/{{ID_ORDEN}}/recepciones`.

Ejemplo de creación de orden:

```json
{
  "codigo": "OC-2026-001",
  "id_solicitante": 3,
  "id_ubicacion_destino": 2,
  "fecha_creacion": "2026-11-10T14:30:00Z",
  "detalles": [
    { "id_material": 7, "cantidad": "10.500", "precio_unitario": "12.35" }
  ]
}
```

La respuesta contiene `orden`, `version` y `detalles`. El total de la versión
se calcula como `129.68` (10.500 × 12.35 = 129.675, redondeado a centavos).
Los únicos estados que escribe esta operación son `PENDIENTE` para la orden y
la versión. El índice UNIQUE real asegura el código y la pareja
`(id_orden, numero_version)`; los materiales duplicados se rechazan antes de
escribir.

Ejemplo de cotización para la versión devuelta:

```json
{
  "id_proveedor": 4,
  "codigo": "COT-PROV-2026-18",
  "fecha_cotizacion": "2026-11-10T15:00:00Z",
  "vigencia_hasta": "2026-11-30",
  "detalles": [
    { "id_material": 7, "cantidad": "10.500", "precio_unitario": "12.20" }
  ]
}
```

La cotización debe cubrir exactamente los materiales y cantidades solicitados;
el total se calcula de sus detalles. El proveedor solo puede cotizar una vez la
misma versión, de acuerdo con el índice UNIQUE existente. Para elegirla, envía
`{ "id_cotizacion": 15 }` al endpoint `cotizacion-elegida`; una cotización de
otra versión se rechaza. La selección fija la cotización y crea la solicitud de
aprobación en la misma transacción; desde ese momento no se puede cambiar.

#### Estados y aprobación formal

Las transiciones previstas por el dominio son `PENDIENTE → APROBADA` o
`PENDIENTE → RECHAZADA` por decisión formal, y `APROBADA → RECIBIDA` cuando
todas las cantidades autorizadas se han aceptado. Una recepción parcial
conserva `APROBADA`; la orden solo pasa a `RECIBIDA` cuando todas sus versiones
lo están. `RECHAZADA` es terminal para recepción. La API no acepta un campo de
estado para crear o aprobar una orden.

La solicitud tiene `nivel_requerido = Administrador`, una cotización requerida
(la seleccionada), y el monto de esa cotización; estos campos corresponden a la
política mínima confirmada. La configuración existente no contiene condiciones
de autorización: `ConfiguracionControlCompra` solo define duplicados,
tolerancia y fraccionamiento. El comité no es parte de este flujo.

**Rol validado contra MySQL:** `Administrador`, `id_rol = 1`. El usuario activo
ID `5` tiene asignados los roles `Administrador` y `Encargado de Bodega`. Debe
ser distinto del solicitante para aprobar o rechazar. La API no crea usuarios,
roles ni asignaciones.
El usuario solicitante nunca puede aprobar/rechazar su propia compra.

Envía la decisión con `id_usuario` del aprobador existente y `decision` igual a
`APROBADO` o `RECHAZADO`; el ID del rol y la fecha se resuelven/generan en el
backend:

```json
{
  "id_usuario": 8,
  "decision": "APROBADO",
  "motivo": "Cotización seleccionada revisada."
}
```

La operación registra exactamente una `DecisionAprobacionCompra` por solicitud
y actualiza en una transacción el estado de la solicitud, versión y orden a
`APROBADA` o `RECHAZADA`. Bloquea decisiones posteriores, decisiones
contradictorias y compras con recepciones previas. En concurrencia, los bloqueos
de filas serializan intentos sobre la misma solicitud; el índice UNIQUE real
`(id_aprobacion, id_usuario)` es una protección adicional, no una restricción de
decisión única por sí sola.

### Recepción de compras

`POST /api/inventario/ordenes-compra/:id/recepciones` registra una recepción
para una orden existente. El encabezado conserva la `id_version` real de la
orden; la versión debe pertenecer a `:id` y debe tener la cotización seleccionada
que originó la solicitud. También exige estado `APROBADA` en orden y versión,
una decisión formal única de un aprobador administrador activo, distinto del
solicitante, y totales consistentes. El rol `Administrador` existe, pero no
tiene usuarios asignados en la base consultada, por lo que la aprobación
positiva/rechazo y una recepción posterior requieren una asignación administrativa
real previa.

```json
{
  "id_version": 12,
  "id_usuario": 3,
  "fecha_recepcion": "2026-11-10T14:30:00Z",
  "estado": "VALOR_DE_ESTADO_DEFINIDO_POR_EL_PROYECTO",
  "observacion": "Entrega parcial sin incidencias.",
  "detalles": [
    {
      "id_detalle_version": 28,
      "cantidad_entregada": "10.500",
      "cantidad_aceptada": "10.000",
      "cantidad_rechazada": "0.500"
    }
  ]
}
```

La operación crea `RecepcionCompra`, sus `DetalleRecepcionCompra` y un
`MovimientoInventario` `ENTRADA_COMPRA` por cada detalle, dentro de una única
transacción MySQL. La entrada usa `cantidad_aceptada`, no escribe existencias
en ninguna otra tabla y se dirige a `id_ubicacion_destino` de la versión.
`estado` se requiere porque la columna es obligatoria, pero se conserva sin
interpretarlo: el esquema no define valores de estado autorizados.

Cuando una recepción es admisible, se validan IDs y referencias, fecha, campos requeridos, duplicados de
`id_detalle_version` dentro de la solicitud, cantidades `DECIMAL(14,3)`, y que
`cantidad_aceptada + cantidad_rechazada = cantidad_entregada`. Cada detalle
requiere una cantidad aceptada positiva para que siempre exista su movimiento
de entrada. La cantidad entregada acumulada en todas las recepciones no puede
superar la autorizada en `DetalleVersionOrdenCompra`; el detalle y la fuente
del movimiento también quedan protegidos por las restricciones UNIQUE del
esquema. Cualquier error revierte encabezado, detalles y movimientos. Solo el
total aceptado completo de todas las líneas cambia la versión a `RECIBIDA`; no
se alteran existencias fuera de `MovimientoInventario`. Como el esquema limita
la cantidad entregada acumulada a la cantidad autorizada y no registra
reemplazos, una recepción con cantidad rechazada puede dejar el total aceptado
incompleto sin una vía segura para recibir reposición; no se marca esa compra
como `RECIBIDA`.

La base no tiene número de factura, guía de recepción ni otra clave documental
única en `RecepcionCompra`. Por ello el endpoint no puede detectar una segunda
solicitud idéntica como duplicado entre recepciones distintas sin inventar una
columna o regla nueva; sí impide repetir el mismo detalle dentro de una
recepción y cada movimiento queda vinculado de forma única a su detalle.

La prueba de integración transaccional se ejecuta con:

```powershell
npm run test:inventory:integration
```

Comprueba orden/versión/detalles, totales, duplicados, cotización válida e
inconsistente, selección y rechazo de cotización de otra versión, bloqueo de
solicitud tras fallo forzado, creación de solicitud formal, rechazo del
solicitante y usuarios sin rol administrador, decisiones duplicadas y
recepción sin aprobación. También ejecuta las pruebas previas de inventario.
Todo corre dentro de una transacción MySQL que se revierte y confirma que no
quedaron filas temporales. La integración de compra aprobada, recepción,
movimiento `ENTRADA_COMPRA` y saldo se validó previamente con el usuario 5 y
rollback. La evidencia del detector de posibles duplicados y sus limitaciones
se documenta en `GUIA_DEMOSTRACION.md`. No se afirma haber probado concurrencia
con conexiones independientes.

### Ajustes de inventario

`POST /api/inventario/ajustes/solicitudes` registra una solicitud trazable al
material, ubicación, solicitante y motivo. `cantidad_variacion` es una cadena
`DECIMAL(14,3)` firmada y distinta de cero: positiva representa una propuesta
de entrada y negativa una propuesta de salida.

```json
{
  "id_material": 1,
  "id_ubicacion": 2,
  "id_solicitante": 3,
  "cantidad_variacion": "-2.500",
  "motivo": "Diferencia encontrada durante conteo físico.",
  "estado": "VALOR_DE_ESTADO_DEFINIDO_POR_EL_PROYECTO",
  "fecha_solicitud": "2026-11-10T14:30:00Z"
}
```

`POST /api/inventario/ajustes/solicitudes/:id/decisiones` registra una sola
`DecisionAjuste` por solicitud, usando las columnas reales disponibles:

```json
{
  "id_administrador": 3,
  "decision": "APROBADO",
  "motivo": "Decisión registrada para revisión.",
  "fecha_decision": "2026-11-10T15:00:00Z"
}
```

Ambas escrituras validan referencias, fecha, textos obligatorios y precisión;
la decisión se bloquea por solicitud y además está protegida por la restricción
UNIQUE real de `DecisionAjuste.id_solicitud_ajuste`. Solo se aceptan exactamente
`APROBADO` y `RECHAZADO`.

- `APROBADO` crea en la misma transacción un movimiento inmutable vinculado a
  `DecisionAjuste`. Variación positiva crea `AJUSTE_ENTRADA` con cantidad
  positiva y ubicación destino. Variación negativa crea `AJUSTE_SALIDA` con
  magnitud positiva y ubicación origen; antes se verifica stock suficiente.
  Si el cálculo o creación del movimiento falla, se revierte también la
  decisión.
- `RECHAZADO` registra la decisión y no crea movimiento ni cambia existencias.
- Una solicitud acepta una sola decisión. El bloqueo de la fila de solicitud
  serializa decisiones concurrentes y la restricción UNIQUE del esquema sirve
  como segunda protección.
- El motor valida que el movimiento apunte a una decisión `APROBADO`, coincida
  con la solicitud en material/ubicación, cantidad y signo, y conserve usuario
  aprobador y fecha de decisión. Un movimiento no autorizado o inconsistente
  hace fallar el cálculo del saldo.

El estado textual de la solicitud se conserva, pero no se interpreta como una
máquina de estados: no se definieron transiciones adicionales. La decisión
`RECHAZADO` es final debido a la restricción de una decisión por solicitud.

La integración comprueba ajustes positivos y negativos, saldo insuficiente,
rechazo sin movimiento, decisión no admitida, solicitud inexistente,
duplicación y rollback forzado de la escritura del movimiento. Todos los datos
están dentro de una transacción de integración que se revierte y se confirma
ausente. La serialización está implementada mediante el bloqueo InnoDB de la
solicitud y el índice UNIQUE, pero una carrera entre conexiones MySQL
independientes no forma parte de esta prueba transaccional y queda pendiente de
verificación específica.

## Datos iniciales simulados (seeders ejecutados)

Los seeders de `seeders/` se ejecutaron correctamente. Contienen los siguientes
datos académicos aprobados:

- Roles: `Administrador`, `Encargado de Bodega`, `Encargado de Obras`,
  `Encargado de Mantenimiento` y `Supervisor`.
- Usuarios: `Responsable simulado de Obras`
  (`responsable.obras@example.invalid`), `Responsable simulado de Mantenimiento`
  (`responsable.mantenimiento@example.invalid`) y
  `Responsable simulado de Bodega Central`
  (`responsable.bodega@example.invalid`). Los tres usan `cargo = NULL`,
  `activo = true` y la fecha fija `2026-11-09 00:00:00` para que la semilla sea
  reproducible; esta fecha es un dato de fixture, no una regla de negocio.
- Asignaciones `UsuarioRol`: Obras → Encargado de Obras; Mantenimiento →
  Encargado de Mantenimiento; Bodega Central → Encargado de Bodega.
- Ubicaciones: `Obras`, `Mantenimiento` y `Bodega Central`, cada una con el
  usuario correspondiente como `id_responsable`.

### Orden y requisitos

Las migraciones estaban aplicadas y las tablas `Rol`, `Usuario`, `UsuarioRol` y
`Ubicacion` vacías antes de la ejecución. El orden alfabético de los archivos
implementa estas dependencias:

1. `20261109140200-seed-approved-roles.js`
2. `20261109140201-seed-simulated-users.js`
3. `20261109140202-seed-approved-user-roles.js`
4. `20261109140203-seed-operational-locations.js`

Cada `up` usa una transacción propia, busca por claves naturales (`nombre`,
`correo` y la pareja de claves foráneas) y omite filas ya existentes solo si
coinciden con los valores esperados. Si encuentra una fila incompatible, se
detiene sin sobrescribirla. Los IDs se resuelven mediante consultas, nunca se
fijan. Un error revierte el seeder actual. `db:seed:all` no es una transacción
global: si falla un seeder posterior, los anteriores pueden haber terminado;
se puede volver a ejecutar porque los `up` son idempotentes.

Para repetir explícitamente un seeder individual:

```powershell
npx sequelize-cli db:seed --seed 20261109140200-seed-approved-roles.js
```

Estos `down` fallan de forma intencional al encontrar cualquier fila coincidente;
los comandos no son una vía para forzar su borrado.

### Reversión conservadora

El esquema no contiene una marca de propiedad del seeder. Por ello, ni siquiera
la coincidencia exacta de un correo, nombre o asignación demuestra que una fila
fue creada por estos archivos. Cada `down` es deliberadamente de solo lectura:
no borra filas y falla si encuentra registros coincidentes, indicando que la
procedencia no puede probarse. Si no encuentra ninguno, termina sin cambios.
Esto evita borrar datos preexistentes o utilizados posteriormente. Por la
misma razón, los comandos estándar de `db:seed:undo` no efectuarán una limpieza
automática de estos datos; una reversión requeriría una decisión y verificación
manual explícitas. No se agregó una tabla de seguimiento.
