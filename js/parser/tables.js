/* ============================================================
   tables.js — extraccion de texto y tablas sin rejilla
   ------------------------------------------------------------
   Las tablas del PMSR no tienen lineas: las filas se agrupan por
   coordenada Y y las columnas por agrupacion de centros X. Portado
   y validado desde el prototipo (numero por numero contra Python).
   ============================================================ */

import { dec, NUM, clean } from "./glyphs.js";

/** Extrae tokens con posicion de una pagina pdf.js. */
export async function pageTokens(page) {
  const tc = await page.getTextContent();
  const vp = page.getViewport({ scale: 1 });
  return tc.items.filter(it => it.str.trim()).map(it => {
    const x = it.transform[4], y = vp.height - it.transform[5];
    return { t: dec(it.str.trim()), x0: x, x1: x + it.width, top: y, h: it.height };
  });
}

/** Agrupa tokens en filas por proximidad vertical (Y). */
export function toRows(tokens, tol = 3.4) {
  const b = {};
  tokens.forEach(w => { (b[Math.round(w.top / tol)] ||= []).push(w); });
  return Object.keys(b).map(Number).sort((a, c) => a - c)
    .map(k => b[k].sort((a, c) => a.x0 - c.x0));
}

/** Palabras del titulo de pagina (banda superior), para identificar cada seccion. */
export function bandWords(tokens) {
  const s = tokens.filter(w => w.top > 25 && w.top < 75).map(w => w.t).join(" ");
  return new Set((clean(s).match(/[a-z]+/g) || []));
}

export const avg = a => a.reduce((x, y) => x + y, 0) / a.length;

/** Agrupa celdas numericas de una fila, uniendo compuestos tipo "4 / 0". */
export function cellsOf(row, start) {
  const out = []; let i = start;
  while (i < row.length) {
    const t = row[i].t;
    if (!NUM.test(t)) { i++; continue; }
    const vals = [parseFloat(t.replace("%", ""))]; let x0 = row[i].x0, x1 = row[i].x1;
    while (i + 2 < row.length && row[i + 1].t === "/" && NUM.test(row[i + 2].t)) {
      vals.push(parseFloat(row[i + 2].t.replace("%", ""))); x1 = row[i + 2].x1; i += 2;
    }
    out.push({ x: (x0 + x1) / 2, vals }); i++;
  }
  return out;
}

/** Reconstruye una tabla individual (dorsal + nombre + celdas) alineando columnas por X. */
export function playerTable(rows) {
  const cand = [];
  for (const r of rows) {
    const t = r.map(w => w.t);
    if (t.length < 4 || !/^\d{1,2}$/.test(t[0])) continue;
    let i = 1; while (i < t.length && !NUM.test(t[i])) i++;
    if (i === 1) continue;
    const cs = cellsOf(r, i);
    if (cs.length < 2) continue;
    cand.push({ num: +t[0], name: t.slice(1, i).join(" "), cs });
  }
  if (!cand.length) return null;
  const xs = cand.flatMap(c => c.cs.map(z => z.x)).sort((a, b) => a - b);
  const cols = []; let cur = [xs[0]];
  for (const x of xs.slice(1)) { if (x - cur[cur.length - 1] > 12) { cols.push(avg(cur)); cur = [x]; } else cur.push(x); }
  cols.push(avg(cur));
  return cand.map(c => {
    const slot = Array(cols.length).fill(null);
    c.cs.forEach(z => { let j = 0, best = 1e9; cols.forEach((cx, k) => { const d = Math.abs(cx - z.x); if (d < best) { best = d; j = k; } }); slot[j] = z.vals; });
    const flat = []; slot.forEach(s => s === null ? flat.push(0) : flat.push(...s));
    return { num: c.num, name: c.name, v: flat };
  });
}

/** Extrae bloques enfrentados local-vs-visitante (Key Stats, Presion, Fases). */
export function duelRows(rows, ymin = 75) {
  const merge = r => {
    const o = []; let i = 0; while (i < r.length) {
      if (NUM.test(r[i].t) && i + 1 < r.length && /^\(\d/.test(r[i + 1].t)) { o.push({ t: r[i].t + " " + r[i + 1].t }); i += 2; }
      else { o.push({ t: r[i].t }); i++; }
    } return o;
  };
  // Pre-fusion: algunas metricas del PMSR ponen la etiqueta en una linea y sus
  // numeros en la de abajo (Posesion, Tiros, Recepciones, Centros, Distancia...).
  // Si una fila es solo etiqueta y la siguiente trae >=2 numeros, las unimos
  // (reordenando por X, de modo que quede local-etiqueta-visitante).
  const isNum = w => NUM.test(w.t);
  const isWord = w => /[A-Za-z]/.test(w.t) && !NUM.test(w.t);
  const merged = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(isWord) && !row.some(isNum) && i + 1 < rows.length &&
        rows[i + 1].filter(isNum).length >= 2) {
      merged.push(row.concat(rows[i + 1]).sort((a, b) => a.x0 - b.x0));
      i++;
    } else merged.push(row);
  }
  const out = [];
  for (const r of merged) {
    if (r[0].top < ymin) continue;
    const c = merge(r);
    const nums = c.filter(z => NUM.test(z.t.split(" ")[0]));
    const words = c.filter(z => !NUM.test(z.t.split(" ")[0]) && /[A-Za-z]/.test(z.t)).map(z => z.t);
    if (nums.length < 2 || !words.length) continue;
    const lab = words.join(" ").trim();
    if (lab.length < 4 || /June|Stadium/.test(lab)) continue;
    out.push([lab, nums[0].t, nums[nums.length - 1].t]);
  }
  return out;
}

/** Convierte un token a numero (tolera parentesis, %, etc.). */
export const N = t => t == null ? 0 : parseFloat(String(t).replace(/[(),%\s].*$/, "").replace(/[^\d.\-]/g, "")) || 0;

/** Busca una fila de un bloque enfrentado por fragmento de etiqueta. Devuelve [local, visitante]. */
export const findKey = (duel, frag) => { const r = duel.find(d => clean(d[0]).includes(frag)); return r ? [N(r[1]), N(r[2])] : [0, 0]; };
