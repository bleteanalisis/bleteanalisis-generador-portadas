# Analizador de partidos — Más Allá del Gol

App web estática que lee informes FIFA *Post Match Summary Report* (PDF) y extrae su
dato para convertirlo en láminas publicables. El PDF se procesa en el navegador: no
sale de tu ordenador.

## Cómo funciona por dentro (sin tecnicismos)

Cada pieza vive en su archivo, para que tocar una no rompa las demás:

```
index.html              El esqueleto. Carga los estilos y arranca la app.
css/
  base.css              La identidad visual (colores, tipografías).
js/
  main.js               El cerebro: conecta "arrastrar PDF" con el parser y pinta.
  validate.js           Cruza el dato consigo mismo para comprobar que cuadra.
  parser/               El motor de extracción, troceado:
    glyphs.js             Traduce los números "disfrazados" del PDF de la FIFA.
    tables.js             Reconstruye las tablas (que no tienen líneas de rejilla).
    shots.js              Recupera el mapa de tiros leyendo los vectores del PDF.
    pmsr.js               Junta todo y devuelve el dato de un partido, ordenado.
```

## Estado (Paso 1 — parser + mesa de trabajo)

Extracción portada del prototipo v3 y **validada sobre partidos reales** (España–Cabo
Verde 0–0, España–Argentina 1–0, Francia–España 0–2):

- **Estadísticas clave:** completas, incluidas las métricas cuya etiqueta y números van
  en líneas distintas (posesión, tiros, distancia, recepciones, centros).
- **Mapa de tiros:** España 27/27 en el 0–0; 20/20 en la final (con el gol, color verde).
- **Equipo sujeto como eje:** eliges un equipo y va en verde en todos los partidos, sea
  local o visitante.
- **Validación visible:** comprueba tiros (mapa vs informe), pases (suma vs total) y
  goles (marcador vs informe). ✓ si cuadra, aviso ámbar si no.

### Pendiente (próximos pasos)
- **Tabla de datos físicos:** no parsea fiable (texto con las letras separadas). Afecta a
  la sección física de la ficha individual y a la comprobación de distancia (desactivada).
- **Territorio (ofrecimientos por tercio):** la detección de esa página falla por una
  ligadura tipográfica ("ff" de *Offering*) que el PDF no codifica; causa localizada,
  falta rehacer la detección y validar los valores.
- **Minutos por jugador** (Opción B) para la ficha individual.
- Reconstrucción de las **láminas** de publicación y el **recorrido** agregado.

## Cómo se usa
Se abre desde su URL publicada (Netlify). Se arrastran de 1 a 8 PDFs y se ve el dato
extraído. Las láminas y la exportación PNG llegan en pasos siguientes.
