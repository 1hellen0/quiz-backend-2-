'use strict';

const { Rol } = require('../../models');
const HttpError = require('../utils/HttpError');

async function listRoles() {
  return Rol.findAll({
    order: [['id_rol', 'ASC']]
  });
}

async function getRol(id) {
  const rol = await Rol.findByPk(id);
  if (!rol) {
    throw new HttpError(404, 'ROL_NOT_FOUND', 'Rol not found.');
  }
  return rol;
}

module.exports = {
  listRoles,
  getRol
};
