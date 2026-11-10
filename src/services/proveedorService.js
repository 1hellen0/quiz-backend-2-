'use strict';

const { Proveedor } = require('../../models');
const HttpError = require('../utils/HttpError');

async function createProveedor(attributes) {
  return Proveedor.create(attributes);
}

async function listProveedores() {
  return Proveedor.findAll({
    order: [['id_proveedor', 'ASC']]
  });
}

async function getProveedor(id) {
  const proveedor = await Proveedor.findByPk(id);
  if (!proveedor) {
    throw new HttpError(404, 'PROVEEDOR_NOT_FOUND', 'Proveedor not found.');
  }
  return proveedor;
}

async function updateProveedor(id, attributes) {
  const proveedor = await getProveedor(id);
  await proveedor.update(attributes);
  return proveedor;
}

async function deleteProveedor(id) {
  const proveedor = await getProveedor(id);
  await proveedor.destroy();
}

module.exports = {
  createProveedor,
  listProveedores,
  getProveedor,
  updateProveedor,
  deleteProveedor
};
