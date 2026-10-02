import {configureStore,createSlice} from "@reduxjs/toolkit";
const authSlice=createSlice({name:"auth",initialState:{user:null,ready:false},reducers:{
 setAuth:(s,a)=>{s.user=a.payload; s.ready=true},clearAuth:s=>{s.user=null;s.ready=true}
}});
const uiSlice=createSlice({name:"ui",initialState:{toast:null},reducers:{toast:(s,a)=>{s.toast=a.payload}}});
export const {setAuth,clearAuth}=authSlice.actions; export const {toast}=uiSlice.actions;
export const store=configureStore({reducer:{auth:authSlice.reducer,ui:uiSlice.reducer}});
