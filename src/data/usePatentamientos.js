import { useState, useEffect } from "react";
import { patentamientosMensuales, rankingAutos, kpis } from "./mockData";

export function usePatentamientos() {
  const [data, setData] = useState(null);
  const [source, setSource] = useState("mock");

  useEffect(() => {
    fetch("/data/patentamientos.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json) => { setData(json); setSource(json.source); })
      .catch(() => {});
  }, []);

  const anioActual = data?.anioActual ?? new Date().getFullYear();

  // Últimos 12 meses disponibles para el gráfico
  const ultimos12 =
    data?.mensual
      ?.slice(-12)
      .map((r) => ({ mes: r.label, autos: r.totalAutos, motos: 0 })) ??
    patentamientosMensuales;

  // Ranking del mes más reciente con top modelos disponibles
  const ultimoConRanking = data?.mensual
    ?.slice()
    .reverse()
    .find((r) => r.topModelos?.length > 0);

  const rankingReal =
    ultimoConRanking?.topModelos?.map((m) => ({
      modelo: m.modelo,
      ventas: m.ventas,
      marca: m.modelo.split(" ")[0],
    })) ?? rankingAutos;

  const rankingMesLabel = ultimoConRanking?.label ?? "";

  // KPIs del año actual
  const mensualAnio = data?.mensual?.filter((r) => r.año === anioActual) ?? [];
  const totalAutos = mensualAnio.reduce((s, r) => s + r.totalAutos, 0) || kpis.totalPatentamientosAnio;
  const totalMotos = kpis.totalMotosAnio;

  const ultimoMes = data?.mensual?.[data.mensual.length - 1];
  const variacionAnual = ultimoMes?.variacionInteranual ?? kpis.variacionAnual;

  const isReal = source !== "mock" && source !== "cache";

  return {
    patentamientos: ultimos12,
    rankingReal,
    rankingMesLabel,
    totalAutos,
    totalMotos,
    variacionAnual: variacionAnual ?? kpis.variacionAnual,
    source,
    isReal,
    anioActual,
  };
}
