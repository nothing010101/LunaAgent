// =============================================================================
// Axios HTTP client for the ACP API.
// =============================================================================

import axios from "axios";
import dotenv from "dotenv";
import { loadApiKey } from "./config.js";

dotenv.config();

// Attempt to load API key from config.json into env (local dev only).
// In Railway/container, LITE_AGENT_API_KEY is already set as an env var.
loadApiKey();

const client = axios.create({
  baseURL: process.env.ACP_API_URL || "https://claw-api.virtuals.io",
});

// Inject API key dynamically on every request so env var changes are picked up
// and container startup order doesn't matter.
client.interceptors.request.use((config) => {
  const apiKey = process.env.LITE_AGENT_API_KEY?.trim();
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      throw new Error(JSON.stringify(error.response.data));
    }
    throw error;
  }
);

export default client;
