/* ============================================================
   main.js — entrada de la aplicacion
   ------------------------------------------------------------
   Conecta la interfaz (arrastrar PDFs) con el parser y muestra la
   VISTA DE TRABAJO orientada al EQUIPO SUJETO: el que tu eliges va
   en verde (izquierda), el rival en gris (derecha), sea local o
   visitante. Arriba, la VALIDACION: comprueba que el dato cuadra.
   ============================================================ */

import { parsePDF } from "./parser/pmsr.js";
import { validateMatch } from "./validate.js";

window.pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const $ = s => document.querySelector(s);
const drop = $("#drop"), fileInput = $("#file"), loaded = $("#loaded"), out = $("#out"), empty = $("#empty");
const subjectbar = $("#subjectbar"), selSubject = $("#selSubject"), subjecthint = $("#subjecthint");

const MATCHES = [];
let subject = null;       // equipo a analizar (verde)
let subjectPinned = false; // true cuando el usuario lo elige a mano

/* ---------- carga de archivos ---------- */
["dragenter", "dragover"].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", ev => handleFiles(ev.dataTransfer.files));
fileInput.addEventListener("change", ev => handleFiles(ev.target.files));

async function handleFiles(list) {
  const files = [...list].filter(f => f.type === "application/pdf").slice(0, 8 - MATCHES.length);
  for (const f of files) {
    const chip = addChip(f.name);
    try {
      const m = await parsePDF(f);
      if (MATCHES.some(x => x.id === m.id)) { chip.set("dup", "Duplicado, omitido"); continue; }
      MATCHES.push(m);
      chip.set(m.warnings.length ? "warn" : "ok",
        `${m.home} ${m.gh}-${m.ga} ${m.away}${m.date ? " · " + m.date : ""}`);
    } catch (err) { chip.set("err", "No se pudo leer: " + err.message); console.error(err); }
  }
  refreshSubject();
  render();
}

/* ---------- chips de estado ---------- */
function addChip(name) {
  const el = document.createElement("div"); el.className = "chip";
  el.innerHTML = `<span class="dot"></span><span class="nm"></span><span class="st"><span class="spin"></span>Analizando...</span><button class="x">&times;</button>`;
  el.querySelector(".nm").textContent = name;
  loaded.appendChild(el);
  el.querySelector(".x").onclick = () => {
    const i = MATCHES.findIndex(m => m.file === name); if (i >= 0) MATCHES.splice(i, 1);
    el.remove(); refreshSubject(); render();
  };
  return {
    set: (cls, txt) => {
      el.querySelector(".dot").className = "dot" + (cls === "ok" ? "" : " " + (cls === "warn" ? "warn" : "err"));
      el.querySelector(".st").textContent = txt;
    }
  };
}

/* ---------- equipo sujeto ---------- */
function refreshSubject() {
  if (!MATCHES.length) { subjectbar.hidden = true; subject = null; return; }
  const count = {};
  MATCHES.forEach(m => { count[m.home] = (count[m.home] || 0) + 1; count[m.away] = (count[m.away] || 0) + 1; });
  const teams = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b));
  // por defecto, el equipo que mas se repite (el del recorrido que analizas);
  // si el usuario lo ha fijado a mano, se respeta mientras siga presente.
  if (subjectPinned && teams.includes(subject)) { /* mantener eleccion */ }
  else subject = teams[0];
  selSubject.innerHTML = teams.map(t =>
    `<option value="${t.replace(/"/g, "&quot;")}"${t === subject ? " selected" : ""}>${t} · ${count[t]} ${count[t] > 1 ? "partidos" : "partido"}</option>`).join("");
  selSubject.onchange = e => { subject = e.target.value; subjectPinned = true; render(); };
  subjecthint.textContent = MATCHES.length > 1 ? "El verde sigue a este equipo en todos los partidos." : "";
  subjectbar.hidden = false;
}

/* ============================================================
   VISTA DE TRABAJO
   ============================================================ */
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const fmt = n => Number.isFinite(n) ? (+n).toLocaleString("es-ES", { maximumFractionDigits: 1 }) : n;

const KS_LABELS = [
  ["possession", "Posesión"], ["expected goals", "xG"], ["goals", "Goles"],
  ["attempts at goal", "Tiros (a puerta)"], ["total passes", "Pases (completados)"],
  ["pass completion", "Acierto de pase"], ["completed line breaks", "Line breaks completados"],
  ["defensive line breaks", "Line breaks defensivos"], ["receptions in the final", "Recepciones último tercio"],
  ["crosses", "Centros"], ["ball progressions", "Progresiones"], ["defensive pressures", "Presiones defensivas"],
  ["forced turnovers", "Pérdidas forzadas"], ["second balls", "Segundas jugadas"],
  ["total distance", "Distancia total"], ["low speed sprinting", "Zona 4 (20–25 km/h)"]
];
function niceLabel(raw) {
  const c = raw.toLowerCase();
  for (const [frag, es] of KS_LABELS) if (c.includes(frag)) return es;
  const words = raw.split(/\s+/).filter(w => w && !/^(km|h|%)$/i.test(w));
  return words.filter((w, i) => w.toLowerCase() !== (words[i - 1] || "").toLowerCase()).join(" ");
}

const SHOT_ORDER = [["goal", "Gol"], ["on", "A puerta"], ["off", "Fuera"], ["blocked", "Bloqueado"], ["incomplete", "Fallido"]];
function shotCounts(list) { const c = {}; (list || []).forEach(s => c[s.key] = (c[s.key] || 0) + 1); return c; }

function render() {
  empty.classList.toggle("hidden", MATCHES.length > 0);
  out.innerHTML = MATCHES.map(matchCard).join("");
}

function block(title, body) { return `<div class="mc-block"><div class="mc-block-h">${title}</div>${body}</div>`; }

/* --- orientacion al sujeto --- */
function orient(m) {
  const subj = (subject && (m.home === subject || m.away === subject)) ? subject : m.home;
  const rival = m.home === subj ? m.away : m.home;
  return { subj, rival, subjHome: m.home === subj };
}

function validationBlock(m) {
  const checks = validateMatch(m);
  if (!checks.length) return "";
  const allOk = checks.every(c => c.ok !== false);
  const rows = checks.map(c => {
    const warn = c.ok === false;
    const nums = warn ? `${fmt(c.got)}${c.unit} <span class="neq">&ne;</span> ${fmt(c.exp)}${c.unit}` : `${fmt(c.got)}${c.unit}`;
    return `<div class="val-row ${warn ? "warn" : "ok"}"><span class="val-ic">${warn ? "!" : "✓"}</span>
      <span class="val-lbl">${esc(c.group)} <span class="muted">· ${esc(c.team)}</span></span><span class="val-n">${nums}</span></div>`;
  }).join("");
  const badge = allOk ? `<span class="count ok">todo cuadra</span>` : `<span class="count warn">revisar</span>`;
  return block(`Validación ${badge}`, `<div class="val">${rows}</div>`);
}

function keyStatsBlock(m, o) {
  if (!m.ks.length) return block("Estadísticas clave", `<p class="muted">No se localizó el bloque.</p>`);
  const rows = m.ks.map(r => {
    const a = o.subjHome ? r[1] : r[2], b = o.subjHome ? r[2] : r[1];
    return `<div class="cmp-row"><span class="cmp-a">${esc(a)}</span><span class="cmp-m">${esc(niceLabel(r[0]))}</span><span class="cmp-b">${esc(b)}</span></div>`;
  }).join("");
  return block(`Estadísticas clave <span class="count">${m.ks.length}</span>`,
    `<div class="cmp"><div class="cmp-head"><span class="cmp-a">${esc(o.subj)}</span><span class="cmp-m"></span><span class="cmp-b">${esc(o.rival)}</span></div>${rows}</div>`);
}

function shotsBlock(m, o) {
  const one = team => {
    const c = shotCounts(m.shots && m.shots[team]);
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    const chips = SHOT_ORDER.filter(([k]) => c[k]).map(([k, lbl]) => `<span class="chip2 s-${k}"><i></i>${lbl} <b>${c[k]}</b></span>`).join("");
    return `<div class="shots-team">
      <div class="shots-h"><span class="shots-name">${esc(team)}</span><span class="shots-total">${total} <span class="muted">remates</span></span></div>
      <div class="chips">${chips || '<span class="muted">sin datos</span>'}</div></div>`;
  };
  return block("Mapa de tiros", `<div class="shots-grid">${one(o.subj)}${one(o.rival)}</div>`);
}

function tablesBlock(m, o) {
  const dim = arr => (arr && arr.length) ? `${arr.length}<span class="muted">×</span>${arr[0].v.length}` : "—";
  const row = team => {
    const T = (m.teams && m.teams[team]) || {};
    return `<tr><td class="t-name">${esc(team)}</td><td>${dim(T.dist)}</td><td>${dim(T.oop)}</td><td>${dim(T.phys)}</td><td>${dim(T.off)}</td></tr>`;
  };
  return block(`Tablas individuales <span class="muted" style="font-weight:400;letter-spacing:0;text-transform:none">jugadores × columnas</span>`,
    `<div class="tscroll"><table class="mini"><thead><tr><th class="t-name">Equipo</th><th>Distribución</th><th>Sin balón</th><th>Físico</th><th>Ofrecimientos</th></tr></thead><tbody>${row(o.subj)}${row(o.rival)}</tbody></table></div>`);
}

function territoryBlock(m, o) {
  const one = team => {
    const x = m.thirds && m.thirds[team];
    if (!x) return `<div class="terr-team"><div class="shots-name">${esc(team)}</div><p class="muted">Pendiente (bloque en revisión).</p></div>`;
    return `<div class="terr-team"><div class="shots-name">${esc(team)}</div>
      <div class="chips"><span class="chip2"><i></i>Final <b>${x.final}</b></span><span class="chip2"><i></i>Medio <b>${x.middle}</b></span><span class="chip2"><i></i>Propio <b>${x.defensive}</b></span></div></div>`;
  };
  return block(`Territorio <span class="muted" style="font-weight:400;letter-spacing:0;text-transform:none">ofrecimientos por tercio</span>`,
    `<div class="shots-grid">${one(o.subj)}${one(o.rival)}</div>`);
}

function matchCard(m) {
  const o = orient(m);
  const warn = m.warnings.length ? `<div class="note"><b>Avisos de lectura:</b> ${m.warnings.map(esc).join(" ")}</div>` : "";
  return `<section class="mc">
    <header class="mc-head">
      <h2>${esc(m.home)} <span class="score">${m.gh}&ndash;${m.ga}</span> ${esc(m.away)}</h2>
      <div class="mc-meta">${[m.date, m.matchNo ? "Partido " + m.matchNo : "", m.file].filter(Boolean).map(esc).join(" &middot; ")}</div>
    </header>
    ${warn}
    ${validationBlock(m)}
    ${keyStatsBlock(m, o)}
    ${shotsBlock(m, o)}
    ${tablesBlock(m, o)}
    ${territoryBlock(m, o)}
  </section>`;
}
