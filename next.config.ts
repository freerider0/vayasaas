// next.config.js
module.exports = {
  webpack: (config: any, { isServer, webpack }: any) => {
    // Handle WebAssembly files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    if (!isServer) {
      // Critical: Replace Node.js modules with empty modules for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,  // This is the critical one for Emscripten
        url: false,
        buffer: false,
        util: false,
        stream: false,
        assert: false,
      };

      // Handle .wasm files as assets
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/wasm/[hash][ext]'
        }
      });

      // Critical: Ignore Node.js specific imports in Emscripten code
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(fs|path|crypto|module)$/,
          contextRegExp: /@salusoft89\/planegcs/
        })
      );
    }

    return config;
  },
};