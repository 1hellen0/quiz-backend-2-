'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RecepcionTraslado', {
      id_recepcion_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_despacho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DespachoTraslado',
          key: 'id_despacho'
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
      observacion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RecepcionTraslado');
  }
};
