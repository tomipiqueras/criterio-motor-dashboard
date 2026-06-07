/**
 * scrape-data.mjs
 * Scrapea autotest.com.ar (autos) y lamoto.com.ar (motos)
 * para obtener datos mensuales de patentamientos de Argentina.
 * GitHub Actions corre este script el día 5 de cada mes.
 */

import puppeteer from "puppeteer";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../public/data/patentamientos.json");

const MESES_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── Buscar URLs de artículos de patentamientos ────────────
async function fetchArticleUrls(browser, searchUrl, domain, keyword) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  try {
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    const urls = await page.evaluate((domain, keyword) => {
      return Array.from(document.querySelectorAll("a[href]"))
        .map(a => a.href)
        .filter(u => u.includes(domain) && u.includes(keyword));
    }, domain, keyword);
    await page.close();
    return [...new Set(urls)];
  } catch (err) {
    await page.close();
    console.error(`Error fetching ${searchUrl}:`, err.message);
    return [];
  }
}

// ── Parsear artículo de autotest (autos) ─────────────────
async function parseAutotestArticle(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    return parseAutotestText(text, url);
  } catch (err) {
    await page.close();
    return null;
  }
}

function parseAutotestText(text, url) {
  // Detectar mes/año del contenido (e.g. "febrero 2026", "enero de 2025")
  const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  let dataMonth = null, dataYear = null;

  for (let i = 0; i < MESES_ES.length; i++) {
    const m = text.match(new RegExp(`${MESES_ES[i]}\\s+(?:de\\s+)?(20\\d{2})`, "i"));
    if (m) { dataMonth = i + 1; dataYear = parseInt(m[1]); break; }
  }

  // Fallback: inferir del título del artículo por URL
  if (!dataYear) {
    const urlDateMatch = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (urlDateMatch) {
      const d = new Date(parseInt(urlDateMatch[1]), parseInt(urlDateMatch[2]) - 2);
      dataYear = d.getFullYear();
      dataMonth = d.getMonth() + 1;
    }
  }

  if (!dataYear || !dataMonth) return null;
  if (dataYear < 2024) return null;

  // Total autos patentados
  const totalPatterns = [
    /(\d{1,3}[.,]\d{3})\s*(?:unidades|vehículos|autos|automóviles|0\s*km)/i,
    /patentaron\s+(\d{1,3}[.,]\d{3})/i,
    /total[^0-9]*(\d{1,3}[.,]\d{3})/i,
    /registraron\s+(\d{1,3}[.,]\d{3})/i,
  ];

  let totalAutos = 0;
  for (const pat of totalPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseInt(m[1].replace(/\./g, "").replace(",", ""));
      if (val > 5000 && val < 200000) { totalAutos = val; break; }
    }
  }

  // Variación interanual
  const varMatch =
    text.match(/([+-]?\d{1,3}[.,]\d{0,2})\s*%.*?(?:interanual|año anterior|mismo mes)/i) ||
    text.match(/(?:interanual|año anterior|mismo mes).*?([+-]?\d{1,3}[.,]\d{0,2})\s*%/i) ||
    text.match(/(\d{1,3}[.,]\d{0,2})\s*%\s*(?:más|menos|de (?:suba|baja|caída|crecimiento))/i);
  let variacion = varMatch ? parseFloat(varMatch[1].replace(",", ".")) : null;
  if (varMatch && text.toLowerCase().includes("baja") && variacion > 0) variacion = -variacion;

  // Top modelos — buscar líneas con marca + número
  const marcasConocidas = ["toyota","volkswagen","ford","chevrolet","renault","fiat","peugeot","honda","hyundai","kia","nissan","jeep","ram","dodge","citroen","citroën","mitsubishi","suzuki","chery","byd","mg"];
  const topModelos = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const numMatch = line.match(/(\d{1,2}[.,]\d{3}|\b\d{3,5}\b)/g);
    if (!numMatch) continue;
    const ventas = parseInt(numMatch[numMatch.length - 1].replace(/[.,]/g, ""));
    if (ventas < 300 || ventas > 30000) continue;
    const lower = line.toLowerCase();
    if (!marcasConocidas.some(m => lower.includes(m))) continue;
    const modeloMatch = line.match(/([A-ZÁÉÍÓÚÑ][a-zA-ZÁÉÍÓÚáéíóúñü\s]+(?:\d{2,4})?)/);
    if (modeloMatch) {
      const modelo = modeloMatch[1].trim().replace(/\s+/g, " ");
      if (modelo.length > 3 && !topModelos.find(m => m.modelo === modelo)) {
        topModelos.push({ modelo, ventas });
      }
    }
  }

  if (totalAutos < 5000) return null;

  return {
    año: dataYear,
    mes: dataMonth,
    label: `${MESES_LABELS[dataMonth-1]} ${String(dataYear).slice(2)}`,
    totalAutos,
    variacionInteranual: variacion,
    topModelosAutos: topModelos.slice(0, 10),
    fuente: "autotest.com.ar",
  };
}

// ── Parsear artículo de lamoto (motos) ────────────────────
async function parseLamotoArticle(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    return parseLamotoText(text, url);
  } catch (err) {
    await page.close();
    return null;
  }
}

function parseLamotoText(text, url) {
  const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  let dataMonth = null, dataYear = null;

  for (let i = 0; i < MESES_ES.length; i++) {
    const m = text.match(new RegExp(`${MESES_ES[i]}\\s+(?:de\\s+)?(20\\d{2})`, "i"));
    if (m) { dataMonth = i + 1; dataYear = parseInt(m[1]); break; }
  }

  // Fallback URL slug: "patentamientos-mayo-2025"
  if (!dataYear) {
    for (let i = 0; i < MESES_ES.length; i++) {
      const m = url.match(new RegExp(`${MESES_ES[i]}[^/]*-(20\\d{2})`, "i"));
      if (m) { dataMonth = i + 1; dataYear = parseInt(m[1]); break; }
    }
  }

  if (!dataYear || !dataMonth) return null;
  if (dataYear < 2024) return null;

  // Total motos
  const totalPatterns = [
    /(\d{1,3}[.,]\d{3})\s*(?:motos?|motocicletas?|unidades)/i,
    /patentaron\s+(\d{1,3}[.,]\d{3})/i,
    /(\d{1,3}[.,]\d{3})\s*(?:patentamientos|registros)/i,
  ];

  let totalMotos = 0;
  for (const pat of totalPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseInt(m[1].replace(/\./g, "").replace(",", ""));
      if (val > 5000 && val < 200000) { totalMotos = val; break; }
    }
  }

  // Top modelos motos
  const marcasMoto = ["honda","gilera","motomel","bajaj","yamaha","corven","zanella","keller","beta","kawasaki","suzuki","tvs","mondial","guerrero"];
  const topModelosMotos = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const numMatch = line.match(/(\d{1,2}[.,]\d{3}|\b\d{3,5}\b)/g);
    if (!numMatch) continue;
    const ventas = parseInt(numMatch[numMatch.length - 1].replace(/[.,]/g, ""));
    if (ventas < 200 || ventas > 30000) continue;
    const lower = line.toLowerCase();
    if (!marcasMoto.some(m => lower.includes(m))) continue;
    const modeloMatch = line.match(/([A-ZÁÉÍÓÚÑ][a-zA-ZÁÉÍÓÚáéíóúñü\s]+(?:\d{2,4}[a-zA-Z]*)?)/);
    if (modeloMatch) {
      const modelo = modeloMatch[1].trim().replace(/\s+/g, " ");
      if (modelo.length > 3 && !topModelosMotos.find(m => m.modelo === modelo)) {
        topModelosMotos.push({ modelo, ventas });
      }
    }
  }

  if (totalMotos < 5000) return null;

  return {
    año: dataYear,
    mes: dataMonth,
    totalMotos,
    topModelosMotos: topModelosMotos.slice(0, 10),
    fuenteMotos: "lamoto.com.ar",
  };
}

// ── Merge datos nuevos con existentes ─────────────────────
function mergeData(existing, autosRecords, motosRecords) {
  const byKey = {};
  for (const r of (existing.mensual || [])) {
    byKey[`${r.año}-${r.mes}`] = { ...r };
  }

  for (const r of autosRecords) {
    if (!r) continue;
    const key = `${r.año}-${r.mes}`;
    byKey[key] = { ...(byKey[key] || {}), ...r };
  }

  for (const r of motosRecords) {
    if (!r) continue;
    const key = `${r.año}-${r.mes}`;
    if (byKey[key]) {
      byKey[key].totalMotos = r.totalMotos;
      byKey[key].topModelosMotos = r.topModelosMotos;
      byKey[key].fuente = [byKey[key].fuente, "lamoto.com.ar"].filter(Boolean).join(" / ");
    }
  }

  return Object.values(byKey).sort((a, b) =>
    a.año !== b.año ? a.año - b.año : a.mes - b.mes
  );
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log("🚀 Iniciando scraping — autotest.com.ar + lamoto.com.ar");

  let existing = { mensual: [] };
  if (existsSync(OUT_FILE)) {
    try { existing = JSON.parse(readFileSync(OUT_FILE, "utf8")); } catch {}
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let autosRecords = [];
  let motosRecords = [];

  try {
    // ── Autos: autotest.com.ar ──
    console.log("\n🚗 Buscando artículos en autotest.com.ar...");
    const autosUrls = await fetchArticleUrls(
      browser,
      "https://www.autotest.com.ar/?s=patentamientos",
      "autotest.com.ar",
      "patentamiento"
    );
    console.log(`   Encontrados: ${autosUrls.length} artículos`);

    const recentAutos = autosUrls.slice(0, 4);
    for (const url of recentAutos) {
      console.log(`   Procesando: ${url.split("/").slice(-2, -1)[0]}`);
      const record = await parseAutotestArticle(browser, url);
      if (record) {
        autosRecords.push(record);
        console.log(`   ✅ ${record.label}: ${record.totalAutos.toLocaleString("es-AR")} autos`);
      }
    }

    // ── Motos: lamoto.com.ar ──
    console.log("\n🏍️  Buscando artículos en lamoto.com.ar...");
    const motosUrls = await fetchArticleUrls(
      browser,
      "https://lamoto.com.ar/?s=patentamientos",
      "lamoto.com.ar",
      "patentamiento"
    );
    console.log(`   Encontrados: ${motosUrls.length} artículos`);

    const recentMotos = motosUrls.slice(0, 4);
    for (const url of recentMotos) {
      console.log(`   Procesando: ${url.split("/").slice(-2, -1)[0]}`);
      const record = await parseMotosArticle(browser, url);
      if (record) {
        motosRecords.push(record);
        console.log(`   ✅ ${record.año}-${String(record.mes).padStart(2,"0")}: ${record.totalMotos.toLocaleString("es-AR")} motos`);
      }
    }

  } catch (err) {
    console.error("❌ Error en scraping:", err.message);
  } finally {
    await browser.close();
  }

  const mensual = mergeData(existing, autosRecords, motosRecords);

  const anioActual = new Date().getFullYear();
  const mensualAnio = mensual.filter(r => r.año === anioActual);

  const output = {
    source: (autosRecords.length > 0 || motosRecords.length > 0)
      ? "autotest-lamoto"
      : "cache",
    fetchedAt: new Date().toISOString(),
    anioActual,
    mensual,
    resumenAnio: {
      año: anioActual,
      totalAutos: mensualAnio.reduce((s, r) => s + (r.totalAutos || 0), 0),
      totalMotos: mensualAnio.reduce((s, r) => s + (r.totalMotos || 0), 0),
      mesesDisponibles: mensualAnio.length,
    },
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n💾 Guardado: ${OUT_FILE}`);
  console.log(`📊 Meses en base de datos: ${mensual.length}`);
  console.log(`📈 Total ${anioActual}: ${output.resumenAnio.totalAutos.toLocaleString("es-AR")} autos / ${output.resumenAnio.totalMotos.toLocaleString("es-AR")} motos`);
}

// Fix: use parseLamotoArticle not parseMotosArticle
async function parseMotosArticle(browser, url) {
  return parseLamotoArticle(browser, url);
}

main().catch(err => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
