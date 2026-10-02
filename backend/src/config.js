import dotenv from "dotenv";
dotenv.config();

const required = (name, fallback = undefined) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: required("MONGODB_URI"),
  accessSecret: required("JWT_ACCESS_SECRET"),
  refreshSecret: required("JWT_REFRESH_SECRET"),
  accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
  refreshDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  aiBaseUrl: process.env.AI_BASE_URL || "http://localhost:8000",
  aiApiKey: required("AI_API_KEY", "agentflow-dev-key-123"),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "AgentFlow AI <no-reply@example.com>",
  demoMode: process.env.DEMO_MODE !== "false",
  cookieSecure: process.env.COOKIE_SECURE === "true"
};
