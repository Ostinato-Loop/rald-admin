import React, { useEffect, useState, useCallback } from "react";

const API = import.meta.env.VITE_API_URL ?? "https://api.rald.cloud";
const TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? "";

type Health = "ok" | "degraded" | "down" | "unknown";

interface Snapshot {
  signups_1h: number; signups_24h: number; signups_total: number;
  trust_distribution: Record<string, number>;
  product_activations: Record<string, number>;
  retry_queue_depth: number; failed_provisions_24h: number;
  avg_provision_ms: number; generated_at: string;
}
interface EcoHealth {
  ecosystem_health: Health;
  products: Array<{ slug: string; name: string; health: Health; latency_ms?: number }>;
  summary: { total: number; healthy: number; degraded: number };
}

const healthColor: Record<Health, string> = {
  ok: "var(--green)", degraded: "var(--yellow)", down: "var(--red)", unknown: "var(--muted)"
};
const dot = (h: Health) => (
  <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
    background: healthColor[h], marginRight:6, flexShrink:0 }} />
);
const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12,
      padding:"20px 24px", ...style }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase",
        color:"var(--muted)", marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string|number; sub?: string; color?: string }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:32, fontWeight:700, color: color ?? "var(--teal)", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>{sub}</div>}
      <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{label}</div>
    </div>
  );
}

const TIERS = ["none","basic","verified","enhanced","elite"];
const TIER_COLOR: Record<string,string> = {
  none:"#475569", basic:"#3b82f6", verified:"#14b8a6", enhanced:"#8b5cf6", elite:"#f59e0b"
};

export default function App() {
  const [snap, setSnap]       = useState<Snapshot | null>(null);
  const [eco, setEco]         = useState<EcoHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [auth, setAuth]       = useState(TOKEN);
  const [inputToken, setInputToken] = useState("");

  const headers = { Authorization: `Bearer ${auth}`, "X-RALD-Product": "rald-admin" };

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true); setError(null);
    try {
      const [s, e] = await Promise.all([
        fetch(`${API}/raldtics/summary`, { headers }).then(r => { if(!r.ok) throw new Error(`${r.status}`); return r.json(); }),
        fetch(`${API}/ecosystem/health`,  { headers }).then(r => { if(!r.ok) throw new Error(`${r.status}`); return r.json(); }),
      ]);
      setSnap(s); setEco(e); setLastRefresh(new Date());
    } catch (err) {
      setError(String(err));
    } finally { setLoading(false); }
  }, [auth]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (!auth) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:28, fontWeight:700, color:"var(--teal)" }}>⚡ RALD Admin</div>
      <div style={{ color:"var(--muted)", fontSize:14 }}>Enter your admin JWT to continue</div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <input value={inputToken} onChange={e => setInputToken(e.target.value)}
          placeholder="Bearer token..."
          style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)",
            borderRadius:8, padding:"10px 16px", fontSize:14, width:340, outline:"none" }} />
        <button onClick={() => setAuth(inputToken)}
          style={{ background:"var(--teal)", color:"#000", border:"none", borderRadius:8,
            padding:"10px 20px", fontWeight:700, cursor:"pointer" }}>Login</button>
      </div>
    </div>
  );

  const ecoStatus = eco?.ecosystem_health ?? "unknown";

  return (
    <div style={{ minHeight:"100vh", padding:"24px 32px", maxWidth:1280, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22, fontWeight:800, color:"var(--teal)" }}>⚡ RALD OS</span>
            <span style={{ fontSize:13, color:"var(--muted)", fontWeight:500 }}>Admin Console</span>
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
            Last refreshed: {lastRefresh.toLocaleTimeString()} · auto-refresh 30s
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {eco && (
            <div style={{ display:"flex", alignItems:"center", background:"var(--surface)",
              border:"1px solid var(--border)", borderRadius:8, padding:"6px 14px", gap:6 }}>
              {dot(ecoStatus)}
              <span style={{ fontSize:13, fontWeight:600, color: healthColor[ecoStatus] }}>
                Ecosystem {ecoStatus.toUpperCase()}
              </span>
            </div>
          )}
          <button onClick={load} disabled={loading}
            style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--teal)",
              borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:"#1f0a0a", border:"1px solid var(--red)", borderRadius:8,
          padding:"12px 16px", color:"var(--red)", marginBottom:20, fontSize:13 }}>
          ⚠ {error}
        </div>
      )}

      {snap && (
        <>
          {/* Top KPI row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
            <Card title="Total Users">
              <Stat label="all time" value={fmt(snap.signups_total)} />
            </Card>
            <Card title="New Signups (1h)">
              <Stat label="last hour" value={snap.signups_1h} color="var(--green)" />
            </Card>
            <Card title="New Signups (24h)">
              <Stat label="last 24 hours" value={fmt(snap.signups_24h)} />
            </Card>
            <Card title="Provision Health">
              <Stat label="failed last 24h"
                value={snap.failed_provisions_24h}
                sub={`${snap.avg_provision_ms ? snap.avg_provision_ms.toFixed(0)+"ms avg" : "—"}`}
                color={snap.failed_provisions_24h > 0 ? "var(--red)" : "var(--green)"} />
            </Card>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Trust tier distribution */}
            <Card title="Trust Tier Distribution" style={{ gridColumn:"1" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
                {TIERS.map(tier => {
                  const count = snap.trust_distribution?.[tier] ?? 0;
                  const total = Object.values(snap.trust_distribution ?? {}).reduce((a,b) => a+b, 0);
                  const pct = total > 0 ? Math.round(count/total*100) : 0;
                  return (
                    <div key={tier}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ textTransform:"capitalize", color: TIER_COLOR[tier], fontWeight:600 }}>{tier}</span>
                        <span style={{ color:"var(--muted)" }}>{fmt(count)} ({pct}%)</span>
                      </div>
                      <div style={{ background:"var(--border)", borderRadius:4, height:6 }}>
                        <div style={{ background: TIER_COLOR[tier], width:`${pct}%`, height:"100%", borderRadius:4,
                          transition:"width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Product activations */}
            <Card title="Product Activations" style={{ gridColumn:"2" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
                {Object.entries(snap.product_activations ?? {})
                  .sort(([,a],[,b]) => b-a)
                  .map(([slug, count]) => (
                    <div key={slug} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, textTransform:"capitalize" }}>{slug}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:"var(--teal)" }}>{fmt(count)}</span>
                    </div>
                  ))}
                {Object.keys(snap.product_activations ?? {}).length === 0 &&
                  <span style={{ color:"var(--muted)", fontSize:13 }}>No activations yet</span>}
              </div>
            </Card>

            {/* Retry queue */}
            <Card title="Retry Queue" style={{ gridColumn:"3" }}>
              <div style={{ textAlign:"center", paddingTop:16 }}>
                <div style={{ fontSize:48, fontWeight:800,
                  color: snap.retry_queue_depth > 0 ? "var(--yellow)" : "var(--green)" }}>
                  {snap.retry_queue_depth}
                </div>
                <div style={{ color:"var(--muted)", fontSize:13, marginTop:8 }}>
                  {snap.retry_queue_depth === 0 ? "All provisioning complete ✓" : "items pending retry"}
                </div>
                <div style={{ marginTop:16, fontSize:11, color:"var(--muted)" }}>
                  Drained hourly by scheduled job
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Ecosystem product grid */}
      {eco && (
        <Card title={`Product Health · ${eco.summary.healthy}/${eco.summary.total} healthy`}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginTop:8 }}>
            {eco.products.map(p => (
              <div key={p.slug} style={{ background:"var(--bg)", border:`1px solid ${healthColor[p.health]}33`,
                borderRadius:8, padding:"12px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {dot(p.health)}
                  <span style={{ fontWeight:600, fontSize:14 }}>{p.name}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>
                  {p.health.toUpperCase()}
                  {p.latency_ms !== undefined && ` · ${p.latency_ms}ms`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && !snap && (
        <div style={{ textAlign:"center", color:"var(--muted)", paddingTop:80, fontSize:14 }}>
          Loading RALD OS data…
        </div>
      )}

      <div style={{ textAlign:"center", color:"var(--muted)", fontSize:11, marginTop:32, paddingBottom:16 }}>
        RALD OS Admin · LILCKY STUDIO LIMITED · {new Date().getFullYear()}
      </div>
    </div>
  );
}
