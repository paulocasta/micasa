import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

export default function setup() {
  rmSync("data/test.db", { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./data/test.db" },
  });
  return () => rmSync("data/test.db", { force: true });
}
