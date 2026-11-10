'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RevisionCompra', {
      id_revision: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_version_evaluada: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VersionOrdenCompra',
          key: 'id_version'
        }
      },
      id_revisor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      tipo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(25),
        allowNull: false
      },
      monto_acumulado: {
        type: Sequelize.DECIMAL(16, 2)
      },
      nivel_requerido: {
        type: Sequelize.STRING(35)
      },
      fecha_deteccion: {
        type: Sequelize.DATE,
        allowNull: false
      },
      fecha_resolucion: {
        type: Sequelize.DATE
      },
      resolucion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RevisionCompra');
  }
};
