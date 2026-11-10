# Preparación de entregables — Quiz #2

## Resumen ejecutivo

El backend de inventario se ejecuta con Node.js, Express, Sequelize y MySQL.
El estado de base de datos documentado para esta entrega incluye 40 modelos,
40 tablas de aplicación y 40 migraciones aplicadas. El inventario se calcula
desde movimientos, no desde saldos editados directamente.

La demostración persistente incluye cuatro materiales en Bodega Central (ID 3):

| Código | ID | Stock | SS | PR | Alerta observada |
|---|---:|---:|---:|---:|---|
| CEM-001 | 58 | 190 | 45 | 165 | No |
| VAR-001 | 59 | 850 | 200 | 800 | No |
| BLO-001 | 60 | 2800 | 1200 | 3600 | Sí |
| ARE-001 | 61 | 14 | 8 | 20 | Sí |

El usuario activo ID 5 tiene los roles Administrador y Encargado de Bodega.
No existe actualmente un proveedor ni una configuración permanente de control
de compras.

## Evidencia del detector

El 2026-11-10, la prueba académica ejecutó el servicio del detector dentro de
una transacción MySQL y la revirtió. Se usaron fixtures temporales: proveedor
“Materiales del Valle S.A.” con identificación sintética
`DEMO-ROLLBACK-20261110-01`, configuración de 7 días, tolerancia `10.00%` y
`dias_fraccionamiento=15`, más una orden/cotización para CEM-001 (ID 58),
cantidad `10`, precio unitario `1.00` y fecha `2026-11-10`.

El servicio devolvió exactamente una coincidencia para la orden temporal,
proveedor, material, cantidad y ventana configurados. Después del rollback,
consultas confirmaron que no quedaron proveedor, configuración, orden,
versión, detalles, cotización ni aprobación de prueba. La existencia de CEM-001
permaneció en `190.000`.

**Limitación importante:** se invocó el servicio del detector directamente
dentro de la transacción; no se validó la ruta HTTP con esos fixtures. La ruta
HTTP no puede compartir una transacción externa que contenga filas aún no
confirmadas. `dias_fraccionamiento` se valida y almacena, pero no participa en
la detección implementada. El identificador sintético fue un dato efímero de
prueba, no una identificación fiscal ni un proveedor real. Los contadores
`AUTO_INCREMENT` pueden avanzar pese al rollback.

Consulta del endpoint para una futura base con proveedor, configuración y
compra reales previamente autorizados:

```text
GET /api/inventario/compras/posibles-duplicados?id_proveedor={{ID_PROVEEDOR}}&id_material=58&cantidad=10&fecha=2026-11-10
```

La configuración usa `dias_duplicado=7` y tolerancia `10.00`; no hay registros
permanentes creados para activar esa consulta actualmente. No crear un proveedor
ni registrar la configuración sin autorización y una identificación aprobada.

## Guion sugerido para video de 5 minutos

| Tiempo | Contenido en pantalla / narración |
|---|---|
| 0:00–0:35 | Presentar el backend, tecnologías y la fuente de existencias basada en movimientos. |
| 0:35–1:20 | Mostrar los cuatro materiales y sus unidades en Bodega Central. |
| 1:20–2:10 | Consultar las existencias calculadas y explicar que no se actualizan directamente. |
| 2:10–2:55 | Mostrar el endpoint de alertas: Block y Arena bajo PR; Cemento y Varilla por encima. Explicar SS y PR. |
| 2:55–3:45 | Presentar el flujo de orden, versión, cotización, selección, aprobación formal y recepción mediante la integración previamente validada. Usar una grabación o resultados de prueba; no asumir que hay compras persistentes disponibles para volver a consultar. Mostrar `ENTRADA_COMPRA` y su trazabilidad. |
| 3:45–4:35 | Presentar la evidencia transaccional del detector, dejando claro que la prueba llamó al servicio, no al endpoint HTTP, y que todos los fixtures fueron revertidos. |
| 4:35–5:00 | Cerrar con validaciones, límites conocidos y ausencia de proveedor/configuración permanentes. |

No presentar los IDs efímeros de la prueba transaccional como registros reales.
No grabar credenciales, variables secretas ni información personal.

## Esquema para presentación de 10 minutos

1. **Problema y alcance (1 min):** control de materiales y trazabilidad de inventario.
2. **Arquitectura (1 min):** Express, servicios, Sequelize y MySQL.
3. **Modelo de existencias (1 min):** movimientos como ledger y precisión decimal.
4. **Parámetros y reorden (1.5 min):** SS, PR y los cuatro materiales de demostración.
5. **Movimientos (1 min):** apertura, salidas, traslados y ajustes; explicar saldo por ubicación.
6. **Compras (1.5 min):** orden versionada, cotización consistente, selección y aprobación formal.
7. **Recepción y trazabilidad (1 min):** recepción, `ENTRADA_COMPRA` y vínculo a orden/proveedor.
8. **Detector (1 min):** criterio de ventana/cantidad, resultado temporal con rollback y límite de no probar HTTP.
9. **Pruebas, límites y cierre (1 min):** rollback, `dias_fraccionamiento` sin uso actual y pasos pendientes.

## Estado de archivos de entrega

- `README.md`: instrucciones y referencia de API.
- `GUIA_DEMOSTRACION.md`: secuencia operativa y evidencia técnica detallada.
- `.env.example`: plantilla sin credenciales.
- Este archivo: resumen y guiones para preparar exposición y grabación.
- PDF final, diapositivas y video grabado: no generados ni verificados como
  archivos en el repositorio. El guion anterior sirve de base; antes de entregar,
  confirmar el enunciado oficial completo y verificar formato/paginación del PDF.

## Verificaciones antes de entregar

- Revisar que `.env` y sus credenciales no se incluyan en la entrega.
- Confirmar el estado y la base de datos correctos antes de grabar.
- No crear proveedor, configuración ni compras permanentes para la sección del
  detector sin autorización independiente.
- Incluir en la exposición la limitación entre la prueba del servicio y la ruta
  HTTP; no afirmar cobertura de detección de fraccionamiento.
- Adjuntar PDF de máximo 15 páginas, video de 5 minutos y presentación de
  10 minutos cuando se produzcan los medios finales.
