// utils/hash.js
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // Increase this for stronger hashing; 12 is a good default

export const hashPassword = async (plainPassword) => {
  if (!plainPassword) throw new Error("Password is required");
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword)
    throw new Error("Missing password(s) for comparison");
  return await bcrypt.compare(plainPassword, hashedPassword);
};
