// next.config.js
module.exports = {
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      // Replace Node.js modules with empty modules for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
        url: false,
        buffer: false,
        util: false,
        stream: false,
        assert: false,
      };
    }

    return config;
  },
};