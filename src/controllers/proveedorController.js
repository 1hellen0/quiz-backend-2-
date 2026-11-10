'use strict';

const HttpError = require('../utils/HttpError');
const proveedorService = require('../services/proveedorService');

const fieldRules = {
  nombre: { type: 'string', required: true, maxLength: 150 },
  identificacion: { type: 'string', required: true, maxLength: 40 },
  correo: { type: 'string', nullable: true, maxLength: 150 },
  telefono: { type: 'string', nullable: true, maxLength: 30 },
  activo: { type: 'boolean' }
};

function validateId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'INVALID_ID', 'The proveedor ID must be a positive integer.');
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_ID', 'The proveedor ID must be a positive integer.');
  }
  return id;
}

function validatePayload(payload, { create }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }

  for (const field of Object.keys(payload)) {
    if (field === 'id_proveedor') {
      throw new HttpError(400, 'PROTECTED_FIELD', 'id_proveedor cannot be supplied or modified.');
    }
    if (!Object.hasOwn(fieldRules, field)) {
      throw new HttpError(400, 'UNKNOWN_FIELD', `Unknown proveedor field: ${field}.`);
    }
  }

  if (create) {
    for (const [field, rule] of Object.entries(fieldRules)) {
      if (rule.required && !Object.hasOwn(payload, field)) {
        throw new HttpError(400, 'REQUIRED_FIELD', `${field} is required.`);
      }
    }
  }

  for (const [field, value] of Object.entries(payload)) {
    const rule = fieldRules[field];
    if (value === null && rule.nullable) {
      continue;
    }
    if (typeof value !== rule.type) {
      throw new HttpError(400, 'INVALID_FIELD_TYPE', `${field} has an invalid type.`);
    }
    if (rule.maxLength && Array.from(value).length > rule.maxLength) {
      throw new HttpError(400, 'FIELD_TOO_LONG', `${field} exceeds ${rule.maxLength} characters.`);
    }
  }

  return payload;
}

async function create(req, res) {
  const proveedor = await proveedorService.createProveedor(
    validatePayload(req.body, { create: true })
  );
  res.status(201).json(proveedor);
}

async function list(req, res) {
  const proveedores = await proveedorService.listProveedores();
  res.status(200).json(proveedores);
}

async function get(req, res) {
  const proveedor = await proveedorService.getProveedor(validateId(req.params.id));
  res.status(200).json(proveedor);
}

async function update(req, res) {
  const proveedor = await proveedorService.updateProveedor(
    validateId(req.params.id),
    validatePayload(req.body, { create: false })
  );
  res.status(200).json(proveedor);
}

async function remove(req, res) {
  await proveedorService.deleteProveedor(validateId(req.params.id));
  res.status(204).end();
}

module.exports = {
  create,
  list,
  get,
  update,
  remove
};
