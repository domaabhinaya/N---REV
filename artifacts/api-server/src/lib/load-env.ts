import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundle dist lives in artifacts/api-server/dist/, so go up 3 levels to repo root
const resolved = path.resolve(__dirname, "../../../.env");

const result = config({ path: resolved });

if (!result.parsed) {
  console.warn("[load-env] .env file not found or empty at", resolved);
}