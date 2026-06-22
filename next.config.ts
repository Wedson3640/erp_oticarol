import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    // Define explicitamente a raiz do workspace para suprimir aviso de lockfile
    root: __dirname,
  },
  // Permite que o IP do host WSL2 / dispositivos da rede local
  // acessem o HMR (hot reload) do servidor de desenvolvimento
  allowedDevOrigins: ["172.29.176.1"],
}

export default nextConfig
