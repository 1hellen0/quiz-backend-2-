'use strict';

const HttpError = require('../utils/HttpError');
const materialService = require('../services/materialService');

const fieldRules = {
  codigo: { type: 'string', required: true, maxLength: 30 },
  nombre: { type: 'string', required: true, maxLength: 150 },
  descripcion: { type: 'string', nullable: true },
  unidad_medida: { type: 'string', required: true, maxLength: 30 },
  activo: { type: 'boolean' }
};

function validateId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'INVALID_ID', 'The material ID must be a positive integer.');
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_ID', 'The material ID must be a positive integer.');
  }
  return id;
}

function validatePayload(payload, { create }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }

  for (const field of Object.keys(payload)) {
    if (field === 'id_material') {
      throw new HttpError(400, 'PROTECTED_FIELD', 'id_material cannot be supplied or modified.');
    }
    if (!Object.hasOwn(fieldRules, field)) {
      throw new HttpError(400, 'UNKNOWN_FIELD', `Unknown material field: ${field}.`);
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
  const attributes = validatePayload(req.body, { create: true });
  const material = await materialService.createMaterial(attributes);
  res.status(201).json(material);
}

async function list(req, res) {
  const materials = await materialService.listMaterials();
  res.status(200).json(materials);
}

async function get(req, res) {
  const material = await materialService.getMaterial(validateId(req.params.id));
  res.status(200).json(material);
}

async function update(req, res) {
  const attributes = validatePayload(req.body, { create: false });
  const material = await materialService.updateMaterial(
    validateId(req.params.id),
    attributes
  );
  res.status(200).json(material);
}

async function remove(req, res) {
  await materialService.deleteMaterial(validateId(req.params.id));
  res.status(204).end();
}

module.exports = {
  create,
  list,
  get,
  update,
  remove
};
