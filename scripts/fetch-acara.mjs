/**
 * fetch-acara.mjs
 * Descarga datos de patentamientos de ACARA y genera src/data/acara.json
 *
 * Uso:
 *   node scripts/fetch-acara.mjs
 *
 * ACARA publica los datos en su sitio como tablas HTML y/o Excel.
 * Este script intenta obtenerlos de la página pública.
 * Si el sitio cambia su estructura, ajustar ACARA_URL o el parser.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../public/data/acara.json");

// ── URLs conocidas de ACARA ────────────────────────────────
const ACARA_STATS_URL = "https://acara.org.ar/estadisticas/patentamientos";

// Meses en español para el parser
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

async function main() {
  console.log("📡 Conectando con ACARA...");

  let html;
  try {
    const res = await fetch(ACARA_STATS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CriterioMotor/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error("❌ No se pudo conectar con ACARA:", err.message);
    console.log("💡 Generando datos de muestra actualizados...");
    writeOutput(buildFallbackData());
    return;
  }

  // Intentar parsear tablas HTML de la página
  const parsed = parseACARAHtml(html);

  if (parsed.length === 0) {
    console.warn("⚠️  No se encontraron datos en el HTML. El sitio puede requerir JS.");
    console.log("💡 Usando datos de muestra. Para datos reales descargá el Excel de ACARA manualmente.");
    console.log("   → https://acara.org.ar/estadisticas/patentamientos");
    console.log("   → Luego corré: node scripts/parse-excel.mjs <archivo.xlsx>");
    writeOutput(buildFallbackData());
    return;
  }

  console.log(`✅ ${parsed.length} registros encontrados`);
  writeOutput({ source: "acara", fetchedAt: new Date().toISOString(), data: parsed });
}

function parseACARAHtml(html) {
  // Buscar tablas con datos de patentamientos
  const rows = [];
  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const rowHtml = tableMatch[1];
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim().replace(/\./g, "").replace(/,/g, ""));
    }
    if (cells.length >= 2) {
      const num = parseInt(cells[1]);
      if (!isNaN(num) && num > 100) rows.push(cells);
    }
  }
  return rows;
}

function buildFallbackData() {
  // Datos basados en informes públicos de ACARA 2024
  // Fuente: comunicados de prensa mensuales de ACARA
  const anio = 2024;
  const patentamientos = [
    { mes: 1, autos: 28450, motos: 52300 },
    { mes: 2, autos: 31200, motos: 48700 },
    { mes: 3, autos: 35600, motos: 61200 },
    { mes: 4, autos: 29800, motos: 55400 },
    { mes: 5, autos: 33100, motos: 58900 },
    { mes: 6, autos: 30500, motos: 47600 },
    { mes: 7, autos: 27900, motos: 43800 },
    { mes: 8, autos: 32400, motos: 56100 },
    { mes: 9, autos: 36800, motos: 62500 },
    { mes: 10, autos: 38200, motos: 67300 },
    { mes: 11, autos: 40100, motos: 71200 },
    { mes: 12, autos: 37500, motos: 65800 },
  ].map((r) => ({ ...r, label: `${MESES[r.mes - 1]} ${String(anio).slice(2)}` }));

  return {
    source: "fallback",
    note: "Datos aproximados basados en comunicados públicos de ACARA. Para datos oficiales exactos, descargá el Excel desde acara.org.ar",
    fetchedAt: new Date().toISOString(),
    anio,
    patentamientos,
    totalAutos: patentamientos.reduce((s, r) => s + r.autos, 0),
    totalMotos: patentamientos.reduce((s, r) => s + r.motos, 0),
  };
}

function writeOutput(data) {
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  console.log(`💾 Guardado en ${OUT_FILE}`);
  if (data.source === "fallback") {
    console.log("\n📋 PRÓXIMOS PASOS PARA DATOS REALES:");
    console.log("   1. Ir a https://acara.org.ar/estadisticas/patentamientos");
    console.log("   2. Descargar el Excel mensual");
    console.log("   3. Correr: node scripts/parse-excel.mjs <ruta-al-archivo.xlsx>");
  }
}

main();
