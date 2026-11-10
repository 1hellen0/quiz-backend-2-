'use strict';

async function selectRows(queryInterface, Sequelize, sql, replacements, transaction) {
  return queryInterface.sequelize.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
    transaction
  });
}

async function withTransaction(queryInterface, callback) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
}

function assertExactMatch(description, actual, expected) {
  if (!actual) {
    return;
  }
  if (!expected(actual)) {
    throw new Error(`Refusing to seed: existing ${description} is incompatible.`);
  }
}

function refuseAmbiguousUndo(description, rows) {
  if (rows.length > 0) {
    throw new Error(
      `Refusing to undo ${description}: matching rows cannot be proven to belong to this seeder; no rows were deleted.`
    );
  }
}

module.exports = {
  selectRows,
  withTransaction,
  assertExactMatch,
  refuseAmbiguousUndo
};
