import { verifyAccess } from "../utils.js";
import { User } from "../models.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const payload = verifyAccess(token);
    const user = await User.findById(payload.sub).select("-passwordHash -apiKeys.keyHash");
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
  }
}
export const requireAdmin = (req,res,next) => req.user?.role === "admin" ? next() : res.status(403).json({message:"Admin access required"});
