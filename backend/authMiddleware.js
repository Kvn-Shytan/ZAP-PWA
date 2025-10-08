const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('[authenticateToken] Request received.');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    console.log('[authenticateToken] No token provided. Sending 401.');
    return res.sendStatus(401); // Unauthorized
  }

  new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('[authenticateToken] Invalid token. Sending 403.', err.message);
        return reject(err);
      }
      console.log('[authenticateToken] Token valid. User:', user.userId, user.role);
      resolve(user);
    });
  })
  .then(user => {
    req.user = user;
    next();
  })
  .catch(err => {
    return res.sendStatus(403); // Forbidden (invalid token)
  });
};

const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('[authorizeRole] Checking roles. User role:', req.user?.role, 'Allowed roles:', allowedRoles);
    if (!req.user || !req.user.role) {
      console.log('[authorizeRole] No user or user role. Sending 403.');
      return res.sendStatus(403); // Forbidden
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (rolesArray.includes(req.user.role)) {
      console.log('[authorizeRole] Role allowed. Proceeding.');
      next(); // Role is allowed, proceed
    } else {
      console.log('[authorizeRole] Role not allowed. Sending 403.');
      res.sendStatus(403); // Forbidden
    }
  };
};

module.exports = { authenticateToken, authorizeRole };
