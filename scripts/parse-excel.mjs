/**
 * parse-excel.mjs
 * Parsea un Excel descargado manualmente de ACARA y genera acara.json
 *
 * Uso:
 *   node scripts/parse-excel.mjs <ruta-al-archivo.xlsx>
 *
 * ACARA publica archivos con columnas tipo:
 *   Mes | Autos | Motos | Comerciales | Total
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../public/data/acara.json");

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const filePath = process.argv[2];
if (!filePath) {
  console.error("❌ Uso: node scripts/parse-excel.mjs <ruta-al-archivo.xlsx>");
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

console.log(`📄 Leyendo hoja: ${sheetName} (${rows.length} filas)`);
console.log("📊 Primeras 5 filas:", rows.slice(0, 5));

// Detectar automáticamente las columnas
const headerRow = rows.findIndex((r) =>
  r.some((c) => String(c).toLowerCase().includes("mes") || String(c).toLowerCase().includes("enero"))
);

if (headerRow === -1) {
  console.error("❌ No se encontró una fila de encabezado. Revisá el formato del Excel.");
  console.log("Filas disponibles:", rows.slice(0, 10));
  process.exit(1);
}

const headers = rows[headerRow].map((h) => String(h).toLowerCase().trim());
console.log("📋 Headers detectados:", headers);

// Intentar mapear columnas comunes de ACARA
const colMes    = headers.findIndex((h) => h.includes("mes") || h.includes("período"));
const colAutos  = headers.findIndex((h) => h.includes("auto") || h.includes("vehículo") || h.includes("particular"));
const colMotos  = headers.findIndex((h) => h.includes("moto"));
const colComerciales = headers.findIndex((h) => h.includes("comercial") || h.includes("carga"));

const patentamientos = [];
for (let i = headerRow + 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row[colMes]) continue;

  const mesVal = String(row[colMes]).trim();
  const autos  = colAutos >= 0 ? parseInt(String(row[colAutos]).replace(/\D/g, "")) || 0 : 0;
  const motos  = colMotos >= 0 ? parseInt(String(row[colMotos]).replace(/\D/g, "")) || 0 : 0;

  if (autos === 0 && motos === 0) continue;

  patentamientos.push({ label: mesVal, autos, motos });
}

const result = {
  source:     "acara-excel",
  file:       filePath,
  fetchedAt:  new Date().toISOString(),
  patentamientos,
  totalAutos: patentamientos.reduce((s, r) => s + r.autos, 0),
  totalMotos: patentamientos.reduce((s, r) => s + r.motos, 0),
};

writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));
console.log(`✅ ${patentamientos.length} meses procesados`);
console.log(`💾 Guardado en ${OUT_FILE}`);
console.log(`📈 Total autos: ${result.totalAutos.toLocaleString("es-AR")}`);
console.log(`📈 Total motos: ${result.totalMotos.toLocaleString("es-AR")}`);
