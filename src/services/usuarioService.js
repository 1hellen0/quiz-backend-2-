'use strict';

const { Usuario } = require('../../models');
const HttpError = require('../utils/HttpError');

async function createUsuario(attributes) {
  return Usuario.create(attributes);
}

async function listUsuarios() {
  return Usuario.findAll({
    order: [['id_usuario', 'ASC']]
  });
}

async function getUsuario(id) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) {
    throw new HttpError(404, 'USUARIO_NOT_FOUND', 'Usuario not found.');
  }
  return usuario;
}

async function updateUsuario(id, attributes) {
  const usuario = await getUsuario(id);
  await usuario.update(attributes);
  return usuario;
}

async function deleteUsuario(id) {
  const usuario = await getUsuario(id);
  await usuario.destroy();
}

module.exports = {
  createUsuario,
  listUsuarios,
  getUsuario,
  updateUsuario,
  deleteUsuario
};
