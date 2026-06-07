import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
const allRequests = [];

page.on("response", async (res) => {
  const url = res.url();
  // Capturar TODO lo que no sea fuente o imagen
  if (!url.match(/\.(woff|woff2|png|jpg|svg|ico|gif)(\?|$)/)) {
    try {
      const body = await res.text();
      if (body.length > 50) allRequests.push({ url, body: body.slice(0, 500) });
    } catch {}
  }
});

console.log("🌐 Cargando ACARA — esperando 8 segundos...");
await page.goto("https://acara.org.ar/estadisticas/patentamientos", {
  waitUntil: "domcontentloaded", timeout: 30000,
});
await new Promise(r => setTimeout(r, 8000));

// Todo el HTML incluyendo scripts inline con datos
const everything = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll("script:not([src])"))
    .map(s => s.innerText.slice(0, 800))
    .filter(t => t.includes("paten") || t.includes("data") || t.includes("chart") || t.includes("["));
  const allText = document.body.innerText;
  const html = document.body.innerHTML.slice(0, 5000);
  return { scripts, allText, html };
});

await browser.close();

console.log("\n🔍 Scripts con datos:");
if (everything.scripts.length === 0) {
  console.log("  (ninguno)");
} else {
  everything.scripts.forEach((s, i) => console.log(`\n  Script ${i}:\n  ${s}`));
}

console.log("\n📄 Texto completo de la página:");
console.log(everything.allText.slice(0, 2000));

console.log("\n🌐 Requests JSON/JS no-asset:");
const jsonReqs = allRequests.filter(r => r.url.includes("js") || r.url.includes("json") || r.url.includes("api"));
jsonReqs.slice(0, 10).forEach(r => {
  console.log(`\n  ${r.url}`);
  if (r.body.includes("paten") || r.body.includes("[") || r.body.includes("data")) {
    console.log(`  >>> ${r.body.slice(0, 300)}`);
  }
});
