import os from "node:os";

/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_PROXY_ORIGIN || "http://127.0.0.1:3000";
const normalizedBackendOrigin = backendOrigin.replace(/\/+$/, "");

function getLanIpv4Hosts() {
  const hosts = new Set();
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((group) => {
    (group || []).forEach((entry) => {
      if (entry && entry.family === "IPv4" && !entry.internal) {
        hosts.add(entry.address);
      }
    });
  });

  return [...hosts];
}

const staticAllowedOrigins = ["localhost", "127.0.0.1", "0.0.0.0"];
const lanAllowedOrigins = getLanIpv4Hosts();
const extraAllowedOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedDevOrigins = [...new Set([...staticAllowedOrigins, ...lanAllowedOrigins, ...extraAllowedOrigins])];

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${normalizedBackendOrigin}/api/v1/:path*`
      },
      {
        source: "/uploads/:path*",
        destination: `${normalizedBackendOrigin}/uploads/:path*`
      }
    ];
  }
};

export default nextConfig;
