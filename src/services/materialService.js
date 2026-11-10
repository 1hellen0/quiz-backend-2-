'use strict';

const { Material } = require('../../models');
const HttpError = require('../utils/HttpError');

async function createMaterial(attributes) {
  return Material.create(attributes);
}

async function listMaterials() {
  return Material.findAll({
    order: [['id_material', 'ASC']]
  });
}

async function getMaterial(id) {
  const material = await Material.findByPk(id);
  if (!material) {
    throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Material not found.');
  }
  return material;
}

async function updateMaterial(id, attributes) {
  const material = await getMaterial(id);
  await material.update(attributes);
  return material;
}

async function deleteMaterial(id) {
  const material = await getMaterial(id);
  await material.destroy();
}

module.exports = {
  createMaterial,
  listMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial
};
