import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { User, RefreshSession, PasswordReset } from "../models.js";
import { config } from "../config.js";
import { asyncHandler, randomToken, sha256, signAccessToken, signRefreshToken, verifyRefresh } from "../utils.js";
import { requireAuth } from "../middleware/auth.js";
import { sendMail } from "../services/mail.js";

const router = Router();
const google = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function issueSession(user, req, res) {
  const jti = randomToken(16);
  const refresh = signRefreshToken(user, jti);
  await RefreshSession.create({
    userId: user._id, tokenHash: sha256(refresh),
    expiresAt: new Date(Date.now() + config.refreshDays * 86400000),
    userAgent: req.get("user-agent"), ip: req.ip
  });
  res.cookie("af_refresh", refresh, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    maxAge: config.refreshDays * 86400000,
    path: "/api/auth"
  });
  return { accessToken: signAccessToken(user) };
}

router.post("/register", asyncHandler(async (req,res) => {
  const { name, email, password } = req.body;
  if (!name || !emailRe.test(email || "") || typeof password !== "string" || password.length < 8)
    return res.status(400).json({message:"Name, valid email and password (8+ chars) are required"});
  if (await User.exists({email: email.toLowerCase()})) return res.status(409).json({message:"Email already registered"});
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({name, email:email.toLowerCase(), passwordHash});
  const session = await issueSession(user, req, res);
  res.status(201).json({ user: user.toJSON(), ...session });
}));

router.post("/login", asyncHandler(async (req,res) => {
  const { email, password } = req.body;
  const user = await User.findOne({email: String(email||"").toLowerCase()});
  if (!user?.passwordHash || !(await bcrypt.compare(password || "", user.passwordHash)))
    return res.status(401).json({message:"Invalid email or password"});
  const session = await issueSession(user, req, res);
  res.json({user:user.toJSON(), ...session});
}));


router.post("/demo", asyncHandler(async (req,res)=>{
  if (!config.demoMode) return res.status(404).json({message:"Demo mode is disabled"});
  let user = await User.findOne({email:"demo@agentflow.local"});
  if (!user) {
    user = await User.create({
      name:"AgentFlow Demo",
      email:"demo@agentflow.local",
      passwordHash:await bcrypt.hash(randomToken(24),12)
    });
  }
  const session = await issueSession(user, req, res);
  res.json({user:user.toJSON(), ...session});
}));

router.post("/google", asyncHandler(async (req,res) => {
  if (!google) return res.status(503).json({message:"Google OAuth is not configured"});
  const { credential } = req.body;
  if (!credential) return res.status(400).json({message:"Google credential is required"});
  const ticket = await google.verifyIdToken({idToken:credential, audience:config.googleClientId});
  const p = ticket.getPayload();
  if (!p?.email || !p.email_verified) return res.status(401).json({message:"Google account email is not verified"});
  let user = await User.findOne({email:p.email.toLowerCase()});
  if (!user) user = await User.create({name:p.name || p.email.split("@")[0], email:p.email.toLowerCase(), googleId:p.sub, avatar:p.picture});
  else if (!user.googleId) { user.googleId=p.sub; if(p.picture) user.avatar=p.picture; await user.save(); }
  const session = await issueSession(user, req, res);
  res.json({user:user.toJSON(), ...session});
}));

router.post("/refresh", asyncHandler(async(req,res)=>{
  const token = req.cookies.af_refresh || req.body.refreshToken;
  if (!token) return res.status(401).json({message:"Refresh token required"});
  try {
    const payload=verifyRefresh(token);
    const session=await RefreshSession.findOne({tokenHash:sha256(token),userId:payload.sub});
    if(!session) return res.status(401).json({message:"Refresh session is invalid"});
    await session.deleteOne();
    const user=await User.findById(payload.sub);
    if(!user) return res.status(401).json({message:"User not found"});
    res.json(await issueSession(user,req,res));
  } catch { res.status(401).json({message:"Refresh token expired or invalid"}); }
}));

router.post("/logout", asyncHandler(async(req,res)=>{
  if(req.cookies.af_refresh || req.body.refreshToken) await RefreshSession.deleteOne({tokenHash:sha256(req.cookies.af_refresh || req.body.refreshToken)}); res.clearCookie("af_refresh",{path:"/api/auth"});
  res.json({message:"Logged out"});
}));

router.get("/me", requireAuth, (req,res)=>res.json({user:req.user}));

router.post("/forgot-password", asyncHandler(async(req,res)=>{
  const email=String(req.body.email||"").toLowerCase();
  const user=await User.findOne({email});
  if(user){
    const raw=randomToken(32);
    await PasswordReset.deleteMany({userId:user._id});
    await PasswordReset.create({userId:user._id,tokenHash:sha256(raw),expiresAt:new Date(Date.now()+15*60*1000)});
    const url=`${config.clientUrl}/reset-password?token=${raw}`;
    await sendMail({to:user.email,subject:"Reset your AgentFlow AI password",html:`<p>Reset your password within 15 minutes:</p><p><a href="${url}">${url}</a></p>`});
  }
  res.json({message:"If an account exists, a password reset link has been sent."});
}));

router.post("/reset-password", asyncHandler(async(req,res)=>{
  const {token,password}=req.body;
  if(typeof password!=="string"||password.length<8||!token) return res.status(400).json({message:"Valid token and 8+ character password required"});
  const reset=await PasswordReset.findOne({tokenHash:sha256(token),expiresAt:{$gt:new Date()}});
  if(!reset) return res.status(400).json({message:"Reset token is invalid or expired"});
  const user=await User.findById(reset.userId);
  user.passwordHash=await bcrypt.hash(password,12);
  await user.save(); await PasswordReset.deleteMany({userId:user._id}); await RefreshSession.deleteMany({userId:user._id});
  res.json({message:"Password reset successfully"});
}));

router.get("/sessions", requireAuth, asyncHandler(async(req,res)=>{
  const sessions=await RefreshSession.find({userId:req.user._id}).select("-tokenHash").sort({createdAt:-1});
  res.json({sessions});
}));
router.delete("/sessions/:id", requireAuth, asyncHandler(async(req,res)=>{
  await RefreshSession.deleteOne({_id:req.params.id,userId:req.user._id}); res.json({message:"Session revoked"});
}));
export default router;
