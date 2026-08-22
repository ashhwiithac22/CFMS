module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const role = req.user.role || req.user.role_name;
  if (role !== 'Administrator' && role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access is restricted to Administrator role only.'
    });
  }

  next();
};
