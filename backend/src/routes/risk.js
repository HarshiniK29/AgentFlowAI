import {Router} from "express";import{requireAuth}from"../middleware/auth.js";import{riskAnalyze}from"../services/ai.js";import{asyncHandler}from"../utils.js";
const r=Router();r.use(requireAuth);r.post("/analyze",asyncHandler(async(req,res)=>res.json(await riskAnalyze(req.body))));export default r;
