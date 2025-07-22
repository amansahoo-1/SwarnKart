// utils/jwt.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d"; // fallback if not set

// Generate a JWT token for a user/admin
export const generateToken = (payload, expiresIn = JWT_EXPIRY) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Verify and decode a JWT token
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Try decoding without throwing errors (optional helper)
export const safeDecode = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// for user token

export const generateUserToken = (user) => {
  return generateToken({
    id: user.id,
    email: user.email,
  });
};
