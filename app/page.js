"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

const ACCENT_MAP = { partido: "#c9a24b", individual: "#b23a2f", colectivo: "#3a6a8c" };
const COLOR_NAMES = { "#c9a24b": "Dorado", "#b23a2f": "Rojo", "#3a6a8c": "Azul", "#3a8c5a": "Verde", "#6a3a8c": "Morado" };
const SWEEP_SHAPES = {
  partido: "polygon(20% 0%,42% 0%,70% 100%,48% 100%)",
  individual: "polygon(0% 0%,36% 0%,12% 100%,0% 100%)",
  colectivo: "polygon(0% 100%,100% 48%,100% 100%)",
};
const JORNADA_STYLES = {
  limpio: "Limpio",
  serif: "Serif",
  bloque: "Bloque",
  barra: "Barra",
  capsula: "Cápsula",
};
const VS_STYLES = {
  serif: "Serif",
  versalita: "VS",
  guion: "Guion",
  punto: "Punto",
};
const RATIOS = {
  newsletter: { label: "Newsletter", dims: "1200 × 630", ratio: "1200/630", w: 1200, h: 630 },
  estandar: { label: "Estándar", dims: "1280 × 720", ratio: "1280/720", w: 1280, h: 720 },
  portfolio: { label: "Portfolio", dims: "1600 × 1200", ratio: "4/3", w: 1600, h: 1200 },
};

export default function Home() {
  const [category, setCategory] = useState("partido");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState("newsletter");
  const [watermark, setWatermark] = useState(false);
  const [customColor, setCustomColor] = useState(null);
  const [jornadaText, setJornadaText] = useState("Jornada 14");
  const [positions, setPositions] = useState({});
  const [guides, setGuides] = useState({ v: false, h: false });
  const [dragActive, setDragActive] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [crestAUrl, setCrestAUrl] = useState(null);
  const [crestBUrl, setCrestBUrl] = useState(null);
  const [leagueUrl, setLeagueUrl] = useState(null);
  const [teamCrestUrl, setTeamCrestUrl] = useState(null);
  const [bgUrl, setBgUrl] = useState(null);
  const [bgBlur, setBgBlur] = useState(8);
  const [colectivoPhotos, setColectivoPhotos] = useState([]);
  const [crestScale, setCrestScale] = useState(1);
  const [leagueScale, setLeagueScale] = useState(1);
  const [teamCrestScale, setTeamCrestScale] = useState(1);
  const [autoAccent, setAutoAccent] = useState(null);
  const [showJornada, setShowJornada] = useState(true);
  const [showVs, setShowVs] = useState(true);
  const [showVsLine, setShowVsLine] = useState(false);
  const [jornadaStyle, setJornadaStyle] = useState("limpio");
  const [jornadaSize, setJornadaSize] = useState(1);
  const [vsStyle, setVsStyle] = useState("serif");
  const [vsSize, setVsSize] = useState(1);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [watermarkUrl, setWatermarkUrl] = useState(null);
  const [watermarkScale, setWatermarkScale] = useState(1);
  const [watermarkOpacity, setWatermarkOpacity] = useState(55);

  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  const crestAInputRef = useRef(null);
  const crestBInputRef = useRef(null);
  const leagueInputRef = useRef(null);
  const teamCrestInputRef = useRef(null);
  const crestAUrlRef = useRef(null);
  const crestBUrlRef = useRef(null);
  const leagueUrlRef = useRef(null);
  const teamCrestUrlRef = useRef(null);
  const bgUrlRef = useRef(null);
  const bgInputRef = useRef(null);
  const watermarkUrlRef = useRef(null);
  const watermarkInputRef = useRef(null);
  const colectivoInputRef = useRef(null);
  const colectivoUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (crestAUrlRef.current) URL.revokeObjectURL(crestAUrlRef.current);
      if (crestBUrlRef.current) URL.revokeObjectURL(crestBUrlRef.current);
      if (leagueUrlRef.current) URL.revokeObjectURL(leagueUrlRef.current);
      if (teamCrestUrlRef.current) URL.revokeObjectURL(teamCrestUrlRef.current);
      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
      if (watermarkUrlRef.current) URL.revokeObjectURL(watermarkUrlRef.current);
      colectivoUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  function stripBackground(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/") || file.type === "image/svg+xml") {
        resolve(file);
        return;
      }
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const maxDim = 700;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          const data = ctx.getImageData(0, 0, w, h);
          const px = data.data;
          const sample = (x, y) => {
            const i = (y * w + x) * 4;
            return [px[i], px[i + 1], px[i + 2], px[i + 3]];
          };
          const corners = [sample(1, 1), sample(w - 2, 1), sample(1, h - 2), sample(w - 2, h - 2)];
          const avgAlpha = corners.reduce((a, c) => a + c[3] / 4, 0);
          if (avgAlpha < 40) {
            resolve(file);
            return;
          }
          const bg = corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4, a[2] + c[2] / 4], [0, 0, 0]);
          const dist = (r, g, b) => Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);
          const T1 = 38;
          const T2 = 100;
          for (let i = 0; i < px.length; i += 4) {
            const d = dist(px[i], px[i + 1], px[i + 2]);
            if (d < T1) {
              px[i + 3] = 0;
            } else if (d < T2) {
              px[i + 3] = Math.round(px[i + 3] * ((d - T1) / (T2 - T1)));
            }
          }
          ctx.putImageData(data, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + "-sinfondo.png", { type: "image/png" }));
          }, "image/png");
        } catch (err) {
          console.error("No se pudo quitar el fondo", err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  }

  function extractAccentColor(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/")) {
        resolve(null);
        return;
      }
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const size = 80;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          const { data } = ctx.getImageData(0, 0, size, size);
          let r = 0,
            g = 0,
            b = 0,
            count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const rr = data[i];
            const gg = data[i + 1];
            const bb = data[i + 2];
            const aa = data[i + 3];
            if (aa < 100) continue;
            const max = Math.max(rr, gg, bb);
            const min = Math.min(rr, gg, bb);
            if (max - min < 40 || max < 40 || max > 250) continue;
            r += rr;
            g += gg;
            b += bb;
            count++;
          }
          if (count < 10) {
            resolve(null);
            return;
          }
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          const hex =
            "#" +
            [r, g, b]
              .map((v) => v.toString(16).padStart(2, "0"))
              .join("");
          resolve(hex);
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function pickImage(urlRef, setter, file) {
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setter(url);
  }

  function clearImage(urlRef, setter) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setter(null);
  }

  function addColectivoPhoto(file) {
    if (!file || colectivoPhotos.length >= 3) return;
    const url = URL.createObjectURL(file);
    colectivoUrlsRef.current.push(url);
    setColectivoPhotos((list) => [...list, { url, name: file.name }]);
    resetForNewPhoto();
  }

  function removeColectivoPhoto(index) {
    setColectivoPhotos((list) => {
      const item = list[index];
      if (item) {
        URL.revokeObjectURL(item.url);
        colectivoUrlsRef.current = colectivoUrlsRef.current.filter((u) => u !== item.url);
      }
      return list.filter((_, i) => i !== index);
    });
    resetForNewPhoto();
  }

  const accent = customColor || autoAccent || ACCENT_MAP[category];

  function resetForNewPhoto() {
    setGenerated(false);
    setGenerating(false);
  }

  function selectCategory(cat) {
    setCategory(cat);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPhotoUrl(null);
    setPhotoName("");
    setGenerated(false);
    setGenerating(false);
    setPositions({});
    clearImage(crestAUrlRef, setCrestAUrl);
    clearImage(crestBUrlRef, setCrestBUrl);
    clearImage(leagueUrlRef, setLeagueUrl);
    clearImage(teamCrestUrlRef, setTeamCrestUrl);
    colectivoUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    colectivoUrlsRef.current = [];
    setColectivoPhotos([]);
    setCrestScale(1);
    setLeagueScale(1);
    setTeamCrestScale(1);
    setAutoAccent(null);
    setPhotoScale(1);
    setPhotoOffsetY(0);
    setShowJornada(true);
    setShowVs(true);
    setShowVsLine(false);
    setJornadaStyle("limpio");
    setJornadaSize(1);
    setVsStyle("serif");
    setVsSize(1);
  }

  function handleFileChosen(file) {
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoUrl(url);
    setPhotoName(file.name);
    resetForNewPhoto();
  }

  function removePhoto() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPhotoUrl(null);
    setPhotoName("");
    resetForNewPhoto();
  }

  const hasPhoto = category === "colectivo" ? colectivoPhotos.length > 0 : !!photoUrl;
  const hasContent =
    hasPhoto || !!bgUrl || !!crestAUrl || !!crestBUrl || !!leagueUrl || !!teamCrestUrl;

  function handleGenerate() {
    if (!hasContent || generating) return;
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1200);
  }

  async function handleExport() {
    if (!generated || !previewRef.current || exporting) return;
    setExporting(true);
    try {
      const target = RATIOS[format];
      const dataUrl = await toPng(previewRef.current, {
        canvasWidth: target.w,
        canvasHeight: target.h,
        pixelRatio: 1,
      });
      const link = document.createElement("a");
      link.download = `portada-${category}-${format}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exportando PNG", err);
    } finally {
      setExporting(false);
    }
  }

  function startDrag(key) {
    return function onPointerDown(e) {
      e.preventDefault();
      const previewEl = previewRef.current;
      if (!previewEl) return;
      const target = e.currentTarget;
      const cRect0 = previewEl.getBoundingClientRect();
      const elRect = target.getBoundingClientRect();
      const centerX = elRect.left + elRect.width / 2;
      const centerY = elRect.top + elRect.height / 2;
      const grabOffsetX = e.clientX - centerX;
      const grabOffsetY = e.clientY - centerY;

      const startLeft = ((centerX - cRect0.left) / cRect0.width) * 100;
      const startTop = ((centerY - cRect0.top) / cRect0.height) * 100;
      setPositions((p) => ({ ...p, [key]: { left: startLeft, top: startTop } }));
      setDragActive(true);
      target.setPointerCapture(e.pointerId);

      function onMove(ev) {
        const cRect = previewEl.getBoundingClientRect();
        const cx = ev.clientX - grabOffsetX;
        const cy = ev.clientY - grabOffsetY;
        let lp = ((cx - cRect.left) / cRect.width) * 100;
        let tp = ((cy - cRect.top) / cRect.height) * 100;
        lp = Math.max(3, Math.min(97, lp));
        tp = Math.max(3, Math.min(97, tp));
        let vShow = false;
        let hShow = false;
        if (Math.abs(lp - 50) < 1.6) {
          lp = 50;
          vShow = true;
        }
        if (Math.abs(tp - 50) < 1.6) {
          tp = 50;
          hShow = true;
        }
        setPositions((p) => ({ ...p, [key]: { left: lp, top: tp } }));
        setGuides({ v: vShow, h: hShow });
      }
      function onUp(ev) {
        target.releasePointerCapture(ev.pointerId);
        setDragActive(false);
        setGuides({ v: false, h: false });
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
      }
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    };
  }

  function resetPositions() {
    setPositions({});
  }

  function resetAll() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    colectivoUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    colectivoUrlsRef.current = [];
    clearImage(crestAUrlRef, setCrestAUrl);
    clearImage(crestBUrlRef, setCrestBUrl);
    clearImage(leagueUrlRef, setLeagueUrl);
    clearImage(teamCrestUrlRef, setTeamCrestUrl);
    clearImage(bgUrlRef, setBgUrl);
    clearImage(watermarkUrlRef, setWatermarkUrl);

    setPhotoUrl(null);
    setPhotoName("");
    setColectivoPhotos([]);
    setGenerated(false);
    setGenerating(false);
    setPositions({});
    setCustomColor(null);
    setAutoAccent(null);
    setJornadaText("Jornada 14");
    setShowJornada(true);
    setShowVs(true);
    setShowVsLine(false);
    setJornadaStyle("limpio");
    setJornadaSize(1);
    setVsStyle("serif");
    setVsSize(1);
    setPhotoScale(1);
    setPhotoOffsetY(0);
    setCrestScale(1);
    setLeagueScale(1);
    setTeamCrestScale(1);
    setBgBlur(8);
    setWatermark(false);
    setWatermarkScale(1);
    setWatermarkOpacity(55);
    setFormat("newsletter");
  }

  function styleFor(key) {
    const p = positions[key];
    if (!p) return {};
    return { left: p.left + "%", top: p.top + "%", right: "auto", bottom: "auto", transform: "translate(-50%,-50%)" };
  }

  function photoFrameStyle() {
    return {
      width: 46 * photoScale + "%",
      height: 74 * photoScale + "%",
      bottom: photoOffsetY + "%",
    };
  }

  function colectivoFrameStyle(index, count) {
    const spans = { 1: [60], 2: [36, 36], 3: [26, 30, 26] };
    const heights = { 1: [80], 2: [78, 82], 3: [66, 84, 70] };
    const widths = spans[count] || spans[1];
    const heightList = heights[count] || heights[1];
    const gap = 2;
    const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (count - 1);
    const startLeft = (100 - totalWidth) / 2;
    let left = startLeft;
    for (let i = 0; i < index; i++) left += widths[i] + gap;
    return {
      left: left + "%",
      width: widths[index] + "%",
      height: heightList[index] + "%",
      bottom: 0,
      WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 16%)",
      maskImage: "linear-gradient(to bottom, transparent 0%, black 16%)",
    };
  }

  const fmt = RATIOS[format];
  const generateLabel = generating
    ? "Generando…"
    : !hasContent
    ? "Añade una foto, un fondo o un escudo"
    : generated
    ? "Volver a generar"
    : "Generar portada";
  const stageCaptionText = generating
    ? "Componiendo con el tratamiento editorial…"
    : generated
    ? "Vista previa — así se compondría tu portada"
    : "Añade una foto, un fondo o un escudo y pulsa Generar";

  return (
    <div className="app">
      <style>{CSS}</style>

      <div className="topbar">
        <div className="brand">
          <div className="brand-name">Más Allá del Gol</div>
          <div className="brand-div" />
          <div className="brand-sub">Generador de portadas</div>
        </div>
        <div className="topbar-right">
          <div className="draft-note">Borrador sin guardar</div>
          <div className="avatar">B</div>
        </div>
      </div>

      <div className="body">
        <div className="panel">
          <div className="stack">
            <div className="label">Tipo de portada</div>
            <div className="tabs">
              {["partido", "individual", "colectivo"].map((cat) => (
                <button
                  key={cat}
                  className={"tab" + (category === cat ? " active" : "")}
                  onClick={() => selectCategory(cat)}
                >
                  {cat === "partido" ? "Partido" : cat === "individual" ? "Individual" : "Colectivo"}
                </button>
              ))}
            </div>
          </div>

          {category === "colectivo" ? (
            <div className="stack">
              <div className="label">1 · Fotografías ({colectivoPhotos.length}/3)</div>
              <input
                ref={colectivoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={(e) => {
                  addColectivoPhoto(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
              {colectivoPhotos.map((p, i) => (
                <div className="photo-card" key={p.url}>
                  <div className="photo-thumb">
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                  </div>
                  <div className="photo-meta">
                    <div className="photo-name">{p.name}</div>
                    <div className="photo-status">{i === 0 ? "Jugador / cuerpo técnico" : "Jugador adicional"}</div>
                  </div>
                  <button className="photo-remove" onClick={() => removeColectivoPhoto(i)} aria-label="Quitar foto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {colectivoPhotos.length < 3 && (
                <button className="dropzone" onClick={() => colectivoInputRef.current?.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="1.6">
                    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  <div className="dropzone-title">{colectivoPhotos.length === 0 ? "Subir fotografía" : "Añadir otra"}</div>
                  <div className="dropzone-sub">Hasta 3 · jugadores, entrenador, etc.</div>
                </button>
              )}
            </div>
          ) : (
            <div className="stack">
              <div className="label">1 · Fotografía</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
              />
              {!photoUrl ? (
                <button className="dropzone" onClick={() => fileInputRef.current?.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="1.6">
                    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  <div className="dropzone-title">Subir fotografía</div>
                  <div className="dropzone-sub">PNG o JPG · se recorta y estiliza sola</div>
                </button>
              ) : (
                <>
                  <div className="photo-card">
                    <div className="photo-thumb">
                      <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                    </div>
                    <div className="photo-meta">
                      <div className="photo-name">{photoName}</div>
                      <div className="photo-status">{generated ? "Recorte + tratamiento aplicado" : "Lista para generar"}</div>
                    </div>
                    <button className="photo-remove" onClick={removePhoto} aria-label="Quitar foto">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {category === "partido" && (
                    <>
                      <div className="blur-row">
                        <span className="crest-label">Tamaño</span>
                        <input
                          type="range"
                          min="0.4"
                          max="1.6"
                          step="0.05"
                          value={photoScale}
                          onChange={(e) => setPhotoScale(Number(e.target.value))}
                          className="blur-slider"
                        />
                        <span className="blur-value">{Math.round(photoScale * 100)}%</span>
                      </div>
                      <div className="blur-row">
                        <span className="crest-label">Altura</span>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          value={photoOffsetY}
                          onChange={(e) => setPhotoOffsetY(Number(e.target.value))}
                          className="blur-slider"
                        />
                        <span className="blur-value">{photoOffsetY}%</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {category === "partido" && (
            <div className="stack">
              <div className="label">2 · Equipos y contexto</div>
              <div className="crest-row">
                <input
                  ref={crestAInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    e.target.value = "";
                    if (!f) return;
                    pickImage(crestAUrlRef, setCrestAUrl, await stripBackground(f));
                  }}
                />
                <button type="button" className="crest-slot" onClick={() => crestAInputRef.current?.click()}>
                  {crestAUrl ? (
                    <img src={crestAUrl} alt="" className="crest-thumb" />
                  ) : (
                    <div className="crest-dot" />
                  )}
                  <div className="crest-label">Escudo A</div>
                </button>
                <input
                  ref={crestBInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    e.target.value = "";
                    if (!f) return;
                    pickImage(crestBUrlRef, setCrestBUrl, await stripBackground(f));
                  }}
                />
                <button type="button" className="crest-slot" onClick={() => crestBInputRef.current?.click()}>
                  {crestBUrl ? (
                    <img src={crestBUrl} alt="" className="crest-thumb" />
                  ) : (
                    <div className="crest-dot" />
                  )}
                  <div className="crest-label">Escudo B</div>
                </button>
              </div>
              {(crestAUrl || crestBUrl) && (
                <div className="blur-row">
                  <span className="crest-label">Tamaño</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={crestScale}
                    onChange={(e) => setCrestScale(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{Math.round(crestScale * 100)}%</span>
                </div>
              )}
              <input
                ref={leagueInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0] || null;
                  e.target.value = "";
                  if (!f) return;
                  const color = await extractAccentColor(f);
                  if (color) setAutoAccent(color);
                  pickImage(leagueUrlRef, setLeagueUrl, await stripBackground(f));
                }}
              />
              <button type="button" className="league-row" onClick={() => leagueInputRef.current?.click()}>
                {leagueUrl ? <img src={leagueUrl} alt="" className="league-thumb" /> : <div className="league-icon" />}
                <div className="crest-label">Logo de la liga</div>
              </button>
              {leagueUrl && (
                <div className="blur-row">
                  <span className="crest-label">Tamaño</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={leagueScale}
                    onChange={(e) => setLeagueScale(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{Math.round(leagueScale * 100)}%</span>
                </div>
              )}
              <input
                className="field-static field-input"
                value={jornadaText}
                onChange={(e) => setJornadaText(e.target.value)}
                placeholder="Jornada 14"
                disabled={!showJornada}
                style={showJornada ? undefined : { opacity: 0.4 }}
              />
              <div className="toggle-row">
                <div className="toggle-row-title">Mostrar jornada</div>
                <button className={"switch" + (showJornada ? " on" : "")} onClick={() => setShowJornada((v) => !v)}>
                  <div className="switch-knob" />
                </button>
              </div>
              {showJornada && (
                <>
                  <div className="pill-row">
                    {Object.entries(JORNADA_STYLES).map(([id, name]) => (
                      <button
                        key={id}
                        className={"style-pill" + (jornadaStyle === id ? " active" : "")}
                        onClick={() => setJornadaStyle(id)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <div className="blur-row">
                    <span className="crest-label">Tamaño</span>
                    <input
                      type="range"
                      min="0.6"
                      max="2.5"
                      step="0.05"
                      value={jornadaSize}
                      onChange={(e) => setJornadaSize(Number(e.target.value))}
                      className="blur-slider"
                    />
                    <span className="blur-value">{Math.round(jornadaSize * 100)}%</span>
                  </div>
                </>
              )}

              <div className="toggle-row">
                <div className="toggle-row-title">Mostrar «vs»</div>
                <button className={"switch" + (showVs ? " on" : "")} onClick={() => setShowVs((v) => !v)}>
                  <div className="switch-knob" />
                </button>
              </div>
              {showVs && (
                <>
                  <div className="pill-row">
                    {Object.entries(VS_STYLES).map(([id, name]) => (
                      <button
                        key={id}
                        className={"style-pill" + (vsStyle === id ? " active" : "")}
                        onClick={() => setVsStyle(id)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <div className="blur-row">
                    <span className="crest-label">Tamaño</span>
                    <input
                      type="range"
                      min="0.6"
                      max="3"
                      step="0.05"
                      value={vsSize}
                      onChange={(e) => setVsSize(Number(e.target.value))}
                      className="blur-slider"
                    />
                    <span className="blur-value">{Math.round(vsSize * 100)}%</span>
                  </div>
                </>
              )}

              <div className="toggle-row">
                <div className="toggle-row-title">Mostrar línea divisoria</div>
                <button className={"switch" + (showVsLine ? " on" : "")} onClick={() => setShowVsLine((v) => !v)}>
                  <div className="switch-knob" />
                </button>
              </div>
            </div>
          )}

          {category === "individual" && (
            <div className="stack">
              <div className="label">2 · Equipo del jugador</div>
              <input
                ref={teamCrestInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0] || null;
                  e.target.value = "";
                  if (!f) return;
                  const color = await extractAccentColor(f);
                  if (color) setAutoAccent(color);
                  pickImage(teamCrestUrlRef, setTeamCrestUrl, await stripBackground(f));
                }}
              />
              <button type="button" className="toggle-row" style={{ width: "100%", textAlign: "left" }} onClick={() => teamCrestInputRef.current?.click()}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {teamCrestUrl ? (
                    <img src={teamCrestUrl} alt="" className="crest-thumb" style={{ width: 26, height: 26 }} />
                  ) : (
                    <div className="crest-dot" style={{ width: 26, height: 26, border: "1px dashed var(--border-strong)" }} />
                  )}
                  <div className="photo-status">{teamCrestUrl ? "Escudo cargado" : "Escudo (discreto) — toca para subir"}</div>
                </div>
              </button>
              {teamCrestUrl && (
                <div className="blur-row">
                  <span className="crest-label">Tamaño</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={teamCrestScale}
                    onChange={(e) => setTeamCrestScale(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{Math.round(teamCrestScale * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {category === "colectivo" && (
            <div className="stack">
              <div className="label">2 · Equipo</div>
              <input
                ref={teamCrestInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0] || null;
                  e.target.value = "";
                  if (!f) return;
                  const color = await extractAccentColor(f);
                  if (color) setAutoAccent(color);
                  pickImage(teamCrestUrlRef, setTeamCrestUrl, await stripBackground(f));
                }}
              />
              <button type="button" className="league-row" onClick={() => teamCrestInputRef.current?.click()}>
                {teamCrestUrl ? (
                  <img src={teamCrestUrl} alt="" className="crest-thumb" style={{ width: 26, height: 26 }} />
                ) : (
                  <div className="crest-dot" style={{ width: 26, height: 26 }} />
                )}
                <div className="photo-status">{teamCrestUrl ? "Escudo cargado" : "Escudo del equipo — toca para subir"}</div>
              </button>
              {teamCrestUrl && (
                <div className="blur-row">
                  <span className="crest-label">Tamaño</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={teamCrestScale}
                    onChange={(e) => setTeamCrestScale(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{Math.round(teamCrestScale * 100)}%</span>
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>
                Sube una foto con varios jugadores y/o el cuerpo técnico — la composición se adapta sola.
              </div>
            </div>
          )}

          <div className="stack">
            <div className="label">3 · Color de acento</div>
            <div className="swatch-row">
              <button
                className={"swatch auto" + (!customColor ? " active" : "")}
                onClick={() => setCustomColor(null)}
                title="Automático (según categoría)"
              />
              {Object.keys(COLOR_NAMES).map((c) => (
                <button
                  key={c}
                  className={"swatch" + (customColor === c ? " active" : "")}
                  style={{ background: c }}
                  title={COLOR_NAMES[c]}
                  onClick={() => setCustomColor(c)}
                />
              ))}
              <span className="swatch-label">
                {customColor
                  ? `${COLOR_NAMES[customColor]} — fijo para esta portada`
                  : autoAccent
                  ? "Extraído del logo que has subido"
                  : "Automático — según la categoría"}
              </span>
            </div>
          </div>

          <div className="stack">
            <div className="label">4 · Fondo personalizado</div>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => pickImage(bgUrlRef, setBgUrl, e.target.files?.[0] || null)}
            />
            {!bgUrl ? (
              <button className="dropzone" onClick={() => bgInputRef.current?.click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="1.6">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="8.5" cy="9.5" r="1.5" />
                  <path d="M21 15l-5-5-8 8" />
                </svg>
                <div className="dropzone-title">Subir imagen de fondo</div>
                <div className="dropzone-sub">Opcional · si no, se usa el fondo automático</div>
              </button>
            ) : (
              <>
                <div className="photo-card">
                  <div className="photo-thumb">
                    <img src={bgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                  </div>
                  <div className="photo-meta">
                    <div className="photo-name">Fondo personalizado</div>
                    <div className="photo-status">Sustituye el fondo automático</div>
                  </div>
                  <button className="photo-remove" onClick={() => clearImage(bgUrlRef, setBgUrl)} aria-label="Quitar fondo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="blur-row">
                  <span className="crest-label">Desenfoque</span>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{bgBlur}px</span>
                </div>
              </>
            )}
          </div>

          <div className="stack">
            <div className="label">5 · Formato de salida</div>
            <div className="chip-list">
              {Object.entries(RATIOS).map(([id, f]) => (
                <button key={id} className={"chip" + (format === id ? " active" : "")} onClick={() => setFormat(id)}>
                  <span>{f.label}</span>
                  <span className="chip-dims">{f.dims}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="stack">
            <div className="label">6 · Marca de agua</div>
            <div className="toggle-row">
              <div>
                <div className="toggle-row-title">Mostrar marca de agua</div>
                <div className="toggle-row-sub">
                  {watermarkUrl ? "Tu logo, en la esquina" : "Sube tu logo abajo"}
                </div>
              </div>
              <button className={"switch" + (watermark ? " on" : "")} onClick={() => setWatermark((w) => !w)}>
                <div className="switch-knob" />
              </button>
            </div>
            <input
              ref={watermarkInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0] || null;
                e.target.value = "";
                if (!f) return;
                pickImage(watermarkUrlRef, setWatermarkUrl, await stripBackground(f));
                setWatermark(true);
              }}
            />
            {!watermarkUrl ? (
              <button className="dropzone" onClick={() => watermarkInputRef.current?.click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" strokeWidth="1.6">
                  <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <div className="dropzone-title">Subir logo del proyecto</div>
                <div className="dropzone-sub">Se le quita el fondo automáticamente</div>
              </button>
            ) : (
              <>
                <div className="photo-card">
                  <div className="photo-thumb">
                    <img src={watermarkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <div className="photo-meta">
                    <div className="photo-name">Logo del proyecto</div>
                    <div className="photo-status">Arrástralo en la portada para colocarlo</div>
                  </div>
                  <button
                    className="photo-remove"
                    onClick={() => clearImage(watermarkUrlRef, setWatermarkUrl)}
                    aria-label="Quitar logo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="blur-row">
                  <span className="crest-label">Tamaño</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={watermarkScale}
                    onChange={(e) => setWatermarkScale(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{Math.round(watermarkScale * 100)}%</span>
                </div>
                <div className="blur-row">
                  <span className="crest-label">Opacidad</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="blur-slider"
                  />
                  <span className="blur-value">{watermarkOpacity}%</span>
                </div>
              </>
            )}
          </div>

          <button
            className={"export-btn" + (generating ? " generating" : "")}
            disabled={!hasContent || generating}
            onClick={handleGenerate}
          >
            <svg className="btn-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
            </svg>
            <svg className="spinner" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1a1508" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" strokeOpacity=".3" />
              <path d="M21 12a9 9 0 00-9-9" />
            </svg>
            <span>{generateLabel}</span>
          </button>
        </div>

        <div className="stage">
          <div
            ref={previewRef}
            className="preview"
            style={{ aspectRatio: fmt.ratio }}
          >
            {bgUrl && (
              <div className="custom-bg">
                <img src={bgUrl} alt="" style={{ filter: `blur(${bgBlur}px) brightness(.55)` }} />
              </div>
            )}
            <div
              className="color-wash"
              style={{ background: `linear-gradient(155deg,${accent}59 0%,${accent}22 38%,transparent 72%)` }}
            />
            <div className="grain" />
            <div
              className="wash"
              style={{ background: `radial-gradient(circle at 68% 38%,${accent}30 0%,transparent 58%)` }}
            />
            <div
              className="diagonal-sweep"
              style={{
                clipPath: SWEEP_SHAPES[category],
                background: `linear-gradient(135deg,${accent}70 0%,${accent}38 100%)`,
              }}
            />
            <div
              className="accent-circle"
              style={{ background: `radial-gradient(circle,${accent}38 0%,transparent 72%)` }}
            />
            <div className="accent-line" />

            {category === "partido" && (
              <>
                {generated && photoUrl && (
                  <div className="photo-frame photo-frame-partido" style={photoFrameStyle()}>
                    <img src={photoUrl} alt="" />
                  </div>
                )}
                {showJornada && (
                  <div
                    className={"jornada j-" + jornadaStyle}
                    style={{
                      ...styleFor("jornadaPill"),
                      fontSize: jornadaSize * 2.6 + "cqw",
                      ...(jornadaStyle === "bloque" ? { background: accent } : null),
                      ...(jornadaStyle === "barra" ? { borderColor: accent } : null),
                    }}
                    onPointerDown={startDrag("jornadaPill")}
                  >
                    {jornadaText || "Jornada 14"}
                  </div>
                )}
                {showVs && (
                  <div
                    className={"vs-mark v-" + vsStyle}
                    style={{ ...styleFor("vsMark"), fontSize: vsSize * 2.6 + "cqw" }}
                    onPointerDown={startDrag("vsMark")}
                  >
                    {vsStyle === "guion" ? "—" : vsStyle === "punto" ? "·" : vsStyle === "versalita" ? "VS" : "vs"}
                  </div>
                )}
                {showVsLine && <div className="vs-line" />}
                <div
                  className={(crestAUrl ? "crest-logo" : "crest-mark") + " crest-a"}
                  style={{ ...styleFor("crestA"), width: crestScale * 11 + "%" }}
                  onPointerDown={startDrag("crestA")}
                >
                  {crestAUrl ? <img src={crestAUrl} alt="" /> : "A"}
                </div>
                <div
                  className={(crestBUrl ? "crest-logo" : "crest-mark") + " crest-b"}
                  style={{ ...styleFor("crestB"), width: crestScale * 11 + "%" }}
                  onPointerDown={startDrag("crestB")}
                >
                  {crestBUrl ? <img src={crestBUrl} alt="" /> : "B"}
                </div>
                {leagueUrl && (
                  <div
                    className="league-mark"
                    style={{ ...styleFor("leagueLogo"), width: leagueScale * 6 + "%" }}
                    onPointerDown={startDrag("leagueLogo")}
                  >
                    <img src={leagueUrl} alt="" />
                  </div>
                )}
                {!generated && <div className="empty-note">Añade lo que quieras y pulsa Generar<br />(la foto es opcional)</div>}
              </>
            )}

            {category === "individual" && (
              <>
                {generated && photoUrl && (
                  <div className="photo-frame photo-frame-individual">
                    <img src={photoUrl} alt="" />
                  </div>
                )}
                {!generated && <div className="empty-note">Añade lo que quieras y pulsa Generar<br />(la foto es opcional)</div>}
                <div className="team-tag" style={styleFor("teamTag")} onPointerDown={startDrag("teamTag")}>
                  {teamCrestUrl ? (
                    <div className="team-logo" style={{ width: 22 * teamCrestScale }}>
                      <img src={teamCrestUrl} alt="" />
                    </div>
                  ) : (
                    <div className="team-mark" style={{ width: 20 * teamCrestScale, height: 20 * teamCrestScale }} />
                  )}
                  <div className="team-label">Equipo</div>
                </div>
              </>
            )}

            {category === "colectivo" && (
              <>
                {generated &&
                  colectivoPhotos.length > 0 &&
                  colectivoPhotos.map((p, i) => (
                    <div className="photo-frame" style={colectivoFrameStyle(i, colectivoPhotos.length)} key={p.url}>
                      <img src={p.url} alt="" />
                    </div>
                  ))}
                {!generated && <div className="empty-note">Añade lo que quieras y pulsa Generar<br />(la foto es opcional)</div>}
                <div className="team-tag" style={styleFor("teamTag")} onPointerDown={startDrag("teamTag")}>
                  {teamCrestUrl ? (
                    <div className="team-logo" style={{ width: 22 * teamCrestScale }}>
                      <img src={teamCrestUrl} alt="" />
                    </div>
                  ) : (
                    <div className="team-mark" style={{ width: 20 * teamCrestScale, height: 20 * teamCrestScale }} />
                  )}
                  <div className="team-label">Equipo</div>
                </div>
              </>
            )}

            {watermark && generated && watermarkUrl && (
              <div
                className="watermark-logo"
                style={{
                  ...styleFor("watermark"),
                  width: watermarkScale * 9 + "%",
                  opacity: watermarkOpacity / 100,
                }}
                onPointerDown={startDrag("watermark")}
              >
                <img src={watermarkUrl} alt="" />
              </div>
            )}

            <div className={"safe-margin" + (dragActive ? " show" : "")} />
            <div className={"snap-guide" + (guides.v ? " show" : "")} id="guideV" />
            <div className={"snap-guide" + (guides.h ? " show" : "")} id="guideH" />

            {generating && (
              <div className="stage-loading show">
                <div className="ring" />
                <div className="stage-loading-text">Generando portada…</div>
              </div>
            )}
          </div>

          <button className="stage-export" disabled={!generated || exporting} onClick={handleExport}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 4v12M12 16l-4-4M12 16l4-4" />
              <path d="M4 20h16" />
            </svg>
            {exporting ? "Exportando…" : "Exportar PNG"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="stage-caption">{stageCaptionText}</div>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <button className="reset-link" onClick={resetPositions}>
              Restablecer posiciones
            </button>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <button className="reset-link danger" onClick={resetAll}>
              Empezar de cero
            </button>
          </div>
          <div className="stage-caption" style={{ opacity: 0.75 }}>
            Arrastra los elementos — se alinean solos al centro y verás el margen seguro para recortes
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
:root{
  --bg:#0b0a09; --bg-2:#141210; --surface:#18150f; --surface-2:#221d15;
  --border:rgba(243,237,224,0.09); --border-strong:rgba(243,237,224,0.17);
  --text:#f3ede4; --text-dim:#a89f8f; --text-faint:#6f6759;
  --gold:#c9a24b; --gold-ink:#1a1508; --gold-soft:rgba(201,162,75,0.14); --focus:#e0b862;
  --font-display:'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-sans:'Manrope', system-ui, -apple-system, sans-serif;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:var(--font-sans);-webkit-font-smoothing:antialiased;}
a{color:var(--gold);text-decoration:none;}
button{font-family:var(--font-sans);cursor:pointer;-webkit-appearance:none;appearance:none;color:inherit;font-size:inherit;}
::selection{background:var(--gold-soft);}
.app{width:100%;min-height:100vh;display:flex;flex-direction:column;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 36px;border-bottom:1px solid var(--border);flex-shrink:0;}
.brand{display:flex;align-items:baseline;gap:14px;}
.brand-name{font-family:var(--font-display);font-size:20px;font-weight:600;}
.brand-div{width:1px;height:16px;background:var(--border-strong);}
.brand-sub{font-size:13px;color:var(--text-dim);letter-spacing:0.02em;}
.topbar-right{display:flex;align-items:center;gap:16px;}
.draft-note{font-size:11.5px;color:var(--text-faint);letter-spacing:0.08em;text-transform:uppercase;}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:14px;color:var(--gold);}
.body{display:flex;flex:1;min-height:0;}
.panel{width:388px;flex-shrink:0;border-right:1px solid var(--border);padding:28px 28px 40px 28px;display:flex;flex-direction:column;gap:26px;overflow-y:auto;max-height:calc(100vh - 78px);}
.label{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-faint);}
.stack{display:flex;flex-direction:column;gap:10px;}
.tabs{display:flex;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;}
.tab{flex:1;padding:9px 4px;border:none;border-radius:7px;font-size:12.5px;font-weight:600;background:transparent;color:var(--text-dim);transition:background .15s,color .15s;}
.tab.active{background:var(--gold);color:var(--gold-ink);}
.dropzone{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 16px;background:var(--surface);border:1.5px dashed var(--border-strong);border-radius:10px;color:var(--text-dim);text-align:center;width:100%;}
.dropzone:hover{border-color:var(--gold);}
.dropzone-title{font-size:13px;color:var(--text);font-weight:600;}
.dropzone-sub{font-size:12px;color:var(--text-faint);}
.photo-card{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;}
.photo-thumb{width:38px;height:38px;border-radius:8px;background:var(--surface-2);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.photo-meta{flex:1;min-width:0;}
.photo-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.photo-status{font-size:12px;color:var(--text-dim);}
.photo-remove{background:none;border:none;color:var(--text-faint);padding:4px;display:flex;}
.photo-remove:hover{color:var(--text);}
.adjust-link{font-size:12px;}
.crest-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.crest-slot{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;background:var(--surface);border:1px dashed var(--border-strong);border-radius:10px;}
.crest-dot{width:30px;height:30px;border-radius:50%;background:var(--surface-2);}
.crest-thumb{width:30px;height:30px;border-radius:50%;object-fit:cover;background:var(--surface-2);}
.crest-label{font-size:11px;color:var(--text-dim);}
.league-row{display:flex;align-items:center;gap:6px;padding:10px 8px;background:var(--surface);border:1px dashed var(--border-strong);border-radius:10px;width:100%;text-align:left;}
.league-icon{width:22px;height:22px;border-radius:6px;background:var(--surface-2);flex-shrink:0;}
.league-thumb{width:22px;height:22px;border-radius:6px;object-fit:contain;background:var(--surface-2);flex-shrink:0;}
.field-static{padding:11px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--text-faint);}
.field-input{width:100%;outline:none;font-family:var(--font-sans);color:var(--text);}
.field-input:focus{border-color:var(--gold);color:var(--text);}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;}
.toggle-row-title{font-size:13px;font-weight:600;}
.toggle-row-sub{font-size:12px;color:var(--text-faint);}
.switch{width:34px;height:20px;border-radius:10px;border:none;position:relative;flex-shrink:0;background:var(--surface-2);transition:background .15s;}
.switch.on{background:var(--gold);}
.switch-knob{width:16px;height:16px;border-radius:50%;background:var(--text-faint);position:absolute;top:2px;left:2px;transition:left .15s,background .15s;}
.switch.on .switch-knob{background:var(--gold-ink);left:16px;}
.swatch-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.swatch{width:26px;height:26px;border-radius:50%;border:2px solid transparent;padding:0;position:relative;transition:transform .12s ease,border-color .12s ease;}
.swatch:hover{transform:scale(1.08);}
.swatch.active{border-color:var(--text);}
.swatch.auto{background:conic-gradient(from 180deg,#c9a24b,#b23a2f,#3a6a8c,#3a8c5a,#c9a24b);display:flex;align-items:center;justify-content:center;}
.swatch.auto::after{content:"";width:14px;height:14px;border-radius:50%;background:var(--surface);}
.swatch-label{font-size:11px;color:var(--text-faint);width:100%;}
.chip-list{display:flex;flex-direction:column;gap:6px;}
.chip{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:9px;font-size:12.5px;font-weight:600;text-align:left;width:100%;background:var(--surface);border:1px solid var(--border);color:var(--text-dim);}
.chip.active{background:var(--gold-soft);border:1px solid var(--gold);color:var(--text);}
.chip-dims{font-weight:400;color:var(--text-faint);font-variant-numeric:tabular-nums;}
.chip.active .chip-dims{color:var(--text-dim);}
.export-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:15px;background:var(--gold);color:var(--gold-ink);border:none;border-radius:10px;font-size:14px;font-weight:700;margin-top:4px;transition:background .15s,opacity .15s;}
.export-btn:hover{background:var(--focus);}
.export-btn:disabled{background:var(--surface-2);color:var(--text-faint);cursor:not-allowed;}
.export-btn .spinner{display:none;}
.export-btn.generating .spinner{display:block;animation:spin .8s linear infinite;}
.export-btn.generating .btn-icon{display:none;}
.export-btn.generating{background:var(--gold);color:var(--gold-ink);opacity:.85;}
@keyframes spin{to{transform:rotate(360deg);}}
.stage-export{display:flex;align-items:center;justify-content:center;gap:9px;padding:11px 22px;background:transparent;color:var(--text-dim);border:1px solid var(--border-strong);border-radius:9px;font-size:13px;font-weight:600;transition:border-color .15s,color .15s;}
.stage-export:not(:disabled):hover{border-color:var(--gold);color:var(--text);}
.stage-export:disabled{opacity:.4;cursor:not-allowed;}
.stage-loading{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:rgba(6,5,5,.72);z-index:5;}
.stage-loading.show{display:flex;}
.stage-loading-text{font-size:12.5px;color:var(--text-dim);letter-spacing:.04em;}
.ring{width:26px;height:26px;border-radius:50%;border:2.5px solid var(--border-strong);border-top-color:var(--gold);animation:spin .8s linear infinite;}
.stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:48px;background:radial-gradient(ellipse at 50% 40%,var(--bg-2) 0%,var(--bg) 70%);min-width:0;}
.preview{width:min(100%,860px);position:relative;border-radius:6px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,0.6),0 0 0 1px var(--border-strong);background:linear-gradient(160deg,#141210 0%,#0a0908 60%,#060505 100%);container-type:inline-size;}
.color-wash{position:absolute;inset:0;pointer-events:none;}
.custom-bg{position:absolute;inset:-4%;pointer-events:none;overflow:hidden;}
.custom-bg img{width:100%;height:100%;object-fit:cover;}
.pill-row{display:flex;flex-wrap:wrap;gap:5px;}
.style-pill{padding:6px 11px;border-radius:7px;font-size:11.5px;font-weight:600;background:var(--surface);border:1px solid var(--border);color:var(--text-faint);}
.style-pill:hover{color:var(--text-dim);border-color:var(--border-strong);}
.style-pill.active{background:var(--gold-soft);border-color:var(--gold);color:var(--text);}
.blur-row{display:flex;align-items:center;gap:10px;padding:2px 2px;}
.blur-slider{flex:1;accent-color:var(--gold);}
.blur-value{font-size:11px;color:var(--text-faint);font-variant-numeric:tabular-nums;min-width:32px;text-align:right;}
.grain{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 3px);pointer-events:none;}
.wash{position:absolute;inset:0;pointer-events:none;}
.diagonal-sweep{position:absolute;inset:0;pointer-events:none;}
.accent-circle{position:absolute;right:4%;top:10%;width:42%;aspect-ratio:1;border-radius:50%;}
.accent-line{position:absolute;left:6%;top:9%;width:14%;height:2px;background:var(--gold);opacity:.6;}
.jornada{position:absolute;left:50%;top:29%;transform:translateX(-50%);white-space:nowrap;line-height:1.2;}
.j-limpio{font-family:var(--font-sans);font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:var(--text);text-shadow:0 2px 10px rgba(0,0,0,.6);}
.j-serif{font-family:var(--font-display);font-weight:500;font-style:italic;letter-spacing:.02em;color:var(--text);text-shadow:0 2px 10px rgba(0,0,0,.6);}
.j-bloque{font-family:var(--font-sans);font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#0b0a09;padding:.5em 1em;}
.j-barra{font-family:var(--font-sans);font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--text);padding:.45em 0;border-top:2px solid var(--gold);border-bottom:2px solid var(--gold);}
.j-capsula{font-family:var(--font-sans);font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);padding:.55em 1.4em;border:1px solid rgba(243,237,224,.3);border-radius:999px;}
.vs-mark{position:absolute;left:50%;top:18.5%;transform:translate(-50%,-50%);color:var(--text-faint);line-height:1;}
.v-serif{font-family:var(--font-display);font-style:italic;}
.v-versalita{font-family:var(--font-sans);font-weight:700;letter-spacing:.18em;}
.v-guion{font-family:var(--font-sans);font-weight:300;}
.v-punto{font-family:var(--font-sans);font-weight:700;}
.vs-line{position:absolute;left:50%;top:40%;bottom:10%;width:1px;background:linear-gradient(180deg,transparent 0%,rgba(243,237,224,.3) 50%,transparent 100%);}
.crest-mark{width:11%;aspect-ratio:1;border-radius:50%;background:var(--surface-2);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:3.4cqw;color:var(--text-dim);position:absolute;top:13%;}
.crest-logo{position:absolute;top:13%;filter:drop-shadow(0 3px 10px rgba(0,0,0,.55));}
.crest-logo img{width:100%;height:auto;display:block;object-fit:contain;}
.crest-a{left:50%;transform:translateX(calc(-100% - 5.5%));}
.crest-b{left:calc(50% + 5.5%);}
.league-mark{position:absolute;left:50%;top:3%;transform:translateX(-50%);width:6%;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5));}
.league-mark img{width:100%;height:auto;display:block;object-fit:contain;}
.team-tag{position:absolute;left:8%;bottom:9%;display:flex;align-items:center;gap:7px;opacity:.85;}
.team-mark{width:20px;height:20px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border-strong);}
.team-logo{filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));}
.team-logo img{width:100%;height:auto;display:block;object-fit:contain;}
.team-label{font-family:var(--font-sans);font-size:10px;letter-spacing:.1em;color:var(--text-faint);text-transform:uppercase;}
.empty-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-sans);font-size:12px;color:var(--text-faint);text-align:center;letter-spacing:.04em;line-height:1.5;}
.watermark-logo{position:absolute;right:4%;bottom:4%;filter:drop-shadow(0 2px 8px rgba(0,0,0,.5));}
.watermark-logo img{width:100%;height:auto;display:block;object-fit:contain;}
.photo-frame{position:absolute;overflow:hidden;z-index:1;}
.photo-frame img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.15) brightness(.92);display:block;}
.photo-frame-individual{right:6%;bottom:0;width:46%;height:92%;-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 16%);mask-image:linear-gradient(to bottom,transparent 0%,black 16%);}
.photo-frame-colectivo{left:50%;bottom:0;width:60%;height:80%;transform:translateX(-50%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 16%);mask-image:linear-gradient(to bottom,transparent 0%,black 16%);}
.photo-frame-partido{left:50%;bottom:0;width:46%;height:74%;transform:translateX(-50%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 20%);mask-image:linear-gradient(to bottom,transparent 0%,black 20%);}
.jornada,.crest-mark,.crest-logo,.team-tag,.league-mark,.watermark-logo,.vs-mark{cursor:grab;touch-action:none;z-index:3;}
.jornada:hover,.crest-mark:hover,.crest-logo:hover,.team-tag:hover,.league-mark:hover,.watermark-logo:hover,.vs-mark:hover{outline:1px dashed rgba(243,237,224,.4);outline-offset:4px;}
.jornada:active,.crest-mark:active,.crest-logo:active,.team-tag:active,.league-mark:active,.watermark-logo:active,.vs-mark:active{cursor:grabbing;outline:1px dashed var(--gold);z-index:10;}
.safe-margin{position:absolute;inset:6%;border:1px dashed rgba(243,237,224,.3);pointer-events:none;opacity:0;transition:opacity .15s ease;border-radius:2px;}
.safe-margin.show{opacity:1;}
.snap-guide{position:absolute;background:var(--gold);opacity:0;pointer-events:none;transition:opacity .08s ease;box-shadow:0 0 6px rgba(201,162,75,.6);}
.snap-guide.show{opacity:.85;}
#guideV{left:50%;top:0;bottom:0;width:1px;transform:translateX(-50%);}
#guideH{top:50%;left:0;right:0;height:1px;transform:translateY(-50%);}
.reset-link{font-size:12px;background:none;border:none;color:var(--text-faint);padding:0;}
.reset-link:hover{color:var(--gold);}
.reset-link.danger:hover{color:#d2624f;}
@media (max-width:860px){
  .body{flex-direction:column;}
  .panel{width:100%;max-height:none;border-right:none;border-bottom:1px solid var(--border);}
  .stage{padding:28px;}
}
`;
