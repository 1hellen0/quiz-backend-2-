'use strict';

const HttpError = require('../utils/HttpError');

const SCALE = 1000n;
const MAX_DECIMAL_MILLIUNITS = 99999999999999n;

const SOURCE_FIELDS = [
  'documento_apertura',
  'id_detalle_entrega_vale',
  'id_detalle_despacho',
  'id_detalle_recepcion_traslado',
  'id_detalle_recepcion_compra',
  'id_decision_ajuste',
  'id_decision_correccion',
  'id_incidencia'
];

const MOVEMENT_RULES = Object.freeze({
  APERTURA: { source: 'documento_apertura', effect: 'in' },
  ENTRADA_COMPRA: { source: 'id_detalle_recepcion_compra', effect: 'in' },
  SALIDA_VALE: { source: 'id_detalle_entrega_vale', effect: 'out' },
  TRASLADO_SALIDA: { source: 'id_detalle_despacho', effect: 'transfer-out' },
  TRASLADO_ENTRADA: { source: 'id_detalle_recepcion_traslado', effect: 'transfer-in' },
  AJUSTE_ENTRADA: { source: 'id_decision_ajuste', effect: 'in' },
  AJUSTE_SALIDA: { source: 'id_decision_ajuste', effect: 'out' }
});

function ledgerError(message) {
  return new HttpError(409, 'INVENTORY_LEDGER_INCONSISTENT', message);
}

function parseQuantity(value) {
  const text = String(value);
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) {
    throw ledgerError('A movement quantity is not a valid DECIMAL(14,3) value.');
  }

  const fractional = (match[2] || '').padEnd(3, '0');
  const milliunits = BigInt(match[1]) * SCALE + BigInt(fractional || '0');
  if (milliunits <= 0n || milliunits > MAX_DECIMAL_MILLIUNITS) {
    throw ledgerError('A movement quantity is outside the supported positive DECIMAL(14,3) range.');
  }
  return milliunits;
}

function formatQuantity(milliunits) {
  const whole = milliunits / SCALE;
  const fraction = String(milliunits % SCALE).padStart(3, '0');
  return `${whole}.${fraction}`;
}

function validateMovementSource(movement, rule) {
  const sources = SOURCE_FIELDS.filter(field => movement[field] !== null && movement[field] !== undefined);
  if (sources.length !== 1 || sources[0] !== rule.source) {
    throw ledgerError('A movement must have exactly one source document matching its type.');
  }
  if (rule.source === 'documento_apertura' && movement.documento_apertura.trim().length === 0) {
    throw ledgerError('An opening movement must identify its opening document.');
  }
}

function validateAdjustmentMovement(movement, rule, quantity) {
  const decision = movement.decisionAjuste;
  const solicitud = decision && decision.solicitud;
  if (!decision || Number(decision.id_decision_ajuste) !== Number(movement.id_decision_ajuste)) {
    throw ledgerError('An adjustment movement must reference its decision.');
  }
  if (decision.decision !== 'APROBADO') {
    throw ledgerError('An adjustment movement requires an APROBADO decision.');
  }
  if (Number(decision.id_administrador) !== Number(movement.id_usuario)) {
    throw ledgerError('An adjustment movement user must match the administrator who approved it.');
  }
  const movementDate = new Date(movement.fecha_movimiento).getTime();
  const decisionDate = new Date(decision.fecha_decision).getTime();
  if (!Number.isFinite(movementDate) || movementDate !== decisionDate) {
    throw ledgerError('An adjustment movement date must match its approval date.');
  }
  if (!solicitud || Number(solicitud.id_solicitud_ajuste) !== Number(decision.id_solicitud_ajuste)) {
    throw ledgerError('An adjustment decision must reference its request.');
  }
  if (Number(solicitud.id_material) !== Number(movement.id_material)) {
    throw ledgerError('An adjustment movement material must match its request.');
  }
  const variationText = String(solicitud.cantidad_variacion);
  const match = /^(-)?(0|[1-9]\d{0,10})(?:\.(\d{1,3}))?$/.exec(variationText);
  if (!match) {
    throw ledgerError('An adjustment request variation is not a valid signed DECIMAL(14,3) value.');
  }
  const variation = BigInt(match[2]) * SCALE + BigInt((match[3] || '').padEnd(3, '0'));
  if (variation === 0n || variation !== quantity) {
    throw ledgerError('An adjustment movement quantity must equal the authorized variation magnitude.');
  }
  const expectedType = match[1] ? 'AJUSTE_SALIDA' : 'AJUSTE_ENTRADA';
  if (movement.tipo !== expectedType) {
    throw ledgerError('An adjustment movement type must match the authorized variation sign.');
  }
  const expectedLocation = Number(solicitud.id_ubicacion);
  if (rule.effect === 'in' && Number(movement.id_ubicacion_destino) !== expectedLocation) {
    throw ledgerError('An adjustment entry destination must match its request location.');
  }
  if (rule.effect === 'out' && Number(movement.id_ubicacion_origen) !== expectedLocation) {
    throw ledgerError('An adjustment exit origin must match its request location.');
  }
}

function addToBalance(balances, locationId, amount) {
  const current = balances.get(locationId) || 0n;
  balances.set(locationId, current + amount);
}

function applyDelta(balances, locationId, amount, direction) {
  const current = balances.get(locationId) || 0n;
  balances.set(locationId, current + (direction === 'in' ? amount : -amount));
}

function calculateExistencia(movements, { id_material, id_ubicacion }) {
  const balances = new Map();
  const transfers = new Map();
  const receipts = [];

  for (const movement of movements) {
    const rule = MOVEMENT_RULES[movement.tipo];
    if (!rule) {
      throw new HttpError(
        501,
        'INVENTORY_MOVEMENT_TYPE_UNSUPPORTED',
        `Inventory balance cannot be calculated for movement type "${movement.tipo}".`
      );
    }
    validateMovementSource(movement, rule);
    if (Number(movement.id_material) !== id_material) {
      throw ledgerError('A movement query returned a different material than requested.');
    }

    const quantity = parseQuantity(movement.cantidad);
    if (movement.tipo === 'AJUSTE_ENTRADA' || movement.tipo === 'AJUSTE_SALIDA') {
      validateAdjustmentMovement(movement, rule, quantity);
    }
    const origin = movement.id_ubicacion_origen === null
      ? null
      : Number(movement.id_ubicacion_origen);
    const destination = movement.id_ubicacion_destino === null
      ? null
      : Number(movement.id_ubicacion_destino);

    if (rule.effect === 'in') {
      if (origin !== null || !destination) {
        throw ledgerError('An inbound movement must have only a destination location.');
      }
      addToBalance(balances, destination, quantity);
      continue;
    }

    if (rule.effect === 'out') {
      if (!origin || destination !== null) {
        throw ledgerError('An outbound movement must have only an origin location.');
      }
      applyDelta(balances, origin, quantity, 'out');
      continue;
    }

    if (rule.effect === 'transfer-out') {
      if (!origin || !destination || origin === destination) {
        throw ledgerError('A transfer dispatch must have distinct origin and destination locations.');
      }
      const dispatchId = Number(movement.id_detalle_despacho);
      if (!Number.isSafeInteger(dispatchId) || dispatchId <= 0) {
        throw ledgerError('A transfer dispatch must reference a valid dispatch detail.');
      }
      if (transfers.has(dispatchId)) {
        throw ledgerError('A transfer dispatch is represented by more than one inventory movement.');
      }
      applyDelta(balances, origin, quantity, 'out');
      transfers.set(dispatchId, {
        id_material,
        destination,
        shipped: quantity,
        received: 0n
      });
      continue;
    }

    if (origin !== null || !destination) {
      throw ledgerError('A transfer receipt must have only a destination location.');
    }
    const dispatchId = Number(movement.id_detalle_recepcion_traslado_dispatch);
    if (!Number.isSafeInteger(dispatchId) || dispatchId <= 0) {
      throw ledgerError('A transfer receipt must be linked to its dispatch detail.');
    }
    receipts.push({ dispatchId, destination, quantity });
    applyDelta(balances, destination, quantity, 'in');
  }

  for (const balance of balances.values()) {
    if (balance < 0n) {
      throw ledgerError('Recorded movements would produce negative available stock.');
    }
  }

  for (const receipt of receipts) {
    const transfer = transfers.get(receipt.dispatchId);
    if (!transfer || transfer.destination !== receipt.destination) {
      throw ledgerError('A transfer receipt does not match a recorded dispatch and destination.');
    }
    transfer.received += receipt.quantity;
    if (transfer.received > transfer.shipped) {
      throw ledgerError('Transfer receipts exceed the dispatched quantity.');
    }
  }

  let inTransit = 0n;
  for (const transfer of transfers.values()) {
    if (transfer.destination === id_ubicacion) {
      inTransit += transfer.shipped - transfer.received;
    }
  }

  return {
    id_material,
    id_ubicacion,
    stock_disponible: formatQuantity(balances.get(id_ubicacion) || 0n),
    cantidad_en_transito: formatQuantity(inTransit)
  };
}

module.exports = {
  MOVEMENT_RULES,
  calculateExistencia,
  formatQuantity,
  parseQuantity
};
