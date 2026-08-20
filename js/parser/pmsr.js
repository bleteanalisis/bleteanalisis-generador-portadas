/* ============================================================
   pmsr.js — parseo de un PDF PMSR completo
   ------------------------------------------------------------
   Orquesta los modulos de extraccion y devuelve el MODELO DE DATOS
   de un partido: un objeto limpio del que cuelgan todas las vistas
   (y, mas adelante, la exportacion JSON/CSV). Arquitectura
   dato-primero: aqui se extrae, no se presenta.
   ============================================================ */

import { clean, NUM } from "./glyphs.js";
import { pageTokens, toRows, bandWords, playerTable, duelRows, avg } from "./tables.js";
import { shotsFromPage } from "./shots.js";

export async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pg = await pdf.getPage(i);
    pages.push({ tokens: await pageTokens(pg), page: pg });
  }

  // metadatos desde la portada
  const p0 = pages[0].tokens.map(t => t.t).join(" ");
  const mScore = p0.match(/([A-Za-zÀ-ɏ ]+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Za-zÀ-ɏ ]+?)\s+(?:Group|Grupo|Match|Round|Quarter|Semi|Final)/);
  const mDate = p0.match(/(\d{1,2} \w+ \d{4})/);
  const mMatch = p0.match(/Match (\d+)/i);
  let home = "Local", away = "Visitante", gh = 0, ga = 0;
  if (mScore) { home = mScore[1].trim(); gh = +mScore[2]; ga = +mScore[3]; away = mScore[4].trim(); }

  const byTitle = (words) => {
    const need = words.split(" ");
    return pages.find(p => { const b = bandWords(p.tokens); return need.every(w => b.has(w)); });
  };
  const teamPages = (words) => {
    const need = words.split(" ");
    return pages.filter(p => { const b = bandWords(p.tokens); return need.every(w => b.has(w)); });
  };

  // tablas individuales: 2 paginas cada bloque (local, visitante)
  function grabTable(words) {
    const ps = teamPages(words).map(p => ({ p, tbl: playerTable(toRows(p.tokens)) })).filter(z => z.tbl);
    return ps.map(z => z.tbl);
  }
  const phys = grabTable("physical data");
  const oop = grabTable("out of possession");
  const dist = grabTable("possession distributions");
  const off = grabTable("receptions");

  // descarta filas que en realidad son la cabecera (nombres de equipo + marcador),
  // no una metrica: p.ej. "Spain Argentina | 1 | 0".
  const teamWordSet = new Set([...clean(home).split(/\s+/), ...clean(away).split(/\s+/)].filter(Boolean));
  const notScoreboard = r => {
    const ws = clean(r[0]).split(/\s+/).filter(Boolean);
    return ws.length && !ws.every(w => teamWordSet.has(w));
  };

  // Key stats y presion (bloques enfrentados)
  const ksP = byTitle("key statistics"), dpP = byTitle("defensive pressure");
  const ks = ksP ? duelRows(toRows(ksP.tokens)).filter(notScoreboard) : [];
  const dp = dpP ? duelRows(toRows(dpP.tokens)).filter(notScoreboard) : [];

  // fases de juego
  const popP = byTitle("phases of play");
  const pop = popP ? duelRows(toRows(popP.tokens)).filter(notScoreboard) : [];

  // ofrecimientos por tercio (numeros grandes + etiqueta debajo)
  function thirds(teamWord) {
    const ps = teamPages("offering receive").filter(p => clean(p.tokens.map(t => t.t).join(" ")).includes(teamWord));
    if (!ps.length) return null;
    const R = toRows(ps[0].tokens); const res = { final: 0, middle: 0, defensive: 0, made: 0, received: 0 };
    R.forEach(r => {
      const txt = r.map(w => w.t).join(" ");
      let key = null;
      if (/Final Third/i.test(txt)) key = "final";
      else if (/Middle Third/i.test(txt)) key = "middle";
      else if (/Defensive\s*$/i.test(txt) || /Defensive Third/i.test(txt)) key = "defensive";
      else if (/Total Offers Made/i.test(txt)) key = "made";
      else if (/Total Offers Received/i.test(txt)) key = "received";
      if (!key) return;
      const cx = avg(r.map(w => (w.x0 + w.x1) / 2));
      let best = null;
      R.forEach(rr => rr.forEach(w => {
        if (!NUM.test(w.t) || w.h < 16 || w.bottom >= r[0].top) return;
        const d = Math.abs((w.x0 + w.x1) / 2 - cx);
        if (d < 120 && (!best || w.top > best.top)) best = { top: w.top, v: +w.t };
      }));
      if (best && !res[key]) res[key] = best.v;
    });
    return res;
  }

  // mapas de tiros (vectores) de ambos equipos.
  // Cada equipo tiene una pagina "Attempts at Goal" con el campo (el mapa) y, si
  // remato mucho, paginas de detalle "Time". En vez de adivinar por conteo de
  // numeros (que fallaba con equipos de muchos tiros), asignamos a cada equipo la
  // pagina que MAS remates produce entre las suyas. Robusto y sin heuristica fragil.
  const shots = {};
  try {
    const attemptsPages = pages.filter(p => {
      const b = bandWords(p.tokens); return b.has("attempts") && b.has("goal");
    });
    for (const nm of [home, away]) {
      const words = clean(nm).match(/[a-z]+/g) || [];
      const mine = attemptsPages.filter(p => {
        const b = bandWords(p.tokens); return words.length && words.every(w => b.has(w));
      });
      let best = [];
      for (const p of mine) { const s = await shotsFromPage(p.page); if (s.length > best.length) best = s; }
      shots[nm] = best;
    }
  } catch (e) { console.warn("tiros no extraidos:", e.message); }

  // roster con minutos (cimiento; el calculo real llegara en el paso de la ficha individual)
  const roster = grabRoster(pages);

  const teams = {};
  [[home, 0], [away, 1]].forEach(([nm, idx]) => {
    teams[nm] = {
      name: nm, side: idx === 0 ? "home" : "away",
      phys: idx < phys.length ? phys[idx] : [],
      oop: idx < oop.length ? oop[idx] : [],
      dist: idx < dist.length ? dist[idx] : [],
      off: idx < off.length ? off[idx] : [],
      roster: roster[idx] || {}
    };
  });

  return {
    id: (mMatch ? mMatch[1] : file.name) + "|" + home + "|" + away,
    file: file.name, home, away, gh, ga,
    date: mDate ? mDate[1] : "", matchNo: mMatch ? +mMatch[1] : null,
    ks, dp, pop, teams, shots,
    thirds: { [home]: thirds(clean(home)), [away]: thirds(clean(away)) },
    warnings: buildWarnings(ks, phys, oop)
  };
}

function grabRoster(pages) {
  // pagina "Match Summary Teams": numeros + nombre + minutos de cambio.
  // De momento devuelve estructura vacia; los minutos reales se conectaran
  // en el paso de la ficha individual (Opcion B con validacion por partido).
  const p = pages.find(pg => { const b = bandWords(pg.tokens); return b.has("match") && b.has("summary") && b.has("teams"); });
  const res = [{}, {}];
  if (!p) return res;
  return res;
}

function buildWarnings(ks, phys, oop) {
  const w = [];
  if (!ks.length) w.push("No se localizo el bloque de estadisticas clave.");
  if (phys.length < 2) w.push("Faltan tablas de datos fisicos de algun equipo.");
  if (oop.length < 2) w.push("Faltan tablas de acciones sin balon.");
  return w;
}
