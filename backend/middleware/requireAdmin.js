module.exports = function requireAdmin(req, res, next) {
  try {
    const isAdmin = !!(req.user && (req.user.isAdmin || req.user.role === 'admin'));
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    next();
  } catch (e) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
};
