export const metadata = {
  title: "Generador de Portadas — Más Allá del Gol",
  description: "Portadas editoriales para análisis de partidos, jugadores y equipos.",
  // Nombre corto bajo el icono al añadirlo a la pantalla de inicio:
  // el título completo se cortaba en "Generador de Portada...".
  appleWebApp: {
    title: "Portadas",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#0b0a09",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
