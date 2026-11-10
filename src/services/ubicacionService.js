'use strict';

const { Ubicacion } = require('../../models');
const HttpError = require('../utils/HttpError');

async function listUbicaciones() {
  return Ubicacion.findAll({
    order: [['id_ubicacion', 'ASC']]
  });
}

async function getUbicacion(id) {
  const ubicacion = await Ubicacion.findByPk(id);
  if (!ubicacion) {
    throw new HttpError(404, 'UBICACION_NOT_FOUND', 'Ubicacion not found.');
  }
  return ubicacion;
}

module.exports = {
  listUbicaciones,
  getUbicacion
};
