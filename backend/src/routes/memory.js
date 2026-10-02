import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { memorySearch, memoryStore } from "../services/ai.js";
import { asyncHandler } from "../utils.js";
const router=Router(); router.use(requireAuth);
router.post("/search",asyncHandler(async(req,res)=>res.json(await memorySearch({...req.body,user_id:req.user._id.toString()}))));
router.post("/store",asyncHandler(async(req,res)=>res.json(await memoryStore({...req.body,user_id:req.user._id.toString()}))));
export default router;
