'use strict';

const HttpError = require('../utils/HttpError');
const inventarioService = require('../services/inventarioService');

const allowedQueryParameters = new Set([
  'id_material',
  'id_ubicacion',
  'fecha_desde',
  'fecha_hasta'
]);

function getSingleQueryValue(query, name) {
  const value = query[name];
  if (Array.isArray(value) || typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'INVALID_QUERY_PARAMETER', `${name} must be supplied once as a non-empty value.`);
  }
  return value;
}

function parseId(value, name, { code = 'INVALID_QUERY_PARAMETER', label = name } = {}) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, code, `${label} must be a positive integer.`);
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2147483647) {
    throw new HttpError(400, code, `${label} must be a valid integer ID.`);
  }
  return id;
}

function validCalendarDate(year, month, day) {
  if (year < 1000 || year > 9999) {
    return false;
  }
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function parseDate(value, name) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    if (!validCalendarDate(Number(year), Number(month), Number(day))) {
      throw new HttpError(400, 'INVALID_DATE', `${name} must be a valid calendar date or ISO timestamp.`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (name === 'fecha_hasta') {
      date.setUTCDate(date.getUTCDate() + 1);
      return {
        value: date,
        exclusive: true
      };
    }
    return date;
  }

  const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/;
  const timestampMatch = timestampPattern.exec(value);
  if (
    !timestampMatch ||
    !validCalendarDate(Number(timestampMatch[1]), Number(timestampMatch[2]), Number(timestampMatch[3])) ||
    Number(timestampMatch[4]) > 23 ||
    Number(timestampMatch[5]) > 59 ||
    Number(timestampMatch[6]) > 59 ||
    Number(timestampMatch[7] || 0) > 23 ||
    Number(timestampMatch[8] || 0) > 59 ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new HttpError(400, 'INVALID_DATE', `${name} must be a valid calendar date or ISO timestamp.`);
  }
  return name === 'fecha_hasta'
    ? { value: new Date(value), exclusive: false }
    : new Date(value);
}

function validateFilters(query) {
  for (const name of Object.keys(query)) {
    if (!allowedQueryParameters.has(name)) {
      throw new HttpError(400, 'UNKNOWN_QUERY_PARAMETER', `Unknown query parameter: ${name}.`);
    }
  }

  const filters = {};
  for (const name of ['id_material', 'id_ubicacion']) {
    if (Object.hasOwn(query, name)) {
      filters[name] = parseId(getSingleQueryValue(query, name), name);
    }
  }

  for (const name of ['fecha_desde', 'fecha_hasta']) {
    if (Object.hasOwn(query, name)) {
      filters[name] = parseDate(getSingleQueryValue(query, name), name);
    }
  }

  if (filters.fecha_desde && filters.fecha_hasta) {
    const from = filters.fecha_desde.getTime();
    const until = filters.fecha_hasta.value.getTime();
    if (filters.fecha_hasta.exclusive ? from >= until : from > until) {
      throw new HttpError(400, 'INVALID_DATE_RANGE', 'fecha_desde must not be later than fecha_hasta.');
    }
  }

  return filters;
}

async function listMovimientos(req, res) {
  const movimientos = await inventarioService.listMovimientos(validateFilters(req.query));
  res.status(200).json(movimientos);
}

async function getMovimiento(req, res) {
  const id = parseId(req.params.id, 'id', {
    code: 'INVALID_ID',
    label: 'Movement ID'
  });
  const movimiento = await inventarioService.getMovimiento(id);
  res.status(200).json(movimiento);
}

async function getExistencia(req, res) {
  const allowedParameters = new Set(['id_material', 'id_ubicacion']);
  for (const name of Object.keys(req.query)) {
    if (!allowedParameters.has(name)) {
      throw new HttpError(400, 'UNKNOWN_QUERY_PARAMETER', `Unknown query parameter: ${name}.`);
    }
  }

  if (!Object.hasOwn(req.query, 'id_material') || !Object.hasOwn(req.query, 'id_ubicacion')) {
    throw new HttpError(
      400,
      'REQUIRED_QUERY_PARAMETER',
      'id_material and id_ubicacion are required to query inventory balance.'
    );
  }

  const id_material = parseId(getSingleQueryValue(req.query, 'id_material'), 'id_material');
  const id_ubicacion = parseId(getSingleQueryValue(req.query, 'id_ubicacion'), 'id_ubicacion');
  const existencia = await inventarioService.getExistencia({ id_material, id_ubicacion });
  res.status(200).json(existencia);
}

function validateAperturaBody(body) {
  const allowedFields = new Set([
    'id_material',
    'id_ubicacion_destino',
    'id_usuario',
    'cantidad',
    'fecha_movimiento',
    'documento_apertura'
  ]);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }

  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new HttpError(400, 'UNKNOWN_FIELD', `Unknown or unsupported opening field: ${field}.`);
    }
  }
  for (const field of allowedFields) {
    if (!Object.hasOwn(body, field)) {
      throw new HttpError(400, 'REQUIRED_FIELD', `${field} is required.`);
    }
  }

  const attributes = {
    id_material: parseId(body.id_material, 'id_material'),
    id_ubicacion_destino: parseId(body.id_ubicacion_destino, 'id_ubicacion_destino'),
    id_usuario: parseId(body.id_usuario, 'id_usuario')
  };

  if (
    (typeof body.cantidad !== 'string' && typeof body.cantidad !== 'number') ||
    (typeof body.cantidad === 'number' && !Number.isFinite(body.cantidad))
  ) {
    throw new HttpError(400, 'INVALID_QUANTITY', 'cantidad must be a positive decimal with at most three decimal places.');
  }
  attributes.cantidad = body.cantidad;

  if (typeof body.documento_apertura !== 'string') {
    throw new HttpError(400, 'INVALID_OPENING_DOCUMENT', 'documento_apertura must be a string.');
  }
  attributes.documento_apertura = body.documento_apertura.trim();
  if (
    attributes.documento_apertura.length === 0 ||
    Array.from(attributes.documento_apertura).length > 80
  ) {
    throw new HttpError(400, 'INVALID_OPENING_DOCUMENT', 'documento_apertura is required and must not exceed 80 characters.');
  }

  if (typeof body.fecha_movimiento !== 'string') {
    throw new HttpError(400, 'INVALID_DATE', 'fecha_movimiento must be a valid ISO date or timestamp.');
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(body.fecha_movimiento);
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(body.fecha_movimiento);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    if (!validCalendarDate(Number(year), Number(month), Number(day))) {
      throw new HttpError(400, 'INVALID_DATE', 'fecha_movimiento must be a valid ISO date or timestamp.');
    }
    attributes.fecha_movimiento = new Date(`${body.fecha_movimiento}T00:00:00.000Z`);
  } else if (
    timestamp &&
    validCalendarDate(Number(timestamp[1]), Number(timestamp[2]), Number(timestamp[3])) &&
    Number(timestamp[4]) <= 23 &&
    Number(timestamp[5]) <= 59 &&
    Number(timestamp[6]) <= 59 &&
    Number(timestamp[7] || 0) <= 23 &&
    Number(timestamp[8] || 0) <= 59 &&
    !Number.isNaN(Date.parse(body.fecha_movimiento))
  ) {
    attributes.fecha_movimiento = new Date(body.fecha_movimiento);
  } else {
    throw new HttpError(400, 'INVALID_DATE', 'fecha_movimiento must be a valid ISO date or timestamp.');
  }

  return attributes;
}

async function createApertura(req, res) {
  const result = await inventarioService.createApertura(validateAperturaBody(req.body));
  res.status(201).json({
    movimiento: result.movimiento,
    existencia: result.existencia
  });
}

function validateBodyObject(body, allowedFields, requiredFields = allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }
  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      throw new HttpError(400, 'UNKNOWN_FIELD', `Unknown or unsupported field: ${field}.`);
    }
  }
  for (const field of requiredFields) {
    if (!Object.hasOwn(body, field)) {
      throw new HttpError(400, 'REQUIRED_FIELD', `${field} is required.`);
    }
  }
}

function parseBodyId(value, field) {
  return parseId(String(value), field, { code: 'INVALID_ID' });
}

function parseQuantityInput(value, field) {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'number' && !Number.isFinite(value))) {
    throw new HttpError(400, 'INVALID_QUANTITY', `${field} must be a positive decimal with at most three decimal places.`);
  }
  return value;
}

function parseBodyDate(value, field) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_DATE', `${field} must be a valid ISO date or timestamp.`);
  }
  return parseDate(value, field);
}

function parseLines(body, idField, quantityField) {
  if (!Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_DETAILS', 'detalles must be a non-empty array.');
  }
  return body.map((line, index) => {
    validateBodyObject(line, [idField, quantityField]);
    return {
      [idField]: parseBodyId(line[idField], `${idField}[${index}]`),
      [quantityField]: parseQuantityInput(line[quantityField], `${quantityField}[${index}]`)
    };
  });
}

function parsePurchaseLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new HttpError(400, 'INVALID_DETAILS', 'detalles must be a non-empty array.');
  }
  return lines.map((line, index) => {
    validateBodyObject(line, ['id_material', 'cantidad', 'precio_unitario']);
    if (typeof line.cantidad !== 'string' || typeof line.precio_unitario !== 'string') {
      throw new HttpError(400, 'INVALID_PURCHASE_DECIMAL', 'Purchase quantities and prices must be decimal strings.');
    }
    return {
      id_material: parseBodyId(line.id_material, `id_material[${index}]`),
      cantidad: line.cantidad,
      precio_unitario: line.precio_unitario
    };
  });
}

async function createOrdenCompra(req, res) {
  const allowedFields = [
    'codigo', 'id_solicitante', 'id_ubicacion_destino', 'fecha_creacion', 'motivo_version', 'detalles'
  ];
  validateBodyObject(req.body, allowedFields, [
    'codigo', 'id_solicitante', 'id_ubicacion_destino', 'fecha_creacion', 'detalles'
  ]);
  const result = await inventarioService.createOrdenCompra({
    codigo: req.body.codigo,
    id_solicitante: parseBodyId(req.body.id_solicitante, 'id_solicitante'),
    id_ubicacion_destino: parseBodyId(req.body.id_ubicacion_destino, 'id_ubicacion_destino'),
    fecha_creacion: parseBodyDate(req.body.fecha_creacion, 'fecha_creacion'),
    motivo_version: req.body.motivo_version,
    detalles: parsePurchaseLines(req.body.detalles)
  });
  res.status(201).json(result);
}

async function createCotizacion(req, res) {
  const allowedFields = ['id_proveedor', 'codigo', 'fecha_cotizacion', 'vigencia_hasta', 'detalles'];
  validateBodyObject(req.body, allowedFields, ['id_proveedor', 'fecha_cotizacion', 'detalles']);
  if (
    req.body.vigencia_hasta !== undefined &&
    req.body.vigencia_hasta !== null &&
    typeof req.body.vigencia_hasta !== 'string'
  ) {
    throw new HttpError(400, 'INVALID_DATE', 'vigencia_hasta must be a YYYY-MM-DD date.');
  }
  const result = await inventarioService.createCotizacion(
    parseBodyId(req.params.id, 'id_version'),
    {
      id_proveedor: parseBodyId(req.body.id_proveedor, 'id_proveedor'),
      codigo: req.body.codigo,
      fecha_cotizacion: parseBodyDate(req.body.fecha_cotizacion, 'fecha_cotizacion'),
      vigencia_hasta: req.body.vigencia_hasta,
      detalles: parsePurchaseLines(req.body.detalles)
    }
  );
  res.status(201).json(result);
}

async function selectCotizacion(req, res) {
  validateBodyObject(req.body, ['id_cotizacion']);
  const result = await inventarioService.selectCotizacion(
    parseBodyId(req.params.id, 'id_version'),
    parseBodyId(req.body.id_cotizacion, 'id_cotizacion')
  );
  res.status(200).json(result);
}

async function createDecisionAprobacionCompra(req, res) {
  const allowedFields = ['id_usuario', 'decision', 'motivo'];
  validateBodyObject(req.body, allowedFields, ['id_usuario', 'decision']);
  const result = await inventarioService.createDecisionAprobacionCompra(
    parseBodyId(req.params.id, 'id_version'),
    {
      id_usuario: parseBodyId(req.body.id_usuario, 'id_usuario'),
      decision: req.body.decision,
      motivo: req.body.motivo
    }
  );
  res.status(201).json(result);
}

async function createValeSalida(req, res) {
  const allowedFields = [
    'codigo', 'id_ubicacion', 'id_solicitante', 'fecha_solicitud', 'motivo', 'estado', 'detalles'
  ];
  validateBodyObject(req.body, allowedFields);
  const result = await inventarioService.createValeSalida({
    codigo: req.body.codigo,
    id_ubicacion: parseBodyId(req.body.id_ubicacion, 'id_ubicacion'),
    id_solicitante: parseBodyId(req.body.id_solicitante, 'id_solicitante'),
    fecha_solicitud: parseBodyDate(req.body.fecha_solicitud, 'fecha_solicitud'),
    motivo: req.body.motivo,
    estado: req.body.estado,
    detalles: parseLines(req.body.detalles, 'id_material', 'cantidad_solicitada')
  });
  res.status(201).json(result);
}

async function createValeEntrega(req, res) {
  const allowedFields = ['id_usuario_entrega', 'fecha_entrega', 'observacion', 'detalles'];
  validateBodyObject(req.body, allowedFields, ['id_usuario_entrega', 'fecha_entrega', 'detalles']);
  const result = await inventarioService.createValeEntrega(
    parseBodyId(req.params.id, 'id_vale'),
    {
      id_usuario_entrega: parseBodyId(req.body.id_usuario_entrega, 'id_usuario_entrega'),
      fecha_entrega: parseBodyDate(req.body.fecha_entrega, 'fecha_entrega'),
      observacion: req.body.observacion,
      detalles: parseLines(req.body.detalles, 'id_detalle_vale', 'cantidad_entregada')
    }
  );
  res.status(201).json(result);
}

async function createTraslado(req, res) {
  const allowedFields = [
    'codigo',
    'id_origen',
    'id_destino',
    'id_solicitante',
    'fecha_solicitud',
    'estado',
    'motivo',
    'detalles'
  ];
  validateBodyObject(req.body, allowedFields, [
    'codigo', 'id_origen', 'id_destino', 'id_solicitante', 'fecha_solicitud', 'estado', 'detalles'
  ]);
  const result = await inventarioService.createTraslado({
    codigo: req.body.codigo,
    id_origen: parseBodyId(req.body.id_origen, 'id_origen'),
    id_destino: parseBodyId(req.body.id_destino, 'id_destino'),
    id_solicitante: parseBodyId(req.body.id_solicitante, 'id_solicitante'),
    fecha_solicitud: parseBodyDate(req.body.fecha_solicitud, 'fecha_solicitud'),
    estado: req.body.estado,
    motivo: req.body.motivo,
    detalles: parseLines(req.body.detalles, 'id_material', 'cantidad_solicitada')
  });
  res.status(201).json(result);
}

async function createDespachoTraslado(req, res) {
  const allowedFields = ['id_usuario', 'fecha_despacho', 'observacion', 'detalles'];
  validateBodyObject(req.body, allowedFields, ['id_usuario', 'fecha_despacho', 'detalles']);
  const result = await inventarioService.createDespachoTraslado(
    parseBodyId(req.params.id, 'id_traslado'),
    {
      id_usuario: parseBodyId(req.body.id_usuario, 'id_usuario'),
      fecha_despacho: parseBodyDate(req.body.fecha_despacho, 'fecha_despacho'),
      observacion: req.body.observacion,
      detalles: parseLines(req.body.detalles, 'id_detalle_traslado', 'cantidad')
    }
  );
  res.status(201).json(result);
}

async function createRecepcionTraslado(req, res) {
  const allowedFields = ['id_usuario', 'fecha_recepcion', 'observacion', 'detalles'];
  validateBodyObject(req.body, allowedFields, ['id_usuario', 'fecha_recepcion', 'detalles']);
  const result = await inventarioService.createRecepcionTraslado(
    parseBodyId(req.params.id, 'id_despacho'),
    {
      id_usuario: parseBodyId(req.body.id_usuario, 'id_usuario'),
      fecha_recepcion: parseBodyDate(req.body.fecha_recepcion, 'fecha_recepcion'),
      observacion: req.body.observacion,
      detalles: parseLines(req.body.detalles, 'id_detalle_despacho', 'cantidad')
    }
  );
  res.status(201).json(result);
}

function parsePurchaseReceiptLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new HttpError(400, 'INVALID_DETAILS', 'detalles must be a non-empty array.');
  }
  return lines.map((line, index) => {
    validateBodyObject(line, [
      'id_detalle_version',
      'cantidad_entregada',
      'cantidad_aceptada',
      'cantidad_rechazada'
    ]);
    return {
      id_detalle_version: parseBodyId(line.id_detalle_version, `id_detalle_version[${index}]`),
      cantidad_entregada: parseQuantityInput(line.cantidad_entregada, `cantidad_entregada[${index}]`),
      cantidad_aceptada: parseQuantityInput(line.cantidad_aceptada, `cantidad_aceptada[${index}]`),
      cantidad_rechazada: parseQuantityInput(line.cantidad_rechazada, `cantidad_rechazada[${index}]`)
    };
  });
}

async function createRecepcionCompra(req, res) {
  const allowedFields = ['id_version', 'id_usuario', 'fecha_recepcion', 'estado', 'observacion', 'detalles'];
  validateBodyObject(req.body, allowedFields, ['id_version', 'id_usuario', 'fecha_recepcion', 'estado', 'detalles']);
  const result = await inventarioService.createRecepcionCompra(
    parseBodyId(req.params.id, 'id_orden'),
    {
      id_version: parseBodyId(req.body.id_version, 'id_version'),
      id_usuario: parseBodyId(req.body.id_usuario, 'id_usuario'),
      fecha_recepcion: parseBodyDate(req.body.fecha_recepcion, 'fecha_recepcion'),
      estado: req.body.estado,
      observacion: req.body.observacion,
      detalles: parsePurchaseReceiptLines(req.body.detalles)
    }
  );
  res.status(201).json(result);
}

async function createSolicitudAjuste(req, res) {
  const fields = [
    'id_material', 'id_ubicacion', 'id_solicitante', 'cantidad_variacion',
    'motivo', 'estado', 'fecha_solicitud'
  ];
  validateBodyObject(req.body, fields);
  const solicitud = await inventarioService.createSolicitudAjuste({
    id_material: parseBodyId(req.body.id_material, 'id_material'),
    id_ubicacion: parseBodyId(req.body.id_ubicacion, 'id_ubicacion'),
    id_solicitante: parseBodyId(req.body.id_solicitante, 'id_solicitante'),
    cantidad_variacion: parseQuantityInput(req.body.cantidad_variacion, 'cantidad_variacion'),
    motivo: req.body.motivo,
    estado: req.body.estado,
    fecha_solicitud: parseBodyDate(req.body.fecha_solicitud, 'fecha_solicitud')
  });
  res.status(201).json(solicitud);
}

async function createDecisionAjuste(req, res) {
  const fields = ['id_administrador', 'decision', 'motivo', 'fecha_decision'];
  validateBodyObject(req.body, fields, ['id_administrador', 'decision', 'fecha_decision']);
  const decision = await inventarioService.createDecisionAjuste(
    parseBodyId(req.params.id, 'id_solicitud_ajuste'),
    {
      id_administrador: parseBodyId(req.body.id_administrador, 'id_administrador'),
      decision: req.body.decision,
      motivo: req.body.motivo,
      fecha_decision: parseBodyDate(req.body.fecha_decision, 'fecha_decision')
    }
  );
  res.status(201).json(decision);
}

async function listReorderAlerts(req, res) {
  if (Object.keys(req.query).length) {
    throw new HttpError(400, 'UNKNOWN_QUERY_PARAMETER', 'The reorder alert query does not accept parameters.');
  }
  res.status(200).json(await inventarioService.listReorderAlerts());
}

async function findPurchaseDuplicates(req, res) {
  const allowed = new Set(['id_proveedor', 'id_material', 'cantidad', 'fecha']);
  for (const field of Object.keys(req.query)) {
    if (!allowed.has(field)) {
      throw new HttpError(400, 'UNKNOWN_QUERY_PARAMETER', `Unknown query parameter: ${field}.`);
    }
  }
  for (const field of allowed) {
    if (!Object.hasOwn(req.query, field)) {
      throw new HttpError(400, 'REQUIRED_QUERY_PARAMETER', `${field} is required.`);
    }
  }
  const cantidad = getSingleQueryValue(req.query, 'cantidad');
  const result = await inventarioService.findPurchaseDuplicates({
    id_proveedor: parseId(getSingleQueryValue(req.query, 'id_proveedor'), 'id_proveedor'),
    id_material: parseId(getSingleQueryValue(req.query, 'id_material'), 'id_material'),
    cantidad: parseQuantityInput(cantidad, 'cantidad'),
    fecha: parseBodyDate(getSingleQueryValue(req.query, 'fecha'), 'fecha')
  });
  res.status(200).json({ posibles_duplicados: result });
}

async function getMaterialHistory(req, res) {
  const id_material = parseId(req.params.id, 'id_material', {
    code: 'INVALID_ID',
    label: 'Material ID'
  });
  res.status(200).json(await inventarioService.getMaterialHistory(id_material));
}

function validateParameterConfigurationBody(body) {
  const fields = [
    'id_material',
    'id_ubicacion',
    'stock_minimo',
    'stock_maximo',
    'demanda_diaria_promedio',
    'demanda_diaria_maxima',
    'tiempo_reposicion_dias',
    'activo',
    'id_usuario',
    'motivo'
  ];
  validateBodyObject(body, fields);
  const attributes = {
    id_material: parseBodyId(body.id_material, 'id_material'),
    id_ubicacion: parseBodyId(body.id_ubicacion, 'id_ubicacion'),
    id_usuario: parseBodyId(body.id_usuario, 'id_usuario'),
    stock_minimo: body.stock_minimo,
    stock_maximo: body.stock_maximo,
    demanda_diaria_promedio: body.demanda_diaria_promedio,
    demanda_diaria_maxima: body.demanda_diaria_maxima,
    tiempo_reposicion_dias: body.tiempo_reposicion_dias,
    activo: body.activo,
    motivo: body.motivo
  };
  for (const field of ['stock_minimo', 'stock_maximo', 'demanda_diaria_promedio', 'demanda_diaria_maxima']) {
    if (typeof attributes[field] !== 'string') {
      throw new HttpError(400, 'INVALID_CONFIGURATION_VALUE', `${field} must be supplied as a decimal string.`);
    }
  }
  return attributes;
}

async function saveInventoryParameters(req, res) {
  const attributes = validateParameterConfigurationBody(req.body);
  const id = req.params.id === undefined ? undefined : parseId(req.params.id, 'id', {
    code: 'INVALID_ID',
    label: 'Inventory parameters ID'
  });
  const result = await inventarioService.upsertInventoryParameters(attributes, id);
  res.status(result.creado ? 201 : 200).json(result.parametros);
}

function validatePurchaseControlBody(body) {
  const fields = [
    'dias_duplicado',
    'tolerancia_cantidad_porcentaje',
    'dias_fraccionamiento',
    'activo',
    'id_usuario_actualiza'
  ];
  validateBodyObject(body, fields);
  if (typeof body.tolerancia_cantidad_porcentaje !== 'string') {
    throw new HttpError(400, 'INVALID_CONFIGURATION_VALUE', 'tolerancia_cantidad_porcentaje must be supplied as a decimal string.');
  }
  return {
    dias_duplicado: body.dias_duplicado,
    tolerancia_cantidad_porcentaje: body.tolerancia_cantidad_porcentaje,
    dias_fraccionamiento: body.dias_fraccionamiento,
    activo: body.activo,
    id_usuario_actualiza: parseBodyId(body.id_usuario_actualiza, 'id_usuario_actualiza')
  };
}

async function savePurchaseControl(req, res) {
  const attributes = validatePurchaseControlBody(req.body);
  const id = req.params.id === undefined ? undefined : parseId(req.params.id, 'id', {
    code: 'INVALID_ID',
    label: 'Purchase-control configuration ID'
  });
  const result = await inventarioService.savePurchaseControl(attributes, id);
  res.status(result.creado ? 201 : 200).json(result.configuracion);
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
  saveInventoryParameters,
  savePurchaseControl
};
