/* ============================================================
   shots.js — mapa de tiros por vectores
   ------------------------------------------------------------
   Los remates son graficos vectoriales (circulos), no texto. Se
   recuperan leyendo los operadores de dibujo de pdf.js y llevando
   las coordenadas al espacio de pagina rastreando la matriz de
   transformacion (save/restore/transform), igual que pdfplumber.
   Validado 27/27 en el partido de referencia.

   Nota (pendiente Fase 1): en un partido CON gol aparece una quinta
   categoria "Goal" con color propio, ausente en el 0-0. Se anadira
   su color a SHOTCOL tras verificarlo sobre el PDF de la final.
   ============================================================ */

// color de relleno (0-255) -> tipo de remate
export const SHOTCOL = {
  "0,128,0": "goal",         // gol (verde) — solo aparece en partidos con gol
  "91,155,213": "on",        // a puerta
  "245,188,0": "off",        // fuera
  "179,136,255": "blocked",  // bloqueado
  "46,77,255": "incomplete"  // fallido
};

// campo izquierdo en pt (validado)
export const FIELD_L = { x0: 36.8, x1: 399.8, y0: 115.5, y1: 380 };

// multiplicacion de matrices de transformacion 2D
const _mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
];
// aplica una matriz a un punto
const _ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Extrae los remates de una pagina de "Attempts at Goal" con campo. */
export async function shotsFromPage(page) {
  const OPS = window.pdfjsLib.OPS;
  const ops = await page.getOperatorList();
  const vp = page.getViewport({ scale: 1 });
  let ctm = vp.transform.slice(); const stack = []; let fill = null; const raw = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    if (fn === OPS.save) stack.push(ctm.slice());
    else if (fn === OPS.restore) ctm = stack.pop() || ctm;
    else if (fn === OPS.transform) ctm = _mul(ctm, a);
    else if (fn === OPS.setFillRGBColor) fill = [a[0], a[1], a[2]].map(v => Math.round(v > 1 ? v : v * 255)).join(",");
    else if (fn === OPS.constructPath && a[0][0] === 13) { // 13 = curva/circulo
      const key = SHOTCOL[fill]; if (!key) continue;
      const mm = a[2]; const [dx, dy] = _ap(ctm, (mm[0] + mm[1]) / 2, (mm[2] + mm[3]) / 2);
      raw.push({ key, x: dx, y: dy });
    }
  }
  // deduplicar (cada circulo = relleno + borde blanco)
  const uniq = [];
  raw.forEach(r => { if (!uniq.some(u => u.key === r.key && Math.hypot(u.x - r.x, u.y - r.y) < 6)) uniq.push(r); });
  // campo izquierdo, quitando la fila de leyenda inferior
  const W = vp.width, H = vp.height;
  const cand = uniq.filter(u => u.x < 0.44 * W);
  const legendY = Math.max(...cand.map(u => u.y), 0);
  const field = cand.filter(u => Math.abs(u.y - legendY) >= 12 && u.y < 0.74 * H);
  return field.map(u => ({
    key: u.key,
    x: Math.max(0, Math.min(1, (u.x - FIELD_L.x0) / (FIELD_L.x1 - FIELD_L.x0))),
    y: Math.max(0, Math.min(1.05, (u.y - FIELD_L.y0) / (FIELD_L.y1 - FIELD_L.y0)))
  }));
}
