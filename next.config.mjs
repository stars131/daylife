/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    outputFileTracingExcludes: {
      "**/*": [".env", ".env.*", "**/.env", "**/.env.*"]
    }
  }
};

export default nextConfig;
