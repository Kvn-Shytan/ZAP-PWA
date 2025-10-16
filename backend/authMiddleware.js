const jwt = require('jsonwebtoken');
const prisma = require('./prisma/client');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(401); // Unauthorized (invalid token)
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.sendStatus(403);
    }
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (rolesArray.includes(req.user.role)) {
      next();
    } else {
      res.sendStatus(403);
    }
  };
};

const authorizeAssignedUserOrAdmin = (allowedRoles, userField) => {
  return async (req, res, next) => {
    const { id } = req.params;
    const requestingUser = req.user;

    if (!id || !requestingUser) {
      return res.sendStatus(400); // Bad Request
    }

    try {
      const order = await prisma.externalProductionOrder.findUnique({
        where: { id },
        include: { expectedOutputs: { include: { product: true } } },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Attach order to request for use in the next handler
      req.order = order;

      const isRoleAllowed = allowedRoles.includes(requestingUser.role);
      const isUserAssigned = order[userField] === requestingUser.userId;

      if (isRoleAllowed || isUserAssigned) {
        return next(); // Authorized
      }

      return res.status(403).json({ error: 'You are not authorized to perform this action.' });

    } catch (error) {
      console.error("Authorization middleware error:", error);
      return res.sendStatus(500);
    }
  };
};

module.exports = { authenticateToken, authorizeRole, authorizeAssignedUserOrAdmin };
