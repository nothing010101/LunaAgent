"use client";

import { useEffect, useState } from "react";

interface Job {
  jobId: string;
  phase: string;
  offering?: string;
}

interface Token {
  symbol: string;
  balance: string;
  usdValue?: string;
}

function phaseBadge(phase: string) {
  const map: Record<string, { bg: string; color: string }> = {
    COMPLETED: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    ACTIVE: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
    EVALUATING: { bg: "rgba(234,179,8,0.15)", color: "#eab308" },
    PENDING: { bg: "rgba(234,179,8,0.15)", color: "#eab308" },
    REJECTED: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    EXPIRED: { bg: "rgba(100,116,139,0.15)", color: "#64748b" },
  };
  const s = map[phase?.toUpperCase()] || map.PENDING;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {phase}
    </span>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [wallet, setWallet] = useState<Token[]>([]);
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [setup, setSetup] = useState(false);
  const [time, setTime] = useState("");

  async function load() {
    setTime(new Date().toLocaleTimeString());
    try {
      const [aj, wj, gj] = await Promise.allSettled([
        fetch("/api/jobs?type=active").then((r) => r.json()),
        fetch("/api/wallet").then((r) => r.json()),
        fetch("/api/agent").then((r) => r.json()),
      ]);
      if (aj.status === "fulfilled" && Array.isArray(aj.value)) setJobs(aj.value);
      if (wj.status === "fulfilled" && Array.isArray(wj.value)) setWallet(wj.value);
      if (gj.status === "fulfilled" && !gj.value.error) {
        setAgent(gj.value);
        setSetup(false);
      } else setSetup(true);
    } catch {
      setSetup(true);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const usdc = wallet.find((w) => w.symbol === "USDC");
  const active = jobs.filter(
    (j) => !["COMPLETED", "REJECTED", "EXPIRED"].includes(j.phase?.toUpperCase())
  );
  const done = jobs.filter((j) => j.phase?.toUpperCase() === "COMPLETED");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* HEADER */}
      <header
        style={{
          background: "rgba(16,16,24,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(168,85,247,0.2)",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #c084fc, #7c3aed)",
              boxShadow: "0 0 18px rgba(168,85,247,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            🌙
          </div>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                background: "linear-gradient(90deg,#c084fc,#818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              LUNA
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Virtuals Protocol · ACP Agent</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 12,
              color: "#22c55e",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                display: "block",
              }}
            />
            {setup ? "Setup Required" : "Live"}
          </div>
          {time && <span style={{ color: "#64748b", fontSize: 11 }}>Updated {time}</span>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {[
            ["ACP Marketplace ↗", "https://app.virtuals.io/acp"],
            ["aGDP ↗", "https://agdp.io"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#94a3b8",
                textDecoration: "none",
                fontSize: 12,
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.15)",
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* SETUP CARD */}
        {setup && (
          <div
            style={{
              background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(59,130,246,0.04))",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: 16,
              padding: "32px",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 10 }}>🌙</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8,
                background: "linear-gradient(90deg,#c084fc,#818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              LUNA Setup Required
            </div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
              Run the one-time setup to connect your Virtuals Protocol account, create LUNA's
              wallet, and start earning on the ACP marketplace.
            </p>
            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: 10,
                padding: "18px 20px",
                textAlign: "left",
                marginBottom: 16,
              }}
            >
              {[
                [
                  "git clone https://github.com/nothing010101/LunaAgent luna-agent && cd luna-agent",
                  "Clone LUNA repo",
                ],
                ["npm install && npm link", "Install dependencies"],
                ["npx tsx bin/acp.ts setup", "Run interactive setup — creates wallet + API key"],
                [
                  "# Add LITE_AGENT_API_KEY to Vercel env vars",
                  "Paste key from config.json → Vercel dashboard",
                ],
              ].map(([cmd, note], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 2,
                      background: "rgba(168,85,247,0.3)",
                      color: "#c084fc",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, color: "#c084fc" }}>
                      {cmd}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATS */}
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 14,
          }}
        >
          Overview
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            { label: "USDC Balance", value: usdc?.balance ?? "—", icon: "💰", color: "#22c55e" },
            { label: "Active Jobs", value: active.length || "—", icon: "⚡", color: "#3b82f6" },
            { label: "Completed Jobs", value: done.length || "—", icon: "✅", color: "#a855f7" },
            {
              label: "Agent",
              value: (agent?.name as string) || "LUNA",
              icon: "🌙",
              color: "#f59e0b",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "rgba(22,22,31,0.8)",
                border: "1px solid rgba(42,42,61,0.8)",
                borderRadius: 16,
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {s.label}
                </span>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* JOBS + WALLET */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div
            style={{
              background: "rgba(22,22,31,0.8)",
              border: "1px solid rgba(42,42,61,0.8)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Active Jobs</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
              Real-time ACP job pipeline
            </div>
            {active.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: "28px 0", color: "#64748b", fontSize: 13 }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
                No active jobs{setup ? " — configure API key first" : ""}
              </div>
            ) : (
              active.map((j, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(42,42,61,0.4)",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                      {j.jobId?.slice(0, 14)}…
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{j.offering || "—"}</div>
                  </div>
                  {phaseBadge(j.phase)}
                </div>
              ))
            )}
          </div>

          <div
            style={{
              background: "rgba(22,22,31,0.8)",
              border: "1px solid rgba(42,42,61,0.8)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Wallet Balances</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
              Base chain · LUNA wallet
            </div>
            {wallet.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: "28px 0", color: "#64748b", fontSize: 13 }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
                {setup ? "Run acp setup to create wallet" : "No balances found"}
              </div>
            ) : (
              wallet.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(42,42,61,0.4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(168,85,247,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      🪙
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{t.symbol}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 13 }}>{t.balance}</div>
                    {t.usdValue && (
                      <div style={{ fontSize: 11, color: "#64748b" }}>${t.usdValue}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AGENT INFO */}
        <div
          style={{
            background: "rgba(22,22,31,0.8)",
            border: "1px solid rgba(42,42,61,0.8)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>LUNA Agent Info</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
            Powered by Virtuals Protocol — Agent Commerce Protocol
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              ["Agent", (agent?.name as string) || "LUNA", "🌙"],
              ["Network", "Base Chain", "🔗"],
              ["Platform", "Virtuals Protocol", "⚡"],
              ["Wallet", (agent?.walletAddress as string)?.slice(0, 12) + "…" || "N/A", "💰"],
              ["Skill", "openclaw-acp", "🛠"],
              ["Marketplace", "ACP (agdp.io)", "🏪"],
            ].map(([label, val, icon], i) => (
              <div
                key={i}
                style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  border: "1px solid rgba(42,42,61,0.5)",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(42,42,61,0.5)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          color: "#64748b",
          fontSize: 11,
        }}
      >
        <span>© 2026 LUNA Agent · Virtuals Protocol</span>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            ["agdp.io", "https://agdp.io"],
            ["ACP", "https://app.virtuals.io/acp"],
            ["GitHub", "https://github.com/nothing010101/LunaAgent"],
          ].map(([l, h]) => (
            <a
              key={h}
              href={h}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#64748b", textDecoration: "none" }}
            >
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
