"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _jsonwebtoken = require('jsonwebtoken'); var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";






 async function authMiddleware(
  req
) {
  const authorization = req.headers.authorization;
  if (!_optionalChain([authorization, 'optionalAccess', _ => _.startsWith, 'call', _2 => _2("Bearer ")])) return null;

  const token = authorization.slice(7);
  try {
    const decoded = _jsonwebtoken2.default.verify(token, JWT_SECRET) ;
    return {
      id: decoded.id,
      email: decoded.email,
    };
  } catch (e) {
    return null;
  }
} exports.authMiddleware = authMiddleware;
