'use strict';

const HttpError = require('../utils/HttpError');
const rolService = require('../services/rolService');

function validateId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'INVALID_ID', 'The rol ID must be a positive integer.');
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_ID', 'The rol ID must be a positive integer.');
  }
  return id;
}

async function list(req, res) {
  const roles = await rolService.listRoles();
  res.status(200).json(roles);
}

async function get(req, res) {
  const rol = await rolService.getRol(validateId(req.params.id));
  res.status(200).json(rol);
}

module.exports = {
  list,
  get
};
