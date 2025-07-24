import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

if (!JWT_SECRET) {
  throw new Error(
    "❌ JWT_SECRET is not defined. Check your .env file or dotenv config."
  );
}

export const generateToken = (payload, expiresIn = JWT_EXPIRY) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    throw error;
  }
};

export const safeDecode = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};

export const generateUserToken = (user) => {
  return generateToken({
    id: user.id,
    email: user.email,
  });
};

export const generateAdminToken = (admin) => {
  return generateToken({
    id: admin.id,
    role: admin.role,
    email: admin.email,
  });
};
