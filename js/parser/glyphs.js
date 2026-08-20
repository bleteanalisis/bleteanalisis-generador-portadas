/* ============================================================
   glyphs.js — decodificacion de glifos privados
   ------------------------------------------------------------
   El PMSR de la FIFA codifica algunos caracteres (digitos, puntos,
   parentesis...) como glifos de uso privado de Unicode. Este mapa,
   ya verificado en el prototipo, los devuelve a caracteres normales.
   ============================================================ */

export const PUA = {
  0xe071: "0", 0xe072: "1", 0xe073: "2", 0xe074: "3", 0xe075: "4",
  0xe076: "5", 0xe077: "6", 0xe078: "7", 0xe079: "8", 0xe07a: "9",
  0xe081: "(", 0xe082: ")", 0xe088: "-", 0xe092: ":", 0xe094: ".",
  0xe09d: "+"
};

/** Traduce una cadena sustituyendo los glifos privados por su caracter real. */
export const dec = s => [...s].map(c => PUA[c.codePointAt(0)] ?? c).join("");

/** Es un token numerico? (admite decimales, signo y porcentaje) */
export const NUM = /^-?\d+(?:\.\d+)?%?$/;

/** Normaliza texto para comparaciones: quita caracteres de control y baja a minusculas. */
export const clean = s => s.replace(/[\x00-\x1f]/g, " ").toLowerCase();
