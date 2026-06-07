import { useState, useEffect } from "react";
import { patentamientosMensuales, rankingAutos, rankingMotos, kpis } from "./mockData";

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

  // Últimos 12 meses para el gráfico — con motos reales
  const patentamientos =
    data?.mensual?.slice(-12).map((r) => ({
      mes: r.label,
      autos: r.totalAutos,
      motos: r.totalMotos ?? 0,
    })) ?? patentamientosMensuales;

  // Ranking autos: último mes con top modelos
  const ultimoConAutos = [...(data?.mensual ?? [])]
    .reverse().find((r) => r.topModelosAutos?.length > 0);
  const rankingAutosReal =
    ultimoConAutos?.topModelosAutos?.map((m) => ({
      modelo: m.modelo, ventas: m.ventas, marca: m.modelo.split(" ")[0],
    })) ?? rankingAutos;

  // Ranking motos: último mes con top modelos motos
  const ultimoConMotos = [...(data?.mensual ?? [])]
    .reverse().find((r) => r.topModelosMotos?.length > 0);
  const rankingMotosReal =
    ultimoConMotos?.topModelosMotos?.map((m) => ({
      modelo: m.modelo, ventas: m.ventas, marca: m.modelo.split(" ")[0],
    })) ?? rankingMotos;

  const rankingAutosMes  = ultimoConAutos?.label ?? "";
  const rankingMotosMes  = ultimoConMotos?.label ?? "";

  // KPIs año actual
  const mensualAnio = data?.mensual?.filter((r) => r.año === anioActual) ?? [];
  const totalAutos = mensualAnio.reduce((s, r) => s + r.totalAutos, 0) || kpis.totalPatentamientosAnio;
  const totalMotos = mensualAnio.reduce((s, r) => s + (r.totalMotos ?? 0), 0) || kpis.totalMotosAnio;

  const ultimoMes = data?.mensual?.[data.mensual.length - 1];
  const variacionAnual = ultimoMes?.variacionInteranual ?? kpis.variacionAnual;

  const isReal = source !== "mock" && source !== "cache";

  return {
    patentamientos,
    rankingAutosReal, rankingAutosMes,
    rankingMotosReal, rankingMotosMes,
    totalAutos, totalMotos,
    variacionAnual: variacionAnual ?? kpis.variacionAnual,
    source, isReal, anioActual,
  };
}
