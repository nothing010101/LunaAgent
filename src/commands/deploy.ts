// =============================================================================
// acp serve deploy railway            — Deploy current agent to Railway
// acp serve deploy railway setup      — Create Railway project for current agent
// acp serve deploy railway status     — Show current agent's deployment status
// acp serve deploy railway logs       — Show current agent's deployment logs
// acp serve deploy railway teardown   — Remove current agent's deployment
// acp serve deploy railway env        — List env vars on current agent's project
// acp serve deploy railway env set    — Set an env var
// acp serve deploy railway env delete — Remove an env var
//
// Each agent gets its own Railway project. Switching agents and deploying
// creates a separate instance — both keep running independently.
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import * as output from "../lib/output.js";
import {
  readConfig,
  writeConfig,
  getActiveAgent,
  sanitizeAgentName,
  ROOT,
} from "../lib/config.js";
import type { DeployInfo, AgentEntry } from "../lib/config.js";
import { generateDockerfile, generateDockerignore } from "../deploy/docker.js";
import * as railway from "../deploy/railway.js";
import type { LogFilter } from "../deploy/railway.js";

const DOCKERFILE_PATH = path.resolve(ROOT, "Dockerfile");
const DOCKERIGNORE_PATH = path.resolve(ROOT, ".dockerignore");

function getOfferingsRoot(agentName: string): string {
  return path.resolve(
    ROOT,
    "src",
    "seller",
    "offerings",
    sanitizeAgentName(agentName)
  );
}

// -- Helpers --

function requireCli(): void {
  const { installed } = railway.checkCli();
  if (!installed) {
    output.fatal(
      "Railway CLI not found. Install it:\n\n" +
        "  npm install -g @railway/cli\n\n" +
        "  Or see: https://docs.railway.com/guides/cli"
    );
  }
}

function requireAgent(): AgentEntry {
  const agent = getActiveAgent();
  if (!agent) {
    output.fatal("No active agent. Run `acp setup` first.");
  }
  return agent;
}

/**
 * Ensure the Railway CLI is pointing at the current agent's project.
 * Reads the stored Railway project config for this agent and writes it
 * to .railway/config.json so all subsequent `railway` commands target it.
 */
function linkToCurrentAgent(): AgentEntry {
  requireCli();
  const agent = requireAgent();
  const config = readConfig();
  const deployInfo = config.DEPLOYS?.[agent.id];

  if (!deployInfo?.railwayConfig) {
    output.fatal(
      `No Railway project for agent "${agent.name}".\n` +
        "  Run `acp serve deploy railway setup` first."
    );
  }

  railway.writeRailwayConfig(deployInfo.railwayConfig);
  return agent;
}

function getDeployInfo(agentId: string): DeployInfo | undefined {
  const config = readConfig();
  return config.DEPLOYS?.[agentId];
}

function saveDeployInfo(agentId: string, info: DeployInfo): void {
  const config = readConfig();
  if (!config.DEPLOYS) config.DEPLOYS = {};
  config.DEPLOYS[agentId] = info;
  writeConfig(config);
}

function removeDeployInfo(agentId: string): void {
  const config = readConfig();
  if (config.DEPLOYS) {
    delete config.DEPLOYS[agentId];
    if (Object.keys(config.DEPLOYS).length === 0) {
      delete config.DEPLOYS;
    }
    writeConfig(config);
  }
}

function listLocalOfferings(agentName: string): string[] {
  const offeringsRoot = getOfferingsRoot(agentName);
  if (!fs.existsSync(offeringsRoot)) return [];
  const entries = fs.readdirSync(offeringsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      const dir = path.join(offeringsRoot, entry.name);
      return (
        fs.existsSync(path.join(dir, "handlers.ts")) &&
        fs.existsSync(path.join(dir, "offering.json"))
      );
    })
    .map((entry) => entry.name);
}

function ensureDockerFiles(): void {
  if (fs.existsSync(DOCKERFILE_PATH)) {
    output.log("  Using existing Dockerfile.");
  } else {
    fs.writeFileSync(DOCKERFILE_PATH, generateDockerfile());
    output.success("Generated Dockerfile");
  }

  if (fs.existsSync(DOCKERIGNORE_PATH)) {
    output.log("  Using existing .dockerignore.");
  } else {
    fs.writeFileSync(DOCKERIGNORE_PATH, generateDockerignore());
    output.success("Generated .dockerignore");
  }
}

// -- Commands --

export async function setup(): Promise<void> {
  // 1. Check CLI
  const { installed, version } = railway.checkCli();
  if (!installed) {
    output.fatal(
      "Railway CLI not found. Install it:\n\n" +
        "  npm install -g @railway/cli\n\n" +
        "  Or see: https://docs.railway.com/guides/cli"
    );
  }
  output.log(`  Railway CLI: ${version}`);

  const agent = requireAgent();

  // 2. Check if this agent already has a Railway project
  const existing = getDeployInfo(agent.id);
  if (existing) {
    output.log(`  Agent "${agent.name}" already has a Railway project.`);
    output.log("  Run `acp serve deploy railway` to deploy.\n");
    return;
  }

  // 3. Check login
  if (!railway.isLoggedIn()) {
    output.log("  Logging in to Railway...");
    railway.login();
  }
  output.success("Logged in to Railway");

  // 4. Create new Railway project for this agent
  output.log(`  Creating Railway project for agent "${agent.name}"...`);
  railway.initProject(`acp-${agent.name}`);

  // 5. Capture the project config that Railway just wrote
  const railwayConfig = railway.readRailwayConfig();
  if (!railwayConfig) {
    output.fatal(
      "Failed to read Railway project config after init. Try running `railway init` manually."
    );
  }

  // 6. Set API key on this project
  const config = readConfig();
  const apiKey = config.LITE_AGENT_API_KEY;
  if (apiKey) {
    railway.setVariable("LITE_AGENT_API_KEY", apiKey);
    output.success("Set LITE_AGENT_API_KEY on Railway");
  } else {
    output.warn(
      "No LITE_AGENT_API_KEY in local config. Run `acp setup` first, then re-run this command."
    );
  }

  // 7. Save project config for this agent
  saveDeployInfo(agent.id, {
    provider: "railway",
    agentName: agent.name,
    offerings: [],
    deployedAt: "",
    railwayConfig,
  });

  output.output(
    { provider: "railway", agent: agent.name, status: "setup_complete" },
    () => {
      output.heading("Railway Setup Complete");
      output.field("Agent", agent.name);
      output.field("Railway Project", `acp-${agent.name}`);
      output.log("\n  Next steps:");
      output.log("    1. Create offerings:   acp sell init <name>");
      output.log("    2. Register on ACP:    acp sell create <name>");
      output.log("    3. Deploy:             acp serve deploy railway\n");
    }
  );
}

export async function deploy(): Promise<void> {
  const agent = linkToCurrentAgent();

  // Check offerings exist locally
  const offerings = listLocalOfferings(agent.name);
  if (offerings.length === 0) {
    output.fatal(
      "No offerings found. Create at least one offering first:\n\n" +
        "  acp sell init <name>\n" +
        "  acp sell create <name>"
    );
  }

  // Generate Docker files if missing
  ensureDockerFiles();

  // Show what's being deployed
  output.log(`\n  Agent:     ${agent.name}`);
  output.log(`  Offerings: ${offerings.join(", ")}`);
  output.log("");

  // Deploy
  output.log("  Deploying to Railway...\n");
  railway.up();

  // Update deploy tracking
  const existing = getDeployInfo(agent.id)!;
  saveDeployInfo(agent.id, {
    ...existing,
    offerings,
    deployedAt: new Date().toISOString(),
  });

  output.output(
    { provider: "railway", status: "deployed", agent: agent.name, offerings },
    () => {
      output.heading("Deployed to Railway");
      output.field("Agent", agent.name);
      output.field("Offerings", offerings.join(", "));
      output.log("");
      output.log("  Check status:  acp serve deploy railway status");
      output.log("  View logs:     acp serve deploy railway logs --follow");
      output.log("  Tear down:     acp serve deploy railway teardown\n");
    }
  );
}

export async function status(): Promise<void> {
  const agent = linkToCurrentAgent();
  const deployInfo = getDeployInfo(agent.id);

  output.heading(`Railway Deployment — ${agent.name}`);
  if (deployInfo && deployInfo.deployedAt) {
    output.field("Offerings", deployInfo.offerings.join(", "));
    output.field("Deployed at", deployInfo.deployedAt);
  }
  output.log("");
  const statusText = railway.getStatus();
  output.log(statusText);
  output.log("");
}

export async function logs(
  follow: boolean = false,
  filter: LogFilter = {}
): Promise<void> {
  linkToCurrentAgent();
  railway.streamLogs(follow, filter);
}

export async function teardown(): Promise<void> {
  const agent = linkToCurrentAgent();
  output.log(`  Removing deployment for agent "${agent.name}"...\n`);
  railway.down();

  removeDeployInfo(agent.id);

  output.output(
    { provider: "railway", agent: agent.name, status: "torn_down" },
    () => {
      output.success(`Deployment for "${agent.name}" removed.`);
      output.log("  The Railway project still exists — re-deploy anytime with:");
      output.log("    acp serve deploy railway\n");
    }
  );
}

export async function env(): Promise<void> {
  const agent = linkToCurrentAgent();
  output.heading(`Railway Env Vars — ${agent.name}`);
  output.log("");
  const vars = railway.listVariables();
  if (vars) {
    output.log(vars);
  } else {
    output.log("  No environment variables set.");
  }
  output.log("");
}

export async function envSet(keyValue: string): Promise<void> {
  linkToCurrentAgent();

  const eqIdx = keyValue.indexOf("=");
  if (eqIdx === -1) {
    output.fatal(
      "Invalid format. Use: acp serve deploy railway env set KEY=value"
    );
  }

  const key = keyValue.slice(0, eqIdx);
  const value = keyValue.slice(eqIdx + 1);

  if (!key) {
    output.fatal("Key cannot be empty.");
  }

  railway.setVariable(key, value);

  output.output({ action: "set", key }, () => {
    output.success(`Set ${key} on Railway`);
    output.log("  Redeploy for changes to take effect:");
    output.log("    acp serve deploy railway\n");
  });
}

export async function envDelete(key: string): Promise<void> {
  linkToCurrentAgent();

  if (!key) {
    output.fatal("Usage: acp serve deploy railway env delete <KEY>");
  }

  railway.deleteVariable(key);

  output.output({ action: "deleted", key }, () => {
    output.success(`Deleted ${key} from Railway`);
    output.log("  Redeploy for changes to take effect:");
    output.log("    acp serve deploy railway\n");
  });
}
