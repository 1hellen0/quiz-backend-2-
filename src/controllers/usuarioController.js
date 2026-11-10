'use strict';

const HttpError = require('../utils/HttpError');
const usuarioService = require('../services/usuarioService');

const fieldRules = {
  nombre: { type: 'string', required: true, maxLength: 120 },
  correo: { type: 'string', required: true, maxLength: 150 },
  cargo: { type: 'string', nullable: true, maxLength: 100 },
  activo: { type: 'boolean' },
  fecha_registro: { type: 'date', required: true }
};

function validateId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'INVALID_ID', 'The usuario ID must be a positive integer.');
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_ID', 'The usuario ID must be a positive integer.');
  }
  return id;
}

function validatePayload(payload, { create }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }

  for (const field of Object.keys(payload)) {
    if (field === 'id_usuario') {
      throw new HttpError(400, 'PROTECTED_FIELD', 'id_usuario cannot be supplied or modified.');
    }
    if (!Object.hasOwn(fieldRules, field)) {
      throw new HttpError(400, 'UNKNOWN_FIELD', `Unknown usuario field: ${field}.`);
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

    if (rule.type === 'date') {
      if (typeof value !== 'string' || !isValidDate(value)) {
        throw new HttpError(400, 'INVALID_FIELD_TYPE', `${field} must be a valid ISO date or datetime string.`);
      }
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

function isValidDate(value) {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  const match = isoDate.exec(value);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, timezone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = hourText === undefined ? 0 : Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  const second = secondText === undefined ? 0 : Number(secondText);
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0;

  if (
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    Number.isNaN(Date.parse(value))
  ) {
    return false;
  }

  if (timezone && timezone !== 'Z') {
    const [offsetHours, offsetMinutes] = timezone.slice(1).split(':').map(Number);
    if (offsetHours > 23 || offsetMinutes > 59) {
      return false;
    }
  }

  return true;
}

async function create(req, res) {
  const usuario = await usuarioService.createUsuario(
    validatePayload(req.body, { create: true })
  );
  res.status(201).json(usuario);
}

async function list(req, res) {
  const usuarios = await usuarioService.listUsuarios();
  res.status(200).json(usuarios);
}

async function get(req, res) {
  const usuario = await usuarioService.getUsuario(validateId(req.params.id));
  res.status(200).json(usuario);
}

async function update(req, res) {
  const usuario = await usuarioService.updateUsuario(
    validateId(req.params.id),
    validatePayload(req.body, { create: false })
  );
  res.status(200).json(usuario);
}

async function remove(req, res) {
  await usuarioService.deleteUsuario(validateId(req.params.id));
  res.status(204).end();
}

module.exports = {
  create,
  list,
  get,
  update,
  remove
};
