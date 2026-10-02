import React from "react";
import {Link} from "react-router-dom";
import {motion} from "framer-motion";
import {Zap,ShieldCheck,Workflow,BrainCircuit} from "lucide-react";
export function AuthLayout({title,subtitle,children}){
 return <div className="min-h-screen bg-[#070a11] text-slate-200 flex">
  <div className="hidden lg:flex w-[46%] relative overflow-hidden p-12 flex-col justify-between border-r border-slate-800/70">
   <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.18),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(124,58,237,.18),transparent_35%)]"/>
   <div className="relative flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center"><Zap/></div><b>AgentFlow AI</b></div>
   <div className="relative max-w-lg"><div className="text-cyan-400 text-xs uppercase tracking-[.3em] mb-4">Autonomous Work OS</div><h2 className="text-5xl font-semibold leading-tight text-white">Turn natural language into <span className="text-cyan-300">real execution.</span></h2><p className="text-slate-400 mt-5">Plan, execute, validate, recover and keep a human in control of risky actions.</p><div className="grid grid-cols-3 gap-3 mt-10">{[[Workflow,"Workflows"],[ShieldCheck,"Risk Control"],[BrainCircuit,"Agent Memory"]].map(([I,t])=><div className="glass rounded-xl p-4" key={t}><I className="text-cyan-300" size={20}/><div className="text-xs mt-3 text-slate-400">{t}</div></div>)}</div></div>
   <div className="relative text-xs text-slate-600">Enterprise-ready platform • Human-in-the-loop by design</div>
  </div>
  <div className="flex-1 flex items-center justify-center p-6"><motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} className="w-full max-w-md"><div className="lg:hidden flex items-center gap-3 mb-10"><div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center"><Zap/></div><b>AgentFlow AI</b></div><h1 className="text-3xl font-semibold text-white">{title}</h1><p className="text-slate-500 mt-2 mb-7">{subtitle}</p>{children}</motion.div></div>
 </div>
}
export const Input=({label,...props})=><label className="block mb-4"><span className="text-xs text-slate-400">{label}</span><input {...props} className="mt-2 w-full bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-400/50 text-white placeholder:text-slate-600"/>{props.error&&<span className="text-xs text-red-400 mt-1">{props.error}</span>}</label>;
export const Button=({children,...props})=><button {...props} className="w-full rounded-xl py-3 bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50 transition">{children}</button>;
export const ErrorBox=({children})=>children?<div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm p-3 mb-4">{children}</div>:null;
