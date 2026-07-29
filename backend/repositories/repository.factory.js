const UserRepository = require('./mssql/user.repository');
const RoleRepository = require('./mssql/role.repository');
const AuditRepository = require('./mssql/audit.repository');
const MessageRepository = require('./mssql/message.repository');

class RepositoryFactory {
  static getUserRepository() {
    return new UserRepository();
  }

  static getRoleRepository() {
    return new RoleRepository();
  }

  static getAuditRepository() {
    return new AuditRepository();
  }

  static getMessageRepository() {
    return new MessageRepository();
  }
}

module.exports = RepositoryFactory;
