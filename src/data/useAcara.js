import { useState, useEffect } from "react";
import { patentamientosMensuales, kpis } from "./mockData";

export function useAcaraData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("mock");

  useEffect(() => {
    fetch("/data/acara.json")
      .then((r) => {
        if (!r.ok) throw new Error("no file");
        return r.json();
      })
      .then((json) => {
        setData(json);
        setSource(json.source === "fallback" ? "mock" : "acara");
      })
      .catch(() => {
        setData(null);
        setSource("mock");
      })
      .finally(() => setLoading(false));
  }, []);

  // Normalizar a formato común { mes, autos, motos }
  const patentamientos =
    data?.patentamientos?.map((r) => ({
      mes:   r.label ?? r.mes,
      autos: r.autos,
      motos: r.motos,
    })) ?? patentamientosMensuales;

  const totalAutos = data?.totalAutos ?? kpis.totalPatentamientosAnio;
  const totalMotos = data?.totalMotos ?? kpis.totalMotosAnio;

  return { patentamientos, totalAutos, totalMotos, loading, source };
}
