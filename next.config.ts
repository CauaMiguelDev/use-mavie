import type { NextConfig } from "next";

// GITHUB_PAGES=1 gera site estático para o GitHub Pages (subpasta /<repo>).
// ponytail: assetPrefix em vez de basePath; o prerender do vinext 1.0-beta ignora basePath.
const pages = process.env.GITHUB_PAGES === "1";
const base = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = pages ? { output: "export", assetPrefix: base, images: { unoptimized: true } } : {};

export default nextConfig;
