const { getPool, sql } = require('../../config/db');

class RoleRepository {
  async findByName(name) {
    const pool = getPool();
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .query('SELECT * FROM Roles WHERE name = @name');
    return result.recordset[0] || null;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Roles WHERE id = @id');
    return result.recordset[0] || null;
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM Roles');
    return result.recordset;
  }

  async findDepartmentByName(name) {
    const pool = getPool();
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .query('SELECT * FROM Departments WHERE name = @name');
    return result.recordset[0] || null;
  }

  async findAllDepartments() {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM Departments');
    return result.recordset;
  }
}

module.exports = RoleRepository;
