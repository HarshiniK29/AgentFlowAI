import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, config.accessSecret, { expiresIn: config.accessExpires });
}
export function signRefreshToken(user, jti) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, jti }, config.refreshSecret, { expiresIn: `${config.refreshDays}d` });
}
export function verifyAccess(token) { return jwt.verify(token, config.accessSecret); }
export function verifyRefresh(token) { return jwt.verify(token, config.refreshSecret); }

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
