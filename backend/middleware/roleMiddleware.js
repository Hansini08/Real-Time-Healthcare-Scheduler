// backend/middleware/roleMiddleware.js
const isAdmin = (req, res, next) => {
    // Assumes protect middleware ran
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user data missing' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: `Forbidden: Role ${req.user.role} not authorized. Admin role required.` });
    }
    next();
};

const checkRole = (roles = []) => (req, res, next) => {
    if (!req.user) { return res.status(401).json({ message: 'Not authorized' }); }
    // Ensure roles is always an array for .includes()
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ message: `Forbidden: Role ${req.user.role} not authorized for this action.` });
    }
    next();
};

module.exports = { isAdmin, checkRole }; // Export both