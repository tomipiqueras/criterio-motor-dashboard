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

  // Convertir a formato { mes, autos, motos } para los gráficos
  const patentamientos =
    data?.mensual
      ?.filter((r) => r.año === anioActual)
      .map((r) => ({ mes: r.label, autos: r.totalAutos, motos: 0 })) ??
    patentamientosMensuales;

  // Ranking real del mes más reciente disponible
  const ultimoMes = data?.mensual?.[data.mensual.length - 1];
  const rankingReal =
    ultimoMes?.topModelos?.map((m) => ({ modelo: m.modelo, ventas: m.ventas, marca: m.modelo.split(" ")[0] })) ??
    rankingAutos;

  const totalAutos = data?.resumenAnio?.totalAutos ?? kpis.totalPatentamientosAnio;
  const variacionAnual = ultimoMes?.variacionInteranual ?? kpis.variacionAnual;

  const isReal = source !== "mock" && source !== "cache";

  return { patentamientos, rankingReal, totalAutos, variacionAnual, source, isReal, anioActual };
}
