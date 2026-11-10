'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DespachoTraslado', {
      id_despacho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Traslado',
          key: 'id_traslado'
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
      fecha_despacho: {
        type: Sequelize.DATE,
        allowNull: false
      },
      observacion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DespachoTraslado');
  }
};
