import axios from "axios";
import { config } from "../config.js";

const client = axios.create({
  baseURL: config.aiBaseUrl,
  timeout: 120000,
  headers: { "x-api-key": config.aiApiKey, "Content-Type": "application/json" }
});

export async function runAgent(payload) {
  const { data } = await client.post("/agent/run", payload);
  return data;
}
export async function planAgent(payload) {
  const { data } = await client.post("/agent/plan", payload);
  return data;
}
export async function riskAnalyze(payload) {
  const { data } = await client.post("/risk/analyze", payload);
  return data;
}
export async function memorySearch(payload) {
  const { data } = await client.post("/memory/search", payload);
  return data;
}
export async function memoryStore(payload) {
  const { data } = await client.post("/memory/store", payload);
  return data;
}
