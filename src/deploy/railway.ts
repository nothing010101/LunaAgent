// =============================================================================
// Railway CLI wrapper.
// Thin wrapper over the `railway` binary using child_process.
// Manages per-agent Railway project linking via .railway/config.json.
// =============================================================================

import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ROOT } from "../lib/config.js";
import type { RailwayProjectConfig } from "../lib/config.js";

const EXEC_OPTS = { cwd: ROOT, encoding: "utf-8" as const };
const RAILWAY_CONFIG_DIR = path.resolve(ROOT, ".railway");
const RAILWAY_CONFIG_PATH = path.resolve(RAILWAY_CONFIG_DIR, "config.json");

// -- Project linking --

/** Read the Railway CLI's local project link (.railway/config.json). */
export function readRailwayConfig(): RailwayProjectConfig | undefined {
  try {
    const content = fs.readFileSync(RAILWAY_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(content);
    if (parsed.project && parsed.environment) {
      return { project: parsed.project, environment: parsed.environment };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Write a Railway project link so subsequent CLI commands target this project. */
export function writeRailwayConfig(config: RailwayProjectConfig): void {
  if (!fs.existsSync(RAILWAY_CONFIG_DIR)) {
    fs.mkdirSync(RAILWAY_CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(
    RAILWAY_CONFIG_PATH,
    JSON.stringify(config, null, 2) + "\n"
  );
}

// -- CLI checks --

export function checkCli(): { installed: boolean; version?: string } {
  try {
    const version = execSync("railway version", {
      ...EXEC_OPTS,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
}

export function isLoggedIn(): boolean {
  try {
    execSync("railway whoami", {
      ...EXEC_OPTS,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

// -- Project management --

export function login(): void {
  execSync("railway login", { ...EXEC_OPTS, stdio: "inherit" });
}

export function initProject(name?: string): void {
  const cmd = name ? `railway init --name "${name}"` : "railway init";
  execSync(cmd, { ...EXEC_OPTS, stdio: "inherit" });
}

// -- Variables --

export function setVariable(key: string, value: string): void {
  execSync(`railway variables set ${key}="${value}"`, {
    ...EXEC_OPTS,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function deleteVariable(key: string): void {
  execSync(`railway variables delete ${key}`, {
    ...EXEC_OPTS,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function listVariables(): string {
  return execSync("railway variables", {
    ...EXEC_OPTS,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

// -- Deployment --

export function up(): void {
  execSync("railway up --detach", { ...EXEC_OPTS, stdio: "inherit" });
}

export function getStatus(): string {
  return execSync("railway status", {
    ...EXEC_OPTS,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

// -- Log filtering --

export interface LogFilter {
  offering?: string;
  job?: string;
  level?: string;
}

function hasActiveFilter(filter: LogFilter): boolean {
  return !!(filter.offering || filter.job || filter.level);
}

function matchesFilter(line: string, filter: LogFilter): boolean {
  const lower = line.toLowerCase();
  if (filter.offering && !lower.includes(filter.offering.toLowerCase()))
    return false;
  if (filter.job && !line.includes(filter.job)) return false;
  if (filter.level && !lower.includes(filter.level.toLowerCase()))
    return false;
  return true;
}

export function streamLogs(
  follow: boolean,
  filter: LogFilter = {}
): void {
  const active = hasActiveFilter(filter);

  if (follow) {
    const child = spawn("railway", ["logs", "--follow"], {
      cwd: ROOT,
      stdio: active ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    if (active && child.stdout) {
      let buffer = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (matchesFilter(line, filter)) {
            process.stdout.write(line + "\n");
          }
        }
      });
    }
    process.on("SIGINT", () => {
      child.kill();
    });
    child.on("close", () => process.exit(0));
    child.unref();
    child.ref();
  } else {
    if (active) {
      const raw = execSync("railway logs", {
        ...EXEC_OPTS,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const lines = raw.split("\n");
      for (const line of lines) {
        if (matchesFilter(line, filter)) {
          process.stdout.write(line + "\n");
        }
      }
    } else {
      execSync("railway logs", { ...EXEC_OPTS, stdio: "inherit" });
    }
  }
}

export function down(): void {
  execSync("railway down --yes", { ...EXEC_OPTS, stdio: "inherit" });
}
