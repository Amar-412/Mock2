export function authorizeRoles(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this role'
      });
    }

    return next();
  };
}
