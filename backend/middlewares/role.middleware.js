const { ForbiddenError } = require('../utils/errors');

module.exports = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Unauthorized access');
      }

      const hasRole = allowedRoles.includes(req.user.role);
      if (!hasRole) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
