// backEnd/middleware/role.js
module.exports = (allowedRoles = []) => {
  // allow passing single role string too
  if (typeof allowedRoles === 'string') allowedRoles = [allowedRoles];
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: "Permission denied — no role found" });
    }
    const userRole = String(req.user.role).toLowerCase();
    const allowed = allowedRoles.map(r => String(r).toLowerCase());
    if (!allowed.includes(userRole)) {
      console.warn(`[RoleCheck] Denied: ${userRole} not in ${allowed.join(", ")}`);
      return res.status(403).json({ error: "Permission denied — insufficient role" });
    }
    next();
  };
};
