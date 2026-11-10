'use strict';

const HttpError = require('../utils/HttpError');
const ubicacionService = require('../services/ubicacionService');

function validateId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'INVALID_ID', 'The ubicacion ID must be a positive integer.');
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_ID', 'The ubicacion ID must be a positive integer.');
  }
  return id;
}

async function list(req, res) {
  const ubicaciones = await ubicacionService.listUbicaciones();
  res.status(200).json(ubicaciones);
}

async function get(req, res) {
  const ubicacion = await ubicacionService.getUbicacion(validateId(req.params.id));
  res.status(200).json(ubicacion);
}

module.exports = {
  list,
  get
};
