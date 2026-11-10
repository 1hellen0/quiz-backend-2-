'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ParametrosInventario', {
      id_parametros: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_material: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Material',
          key: 'id_material'
        }
      },
      id_ubicacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Ubicacion',
          key: 'id_ubicacion'
        }
      },
      stock_minimo: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      stock_maximo: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      demanda_diaria_promedio: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      demanda_diaria_maxima: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      tiempo_reposicion_dias: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('ParametrosInventario', {
      fields: ['id_material', 'id_ubicacion'],
      type: 'unique',
      name: 'ParametrosInventario_id_material_id_ubicacion_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ParametrosInventario');
  }
};
