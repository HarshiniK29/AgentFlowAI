import React,{useEffect} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import {Provider,useDispatch} from "react-redux";
import {GoogleOAuthProvider} from "@react-oauth/google";
import api,{setAccessToken} from "./api";
import {store,setAuth,clearAuth} from "./store";
import App from "./App";
import "./index.css";

function Bootstrap(){
 const dispatch=useDispatch();
 useEffect(()=>{api.get("/auth/me").then(r=>dispatch(setAuth(r.data.user))).catch(()=>dispatch(clearAuth()))},[dispatch]);
 return <App/>
}
createRoot(document.getElementById("root")).render(<Provider store={store}><GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID||"not-configured"}><BrowserRouter><Bootstrap/></BrowserRouter></GoogleOAuthProvider></Provider>);
