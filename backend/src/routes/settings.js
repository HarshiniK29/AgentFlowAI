import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models.js";
import { asyncHandler } from "../utils.js";

const router=Router(); router.use(requireAuth);
router.get("/",(req,res)=>res.json({user:req.user}));
router.patch("/profile",asyncHandler(async(req,res)=>{
  const allowed={name:req.body.name,avatar:req.body.avatar};
  const user=await User.findByIdAndUpdate(req.user._id,{$set:allowed},{new:true}).select("-passwordHash -apiKeys.keyHash");
  res.json({user});
}));
router.patch("/notifications",asyncHandler(async(req,res)=>{
  const user=await User.findByIdAndUpdate(req.user._id,{$set:{notificationSettings:req.body}},{new:true}).select("-passwordHash -apiKeys.keyHash");
  res.json({settings:user.notificationSettings});
}));
router.post("/api-keys",asyncHandler(async(req,res)=>{
  const raw=`af_${crypto.randomBytes(24).toString("hex")}`;
  const key={name:req.body.name||"Default",keyHash:crypto.createHash("sha256").update(raw).digest("hex"),lastFour:raw.slice(-4)};
  await User.findByIdAndUpdate(req.user._id,{$push:{apiKeys:key}});
  res.status(201).json({key:raw,name:key.name,lastFour:key.lastFour,createdAt:key.createdAt});
}));
router.delete("/api-keys/:lastFour",asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(req.user._id,{$pull:{apiKeys:{lastFour:req.params.lastFour}}}); res.json({message:"API key revoked"});
}));
export default router;
