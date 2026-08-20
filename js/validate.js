/* ============================================================
   validate.js — reconciliacion del dato
   ------------------------------------------------------------
   Cruza el dato extraido consigo mismo para comprobar que cuadra:
   el mapa de tiros contra la estadistica, la suma de los jugadores
   contra los totales del equipo, el marcador contra las cifras.
   No corrige nada: senala. Fallar con aviso, no en silencio.
   ============================================================ */

import { findKey } from "./parser/tables.js";

export function validateMatch(m) {
  const checks = [];
  const bySide = { home: m.home, away: m.away };
  const sides = [["home", 0], ["away", 1]];
  const has = frag => m.ks.some(r => r[0].toLowerCase().includes(frag));

  const push = (group, team, exp, got, tol, unit = "") => {
    const ok = exp == null ? null : Math.abs(got - exp) <= tol;
    checks.push({ group, team, exp, got, unit, ok });
  };

  // 1) Tiros: mapa (vectores) vs "Attempts at Goal" del informe
  if (has("attempts at goal")) {
    const att = findKey(m.ks, "attempts at goal");
    sides.forEach(([side, i]) => push("Tiros · mapa vs informe", bySide[side], att[i], (m.shots[bySide[side]] || []).length, 0));
  }

  // 2) Pases intentados: suma de jugadores vs total del informe
  if (has("total passes")) {
    const passes = findKey(m.ks, "total passes");
    sides.forEach(([side, i]) => {
      const rows = (m.teams[bySide[side]] && m.teams[bySide[side]].dist) || [];
      if (rows.length) push("Pases · suma vs total", bySide[side], passes[i], rows.reduce((a, r) => a + (r.v[0] || 0), 0), 0);
    });
  }

  // (3) Distancia total: prevista, pero la tabla de datos fisicos aun no parsea
  //     fiable (texto con letras separadas); se reactivara al arreglar esa tabla.

  // 4) Goles: marcador vs estadistica
  if (has("goals")) {
    const goals = findKey(m.ks, "goals");
    push("Goles · marcador vs informe", m.home, goals[0], m.gh, 0);
    push("Goles · marcador vs informe", m.away, goals[1], m.ga, 0);
  }

  return checks;
}
