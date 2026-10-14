import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JourneyV12 } from "../src/schemas/zod/journey-v1_2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, "../public/assets/journeys/v1.2");

const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

let failed = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw);
  const r = JourneyV12.safeParse(data);
  if (!r.success) {
    failed++;
    console.error("❌", f, "failed validation:");
    console.error(JSON.stringify(r.error.format(), null, 2));
  } else {
    console.log("✅", f, "valid.");
  }
}

if (failed > 0) process.exit(1);
else console.log("All journey files valid.");
