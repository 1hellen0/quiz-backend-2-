'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('VersionOrdenCompra', {
      id_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'OrdenCompra',
          key: 'id_orden'
        }
      },
      numero_version: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      id_ubicacion_destino: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Ubicacion',
          key: 'id_ubicacion'
        }
      },
      id_cotizacion_elegida: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      monto_total: {
        type: Sequelize.DECIMAL(16, 2),
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      fecha_version: {
        type: Sequelize.DATE,
        allowNull: false
      },
      motivo_version: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('VersionOrdenCompra', {
      fields: ['id_orden', 'numero_version'],
      type: 'unique',
      name: 'VersionOrdenCompra_id_orden_numero_version_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('VersionOrdenCompra');
  }
};
