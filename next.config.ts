import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    // Define explicitamente a raiz do workspace para suprimir aviso de lockfile
    root: __dirname,
  },
}

export default nextConfig
