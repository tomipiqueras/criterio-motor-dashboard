/**
 * scrape-data.mjs
 * Obtiene datos reales de patentamientos scrapeando artículos de Infobae
 * que cubren los comunicados mensuales de ACARA.
 *
 * Estrategia:
 *  1. Lee la página del tag "patentamientos" de Infobae para encontrar artículos recientes
 *  2. Filtra los que son reportes mensuales de ACARA
 *  3. Extrae los datos de cada artículo
 *  4. Guarda en public/data/patentamientos.json
 *
 * GitHub Actions corre este script el día 5 de cada mes.
 */

import puppeteer from "puppeteer";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../public/data/patentamientos.json");

const MESES_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── Buscar artículos mensuales en Infobae ────────────────
async function fetchArticleUrls(browser) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (compatible; CriterioMotorBot/1.0)");
  await page.goto("https://www.infobae.com/tag/patentamientos/", {
    waitUntil: "networkidle2", timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 3000));

  const urls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map(a => a.href)
      .filter(u => u.includes("infobae.com/economia") && u.includes("patentamiento"));
  });

  await page.close();
  return [...new Set(urls)];
}

// ── Parsear artículo individual ───────────────────────────
async function parseArticle(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (compatible; CriterioMotorBot/1.0)");
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    return parseArticleText(text, url);
  } catch (err) {
    await page.close();
    return null;
  }
}

// ── Extraer datos del texto del artículo ─────────────────
function parseArticleText(text, url) {
  // Detectar mes y año de la URL o del contenido
  const urlDateMatch = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!urlDateMatch) return null;
  const pubYear = parseInt(urlDateMatch[1]);
  const pubMonth = parseInt(urlDateMatch[2]);

  // El artículo de mayo habla de datos de abril (mes anterior)
  const dataDate = new Date(pubYear, pubMonth - 2); // mes anterior al de publicación
  const dataYear = dataDate.getFullYear();
  const dataMonth = dataDate.getMonth() + 1;

  // No procesar artículos muy viejos
  if (dataYear < 2024) return null;

  // Buscar total de patentamientos
  const totalPatterns = [
    /(\d{1,3}[.,]\d{3})\s*(?:unidades|vehículos|0\s*km)/i,
    /total[^0-9]*(\d{1,3}[.,]\d{3})/i,
    /patentaron[^0-9]*(\d{1,3}[.,]\d{3})/i,
  ];

  let totalAutos = 0;
  for (const pattern of totalPatterns) {
    const m = text.match(pattern);
    if (m) {
      totalAutos = parseInt(m[1].replace(/[.,]/g, ""));
      if (totalAutos > 5000 && totalAutos < 200000) break;
    }
  }

  // Buscar variación interanual
  const varMatch = text.match(/([+-]?\d{1,2}[.,]\d{0,2})\s*%.*(?:interanual|año anterior|mismo período)/i)
    || text.match(/(?:interanual|año anterior).*?([+-]?\d{1,2}[.,]\d{0,2})\s*%/i);
  const variacion = varMatch ? parseFloat(varMatch[1].replace(",", ".")) : null;

  // Extraer top modelos (buscar tablas o listas con números)
  const modelLines = text.split("\n").filter(l => {
    const nums = l.match(/\d{3,}/g);
    return nums && nums.some(n => parseInt(n) > 100 && parseInt(n) < 50000);
  });

  const topModelos = [];
  const marcasConocidas = ["toyota","volkswagen","ford","chevrolet","renault","fiat","peugeot","honda","hyundai","kia","nissan","jeep","ram","dodge"];

  for (const line of modelLines.slice(0, 30)) {
    const numMatch = line.match(/(\d{1,2}[.,]\d{3}|\d{3,4})/g);
    if (!numMatch) continue;
    const unidades = parseInt(numMatch[numMatch.length - 1].replace(",",".").replace(".",""));
    if (unidades < 200 || unidades > 20000) continue;

    const lowerLine = line.toLowerCase();
    const marca = marcasConocidas.find(m => lowerLine.includes(m));
    if (!marca) continue;

    // Extraer nombre del modelo
    const modeloMatch = line.match(/([A-Z][a-zA-Záéíóúñü\s]+(?:\d{0,3})?)/);
    if (modeloMatch) {
      topModelos.push({ modelo: modeloMatch[1].trim(), ventas: unidades });
    }
  }

  if (totalAutos < 5000) return null;

  return {
    año: dataYear,
    mes: dataMonth,
    label: `${MESES_LABELS[dataMonth-1]} ${String(dataYear).slice(2)}`,
    totalAutos,
    variacionInteranual: variacion,
    topModelos: topModelos.slice(0, 10),
    fuente: url,
  };
}

// ── Merge con datos existentes ────────────────────────────
function mergeData(existing, newRecords) {
  const byKey = {};

  // Cargar existentes
  for (const r of (existing.mensual || [])) {
    byKey[`${r.año}-${r.mes}`] = r;
  }

  // Agregar/actualizar con nuevos
  for (const r of newRecords) {
    if (r) byKey[`${r.año}-${r.mes}`] = r;
  }

  return Object.values(byKey).sort((a, b) =>
    a.año !== b.año ? a.año - b.año : a.mes - b.mes
  );
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log("🚀 Iniciando scraping de datos de patentamientos...");

  // Cargar datos existentes
  let existing = { mensual: [] };
  if (existsSync(OUT_FILE)) {
    try { existing = JSON.parse(readFileSync(OUT_FILE, "utf8")); } catch {}
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let newRecords = [];

  try {
    console.log("📰 Buscando artículos en Infobae...");
    const urls = await fetchArticleUrls(browser);
    console.log(`   Encontrados: ${urls.length} artículos`);

    // Procesar solo los más recientes (últimos 3 meses = 3 artículos)
    const recent = urls
      .filter(u => u.match(/\d{4}\/\d{2}\/\d{2}/))
      .sort((a, b) => {
        const da = a.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        const db = b.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        return new Date(db[1], db[2]-1, db[3]) - new Date(da[1], da[2]-1, da[3]);
      })
      .slice(0, 4);

    for (const url of recent) {
      console.log(`   Procesando: ${url.split("/").slice(-1)[0]}`);
      const record = await parseArticle(browser, url);
      if (record) {
        newRecords.push(record);
        console.log(`   ✅ ${record.label}: ${record.totalAutos.toLocaleString("es-AR")} autos`);
      }
    }
  } catch (err) {
    console.error("❌ Error en scraping:", err.message);
  } finally {
    await browser.close();
  }

  // Merge y guardar
  const mensual = mergeData(existing, newRecords);

  // Año actual
  const anioActual = new Date().getFullYear();
  const mensualAnio = mensual.filter(r => r.año === anioActual);

  const output = {
    source: newRecords.length > 0 ? "infobae-acara" : "cache",
    fetchedAt: new Date().toISOString(),
    anioActual,
    mensual,
    // Resumen del año actual para los KPIs
    resumenAnio: {
      año: anioActual,
      totalAutos: mensualAnio.reduce((s, r) => s + r.totalAutos, 0),
      mesesDisponibles: mensualAnio.length,
    },
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n💾 Guardado: ${OUT_FILE}`);
  console.log(`📊 Meses en base de datos: ${mensual.length}`);
  console.log(`📈 Total ${anioActual}: ${output.resumenAnio.totalAutos.toLocaleString("es-AR")} autos`);
}

main().catch(err => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
