

/** @type {import("next").NextConfig} */
const config = {
  async rewrites() {
    return [
      { source: "/", destination: "/landing/index.html" },
      { source: "/termos", destination: "/landing/termos.html" },
      { source: "/privacidade", destination: "/landing/privacidade.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default config;
