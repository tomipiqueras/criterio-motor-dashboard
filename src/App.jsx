import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { TrendingUp, DollarSign, BarChart2, Activity, Car, Bike } from "lucide-react";
import CriterioLogo from "./components/CriterioLogo";
import { usePatentamientos } from "./data/usePatentamientos";
import {
  rankingAutos,
  rankingMotos,
  preciosPorSegmento,
  evolucionPrecios,
  kpis,
} from "./data/mockData";

// ── Design tokens ────────────────────────────────────────────
const C = {
  orange:  "#ec6913",
  orangeD: "#c9560e",
  bg:      "#0d0d0d",
  surface: "#161616",
  border:  "#2a2a2a",
  text:    "#f5f5f5",
  muted:   "#888",
  white:   "#ffffff",
};

// ── Helpers ──────────────────────────────────────────────────
const fmtARS = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${n.toLocaleString("es-AR")}`;
const fmtNum = (n) => n.toLocaleString("es-AR");

const tooltipStyle = {
  contentStyle: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 },
  labelStyle: { color: C.muted },
  cursor: { fill: "rgba(236,105,19,.08)" },
};

// ── Sub-components ───────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, accent = false }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${accent ? C.orange : C.border}`,
      borderRadius: 12, padding: "18px 20px",
      boxShadow: accent ? `0 0 0 1px ${C.orange}22` : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ margin: 0, fontSize: 12, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</p>
        {Icon && <Icon size={16} color={accent ? C.orange : C.muted} />}
      </div>
      <p style={{ margin: "8px 0 2px", fontSize: 22, fontWeight: 700, color: accent ? C.orange : C.white }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{sub}</p>}
    </div>
  );
}

function TabBtn({ id, label, icon: Icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      border: active ? "none" : `1px solid ${C.border}`,
      background: active ? C.orange : C.surface,
      color: active ? C.white : C.muted,
      cursor: "pointer", whiteSpace: "nowrap",
      transition: "all .15s",
    }}>
      <Icon size={14} />
      {label}
    </button>
  );
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("patentamientos");
  const [rankingTipo, setRankingTipo] = useState("autos");
  const [moneda, setMoneda] = useState("pesos");
  const {
    patentamientos: patentamientosMensuales,
    rankingAutosReal, rankingAutosMes,
    rankingMotosReal, rankingMotosMes,
    totalAutos, totalMotos,
    variacionAnual, source, isReal, anioActual,
  } = usePatentamientos();

  const tabs = [
    { id: "patentamientos", label: "Patentamientos", icon: BarChart2 },
    { id: "ranking",        label: "Ranking ventas", icon: TrendingUp },
    { id: "precios",        label: "Precios por segmento", icon: DollarSign },
    { id: "evolucion",      label: "Evolución de precios", icon: Activity },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>

      {/* ── Header ── */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <CriterioLogo height={40} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Mercado automotriz AR · 2024</span>
            <span style={{
              fontSize: 11,
              background: isReal ? "#16a34a22" : `${C.orange}22`,
              color:      isReal ? "#4ade80"  : C.orange,
              padding: "4px 10px", borderRadius: 999, fontWeight: 600,
              border: `1px solid ${isReal ? "#16a34a44" : C.orange + "44"}`,
            }}>
              {isReal ? "✓ Datos reales" : "Datos de ejemplo"}
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 48px" }}>

        {/* ── KPIs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 16, marginBottom: 32 }}>
          <KPI label="Autos patentados"   value={fmtNum(totalAutos)} sub="Acum. 2024"   icon={Car}  accent />
          <KPI label="Motos patentadas"   value={fmtNum(totalMotos)} sub="Acum. 2024"  icon={Bike} />
          <KPI label="Variación anual"    value={`${variacionAnual > 0 ? "+" : ""}${variacionAnual}%`} sub={`vs ${anioActual - 1}`} icon={TrendingUp} accent />
          <KPI label="Precio prom. auto"  value={fmtARS(kpis.precioPromedioAuto)}      sub="0km, promedio" icon={DollarSign} />
          <KPI label="Precio prom. moto"  value={fmtARS(kpis.precioPromedioMoto)}      sub="0km, promedio" icon={DollarSign} />
          <KPI label="Dólar blue ref."    value={`$${fmtNum(kpis.tipoCambioBlue)}`}    sub="ARS/USD"      icon={Activity} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 2 }}>
          {tabs.map((t) => <TabBtn key={t.id} {...t} active={tab === t.id} onClick={setTab} />)}
        </div>

        {/* ── Card ── */}
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>

          {/* PATENTAMIENTOS */}
          {tab === "patentamientos" && (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Patentamientos mensuales 2024</h2>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>Unidades registradas por mes — autos y motos</p>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={patentamientosMensuales}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.orange} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [fmtNum(v)]} />
                  <Legend wrapperStyle={{ color: C.muted, fontSize: 13 }} />
                  <Area type="monotone" dataKey="autos" name="Autos" stroke={C.orange} fill="url(#gA)" strokeWidth={2} dot={{ r: 3, fill: C.orange }} />
                  <Area type="monotone" dataKey="motos" name="Motos" stroke={C.white}  fill="url(#gM)" strokeWidth={2} dot={{ r: 3, fill: C.white }} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}

          {/* RANKING */}
          {tab === "ranking" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Ranking de ventas 2024</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["autos", "Autos"], ["motos", "Motos"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setRankingTipo(val)} style={{
                      padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none",
                      background: rankingTipo === val ? C.orange : C.bg,
                      color: rankingTipo === val ? C.white : C.muted, cursor: "pointer",
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>
                {rankingTipo === "autos"
                  ? `Top 10 modelos más vendidos${rankingAutosMes && isReal ? ` · ${rankingAutosMes}` : ""}`
                  : `Top 5 modelos más vendidos${rankingMotosMes && isReal ? ` · ${rankingMotosMes}` : ""}`}
              </p>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={rankingTipo === "autos" ? (isReal ? rankingAutosReal : rankingAutos) : (isReal ? rankingMotosReal : rankingMotos)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="modelo" tick={{ fontSize: 11, fill: C.text }} width={165} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [fmtNum(v), "Unidades"]} />
                  <Bar dataKey="ventas" fill={C.orange} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {/* PRECIOS POR SEGMENTO */}
          {tab === "precios" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Precios por segmento</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["pesos", "ARS"], ["dolares", "USD"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setMoneda(val)} style={{
                      padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none",
                      background: moneda === val ? C.orange : C.bg,
                      color: moneda === val ? C.white : C.muted, cursor: "pointer",
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>Rango de precios 0km por categoría</p>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Segmento", "Desde", "Hasta", "Rango"].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 0 || i === 3 ? "left" : "right", padding: "10px 8px", color: C.muted, fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preciosPorSegmento.map((row, i) => {
                    const min = moneda === "pesos" ? row.precioMinARS : row.precioMinUSD;
                    const max = moneda === "pesos" ? row.precioMaxARS : row.precioMaxUSD;
                    const allMax = moneda === "pesos" ? 250_000_000 : 250_000;
                    const pct = (max / allMax) * 100;
                    const fmt = moneda === "pesos"
                      ? (v) => `$${(v/1_000_000).toFixed(1)}M`
                      : (v) => `USD ${(v/1000).toFixed(0)}k`;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "13px 8px", fontWeight: 600, color: C.white }}>{row.segmento}</td>
                        <td style={{ padding: "13px 8px", textAlign: "right", color: C.muted }}>{fmt(min)}</td>
                        <td style={{ padding: "13px 8px", textAlign: "right", color: C.text }}>{fmt(max)}</td>
                        <td style={{ padding: "13px 8px", width: 200 }}>
                          <div style={{ height: 8, background: C.bg, borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: C.orange, borderRadius: 999 }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* EVOLUCIÓN PRECIOS */}
          {tab === "evolucion" && (
            <>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Evolución de precios 2023–2025</h2>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted }}>Auto 0km promedio — precio en pesos</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={evolucionPrecios}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1_000_000).toFixed(0)}M`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`$${(v/1_000_000).toFixed(1)}M`, "Precio ARS"]} />
                  <Line type="monotone" dataKey="pesos" stroke={C.orange} strokeWidth={2.5} dot={{ r: 3, fill: C.orange }} />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ margin: "28px 0 12px", fontSize: 13, color: C.muted }}>Precio en USD y cotización dólar blue</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={evolucionPrecios}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="usd" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `USD ${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="blue" orientation="right" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ color: C.muted, fontSize: 13 }} />
                  <Line yAxisId="usd"  type="monotone" dataKey="dolares" name="Precio USD"  stroke={C.orange} strokeWidth={2.5} dot={{ r: 3, fill: C.orange }} />
                  <Line yAxisId="blue" type="monotone" dataKey="blue"    name="Dólar blue"  stroke={C.white}  strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, flexWrap: "wrap", gap: 12 }}>
          <CriterioLogo height={28} />
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
            Datos de ejemplo · Fuentes: ACARA, DNRPA, Infoauto · <span style={{ color: C.orange }}>criteriomotor.com</span>
          </p>
        </div>
      </main>
    </div>
  );
}
