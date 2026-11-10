'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ConfiguracionControlCompra', {
      id_configuracion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      dias_duplicado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      tolerancia_cantidad_porcentaje: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 10
      },
      dias_fraccionamiento: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 7
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      id_usuario_actualiza: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      fecha_actualizacion: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ConfiguracionControlCompra');
  }
};
