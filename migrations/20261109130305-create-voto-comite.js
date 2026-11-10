'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('VotoComite', {
      id_voto: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_integrante: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'IntegranteComite',
          key: 'id_integrante'
        }
      },
      voto: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      comentario: {
        type: Sequelize.TEXT
      },
      fecha_voto: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('VotoComite');
  }
};
