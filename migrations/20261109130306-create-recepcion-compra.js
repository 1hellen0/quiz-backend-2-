'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RecepcionCompra', {
      id_recepcion_compra: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VersionOrdenCompra',
          key: 'id_version'
        }
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      fecha_recepcion: {
        type: Sequelize.DATE,
        allowNull: false
      },
      fecha_confirmacion: {
        type: Sequelize.DATE
      },
      estado: {
        type: Sequelize.STRING(25),
        allowNull: false
      },
      observacion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RecepcionCompra');
  }
};
