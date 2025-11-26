import crypto from "crypto";

export const generateToken = (user) => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // generates a random 6-digit code
}