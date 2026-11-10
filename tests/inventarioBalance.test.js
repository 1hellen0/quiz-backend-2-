'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MOVEMENT_RULES,
  calculateExistencia,
  formatQuantity,
  parseQuantity
} = require('../src/services/inventarioBalance');
const {
  calculateTotalCents,
  formatCents,
  parsePositiveDecimal
} = require('../src/services/purchaseMath');

function movement({
  tipo,
  cantidad,
  id_ubicacion_origen = null,
  id_ubicacion_destino = null,
  sourceField,
  sourceId,
  id_detalle_recepcion_traslado_dispatch = null,
  decisionAjuste = null
}) {
  return {
    id_material: 10,
    tipo,
    cantidad,
    id_ubicacion_origen,
    id_ubicacion_destino,
    id_detalle_recepcion_traslado_dispatch: null,
    documento_apertura: null,
    id_detalle_entrega_vale: null,
    id_detalle_despacho: null,
    id_detalle_recepcion_traslado: null,
    id_detalle_recepcion_compra: null,
    id_decision_ajuste: null,
    id_decision_correccion: null,
    id_incidencia: null,
    [sourceField]: sourceId,
    id_detalle_recepcion_traslado_dispatch,
    decisionAjuste
  };
}

function calculate(movements, id_ubicacion = 20) {
  return calculateExistencia(movements, {
    id_material: 10,
    id_ubicacion
  });
}

test('declares proposed labels for the supported accounting categories', () => {
  assert.deepEqual(Object.keys(MOVEMENT_RULES), [
    'APERTURA',
    'ENTRADA_COMPRA',
    'SALIDA_VALE',
    'TRASLADO_SALIDA',
    'TRASLADO_ENTRADA',
    'AJUSTE_ENTRADA',
    'AJUSTE_SALIDA'
  ]);
});

test('calculates opening and purchase entries exactly', () => {
  const result = calculate([
    movement({
      tipo: 'APERTURA',
      cantidad: '100.125',
      id_ubicacion_destino: 20,
      sourceField: 'documento_apertura',
      sourceId: 'AP-TEST-1'
    }),
    movement({
      tipo: 'ENTRADA_COMPRA',
      cantidad: '0.375',
      id_ubicacion_destino: 20,
      sourceField: 'id_detalle_recepcion_compra',
      sourceId: 7
    })
  ]);
  assert.equal(result.stock_disponible, '100.500');
  assert.equal(result.cantidad_en_transito, '0.000');
});

test('calculates exits without floating-point arithmetic', () => {
  const result = calculate([
    movement({
      tipo: 'APERTURA',
      cantidad: '1.000',
      id_ubicacion_destino: 20,
      sourceField: 'documento_apertura',
      sourceId: 'AP-TEST-2'
    }),
    movement({
      tipo: 'SALIDA_VALE',
      cantidad: '0.100',
      id_ubicacion_origen: 20,
      sourceField: 'id_detalle_entrega_vale',
      sourceId: 31
    })
  ]);
  assert.equal(result.stock_disponible, '0.900');
});

test('deducts transfer dispatch from source and keeps unreceived quantity in transit', () => {
  const dispatched = movement({
    tipo: 'TRASLADO_SALIDA',
    cantidad: '5.000',
    id_ubicacion_origen: 10,
    id_ubicacion_destino: 20,
    sourceField: 'id_detalle_despacho',
    sourceId: 501
  });
  const received = movement({
    tipo: 'TRASLADO_ENTRADA',
    cantidad: '2.500',
    id_ubicacion_destino: 20,
    sourceField: 'id_detalle_recepcion_traslado',
    sourceId: 801,
    id_detalle_recepcion_traslado_dispatch: 501
  });

  const opening = movement({
    tipo: 'APERTURA',
    cantidad: '10.000',
    id_ubicacion_destino: 10,
    sourceField: 'documento_apertura',
    sourceId: 'AP-TEST-3'
  });
  const destination = calculate([opening, dispatched, received], 20);
  assert.equal(destination.stock_disponible, '2.500');
  assert.equal(destination.cantidad_en_transito, '2.500');

  const source = calculate([
    opening,
    dispatched,
    received
  ], 10);
  assert.equal(source.stock_disponible, '5.000');
  assert.equal(source.cantidad_en_transito, '0.000');
});

test('returns zero for a material-location pair with no movements', () => {
  assert.deepEqual(calculate([]), {
    id_material: 10,
    id_ubicacion: 20,
    stock_disponible: '0.000',
    cantidad_en_transito: '0.000'
  });
});

test('rejects unknown movement types rather than returning a balance', () => {
  assert.throws(
    () => calculate([movement({
      tipo: 'UNCONFIRMED_TYPE',
      cantidad: '1.000',
      id_ubicacion_destino: 20,
      sourceField: 'id_incidencia',
      sourceId: 44
    })]),
    error => error.status === 501 && error.code === 'INVENTORY_MOVEMENT_TYPE_UNSUPPORTED'
  );
});

test('applies approved positive and negative adjustments exactly', () => {
  const approvedAdjustment = (variation, tipo, locationField, locationId, amount) => movement({
    tipo,
    cantidad: amount,
    [locationField]: locationId,
    sourceField: 'id_decision_ajuste',
    sourceId: 21,
    decisionAjuste: {
      id_decision_ajuste: 21,
      id_solicitud_ajuste: 31,
      id_administrador: 7,
      decision: 'APROBADO',
      fecha_decision: '2026-11-10T15:00:00.000Z',
      solicitud: {
        id_solicitud_ajuste: 31,
        id_material: 10,
        id_ubicacion: 20,
        cantidad_variacion: variation
      }
    }
  });
  const opening = movement({
    tipo: 'APERTURA',
    cantidad: '10.000',
    id_ubicacion_destino: 20,
    sourceField: 'documento_apertura',
    sourceId: 'AP-ADJUSTMENT-TEST'
  });
  const positive = approvedAdjustment(
    '2.500', 'AJUSTE_ENTRADA', 'id_ubicacion_destino', 20, '2.500'
  );
  const negative = approvedAdjustment(
    '-3.125', 'AJUSTE_SALIDA', 'id_ubicacion_origen', 20, '3.125'
  );
  positive.id_usuario = 7;
  positive.fecha_movimiento = '2026-11-10T15:00:00.000Z';
  negative.id_usuario = 7;
  negative.fecha_movimiento = '2026-11-10T15:00:00.000Z';

  assert.equal(calculate([opening, positive, negative]).stock_disponible, '9.375');
});

test('rejects adjustments without an approved decision or with mismatched authorization', () => {
  const adjustment = movement({
    tipo: 'AJUSTE_ENTRADA',
    cantidad: '1.000',
    id_ubicacion_destino: 20,
    sourceField: 'id_decision_ajuste',
    sourceId: 21,
    decisionAjuste: {
      id_decision_ajuste: 21,
      id_solicitud_ajuste: 31,
      id_administrador: 7,
      decision: 'RECHAZADO',
      fecha_decision: '2026-11-10T15:00:00.000Z',
      solicitud: {
        id_solicitud_ajuste: 31,
        id_material: 10,
        id_ubicacion: 20,
        cantidad_variacion: '1.000'
      }
    }
  });
  adjustment.id_usuario = 7;
  adjustment.fecha_movimiento = '2026-11-10T15:00:00.000Z';
  assert.throws(() => calculate([adjustment]), error =>
    error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );

  adjustment.decisionAjuste.decision = 'APROBADO';
  adjustment.cantidad = '1.001';
  assert.throws(() => calculate([adjustment]), error =>
    error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );

  adjustment.cantidad = '1.000';
  adjustment.id_usuario = 8;
  assert.throws(() => calculate([adjustment]), error =>
    error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );
  adjustment.id_usuario = 7;
  adjustment.decisionAjuste.solicitud.id_ubicacion = 21;
  assert.throws(() => calculate([adjustment]), error =>
    error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );
});

test('rejects a movement with multiple or mismatched document sources', () => {
  const invalid = movement({
    tipo: 'ENTRADA_COMPRA',
    cantidad: '1.000',
    id_ubicacion_destino: 20,
    sourceField: 'id_detalle_recepcion_compra',
    sourceId: 7
  });
  invalid.id_detalle_entrega_vale = 3;
  assert.throws(
    () => calculate([invalid]),
    error => error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );
});

test('rejects negative balances and transfer receipts exceeding dispatch', () => {
  assert.throws(
    () => calculate([movement({
      tipo: 'SALIDA_VALE',
      cantidad: '0.001',
      id_ubicacion_origen: 20,
      sourceField: 'id_detalle_entrega_vale',
      sourceId: 1
    })]),
    error => error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );

  const dispatch = movement({
    tipo: 'TRASLADO_SALIDA',
    cantidad: '1.000',
    id_ubicacion_origen: 10,
    id_ubicacion_destino: 20,
    sourceField: 'id_detalle_despacho',
    sourceId: 2
  });
  const receipt = movement({
    tipo: 'TRASLADO_ENTRADA',
    cantidad: '1.001',
    id_ubicacion_destino: 20,
    sourceField: 'id_detalle_recepcion_traslado',
    sourceId: 3,
    id_detalle_recepcion_traslado_dispatch: 2
  });
  assert.throws(
    () => calculate([dispatch, receipt]),
    error => error.code === 'INVENTORY_LEDGER_INCONSISTENT'
  );
});

test('uses fixed-point decimal parsing for DECIMAL(14,3)', () => {
  assert.equal(parseQuantity('99999999999.999'), 99999999999999n);
  assert.equal(formatQuantity(1234567n), '1234.567');
  assert.throws(() => parseQuantity('0.0001'));
  assert.throws(() => parseQuantity('-1.000'));
  assert.throws(() => parseQuantity('100000000000.000'));
});

test('calculates purchase totals with fixed-point decimal arithmetic', () => {
  const quantity = parsePositiveDecimal('0.005', 3, 11, 'cantidad').units;
  const price = parsePositiveDecimal('1.00', 2, 14, 'precio_unitario').units;
  const secondQuantity = parsePositiveDecimal('2.125', 3, 11, 'cantidad').units;
  const secondPrice = parsePositiveDecimal('3.20', 2, 14, 'precio_unitario').units;

  assert.equal(formatCents(calculateTotalCents([
    { quantityMilli: quantity, priceCents: price },
    { quantityMilli: secondQuantity, priceCents: secondPrice }
  ])), '6.81');
});

test('rejects invalid purchase decimals and totals outside DECIMAL(16,2)', () => {
  assert.throws(() => parsePositiveDecimal(1.25, 2, 14, 'precio_unitario'));
  assert.throws(() => parsePositiveDecimal('0.0000', 3, 11, 'cantidad'));
  assert.throws(() => parsePositiveDecimal('100000000000.000', 3, 11, 'cantidad'));
  assert.throws(() => calculateTotalCents([{
    quantityMilli: 99999999999999n,
    priceCents: 9999999999999999n
  }]), /DECIMAL\(16,2\)/);
});
