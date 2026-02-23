'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ai4biz-admin-secret-change-in-production';

/**
 * Express middleware — protects admin API routes.
 * Expects: Authorization: Bearer <token>
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided.',
    });
  }

  const token = authHeader.slice(7);
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired session. Please log in again.',
    });
  }
}

module.exports = adminAuth;
