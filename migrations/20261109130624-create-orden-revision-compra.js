'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OrdenRevisionCompra', {
      id_orden_revision: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_revision: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'RevisionCompra',
          key: 'id_revision'
        }
      },
      id_version_relacionada: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VersionOrdenCompra',
          key: 'id_version'
        }
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('OrdenRevisionCompra', {
      fields: ['id_revision', 'id_version_relacionada'],
      type: 'unique',
      name: 'OrdenRevisionCompra_id_revision_id_version_relacionada_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('OrdenRevisionCompra');
  }
};
