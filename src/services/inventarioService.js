'use strict';

const {
  MovimientoInventario,
  Material,
  Usuario,
  Ubicacion,
  ValeSalida,
  DetalleValeSalida,
  EntregaVale,
  DetalleEntregaVale,
  Traslado,
  DetalleTraslado,
  DespachoTraslado,
  DetalleDespachoTraslado,
  RecepcionTraslado,
  DetalleRecepcionTraslado,
  ParametrosInventario,
  HistorialParametrosInventario,
  AlertaReorden,
  ConfiguracionControlCompra,
  OrdenCompra,
  VersionOrdenCompra,
  Cotizacion,
  DetalleCotizacion,
  AprobacionCompra,
  DecisionAprobacionCompra,
  ComiteAprobacion,
  UsuarioRol,
  Rol,
  Proveedor,
  DetalleVersionOrdenCompra,
  DetalleRecepcionCompra,
  RecepcionCompra,
  SolicitudAjuste,
  DecisionAjuste,
  Sequelize,
  sequelize
} = require('../../models');
const HttpError = require('../utils/HttpError');
const {
  InvalidPurchaseDecimalError,
  parsePositiveDecimal,
  calculateTotalCents,
  formatCents
} = require('./purchaseMath');
const ADMIN_APPROVER_ROLE_NAME = 'Administrador';
const {
  calculateExistencia,
  formatQuantity,
  parseQuantity
} = require('./inventarioBalance');

async function listMovimientos(filters) {
  const where = {};

  if (filters.id_material !== undefined) {
    where.id_material = filters.id_material;
  }

  if (filters.id_ubicacion !== undefined) {
    where[Sequelize.Op.or] = [
      { id_ubicacion_origen: filters.id_ubicacion },
      { id_ubicacion_destino: filters.id_ubicacion }
    ];
  }

  if (filters.fecha_desde !== undefined || filters.fecha_hasta !== undefined) {
    where.fecha_movimiento = {};
    if (filters.fecha_desde !== undefined) {
      where.fecha_movimiento[Sequelize.Op.gte] = filters.fecha_desde;
    }
    if (filters.fecha_hasta !== undefined) {
      const operator = filters.fecha_hasta.exclusive
        ? Sequelize.Op.lt
        : Sequelize.Op.lte;
      where.fecha_movimiento[operator] = filters.fecha_hasta.value;
    }
  }

  return MovimientoInventario.findAll({
    where,
    order: [['fecha_movimiento', 'ASC'], ['id_movimiento', 'ASC']]
  });
}

async function getMovimiento(id) {
  const movimiento = await MovimientoInventario.findByPk(id);
  if (!movimiento) {
    throw new HttpError(404, 'MOVEMENT_NOT_FOUND', 'Inventory movement not found.');
  }
  return movimiento;
}

async function getExistencia({ id_material, id_ubicacion, transaction }) {
  const [material, ubicacion] = await Promise.all([
    Material.findByPk(id_material, {
      attributes: ['id_material'],
      transaction,
      logging: false
    }),
    Ubicacion.findByPk(id_ubicacion, {
      attributes: ['id_ubicacion'],
      transaction,
      logging: false
    })
  ]);
  if (!material) {
    throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
  }
  if (!ubicacion) {
    throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Location not found.');
  }

  const movements = await MovimientoInventario.findAll({
    where: { id_material },
    include: [{
      model: DetalleRecepcionTraslado,
      as: 'detalleRecepcionTraslado',
      attributes: ['id_detalle_recepcion_traslado', 'id_detalle_despacho'],
      include: [{
        model: DetalleDespachoTraslado,
        as: 'detalleDespacho',
        attributes: ['id_detalle_despacho'],
        required: false
      }],
      required: false
    }, {
      model: DecisionAjuste,
      as: 'decisionAjuste',
      attributes: ['id_decision_ajuste', 'id_solicitud_ajuste', 'id_administrador', 'decision', 'fecha_decision'],
      include: [{
        model: SolicitudAjuste,
        as: 'solicitud',
        attributes: ['id_solicitud_ajuste', 'id_material', 'id_ubicacion', 'cantidad_variacion'],
        required: false
      }],
      required: false
    }],
    order: [['id_movimiento', 'ASC']],
    transaction,
    logging: false
  });

  const normalizedMovements = movements.map(instance => {
    const movement = instance.get({ plain: true });
    const receipt = movement.detalleRecepcionTraslado;
    if (receipt) {
      const dispatch = receipt.detalleDespacho;
      if (!dispatch || Number(dispatch.id_detalle_despacho) !== Number(receipt.id_detalle_despacho)) {
        throw new HttpError(
          409,
          'INVENTORY_LEDGER_INCONSISTENT',
          'A transfer receipt is not linked to its dispatch detail.'
        );
      }
      movement.id_detalle_recepcion_traslado_dispatch = dispatch.id_detalle_despacho;
    } else {
      movement.id_detalle_recepcion_traslado_dispatch = null;
    }
    delete movement.detalleRecepcionTraslado;
    return movement;
  });

  return calculateExistencia(normalizedMovements, { id_material, id_ubicacion });
}

function validateAperturaQuantity(value) {
  try {
    return formatQuantity(parseQuantity(value));
  } catch (error) {
    if (error.code === 'INVENTORY_LEDGER_INCONSISTENT') {
      throw new HttpError(
        400,
        'INVALID_QUANTITY',
        'cantidad must be positive, have at most three decimals, and fit DECIMAL(14,3).'
      );
    }
    throw error;
  }
}

function validateAdjustmentQuantity(value) {
  const text = String(value);
  const match = /^(-)?(0|[1-9]\d{0,10})(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) {
    throw new HttpError(400, 'INVALID_ADJUSTMENT_QUANTITY', 'cantidad_variacion must be a non-zero DECIMAL(14,3) value.');
  }
  const fractional = (match[3] || '').padEnd(3, '0');
  const milliunits = BigInt(match[2]) * 1000n + BigInt(fractional || '0');
  if (milliunits === 0n || milliunits > 99999999999999n) {
    throw new HttpError(400, 'INVALID_ADJUSTMENT_QUANTITY', 'cantidad_variacion must be a non-zero DECIMAL(14,3) value.');
  }
  return `${match[1] ? '-' : ''}${match[2]}.${fractional}`;
}

async function createApertura(attributes, { transaction } = {}) {
  for (const field of ['id_material', 'id_ubicacion_destino', 'id_usuario']) {
    if (!Number.isSafeInteger(attributes[field]) || attributes[field] < 1 || attributes[field] > 2147483647) {
      throw new HttpError(400, 'INVALID_ID', `${field} must be a positive integer.`);
    }
  }
  if (!(attributes.fecha_movimiento instanceof Date) || Number.isNaN(attributes.fecha_movimiento.getTime())) {
    throw new HttpError(400, 'INVALID_DATE', 'fecha_movimiento must be a valid date.');
  }
  if (
    typeof attributes.documento_apertura !== 'string' ||
    attributes.documento_apertura.trim().length === 0 ||
    Array.from(attributes.documento_apertura).length > 80
  ) {
    throw new HttpError(400, 'INVALID_OPENING_DOCUMENT', 'documento_apertura is required and must not exceed 80 characters.');
  }
  const cantidad = validateAperturaQuantity(attributes.cantidad);
  const writeApertura = async activeTransaction => {
    const material = await Material.findByPk(attributes.id_material, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!material) {
      throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
    }

    const [usuario, ubicacion] = await Promise.all([
      Usuario.findByPk(attributes.id_usuario, {
        transaction: activeTransaction,
        logging: false
      }),
      Ubicacion.findByPk(attributes.id_ubicacion_destino, {
        transaction: activeTransaction,
        logging: false
      })
    ]);
    if (!usuario) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    if (!ubicacion) {
      throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Location not found.');
    }

    const existing = await MovimientoInventario.findOne({
      where: {
        tipo: 'APERTURA',
        id_material: attributes.id_material,
        id_ubicacion_destino: attributes.id_ubicacion_destino,
        documento_apertura: attributes.documento_apertura
      },
      attributes: ['id_movimiento'],
      transaction: activeTransaction,
      logging: false
    });
    if (existing) {
      throw new HttpError(
        409,
        'DUPLICATE_OPENING_DOCUMENT',
        'This opening document is already registered for the material and location.'
      );
    }

    const movimiento = await MovimientoInventario.create({
      id_material: attributes.id_material,
      id_ubicacion_origen: null,
      id_ubicacion_destino: attributes.id_ubicacion_destino,
      id_usuario: attributes.id_usuario,
      tipo: 'APERTURA',
      cantidad,
      fecha_movimiento: attributes.fecha_movimiento,
      documento_apertura: attributes.documento_apertura
    }, {
      transaction: activeTransaction,
      logging: false
    });

    const existencia = await getExistencia({
      id_material: attributes.id_material,
      id_ubicacion: attributes.id_ubicacion_destino,
      transaction: activeTransaction
    });

    return { movimiento, existencia };
  };

  if (transaction) {
    return writeApertura(transaction);
  }
  return sequelize.transaction(writeApertura);
}

function validateId(value, field) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    throw new HttpError(400, 'INVALID_ID', `${field} must be a positive integer.`);
  }
}

function parseNonnegativeMilli(value, field) {
  const text = String(value);
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) {
    throw new HttpError(409, 'INVALID_INVENTORY_CONFIGURATION', `${field} is not a valid DECIMAL(14,3) value.`);
  }
  const fractional = (match[2] || '').padEnd(3, '0');
  return BigInt(match[1]) * 1000n + BigInt(fractional || '0');
}

function validateDate(value, field) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new HttpError(400, 'INVALID_DATE', `${field} must be a valid date.`);
  }
}

function validateText(value, field, maxLength, { optional = false } = {}) {
  if (optional && (value === undefined || value === null)) {
    return null;
  }
  if (typeof value !== 'string' || value.trim().length === 0 || Array.from(value).length > maxLength) {
    throw new HttpError(400, 'INVALID_FIELD', `${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function validateConfigurationDecimal(value, field) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,10})(?:\.\d{1,3})?$/.test(value)) {
    throw new HttpError(400, 'INVALID_CONFIGURATION_VALUE', `${field} must be a non-negative decimal string with at most three decimals.`);
  }
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(3, '0')}`;
}

function validateNonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
    throw new HttpError(400, 'INVALID_CONFIGURATION_VALUE', `${field} must be a non-negative 32-bit integer.`);
  }
}

function validateBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw new HttpError(400, 'INVALID_CONFIGURATION_VALUE', `${field} must be a boolean.`);
  }
}

function validateParameterAttributes(attributes) {
  validateId(attributes.id_material, 'id_material');
  validateId(attributes.id_ubicacion, 'id_ubicacion');
  validateId(attributes.id_usuario, 'id_usuario');
  validateText(attributes.motivo, 'motivo', 65535);
  validateBoolean(attributes.activo, 'activo');

  const values = {
    stock_minimo: validateConfigurationDecimal(attributes.stock_minimo, 'stock_minimo'),
    stock_maximo: validateConfigurationDecimal(attributes.stock_maximo, 'stock_maximo'),
    demanda_diaria_promedio: validateConfigurationDecimal(attributes.demanda_diaria_promedio, 'demanda_diaria_promedio'),
    demanda_diaria_maxima: validateConfigurationDecimal(attributes.demanda_diaria_maxima, 'demanda_diaria_maxima')
  };
  validateNonnegativeInteger(attributes.tiempo_reposicion_dias, 'tiempo_reposicion_dias');
  if (
    parseNonnegativeMilli(values.stock_maximo, 'stock_maximo') <
      parseNonnegativeMilli(values.stock_minimo, 'stock_minimo') ||
    parseNonnegativeMilli(values.demanda_diaria_maxima, 'demanda_diaria_maxima') <
      parseNonnegativeMilli(values.demanda_diaria_promedio, 'demanda_diaria_promedio')
  ) {
    throw new HttpError(400, 'INVALID_CONFIGURATION_RANGE', 'Maximum stock and maximum daily demand must not be below their corresponding minimum or average values.');
  }
  return {
    ...values,
    tiempo_reposicion_dias: attributes.tiempo_reposicion_dias,
    activo: attributes.activo
  };
}

async function assertConfigurationUser(id_usuario, transaction) {
  if (!await Usuario.findByPk(id_usuario, {
    attributes: ['id_usuario'],
    transaction,
    logging: false
  })) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'Configuration user not found.');
  }
}

async function upsertInventoryParameters(attributes, id_parametros, { transaction } = {}) {
  const values = validateParameterAttributes(attributes);
  return runTransaction(transaction, async activeTransaction => {
    const [material, location] = await Promise.all([
      Material.findByPk(attributes.id_material, {
        attributes: ['id_material'],
        transaction: activeTransaction,
        logging: false
      }),
      Ubicacion.findByPk(attributes.id_ubicacion, {
        attributes: ['id_ubicacion'],
        transaction: activeTransaction,
        logging: false
      })
    ]);
    if (!material) throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
    if (!location) throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Location not found.');
    await assertConfigurationUser(attributes.id_usuario, activeTransaction);

    const existing = id_parametros === undefined
      ? await ParametrosInventario.findOne({
        where: { id_material: attributes.id_material, id_ubicacion: attributes.id_ubicacion },
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        logging: false
      })
      : await ParametrosInventario.findByPk(id_parametros, {
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        logging: false
      });
    if (id_parametros !== undefined && !existing) {
      throw new HttpError(404, 'INVENTORY_PARAMETERS_NOT_FOUND', 'Inventory parameters not found.');
    }
    if (existing && (
      Number(existing.id_material) !== attributes.id_material ||
      Number(existing.id_ubicacion) !== attributes.id_ubicacion
    )) {
      throw new HttpError(409, 'INVENTORY_PARAMETERS_KEY_MISMATCH', 'The material and location must match the existing parameter record.');
    }
    const previousValues = existing ? {
      stock_minimo: existing.stock_minimo,
      stock_maximo: existing.stock_maximo,
      demanda_diaria_promedio: existing.demanda_diaria_promedio,
      demanda_diaria_maxima: existing.demanda_diaria_maxima,
      tiempo_reposicion_dias: existing.tiempo_reposicion_dias,
      activo: existing.activo
    } : null;
    const parameter = existing
      ? await existing.update(values, { transaction: activeTransaction, logging: false })
      : await ParametrosInventario.create({
        id_material: attributes.id_material,
        id_ubicacion: attributes.id_ubicacion,
        ...values
      }, { transaction: activeTransaction, logging: false });

    await HistorialParametrosInventario.create({
      id_parametros: parameter.id_parametros,
      id_usuario: attributes.id_usuario,
      fecha_cambio: new Date(),
      valores_anteriores: previousValues === null ? null : JSON.stringify(previousValues),
      valores_nuevos: JSON.stringify(values),
      motivo: attributes.motivo.trim()
    }, { transaction: activeTransaction, logging: false });
    return { parametros: parameter, creado: !existing };
  });
}

function validatePurchaseControlAttributes(attributes) {
  validateId(attributes.id_usuario_actualiza, 'id_usuario_actualiza');
  validateNonnegativeInteger(attributes.dias_duplicado, 'dias_duplicado');
  validateNonnegativeInteger(attributes.dias_fraccionamiento, 'dias_fraccionamiento');
  validateBoolean(attributes.activo, 'activo');
  if (
    typeof attributes.tolerancia_cantidad_porcentaje !== 'string' ||
    !/^(0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(attributes.tolerancia_cantidad_porcentaje)
  ) {
    throw new HttpError(400, 'INVALID_CONFIGURATION_VALUE', 'tolerancia_cantidad_porcentaje must be a non-negative DECIMAL(5,2) string.');
  }
  return {
    dias_duplicado: attributes.dias_duplicado,
    tolerancia_cantidad_porcentaje: attributes.tolerancia_cantidad_porcentaje,
    dias_fraccionamiento: attributes.dias_fraccionamiento,
    activo: attributes.activo,
    id_usuario_actualiza: attributes.id_usuario_actualiza,
    fecha_actualizacion: new Date()
  };
}

async function savePurchaseControl(attributes, id_configuracion, { transaction } = {}) {
  const values = validatePurchaseControlAttributes(attributes);
  return runTransaction(transaction, async activeTransaction => {
    await assertConfigurationUser(attributes.id_usuario_actualiza, activeTransaction);
    const activeRows = await ConfiguracionControlCompra.findAll({
      where: { activo: true },
      attributes: ['id_configuracion'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    let existing;
    if (id_configuracion !== undefined) {
      validateId(id_configuracion, 'id_configuracion');
      existing = await ConfiguracionControlCompra.findByPk(id_configuracion, {
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        logging: false
      });
      if (!existing) {
        throw new HttpError(404, 'PURCHASE_CONTROL_CONFIG_NOT_FOUND', 'Purchase-control configuration not found.');
      }
    }

    if (values.activo && activeRows.some(row => Number(row.id_configuracion) !== Number(id_configuracion))) {
      throw new HttpError(409, 'ACTIVE_PURCHASE_CONTROL_CONFIG_EXISTS', 'Only one active purchase-control configuration is supported.');
    }
    const configuration = existing
      ? await existing.update(values, { transaction: activeTransaction, logging: false })
      : await ConfiguracionControlCompra.create(values, { transaction: activeTransaction, logging: false });
    return { configuracion: configuration, creado: !existing };
  });
}

function validateLines(lines, idField, quantityField) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new HttpError(400, 'INVALID_DETAILS', 'At least one detail line is required.');
  }
  const seen = new Set();
  return lines.map((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new HttpError(400, 'INVALID_DETAILS', `details[${index}] must be an object.`);
    }
    validateId(line[idField], `${idField}[${index}]`);
    const key = String(line[idField]);
    if (seen.has(key)) {
      throw new HttpError(400, 'DUPLICATE_DETAIL', `${idField} must not repeat in one operation.`);
    }
    seen.add(key);
    return {
      id: line[idField],
      quantity: validateAperturaQuantity(line[quantityField])
    };
  });
}

function validatePurchaseDecimal(value, scale, integerDigits, field) {
  try {
    return parsePositiveDecimal(value, scale, integerDigits, field);
  } catch (error) {
    if (error instanceof InvalidPurchaseDecimalError) {
      throw new HttpError(400, 'INVALID_PURCHASE_DECIMAL', error.message);
    }
    throw error;
  }
}

function validatePurchaseLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new HttpError(400, 'INVALID_DETAILS', 'At least one purchase detail line is required.');
  }

  const seen = new Set();
  return lines.map((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new HttpError(400, 'INVALID_DETAILS', `detalles[${index}] must be an object.`);
    }
    validateId(line.id_material, `id_material[${index}]`);
    if (seen.has(line.id_material)) {
      throw new HttpError(400, 'DUPLICATE_DETAIL', 'A material must not repeat in one purchase version.');
    }
    seen.add(line.id_material);

    const quantity = validatePurchaseDecimal(line.cantidad, 3, 11, `cantidad[${index}]`);
    const price = validatePurchaseDecimal(line.precio_unitario, 2, 14, `precio_unitario[${index}]`);
    return {
      id_material: line.id_material,
      cantidad: quantity.canonical,
      quantityMilli: quantity.units,
      precio_unitario: price.canonical,
      priceCents: price.units
    };
  });
}

function calculatePurchaseTotal(lines) {
  try {
    return formatCents(calculateTotalCents(lines));
  } catch (error) {
    if (error instanceof RangeError) {
      throw new HttpError(400, 'PURCHASE_TOTAL_OUT_OF_RANGE', 'Calculated total exceeds DECIMAL(16,2).');
    }
    throw error;
  }
}

function calculateStoredLinesTotal(lines) {
  return calculatePurchaseTotal(lines.map(line => ({
    quantityMilli: validatePurchaseDecimal(String(line.cantidad), 3, 11, 'cantidad').units,
    priceCents: validatePurchaseDecimal(String(line.precio_unitario), 2, 14, 'precio_unitario').units
  })));
}

function validateDateOnly(value, field) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ||
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new HttpError(400, 'INVALID_DATE', `${field} must be a valid YYYY-MM-DD date.`);
  }
}

async function assertPurchaseVersionEditable(version, transaction) {
  if (version.estado !== 'PENDIENTE') {
    throw new HttpError(409, 'PURCHASE_VERSION_NOT_EDITABLE', 'Only a pending purchase version can be changed.');
  }
  const [approval, receipt] = await Promise.all([
    AprobacionCompra.findOne({
      where: { id_version: version.id_version },
      attributes: ['id_aprobacion'],
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    }),
    RecepcionCompra.findOne({
      where: { id_version: version.id_version },
      attributes: ['id_recepcion_compra'],
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    })
  ]);
  if (approval || receipt) {
    throw new HttpError(409, 'PURCHASE_VERSION_LOCKED', 'A purchase version with an approval record or receipt cannot be changed.');
  }
}

async function loadVersionLines(id_version, transaction, { lock = false } = {}) {
  return DetalleVersionOrdenCompra.findAll({
    where: { id_version },
    order: [['id_detalle_version', 'ASC']],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    logging: false
  });
}

async function assertQuoteMatchesVersion(quote, versionLines, transaction, { lock = false } = {}) {
  const quoteLines = await DetalleCotizacion.findAll({
    where: { id_cotizacion: quote.id_cotizacion },
    order: [['id_material', 'ASC']],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    logging: false
  });
  if (quoteLines.length !== versionLines.length || quoteLines.length === 0) {
    throw new HttpError(409, 'QUOTE_DETAILS_INCONSISTENT', 'The quote must contain exactly the materials requested by its order version.');
  }

  const versionByMaterial = new Map(versionLines.map(line => [
    Number(line.id_material),
    validatePurchaseDecimal(String(line.cantidad), 3, 11, 'cantidad').units
  ]));
  const seen = new Set();
  for (const line of quoteLines) {
    const materialId = Number(line.id_material);
    if (seen.has(materialId) || !versionByMaterial.has(materialId)) {
      throw new HttpError(409, 'QUOTE_DETAILS_INCONSISTENT', 'The quote contains a duplicate or unrequested material.');
    }
    seen.add(materialId);
    const quoteQuantity = validatePurchaseDecimal(String(line.cantidad), 3, 11, 'cantidad').units;
    if (quoteQuantity !== versionByMaterial.get(materialId)) {
      throw new HttpError(409, 'QUOTE_DETAILS_INCONSISTENT', 'Quoted quantities must match the order version.');
    }
    validatePurchaseDecimal(String(line.precio_unitario), 2, 14, 'precio_unitario');
  }
  if (calculateStoredLinesTotal(quoteLines) !== String(quote.monto_total)) {
    throw new HttpError(409, 'QUOTE_TOTAL_INCONSISTENT', 'The quote total does not match its detail lines.');
  }
  return quoteLines;
}

async function createOrdenCompra(attributes, { transaction } = {}) {
  const codigo = validateText(attributes.codigo, 'codigo', 40);
  validateId(attributes.id_solicitante, 'id_solicitante');
  validateId(attributes.id_ubicacion_destino, 'id_ubicacion_destino');
  validateDate(attributes.fecha_creacion, 'fecha_creacion');
  const motivo_version = validateText(attributes.motivo_version, 'motivo_version', 65535, { optional: true });
  const lines = validatePurchaseLines(attributes.detalles);
  const monto_total = calculatePurchaseTotal(lines);

  return runPurchaseTransaction(transaction, async activeTransaction => {
    const [existingOrder, user, location] = await Promise.all([
      OrdenCompra.findOne({
        where: { codigo },
        attributes: ['id_orden'],
        transaction: activeTransaction,
        logging: false
      }),
      Usuario.findByPk(attributes.id_solicitante, {
        attributes: ['id_usuario'],
        transaction: activeTransaction,
        logging: false
      }),
      Ubicacion.findByPk(attributes.id_ubicacion_destino, {
        attributes: ['id_ubicacion'],
        transaction: activeTransaction,
        logging: false
      })
    ]);
    if (existingOrder) {
      throw new HttpError(409, 'PURCHASE_ORDER_CODE_EXISTS', 'A purchase order with this code already exists.');
    }
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    if (!location) {
      throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Destination location not found.');
    }
    await lockMaterials(lines.map(line => line.id_material), activeTransaction);

    const order = await OrdenCompra.create({
      codigo,
      id_solicitante: attributes.id_solicitante,
      fecha_creacion: attributes.fecha_creacion,
      estado: 'PENDIENTE'
    }, { transaction: activeTransaction, logging: false });
    const version = await VersionOrdenCompra.create({
      id_orden: order.id_orden,
      numero_version: 1,
      id_ubicacion_destino: attributes.id_ubicacion_destino,
      id_cotizacion_elegida: null,
      monto_total,
      estado: 'PENDIENTE',
      fecha_version: attributes.fecha_creacion,
      motivo_version
    }, { transaction: activeTransaction, logging: false });
    const detalles = [];
    for (const line of lines) {
      detalles.push(await DetalleVersionOrdenCompra.create({
        id_version: version.id_version,
        id_material: line.id_material,
        cantidad: line.cantidad,
        precio_unitario: line.precio_unitario
      }, { transaction: activeTransaction, logging: false }));
    }
    return { orden: order, version, detalles };
  });
}

async function createCotizacion(id_version, attributes, { transaction } = {}) {
  validateId(id_version, 'id_version');
  validateId(attributes.id_proveedor, 'id_proveedor');
  validateDate(attributes.fecha_cotizacion, 'fecha_cotizacion');
  if (attributes.vigencia_hasta !== undefined && attributes.vigencia_hasta !== null) {
    validateDateOnly(attributes.vigencia_hasta, 'vigencia_hasta');
  }
  const codigo = attributes.codigo === undefined || attributes.codigo === null
    ? null
    : validateText(attributes.codigo, 'codigo', 60);
  const lines = validatePurchaseLines(attributes.detalles);
  const monto_total = calculatePurchaseTotal(lines);

  return runPurchaseTransaction(transaction, async activeTransaction => {
    const version = await VersionOrdenCompra.findByPk(id_version, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!version) {
      throw new HttpError(404, 'PURCHASE_ORDER_VERSION_NOT_FOUND', 'Purchase-order version not found.');
    }
    const order = await OrdenCompra.findByPk(version.id_orden, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!order) {
      throw new HttpError(409, 'PURCHASE_ORDER_LEDGER_INCONSISTENT', 'The purchase-order version references a missing order.');
    }
    await assertPurchaseVersionEditable(version, activeTransaction);
    if (order.estado !== 'PENDIENTE') {
      throw new HttpError(409, 'PURCHASE_ORDER_NOT_EDITABLE', 'Only a pending purchase order can receive quotes.');
    }
    const [provider, versionLines] = await Promise.all([
      Proveedor.findByPk(attributes.id_proveedor, {
        attributes: ['id_proveedor'],
        transaction: activeTransaction,
        logging: false
      }),
      loadVersionLines(id_version, activeTransaction, { lock: true })
    ]);
    if (!provider) {
      throw new HttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');
    }
    const existingQuote = await Cotizacion.findOne({
      where: { id_version, id_proveedor: attributes.id_proveedor },
      attributes: ['id_cotizacion'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (existingQuote) {
      throw new HttpError(409, 'PURCHASE_QUOTE_ALREADY_EXISTS', 'This supplier already has a quote for the purchase version.');
    }
    if (!versionLines.length) {
      throw new HttpError(409, 'PURCHASE_VERSION_WITHOUT_DETAILS', 'The purchase version has no details.');
    }
    if (calculateStoredLinesTotal(versionLines) !== String(version.monto_total)) {
      throw new HttpError(409, 'PURCHASE_VERSION_TOTAL_INCONSISTENT', 'The purchase version total does not match its detail lines.');
    }
    const versionByMaterial = new Map(versionLines.map(line => [
      Number(line.id_material),
      validatePurchaseDecimal(String(line.cantidad), 3, 11, 'cantidad').units
    ]));
    if (lines.length !== versionByMaterial.size) {
      throw new HttpError(409, 'QUOTE_DETAILS_INCONSISTENT', 'The quote must contain exactly the materials requested by its order version.');
    }
    for (const line of lines) {
      if (!versionByMaterial.has(line.id_material) || versionByMaterial.get(line.id_material) !== line.quantityMilli) {
        throw new HttpError(409, 'QUOTE_DETAILS_INCONSISTENT', 'Quoted materials and quantities must match the order version.');
      }
    }

    const quote = await Cotizacion.create({
      id_version,
      id_proveedor: attributes.id_proveedor,
      codigo,
      fecha_cotizacion: attributes.fecha_cotizacion,
      vigencia_hasta: attributes.vigencia_hasta || null,
      monto_total
    }, { transaction: activeTransaction, logging: false });
    const detalles = [];
    for (const line of lines) {
      detalles.push(await DetalleCotizacion.create({
        id_cotizacion: quote.id_cotizacion,
        id_material: line.id_material,
        cantidad: line.cantidad,
        precio_unitario: line.precio_unitario
      }, { transaction: activeTransaction, logging: false }));
    }
    return { cotizacion: quote, detalles };
  });
}

async function selectCotizacion(id_version, id_cotizacion, { transaction } = {}) {
  validateId(id_version, 'id_version');
  validateId(id_cotizacion, 'id_cotizacion');

  return runPurchaseTransaction(transaction, async activeTransaction => {
    const version = await VersionOrdenCompra.findByPk(id_version, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!version) {
      throw new HttpError(404, 'PURCHASE_ORDER_VERSION_NOT_FOUND', 'Purchase-order version not found.');
    }
    const order = await OrdenCompra.findByPk(version.id_orden, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!order) {
      throw new HttpError(409, 'PURCHASE_ORDER_LEDGER_INCONSISTENT', 'The purchase-order version references a missing order.');
    }
    await assertPurchaseVersionEditable(version, activeTransaction);
    if (order.estado !== 'PENDIENTE') {
      throw new HttpError(409, 'PURCHASE_ORDER_NOT_EDITABLE', 'Only a pending purchase order can change its selected quote.');
    }

    const quote = await Cotizacion.findByPk(id_cotizacion, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!quote || Number(quote.id_version) !== Number(id_version)) {
      throw new HttpError(404, 'PURCHASE_QUOTE_NOT_FOUND', 'The quote does not belong to this purchase-order version.');
    }
    const versionLines = await loadVersionLines(id_version, activeTransaction, { lock: true });
    if (!versionLines.length) {
      throw new HttpError(409, 'PURCHASE_VERSION_WITHOUT_DETAILS', 'The purchase version has no details.');
    }
    if (calculateStoredLinesTotal(versionLines) !== String(version.monto_total)) {
      throw new HttpError(409, 'PURCHASE_VERSION_TOTAL_INCONSISTENT', 'The purchase version total does not match its detail lines.');
    }
    await assertQuoteMatchesVersion(quote, versionLines, activeTransaction, { lock: true });
    version.id_cotizacion_elegida = quote.id_cotizacion;
    await version.save({ transaction: activeTransaction, logging: false });
    const adminRole = await Rol.findOne({
      where: { nombre: ADMIN_APPROVER_ROLE_NAME },
      transaction: activeTransaction,
      logging: false
    });
    if (!adminRole) {
      throw new HttpError(409, 'ADMIN_APPROVER_ROLE_NOT_FOUND', 'The administrative approver role does not exist.');
    }
    const aprobacion = await AprobacionCompra.create({
      id_version: version.id_version,
      nivel_requerido: adminRole.nombre,
      cotizaciones_requeridas: 1,
      monto_evaluado: quote.monto_total,
      estado: 'PENDIENTE',
      fecha_solicitud: new Date()
    }, { transaction: activeTransaction, logging: false });
    return { version, cotizacion: quote, aprobacion };
  });
}

async function createDecisionAprobacionCompra(id_version, attributes, { transaction } = {}) {
  validateId(id_version, 'id_version');
  validateId(attributes.id_usuario, 'id_usuario');
  if (!['APROBADO', 'RECHAZADO'].includes(attributes.decision)) {
    throw new HttpError(400, 'INVALID_PURCHASE_DECISION', 'decision must be APROBADO or RECHAZADO.');
  }
  const motivo = validateText(attributes.motivo, 'motivo', 65535, { optional: true });

  return runPurchaseTransaction(transaction, async activeTransaction => {
    const version = await VersionOrdenCompra.findByPk(id_version, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!version) {
      throw new HttpError(404, 'PURCHASE_ORDER_VERSION_NOT_FOUND', 'Purchase-order version not found.');
    }
    const order = await OrdenCompra.findByPk(version.id_orden, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!order) {
      throw new HttpError(409, 'PURCHASE_ORDER_LEDGER_INCONSISTENT', 'The purchase-order version references a missing order.');
    }
    if (order.estado !== 'PENDIENTE' || version.estado !== 'PENDIENTE') {
      throw new HttpError(409, 'PURCHASE_NOT_PENDING', 'Only a pending purchase can be decided.');
    }
    if (Number(order.id_solicitante) === attributes.id_usuario) {
      throw new HttpError(403, 'PURCHASE_APPROVER_CANNOT_BE_REQUESTER', 'The purchase requester cannot approve or reject their own purchase.');
    }

    const approval = await AprobacionCompra.findOne({
      where: { id_version },
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!approval) {
      throw new HttpError(409, 'PURCHASE_APPROVAL_NOT_REQUESTED', 'Select a valid quote to create the formal approval request before recording a decision.');
    }
    if (approval.estado !== 'PENDIENTE') {
      throw new HttpError(409, 'PURCHASE_DECISION_ALREADY_RECORDED', 'The approval request already has a final decision.');
    }
    const existingDecisions = await DecisionAprobacionCompra.findAll({
      where: { id_aprobacion: approval.id_aprobacion },
      attributes: ['id_decision_compra'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (existingDecisions.length) {
      throw new HttpError(409, 'PURCHASE_DECISION_ALREADY_RECORDED', 'The approval request already has a decision.');
    }

    const [adminRole, approver, assignment, quote] = await Promise.all([
      Rol.findOne({
        where: { nombre: ADMIN_APPROVER_ROLE_NAME },
        transaction: activeTransaction,
        logging: false
      }),
      Usuario.findByPk(attributes.id_usuario, {
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        logging: false
      }),
      UsuarioRol.findOne({
        where: { id_usuario: attributes.id_usuario },
        include: [{
          model: Rol,
          as: 'rol',
          where: { nombre: ADMIN_APPROVER_ROLE_NAME },
          required: true
        }],
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        logging: false
      }),
      version.id_cotizacion_elegida === null
        ? null
        : Cotizacion.findByPk(version.id_cotizacion_elegida, {
          transaction: activeTransaction,
          lock: activeTransaction.LOCK.UPDATE,
          logging: false
        })
    ]);
    if (!adminRole) {
      throw new HttpError(409, 'ADMIN_APPROVER_ROLE_NOT_FOUND', 'The administrative approver role does not exist.');
    }
    if (!approver) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'Approver user not found.');
    }
    if (!approver.activo) {
      throw new HttpError(403, 'PURCHASE_APPROVER_INACTIVE', 'An inactive user cannot approve or reject a purchase.');
    }
    if (!assignment) {
      throw new HttpError(403, 'PURCHASE_APPROVER_ROLE_REQUIRED', 'The user must be assigned to the administrative approver role.');
    }
    if (!quote || Number(quote.id_version) !== Number(version.id_version)) {
      throw new HttpError(409, 'PURCHASE_QUOTE_REQUIRED', 'A quote belonging to this version must be selected before approval.');
    }

    const versionLines = await loadVersionLines(id_version, activeTransaction, { lock: true });
    if (!versionLines.length || calculateStoredLinesTotal(versionLines) !== String(version.monto_total)) {
      throw new HttpError(409, 'PURCHASE_VERSION_TOTAL_INCONSISTENT', 'The purchase version must have details and a correct total before approval.');
    }
    const quoteLines = await assertQuoteMatchesVersion(quote, versionLines, activeTransaction, { lock: true });
    const quoteCount = await Cotizacion.count({
      where: { id_version },
      transaction: activeTransaction,
      logging: false
    });
    if (
      approval.nivel_requerido !== adminRole.nombre ||
      Number(approval.cotizaciones_requeridas) !== 1 ||
      quoteCount < Number(approval.cotizaciones_requeridas) ||
      String(approval.monto_evaluado) !== String(quote.monto_total) ||
      calculateStoredLinesTotal(quoteLines) !== String(quote.monto_total)
    ) {
      throw new HttpError(409, 'PURCHASE_APPROVAL_INCONSISTENT', 'The approval request does not match the selected quote and minimum policy.');
    }
    const committee = await ComiteAprobacion.findOne({
      where: { id_aprobacion: approval.id_aprobacion },
      attributes: ['id_comite'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (committee) {
      throw new HttpError(409, 'PURCHASE_COMMITTEE_NOT_SUPPORTED', 'Committee approvals are not part of this single-administrator flow.');
    }
    const receipt = await RecepcionCompra.findOne({
      where: { id_version },
      attributes: ['id_recepcion_compra'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (receipt) {
      throw new HttpError(409, 'PURCHASE_ALREADY_RECEIVED', 'A purchase with a receipt cannot receive an approval decision.');
    }

    const decisionRow = await DecisionAprobacionCompra.create({
      id_aprobacion: approval.id_aprobacion,
      id_usuario: approver.id_usuario,
      id_rol: adminRole.id_rol,
      decision: attributes.decision,
      motivo,
      fecha_decision: new Date()
    }, { transaction: activeTransaction, logging: false });
    const newState = attributes.decision === 'APROBADO' ? 'APROBADA' : 'RECHAZADA';
    await approval.update({ estado: newState }, { transaction: activeTransaction, logging: false });
    await version.update({ estado: newState }, { transaction: activeTransaction, logging: false });
    await order.update({ estado: newState }, { transaction: activeTransaction, logging: false });
    return { aprobacion: approval, decision: decisionRow, orden: order, version };
  });
}

function runTransaction(transaction, operation) {
  return transaction ? operation(transaction) : sequelize.transaction(operation);
}

function runPurchaseTransaction(transaction, operation) {
  return transaction
    ? sequelize.transaction({ transaction }, operation)
    : sequelize.transaction(operation);
}

async function lockMaterials(materialIds, transaction) {
  const ids = [...new Set(materialIds)].sort((left, right) => left - right);
  const rows = await Material.findAll({
    where: { id_material: ids },
    attributes: ['id_material'],
    order: [['id_material', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
    logging: false
  });
  if (rows.length !== ids.length) {
    const found = new Set(rows.map(row => Number(row.id_material)));
    throw new HttpError(404, 'MATERIAL_NOT_FOUND', `Material ${ids.find(id => !found.has(id))} not found.`);
  }
}

async function assertUserExists(id_usuario, transaction) {
  validateId(id_usuario, 'id_usuario');
  if (!await Usuario.findByPk(id_usuario, { transaction, attributes: ['id_usuario'], logging: false })) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }
}

async function createValeSalida(attributes, { transaction } = {}) {
  validateId(attributes.id_ubicacion, 'id_ubicacion');
  validateId(attributes.id_solicitante, 'id_solicitante');
  validateDate(attributes.fecha_solicitud, 'fecha_solicitud');
  const codigo = validateText(attributes.codigo, 'codigo', 40);
  const motivo = validateText(attributes.motivo, 'motivo', 65535);
  const estado = validateText(attributes.estado, 'estado', 30);
  const lines = validateLines(attributes.detalles, 'id_material', 'cantidad_solicitada');

  return runTransaction(transaction, async transaction => {
    const [location, user] = await Promise.all([
      Ubicacion.findByPk(attributes.id_ubicacion, { transaction, attributes: ['id_ubicacion'], logging: false }),
      Usuario.findByPk(attributes.id_solicitante, { transaction, attributes: ['id_usuario'], logging: false })
    ]);
    if (!location) {
      throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Location not found.');
    }
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    await lockMaterials(lines.map(line => line.id), transaction);
    const vale = await ValeSalida.create({
      codigo,
      id_ubicacion: attributes.id_ubicacion,
      id_solicitante: attributes.id_solicitante,
      fecha_solicitud: attributes.fecha_solicitud,
      motivo,
      estado
    }, { transaction, logging: false });
    const detalles = await Promise.all(lines.map(line => DetalleValeSalida.create({
      id_vale: vale.id_vale,
      id_material: line.id,
      cantidad_solicitada: line.quantity
    }, { transaction, logging: false })));
    return { vale, detalles };
  });
}

async function createValeEntrega(id_vale, attributes, { transaction } = {}) {
  validateId(id_vale, 'id_vale');
  validateId(attributes.id_usuario_entrega, 'id_usuario_entrega');
  validateDate(attributes.fecha_entrega, 'fecha_entrega');
  const observacion = validateText(attributes.observacion, 'observacion', 65535, { optional: true });
  const lines = validateLines(attributes.detalles, 'id_detalle_vale', 'cantidad_entregada');

  return runTransaction(transaction, async transaction => {
    const vale = await ValeSalida.findByPk(id_vale, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (!vale) {
      throw new HttpError(404, 'ISSUE_VOUCHER_NOT_FOUND', 'Issue voucher not found.');
    }
    await assertUserExists(attributes.id_usuario_entrega, transaction);

    const details = await DetalleValeSalida.findAll({
      where: { id_detalle_vale: lines.map(line => line.id) },
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (details.length !== lines.length) {
      throw new HttpError(404, 'ISSUE_VOUCHER_DETAIL_NOT_FOUND', 'One or more issue voucher details were not found.');
    }
    for (const detail of details) {
      if (Number(detail.id_vale) !== id_vale) {
        throw new HttpError(409, 'ISSUE_VOUCHER_DETAIL_MISMATCH', 'A detail does not belong to this issue voucher.');
      }
    }

    await lockMaterials(details.map(detail => Number(detail.id_material)), transaction);
    const detailById = new Map(details.map(detail => [Number(detail.id_detalle_vale), detail]));
    const deliveredDetails = await DetalleEntregaVale.findAll({
      where: { id_detalle_vale: lines.map(line => line.id) },
      attributes: ['id_detalle_vale', 'cantidad_entregada'],
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    const deliveredById = new Map();
    for (const row of deliveredDetails) {
      const current = deliveredById.get(Number(row.id_detalle_vale)) || 0n;
      deliveredById.set(
        Number(row.id_detalle_vale),
        current + parseNonnegativeMilli(row.cantidad_entregada, 'cantidad_entregada')
      );
    }

    const lineDetails = lines.map(line => {
      const detail = detailById.get(line.id);
      const requested = parseNonnegativeMilli(detail.cantidad_solicitada, 'cantidad_solicitada');
      const delivered = deliveredById.get(line.id) || 0n;
      const quantity = parseNonnegativeMilli(line.quantity, 'cantidad_entregada');
      if (delivered > 0n) {
        throw new HttpError(409, 'VOUCHER_ALREADY_DELIVERED', 'A voucher detail can be delivered only once.');
      }
      if (quantity !== requested) {
        throw new HttpError(409, 'DELIVERY_MUST_MATCH_REQUEST', 'Each delivered quantity must equal the requested quantity for its detail.');
      }
      return { line, detail, quantity };
    });

    for (const { detail, quantity } of lineDetails) {
      const balance = await getExistencia({
        id_material: Number(detail.id_material),
        id_ubicacion: Number(vale.id_ubicacion),
        transaction
      });
      if (parseNonnegativeMilli(balance.stock_disponible, 'stock_disponible') < quantity) {
        throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Available stock is insufficient for this voucher delivery.');
      }
    }

    const entrega = await EntregaVale.create({
      id_vale,
      id_usuario_entrega: attributes.id_usuario_entrega,
      fecha_entrega: attributes.fecha_entrega,
      observacion
    }, { transaction, logging: false });

    const created = [];
    for (const { line, detail, quantity } of lineDetails) {
      const detailEntrega = await DetalleEntregaVale.create({
        id_entrega: entrega.id_entrega,
        id_detalle_vale: line.id,
        cantidad_entregada: line.quantity
      }, { transaction, logging: false });
      const movimiento = await MovimientoInventario.create({
        id_material: detail.id_material,
        id_ubicacion_origen: vale.id_ubicacion,
        id_ubicacion_destino: null,
        id_usuario: attributes.id_usuario_entrega,
        tipo: 'SALIDA_VALE',
        cantidad: line.quantity,
        fecha_movimiento: attributes.fecha_entrega,
        id_detalle_entrega_vale: detailEntrega.id_detalle_entrega
      }, { transaction, logging: false });
      created.push(movimiento);
    }
    return { entrega, movimientos: created };
  });
}

async function createTraslado(attributes, { transaction } = {}) {
  validateId(attributes.id_origen, 'id_origen');
  validateId(attributes.id_destino, 'id_destino');
  validateId(attributes.id_solicitante, 'id_solicitante');
  validateDate(attributes.fecha_solicitud, 'fecha_solicitud');
  if (attributes.id_origen === attributes.id_destino) {
    throw new HttpError(400, 'INVALID_TRANSFER_LOCATIONS', 'Origin and destination must be different.');
  }
  const codigo = validateText(attributes.codigo, 'codigo', 40);
  const estado = validateText(attributes.estado, 'estado', 30);
  const motivo = validateText(attributes.motivo, 'motivo', 65535, { optional: true });
  const lines = validateLines(attributes.detalles, 'id_material', 'cantidad_solicitada');

  return runTransaction(transaction, async transaction => {
    const [origin, destination] = await Promise.all([
      Ubicacion.findByPk(attributes.id_origen, { transaction, attributes: ['id_ubicacion'], logging: false }),
      Ubicacion.findByPk(attributes.id_destino, { transaction, attributes: ['id_ubicacion'], logging: false })
    ]);
    if (!origin || !destination) {
      throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Transfer origin or destination was not found.');
    }
    await assertUserExists(attributes.id_solicitante, transaction);
    await lockMaterials(lines.map(line => line.id), transaction);
    const traslado = await Traslado.create({
      codigo,
      id_origen: attributes.id_origen,
      id_destino: attributes.id_destino,
      id_solicitante: attributes.id_solicitante,
      fecha_solicitud: attributes.fecha_solicitud,
      estado,
      motivo
    }, { transaction, logging: false });
    const detalles = await Promise.all(lines.map(line => DetalleTraslado.create({
      id_traslado: traslado.id_traslado,
      id_material: line.id,
      cantidad_solicitada: line.quantity
    }, { transaction, logging: false })));
    return { traslado, detalles };
  });
}

async function createDespachoTraslado(id_traslado, attributes, { transaction } = {}) {
  validateId(id_traslado, 'id_traslado');
  validateId(attributes.id_usuario, 'id_usuario');
  validateDate(attributes.fecha_despacho, 'fecha_despacho');
  const observacion = validateText(attributes.observacion, 'observacion', 65535, { optional: true });
  const lines = validateLines(attributes.detalles, 'id_detalle_traslado', 'cantidad');

  return runTransaction(transaction, async transaction => {
    const traslado = await Traslado.findByPk(id_traslado, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (!traslado) {
      throw new HttpError(404, 'TRANSFER_NOT_FOUND', 'Transfer not found.');
    }
    await assertUserExists(attributes.id_usuario, transaction);
    const details = await DetalleTraslado.findAll({
      where: { id_detalle_traslado: lines.map(line => line.id) },
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (details.length !== lines.length || details.some(detail => Number(detail.id_traslado) !== id_traslado)) {
      throw new HttpError(409, 'TRANSFER_DETAIL_MISMATCH', 'One or more detail lines do not belong to this transfer.');
    }
    await lockMaterials(details.map(detail => Number(detail.id_material)), transaction);

    const detailById = new Map(details.map(detail => [Number(detail.id_detalle_traslado), detail]));
    const existingDispatches = await DetalleDespachoTraslado.findAll({
      where: { id_detalle_traslado: lines.map(line => line.id) },
      attributes: ['id_detalle_traslado'],
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (existingDispatches.length) {
      throw new HttpError(409, 'TRANSFER_ALREADY_DISPATCHED', 'A transfer detail can be dispatched only once by this operation.');
    }

    for (const line of lines) {
      const detail = detailById.get(line.id);
      if (parseNonnegativeMilli(line.quantity, 'cantidad') !== parseNonnegativeMilli(detail.cantidad_solicitada, 'cantidad_solicitada')) {
        throw new HttpError(400, 'DISPATCH_MUST_MATCH_REQUEST', 'Each dispatched quantity must equal the requested quantity for its detail.');
      }
      const balance = await getExistencia({
        id_material: Number(detail.id_material),
        id_ubicacion: Number(traslado.id_origen),
        transaction
      });
      if (parseNonnegativeMilli(balance.stock_disponible, 'stock_disponible') < parseNonnegativeMilli(line.quantity, 'cantidad')) {
        throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Available stock is insufficient for this transfer dispatch.');
      }
    }

    const despacho = await DespachoTraslado.create({
      id_traslado,
      id_usuario: attributes.id_usuario,
      fecha_despacho: attributes.fecha_despacho,
      observacion
    }, { transaction, logging: false });
    const movimientos = [];
    const detalles = [];
    for (const line of lines) {
      const detail = detailById.get(line.id);
      const detalleDespacho = await DetalleDespachoTraslado.create({
        id_despacho: despacho.id_despacho,
        id_detalle_traslado: line.id,
        cantidad_despachada: line.quantity
      }, { transaction, logging: false });
      detalles.push(detalleDespacho);
      movimientos.push(await MovimientoInventario.create({
        id_material: detail.id_material,
        id_ubicacion_origen: traslado.id_origen,
        id_ubicacion_destino: traslado.id_destino,
        id_usuario: attributes.id_usuario,
        tipo: 'TRASLADO_SALIDA',
        cantidad: line.quantity,
        fecha_movimiento: attributes.fecha_despacho,
        id_detalle_despacho: detalleDespacho.id_detalle_despacho
      }, { transaction, logging: false }));
    }
    return { despacho, detalles, movimientos };
  });
}

async function createRecepcionTraslado(id_despacho, attributes, { transaction } = {}) {
  validateId(id_despacho, 'id_despacho');
  validateId(attributes.id_usuario, 'id_usuario');
  validateDate(attributes.fecha_recepcion, 'fecha_recepcion');
  const observacion = validateText(attributes.observacion, 'observacion', 65535, { optional: true });
  const lines = validateLines(attributes.detalles, 'id_detalle_despacho', 'cantidad');

  return runTransaction(transaction, async transaction => {
    const despacho = await DespachoTraslado.findByPk(id_despacho, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (!despacho) {
      throw new HttpError(404, 'DISPATCH_NOT_FOUND', 'Transfer dispatch not found.');
    }
    const traslado = await Traslado.findByPk(despacho.id_traslado, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (!traslado) {
      throw new HttpError(409, 'TRANSFER_LEDGER_INCONSISTENT', 'Dispatch references a missing transfer.');
    }
    await assertUserExists(attributes.id_usuario, transaction);

    const details = await DetalleDespachoTraslado.findAll({
      where: { id_detalle_despacho: lines.map(line => line.id) },
      include: [{ model: DetalleTraslado, as: 'detalleTraslado', required: true }],
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    if (details.length !== lines.length || details.some(detail =>
      Number(detail.id_despacho) !== id_despacho ||
      Number(detail.detalleTraslado.id_traslado) !== Number(traslado.id_traslado)
    )) {
      throw new HttpError(409, 'DISPATCH_DETAIL_MISMATCH', 'One or more detail lines do not belong to this dispatch.');
    }
    await lockMaterials(details.map(detail => Number(detail.detalleTraslado.id_material)), transaction);

    const priorReceipts = await DetalleRecepcionTraslado.findAll({
      where: { id_detalle_despacho: lines.map(line => line.id) },
      attributes: ['id_detalle_despacho', 'cantidad_recibida'],
      transaction,
      lock: transaction.LOCK.UPDATE,
      logging: false
    });
    const receivedByDispatchDetail = new Map();
    for (const row of priorReceipts) {
      const current = receivedByDispatchDetail.get(Number(row.id_detalle_despacho)) || 0n;
      receivedByDispatchDetail.set(
        Number(row.id_detalle_despacho),
        current + parseNonnegativeMilli(row.cantidad_recibida, 'cantidad_recibida')
      );
    }
    const detailById = new Map(details.map(detail => [Number(detail.id_detalle_despacho), detail]));
    for (const line of lines) {
      const detail = detailById.get(line.id);
      const dispatched = parseNonnegativeMilli(detail.cantidad_despachada, 'cantidad_despachada');
      const alreadyReceived = receivedByDispatchDetail.get(line.id) || 0n;
      const quantity = parseNonnegativeMilli(line.quantity, 'cantidad');
      if (alreadyReceived + quantity > dispatched) {
        throw new HttpError(409, 'RECEIPT_QUANTITY_EXCEEDED', 'Received quantity would exceed the dispatched quantity.');
      }
    }

    const recepcion = await RecepcionTraslado.create({
      id_despacho,
      id_usuario: attributes.id_usuario,
      fecha_recepcion: attributes.fecha_recepcion,
      observacion
    }, { transaction, logging: false });
    const movimientos = [];
    const detalles = [];
    for (const line of lines) {
      const detail = detailById.get(line.id);
      const detalleRecepcion = await DetalleRecepcionTraslado.create({
        id_recepcion_traslado: recepcion.id_recepcion_traslado,
        id_detalle_despacho: line.id,
        cantidad_recibida: line.quantity
      }, { transaction, logging: false });
      detalles.push(detalleRecepcion);
      movimientos.push(await MovimientoInventario.create({
        id_material: detail.detalleTraslado.id_material,
        id_ubicacion_origen: null,
        id_ubicacion_destino: traslado.id_destino,
        id_usuario: attributes.id_usuario,
        tipo: 'TRASLADO_ENTRADA',
        cantidad: line.quantity,
        fecha_movimiento: attributes.fecha_recepcion,
        id_detalle_recepcion_traslado: detalleRecepcion.id_detalle_recepcion_traslado
      }, { transaction, logging: false }));
    }
    return { recepcion, detalles, movimientos };
  });
}

async function createRecepcionCompra(id_orden, attributes, { transaction } = {}) {
  validateId(id_orden, 'id_orden');
  validateId(attributes.id_version, 'id_version');
  validateId(attributes.id_usuario, 'id_usuario');
  validateDate(attributes.fecha_recepcion, 'fecha_recepcion');
  const estado = validateText(attributes.estado, 'estado', 25);
  const observacion = validateText(attributes.observacion, 'observacion', 65535, { optional: true });
  if (!Array.isArray(attributes.detalles) || attributes.detalles.length === 0) {
    throw new HttpError(400, 'INVALID_DETAILS', 'At least one purchase receipt detail is required.');
  }

  const seen = new Set();
  const lines = attributes.detalles.map((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new HttpError(400, 'INVALID_DETAILS', `detalles[${index}] must be an object.`);
    }
    validateId(line.id_detalle_version, `id_detalle_version[${index}]`);
    if (seen.has(line.id_detalle_version)) {
      throw new HttpError(400, 'DUPLICATE_DETAIL', 'id_detalle_version must not repeat in one receipt.');
    }
    seen.add(line.id_detalle_version);
    const cantidad_entregada = validateAperturaQuantity(line.cantidad_entregada);
    let cantidad_aceptada;
    let cantidad_rechazada;
    try {
      cantidad_aceptada = formatQuantity(parseNonnegativeMilli(line.cantidad_aceptada, 'cantidad_aceptada'));
      cantidad_rechazada = formatQuantity(parseNonnegativeMilli(line.cantidad_rechazada, 'cantidad_rechazada'));
    } catch (error) {
      if (error instanceof HttpError) {
        throw new HttpError(400, 'INVALID_QUANTITY', 'Receipt quantities must fit DECIMAL(14,3).');
      }
      throw error;
    }
    if (parseNonnegativeMilli(cantidad_aceptada, 'cantidad_aceptada') <= 0n) {
      throw new HttpError(400, 'INVALID_ACCEPTED_QUANTITY', 'cantidad_aceptada must be positive because each receipt detail creates an inventory entry.');
    }
    if (
      parseNonnegativeMilli(cantidad_aceptada, 'cantidad_aceptada') +
      parseNonnegativeMilli(cantidad_rechazada, 'cantidad_rechazada') !==
      parseNonnegativeMilli(cantidad_entregada, 'cantidad_entregada')
    ) {
      throw new HttpError(400, 'RECEIPT_QUANTITY_MISMATCH', 'cantidad_aceptada plus cantidad_rechazada must equal cantidad_entregada.');
    }
    return {
      id_detalle_version: line.id_detalle_version,
      cantidad_entregada,
      cantidad_aceptada,
      cantidad_rechazada
    };
  });

  const writeReceipt = async activeTransaction => {
    const version = await VersionOrdenCompra.findByPk(attributes.id_version, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!version || Number(version.id_orden) !== id_orden) {
      throw new HttpError(404, 'PURCHASE_ORDER_VERSION_NOT_FOUND', 'The purchase-order version does not belong to the supplied order.');
    }
    const [order, user, quote] = await Promise.all([
      OrdenCompra.findByPk(id_orden, { transaction: activeTransaction, lock: activeTransaction.LOCK.UPDATE, logging: false }),
      Usuario.findByPk(attributes.id_usuario, { attributes: ['id_usuario'], transaction: activeTransaction, logging: false }),
      version.id_cotizacion_elegida === null
        ? null
        : Cotizacion.findByPk(version.id_cotizacion_elegida, { transaction: activeTransaction, lock: activeTransaction.LOCK.UPDATE, logging: false })
    ]);
    if (!order) {
      throw new HttpError(409, 'PURCHASE_ORDER_LEDGER_INCONSISTENT', 'The purchase-order version references a missing order.');
    }
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    if (!quote || Number(quote.id_version) !== Number(version.id_version)) {
      throw new HttpError(409, 'PURCHASE_SUPPLIER_TRACEABILITY_UNAVAILABLE', 'The order version must select a quote belonging to itself before receiving inventory.');
    }
    if (order.estado === 'RECHAZADA' || version.estado === 'RECHAZADA') {
      throw new HttpError(409, 'PURCHASE_REJECTED', 'A rejected purchase cannot be received.');
    }
    if (order.estado !== 'APROBADA' || version.estado !== 'APROBADA') {
      throw new HttpError(409, 'PURCHASE_APPROVAL_REQUIRED', 'The purchase must have a formal approval before receiving inventory.');
    }
    await assertFormalPurchaseApproval(order, version, quote, activeTransaction);

    const versionDetails = await loadVersionLines(version.id_version, activeTransaction, { lock: true });
    const detailsById = new Map(versionDetails.map(detail => [Number(detail.id_detalle_version), detail]));
    const details = lines.map(line => detailsById.get(line.id_detalle_version)).filter(Boolean);
    if (details.length !== lines.length || details.some(detail => Number(detail.id_version) !== Number(version.id_version))) {
      throw new HttpError(409, 'PURCHASE_RECEIPT_DETAIL_MISMATCH', 'One or more detail lines do not belong to the supplied order version.');
    }
    if (!versionDetails.length) {
      throw new HttpError(409, 'PURCHASE_VERSION_WITHOUT_DETAILS', 'The approved purchase version has no details.');
    }
    if (calculateStoredLinesTotal(versionDetails) !== String(version.monto_total)) {
      throw new HttpError(409, 'PURCHASE_VERSION_TOTAL_INCONSISTENT', 'The purchase version total does not match its detail lines.');
    }
    await assertQuoteMatchesVersion(quote, versionDetails, activeTransaction, { lock: true });
    await lockMaterials(details.map(detail => Number(detail.id_material)), activeTransaction);

    const priorDetails = await DetalleRecepcionCompra.findAll({
      where: { id_detalle_version: versionDetails.map(detail => detail.id_detalle_version) },
      attributes: ['id_detalle_version', 'cantidad_entregada', 'cantidad_aceptada'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    const receivedByVersionDetail = new Map();
    const acceptedByVersionDetail = new Map();
    for (const detail of priorDetails) {
      const key = Number(detail.id_detalle_version);
      receivedByVersionDetail.set(key, (receivedByVersionDetail.get(key) || 0n) + parseNonnegativeMilli(detail.cantidad_entregada, 'cantidad_entregada'));
      acceptedByVersionDetail.set(key, (acceptedByVersionDetail.get(key) || 0n) + parseNonnegativeMilli(detail.cantidad_aceptada, 'cantidad_aceptada'));
    }
    const detailById = detailsById;
    for (const line of lines) {
      const authorized = parseNonnegativeMilli(detailById.get(line.id_detalle_version).cantidad, 'cantidad');
      const received = receivedByVersionDetail.get(line.id_detalle_version) || 0n;
      if (received + parseNonnegativeMilli(line.cantidad_entregada, 'cantidad_entregada') > authorized) {
        throw new HttpError(409, 'RECEIPT_QUANTITY_EXCEEDED', 'Received quantity would exceed the authorized order quantity.');
      }
    }

    const recepcion = await RecepcionCompra.create({
      id_version: version.id_version,
      id_usuario: attributes.id_usuario,
      fecha_recepcion: attributes.fecha_recepcion,
      estado,
      observacion
    }, { transaction: activeTransaction, logging: false });
    const detalles = [];
    const movimientos = [];
    for (const line of lines) {
      const detail = detailById.get(line.id_detalle_version);
      const detalle = await DetalleRecepcionCompra.create({
        id_recepcion_compra: recepcion.id_recepcion_compra,
        ...line
      }, { transaction: activeTransaction, logging: false });
      detalles.push(detalle);
      movimientos.push(await MovimientoInventario.create({
        id_material: detail.id_material,
        id_ubicacion_origen: null,
        id_ubicacion_destino: version.id_ubicacion_destino,
        id_usuario: attributes.id_usuario,
        tipo: 'ENTRADA_COMPRA',
        cantidad: line.cantidad_aceptada,
        fecha_movimiento: attributes.fecha_recepcion,
        id_detalle_recepcion_compra: detalle.id_detalle_recepcion_compra
      }, { transaction: activeTransaction, logging: false }));
    }
    const acceptedAfter = new Map(acceptedByVersionDetail);
    for (const line of lines) {
      acceptedAfter.set(
        line.id_detalle_version,
        (acceptedAfter.get(line.id_detalle_version) || 0n) +
          parseNonnegativeMilli(line.cantidad_aceptada, 'cantidad_aceptada')
      );
    }
    const complete = versionDetails.every(detail =>
      acceptedAfter.get(Number(detail.id_detalle_version)) === parseNonnegativeMilli(detail.cantidad, 'cantidad')
    );
    if (complete) {
      await version.update({ estado: 'RECIBIDA' }, { transaction: activeTransaction, logging: false });
      const orderVersions = await VersionOrdenCompra.findAll({
        where: { id_orden: order.id_orden },
        attributes: ['id_version', 'estado'],
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        logging: false
      });
      if (orderVersions.every(item =>
        Number(item.id_version) === Number(version.id_version) || item.estado === 'RECIBIDA'
      )) {
        await order.update({ estado: 'RECIBIDA' }, { transaction: activeTransaction, logging: false });
      }
    }
    return { recepcion, detalles, movimientos };
  };
  return transaction
    ? sequelize.transaction({ transaction }, writeReceipt)
    : sequelize.transaction(writeReceipt);
}

async function assertFormalPurchaseApproval(order, version, quote, transaction) {
  const approval = await AprobacionCompra.findOne({
    where: { id_version: version.id_version },
    transaction,
    lock: transaction.LOCK.UPDATE,
    logging: false
  });
  if (!approval || approval.estado !== 'APROBADA') {
    if (approval && approval.estado === 'RECHAZADA') {
      throw new HttpError(409, 'PURCHASE_REJECTED', 'A formally rejected purchase cannot be received.');
    }
    throw new HttpError(409, 'PURCHASE_APPROVAL_REQUIRED', 'A formal APROBADA record is required before receiving inventory.');
  }
  const requiredQuotes = Number(approval.cotizaciones_requeridas);
  if (requiredQuotes !== 1) {
    throw new HttpError(409, 'PURCHASE_APPROVAL_CONFIGURATION_INVALID', 'The approval record has no valid required-quote count.');
  }
  const quoteCount = await Cotizacion.count({
    where: { id_version: version.id_version },
    transaction,
    logging: false
  });
  if (quoteCount < requiredQuotes) {
    throw new HttpError(409, 'PURCHASE_APPROVAL_QUOTE_REQUIREMENT_NOT_MET', 'The required number of quotes has not been reached.');
  }
  const totalApproval = validatePurchaseDecimal(String(approval.monto_evaluado), 2, 14, 'monto_evaluado').units;
  const totalQuote = validatePurchaseDecimal(String(quote.monto_total), 2, 14, 'monto_total').units;
  if (totalApproval !== totalQuote) {
    throw new HttpError(409, 'PURCHASE_APPROVAL_AMOUNT_MISMATCH', 'The approved amount does not match the selected quote.');
  }

  const committee = await ComiteAprobacion.findOne({
    where: { id_aprobacion: approval.id_aprobacion },
    attributes: ['id_comite'],
    transaction,
    lock: transaction.LOCK.UPDATE,
    logging: false
  });
  if (committee) {
    throw new HttpError(409, 'PURCHASE_COMMITTEE_POLICY_UNRESOLVED', 'This purchase uses a committee; its required voting rule is not defined by the schema.');
  }

  const decisions = await DecisionAprobacionCompra.findAll({
    where: { id_aprobacion: approval.id_aprobacion },
    transaction,
    lock: transaction.LOCK.UPDATE,
    logging: false
  });
  if (decisions.length !== 1 || decisions[0].decision !== 'APROBADO') {
    throw new HttpError(409, 'PURCHASE_APPROVAL_DECISION_REQUIRED', 'Exactly one APROBADO decision is required for the approval.');
  }

  for (const decision of decisions) {
    const [user, role, assignment] = await Promise.all([
      Usuario.findByPk(decision.id_usuario, {
        attributes: ['id_usuario', 'activo'],
        transaction,
        logging: false
      }),
      Rol.findByPk(decision.id_rol, {
        attributes: ['id_rol', 'nombre'],
        transaction,
        logging: false
      }),
      UsuarioRol.findOne({
        where: { id_usuario: decision.id_usuario, id_rol: decision.id_rol },
        attributes: ['id_usuario_rol'],
        transaction,
        logging: false
      })
    ]);
    if (!user || !user.activo || !role || !assignment ||
      role.nombre !== ADMIN_APPROVER_ROLE_NAME ||
      Number(decision.id_rol) !== Number(role.id_rol) ||
      role.nombre !== approval.nivel_requerido ||
      Number(user.id_usuario) === Number(order.id_solicitante)) {
      throw new HttpError(409, 'PURCHASE_APPROVAL_ACTOR_INVALID', 'The approval decision must belong to an active administrator who is not the requester.');
    }
  }
}

async function createSolicitudAjuste(attributes, { transaction } = {}) {
  validateId(attributes.id_material, 'id_material');
  validateId(attributes.id_ubicacion, 'id_ubicacion');
  validateId(attributes.id_solicitante, 'id_solicitante');
  validateDate(attributes.fecha_solicitud, 'fecha_solicitud');
  const cantidad_variacion = validateAdjustmentQuantity(attributes.cantidad_variacion);
  const motivo = validateText(attributes.motivo, 'motivo', 65535);
  const estado = validateText(attributes.estado, 'estado', 25);

  return runTransaction(transaction, async activeTransaction => {
    const [material, ubicacion, solicitante] = await Promise.all([
      Material.findByPk(attributes.id_material, { transaction: activeTransaction, lock: activeTransaction.LOCK.UPDATE, logging: false }),
      Ubicacion.findByPk(attributes.id_ubicacion, { attributes: ['id_ubicacion'], transaction: activeTransaction, logging: false }),
      Usuario.findByPk(attributes.id_solicitante, { attributes: ['id_usuario'], transaction: activeTransaction, logging: false })
    ]);
    if (!material) throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
    if (!ubicacion) throw new HttpError(404, 'LOCATION_NOT_FOUND', 'Location not found.');
    if (!solicitante) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');

    return SolicitudAjuste.create({
      id_material: attributes.id_material,
      id_ubicacion: attributes.id_ubicacion,
      id_solicitante: attributes.id_solicitante,
      cantidad_variacion,
      motivo,
      estado,
      fecha_solicitud: attributes.fecha_solicitud
    }, { transaction: activeTransaction, logging: false });
  });
}

async function createDecisionAjuste(id_solicitud_ajuste, attributes, { transaction } = {}) {
  validateId(id_solicitud_ajuste, 'id_solicitud_ajuste');
  validateId(attributes.id_administrador, 'id_administrador');
  validateDate(attributes.fecha_decision, 'fecha_decision');
  const decision = attributes.decision;
  const motivo = validateText(attributes.motivo, 'motivo', 65535, { optional: true });
  if (typeof decision !== 'string' || !['APROBADO', 'RECHAZADO'].includes(decision)) {
    throw new HttpError(400, 'INVALID_ADJUSTMENT_DECISION', 'decision must be APROBADO or RECHAZADO.');
  }

  const writeDecision = async activeTransaction => {
    const solicitud = await SolicitudAjuste.findByPk(id_solicitud_ajuste, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    });
    if (!solicitud) {
      throw new HttpError(404, 'ADJUSTMENT_REQUEST_NOT_FOUND', 'Adjustment request not found.');
    }
    const [administrador, material, ubicacion] = await Promise.all([
      Usuario.findByPk(attributes.id_administrador, {
        attributes: ['id_usuario'], transaction: activeTransaction, logging: false
      }),
      Material.findByPk(solicitud.id_material, {
        attributes: ['id_material'], transaction: activeTransaction, lock: activeTransaction.LOCK.UPDATE, logging: false
      }),
      Ubicacion.findByPk(solicitud.id_ubicacion, {
        attributes: ['id_ubicacion'], transaction: activeTransaction, logging: false
      })
    ]);
    if (!administrador) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    if (!material) throw new HttpError(409, 'ADJUSTMENT_REQUEST_INCONSISTENT', 'Adjustment request references a missing material.');
    if (!ubicacion) throw new HttpError(409, 'ADJUSTMENT_REQUEST_INCONSISTENT', 'Adjustment request references a missing location.');
    if (await DecisionAjuste.findOne({
      where: { id_solicitud_ajuste },
      attributes: ['id_decision_ajuste'],
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      logging: false
    })) {
      throw new HttpError(409, 'ADJUSTMENT_DECISION_ALREADY_RECORDED', 'An adjustment decision is already recorded for this request.');
    }
    const recordedDecision = await DecisionAjuste.create({
      id_solicitud_ajuste,
      id_administrador: attributes.id_administrador,
      decision,
      motivo,
      fecha_decision: attributes.fecha_decision
    }, { transaction: activeTransaction, logging: false });
    if (decision === 'RECHAZADO') {
      return { decision: recordedDecision, movimiento: null };
    }

    const variation = String(solicitud.cantidad_variacion);
    const isNegative = variation.startsWith('-');
    const cantidad = isNegative ? variation.slice(1) : variation;
    if (isNegative) {
      const existencia = await getExistencia({
        id_material: Number(solicitud.id_material),
        id_ubicacion: Number(solicitud.id_ubicacion),
        transaction: activeTransaction
      });
      if (parseNonnegativeMilli(existencia.stock_disponible, 'stock_disponible') < parseNonnegativeMilli(cantidad, 'cantidad_variacion')) {
        throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Available stock is insufficient for this adjustment.');
      }
    }
    const movimiento = await MovimientoInventario.create({
      id_material: solicitud.id_material,
      id_ubicacion_origen: isNegative ? solicitud.id_ubicacion : null,
      id_ubicacion_destino: isNegative ? null : solicitud.id_ubicacion,
      id_usuario: attributes.id_administrador,
      tipo: isNegative ? 'AJUSTE_SALIDA' : 'AJUSTE_ENTRADA',
      cantidad,
      fecha_movimiento: attributes.fecha_decision,
      id_decision_ajuste: recordedDecision.id_decision_ajuste,
      observacion: solicitud.motivo
    }, { transaction: activeTransaction, logging: false });
    await getExistencia({
      id_material: Number(solicitud.id_material),
      id_ubicacion: Number(solicitud.id_ubicacion),
      transaction: activeTransaction
    });
    return { decision: recordedDecision, movimiento };
  };
  return transaction
    ? sequelize.transaction({ transaction }, writeDecision)
    : sequelize.transaction(writeDecision);
}

async function listReorderAlerts({ transaction } = {}) {
  const parameters = await ParametrosInventario.findAll({
    where: { activo: true },
    order: [['id_parametros', 'ASC']],
    transaction,
    logging: false
  });
  const results = [];
  for (const parameter of parameters) {
    const average = parseNonnegativeMilli(parameter.demanda_diaria_promedio, 'demanda_diaria_promedio');
    const maximum = parseNonnegativeMilli(parameter.demanda_diaria_maxima, 'demanda_diaria_maxima');
    const leadDays = Number(parameter.tiempo_reposicion_dias);
    if (maximum < average || !Number.isSafeInteger(leadDays) || leadDays < 0) {
      throw new HttpError(409, 'INVALID_INVENTORY_CONFIGURATION', 'Active inventory parameters contain unsupported demand or replenishment values.');
    }
    const safety = (maximum - average) * BigInt(leadDays);
    const reorderPoint = average * BigInt(leadDays) + safety;
    const existence = await getExistencia({
      id_material: Number(parameter.id_material),
      id_ubicacion: Number(parameter.id_ubicacion),
      transaction
    });
    const stock = parseNonnegativeMilli(existence.stock_disponible, 'stock_disponible');
    if (stock < reorderPoint) {
      results.push({
        id_parametros: parameter.id_parametros,
        id_material: parameter.id_material,
        id_ubicacion: parameter.id_ubicacion,
        stock_disponible: existence.stock_disponible,
        stock_seguridad: formatQuantity(safety),
        punto_reorden: formatQuantity(reorderPoint),
        requiere_reorden: true
      });
    }
  }
  return results;
}

async function findPurchaseDuplicates({ id_proveedor, id_material, cantidad, fecha }, { transaction } = {}) {
  validateId(id_proveedor, 'id_proveedor');
  validateId(id_material, 'id_material');
  validateDate(fecha, 'fecha');
  const candidateQuantity = parseNonnegativeMilli(validateAperturaQuantity(cantidad), 'cantidad');
  const configRows = await ConfiguracionControlCompra.findAll({
    where: { activo: true },
    order: [['id_configuracion', 'ASC']],
    transaction,
    logging: false
  });
  if (configRows.length !== 1) {
    throw new HttpError(
      409,
      'PURCHASE_CONTROL_CONFIG_UNAVAILABLE',
      'Exactly one active purchase-control configuration is required for duplicate detection.'
    );
  }
  const configuration = configRows[0];
  const days = Number(configuration.dias_duplicado);
  const toleranceText = String(configuration.tolerancia_cantidad_porcentaje);
  if (!Number.isSafeInteger(days) || days < 0 || !/^(0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(toleranceText)) {
    throw new HttpError(409, 'INVALID_PURCHASE_CONTROL_CONFIG', 'Active duplicate-control settings are invalid.');
  }
  const [wholeTolerance, fractionalTolerance = ''] = toleranceText.split('.');
  const toleranceHundredths = BigInt(wholeTolerance) * 100n + BigInt(fractionalTolerance.padEnd(2, '0'));
  const start = new Date(fecha.getTime() - days * 86400000);
  const end = new Date(fecha.getTime() + days * 86400000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpError(409, 'INVALID_PURCHASE_CONTROL_CONFIG', 'The duplicate date window exceeds supported date limits.');
  }
  const [supplier, material] = await Promise.all([
    Proveedor.findByPk(id_proveedor, { attributes: ['id_proveedor'], transaction, logging: false }),
    Material.findByPk(id_material, { attributes: ['id_material'], transaction, logging: false })
  ]);
  if (!supplier) {
    throw new HttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');
  }
  if (!material) {
    throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
  }
  const orders = await OrdenCompra.findAll({
    where: { fecha_creacion: { [Sequelize.Op.between]: [start, end] } },
    include: [{
      model: VersionOrdenCompra,
      as: 'versiones',
      required: true,
      include: [
        {
          model: Cotizacion,
          as: 'cotizacionElegida',
          required: true,
          where: { id_proveedor },
          include: [{ model: Proveedor, as: 'proveedor', attributes: ['id_proveedor', 'nombre'] }]
        },
        {
          model: DetalleVersionOrdenCompra,
          as: 'detalles',
          required: true,
          where: { id_material }
        }
      ]
    }],
    order: [['fecha_creacion', 'DESC']],
    transaction,
    logging: false
  });
  const matches = [];
  for (const order of orders) {
    for (const version of order.versiones) {
      const quote = version.cotizacionElegida;
      for (const detail of version.detalles) {
        const existingQuantity = parseNonnegativeMilli(detail.cantidad, 'cantidad');
        const difference = existingQuantity > candidateQuantity
          ? existingQuantity - candidateQuantity
          : candidateQuantity - existingQuantity;
        if (difference * 10000n <= candidateQuantity * toleranceHundredths) {
          matches.push({
            id_orden: order.id_orden,
            codigo_orden: order.codigo,
            fecha_orden: order.fecha_creacion,
            id_version: version.id_version,
            id_cotizacion: quote.id_cotizacion,
            id_proveedor: quote.id_proveedor,
            proveedor: quote.proveedor.nombre,
            id_material: detail.id_material,
            cantidad_ordenada: detail.cantidad,
            diferencia_porcentual_maxima: configuration.tolerancia_cantidad_porcentaje,
            dias_duplicado: days
          });
        }
      }
    }
  }
  return matches;
}

async function getMaterialHistory(id_material, { transaction } = {}) {
  validateId(id_material, 'id_material');
  if (!await Material.findByPk(id_material, { attributes: ['id_material'], transaction, logging: false })) {
    throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
  }
  return MovimientoInventario.findAll({
    where: { id_material },
    include: [{
      model: DetalleRecepcionCompra,
      as: 'detalleRecepcionCompra',
      required: false,
      include: [
        { model: RecepcionCompra, as: 'recepcionCompra', required: false },
        {
          model: DetalleVersionOrdenCompra,
          as: 'detalleVersionOrdenCompra',
          required: false,
          include: [{
            model: VersionOrdenCompra,
            as: 'versionOrdenCompra',
            required: false,
            include: [
              { model: OrdenCompra, as: 'ordenCompra', required: false },
              {
                model: Cotizacion,
                as: 'cotizacionElegida',
                required: false,
                include: [{ model: Proveedor, as: 'proveedor', required: false }]
              }
            ]
          }]
        }
      ]
    }],
    order: [['fecha_movimiento', 'ASC'], ['id_movimiento', 'ASC']],
    transaction,
    logging: false
  });
}

module.exports = {
  listMovimientos,
  getMovimiento,
  getExistencia,
  createApertura,
  createOrdenCompra,
  createCotizacion,
  selectCotizacion,
  createDecisionAprobacionCompra,
  createValeSalida,
  createValeEntrega,
  createTraslado,
  createDespachoTraslado,
  createRecepcionTraslado,
  createRecepcionCompra,
  createSolicitudAjuste,
  createDecisionAjuste,
  listReorderAlerts,
  findPurchaseDuplicates,
  getMaterialHistory,
  upsertInventoryParameters,
  savePurchaseControl
};
