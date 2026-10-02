import React,{useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {GoogleLogin} from "@react-oauth/google";
import api,{setAccessToken} from "../api";
import {useDispatch} from "react-redux";
import {setAuth} from "../store";
import {AuthLayout,Input,Button,ErrorBox} from "./Auth";
export default function Login(){
 const [form,setForm]=useState({email:"",password:""}),[error,setError]=useState(""),[loading,setLoading]=useState(false);const nav=useNavigate(),dispatch=useDispatch();
 const finish=d=>{setAccessToken(d.accessToken);dispatch(setAuth(d.user));nav("/dashboard")};
 const submit=async e=>{e.preventDefault();setError("");setLoading(true);try{finish((await api.post("/auth/login",form)).data)}catch(e){setError(e.response?.data?.message||"Login failed")}finally{setLoading(false)}};
 const demo=async()=>{setError("");setLoading(true);try{finish((await api.post("/auth/demo")).data)}catch(e){setError(e.response?.data?.message||"Demo login failed")}finally{setLoading(false)}};
 const google=async credential=>{try{finish((await api.post("/auth/google",{credential})).data)}catch(e){setError(e.response?.data?.message||"Google login failed")}};
 return <AuthLayout title="Welcome back" subtitle="Sign in to continue your autonomous workflows."><ErrorBox>{error}</ErrorBox><form onSubmit={submit}><Input label="Work email" type="email" required placeholder="you@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><Input label="Password" type="password" required placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><div className="text-right -mt-2 mb-5"><Link to="/forgot-password" className="text-xs text-cyan-400 hover:underline">Forgot password?</Link></div><Button disabled={loading}>{loading?"Signing in...":"Sign in"}</Button><button type="button" onClick={demo} disabled={loading} className="w-full mt-3 rounded-xl py-3 border border-cyan-400/20 bg-cyan-400/5 text-cyan-300 font-semibold hover:bg-cyan-400/10 disabled:opacity-50">Launch 2-minute demo</button></form><div className="flex items-center gap-3 my-5"><div className="h-px bg-slate-800 flex-1"/><span className="text-xs text-slate-600">OR</span><div className="h-px bg-slate-800 flex-1"/></div>{import.meta.env.VITE_GOOGLE_CLIENT_ID&&<div className="flex justify-center"><GoogleLogin onSuccess={r=>google(r.credential)} onError={()=>setError("Google login failed")} theme="filled_black" width="360"/></div>}<p className="text-center text-sm text-slate-500 mt-7">New to AgentFlow? <Link className="text-cyan-400" to="/register">Create account</Link></p></AuthLayout>
}
