import axios from "axios";
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||"http://localhost:5000/api",withCredentials:true});
let accessToken=localStorage.getItem("af_access");
export const setAccessToken=t=>{accessToken=t;if(t)localStorage.setItem("af_access",t);else localStorage.removeItem("af_access")};
export const getAccessToken=()=>accessToken;
api.interceptors.request.use(c=>{if(accessToken)c.headers.Authorization=`Bearer ${accessToken}`;return c});
api.interceptors.response.use(r=>r,async err=>{
  const original=err.config;
  if(err.response?.status===401&&!original._retry){
    original._retry=true;
    try{const {data}=await axios.post(`${api.defaults.baseURL}/auth/refresh`,{});setAccessToken(data.accessToken);return api(original)}catch{setAccessToken(null)}
  }
  return Promise.reject(err)
});
export default api;
