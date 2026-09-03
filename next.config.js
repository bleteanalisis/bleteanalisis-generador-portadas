/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // La librería de recorte usa onnxruntime-web, que solo funciona en el
    // navegador. Si Next intenta resolver módulos de Node (fs, path…) al
    // empaquetarla, la compilación falla.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    if (isServer) {
      // En el servidor no se usa nunca: se carga con import() dinámico
      // dentro del navegador, así que no hace falta empaquetarla.
      config.externals = [...(config.externals || []), "@imgly/background-removal", "onnxruntime-web"];
    }
    return config;
  },
};

module.exports = nextConfig;
