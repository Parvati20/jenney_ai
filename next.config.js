const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["speech-to-speech"],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix onnx wasm loading
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /onnxruntime-web|speech-to-speech/,
        })
      );
    }

    return config;
  },

  // OPTIONAL (for future optimization)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;


