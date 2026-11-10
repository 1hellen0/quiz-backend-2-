'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Cotizacion', {
      id_cotizacion: {
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
      id_proveedor: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Proveedor',
          key: 'id_proveedor'
        }
      },
      codigo: {
        type: Sequelize.STRING(60)
      },
      fecha_cotizacion: {
        type: Sequelize.DATE,
        allowNull: false
      },
      vigencia_hasta: {
        type: Sequelize.DATEONLY
      },
      monto_total: {
        type: Sequelize.DECIMAL(16, 2),
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('Cotizacion', {
      fields: ['id_version', 'id_proveedor'],
      type: 'unique',
      name: 'Cotizacion_id_version_id_proveedor_unique'
    });

    await queryInterface.addConstraint('VersionOrdenCompra', {
      fields: ['id_cotizacion_elegida'],
      type: 'foreign key',
      name: 'VersionOrdenCompra_id_cotizacion_elegida_fkey',
      references: {
        table: 'Cotizacion',
        field: 'id_cotizacion'
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'VersionOrdenCompra',
      'VersionOrdenCompra_id_cotizacion_elegida_fkey'
    );
    await queryInterface.dropTable('Cotizacion');
  }
};
