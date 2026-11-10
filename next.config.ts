import type { NextConfig } from "next";

// Almost every page here depends on the signed-in user or live booking data,
// so pages render per request rather than opting in to Cache Components.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
