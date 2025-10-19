import path from "path";
import { fileURLToPath } from "url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import Dotenv from "dotenv-webpack";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {import('webpack').Configuration} */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== "production";
console.log(`🧬 App is in ${isDev ? "development" : "production"} mode`);

export default {
  entry: ["regenerator-runtime/runtime.js", "./src/index.tsx"],
  output: {
    path: isDev
      ? path.resolve(__dirname, ".dev")
      : path.resolve(__dirname, "dist"),
    filename: isDev ? "static/[name].js" : "static/[name]-[contenthash].js",
    chunkFilename: "static/[name].[contenthash].js",
  },
  mode: isDev ? "development" : "production",
  resolve: {
    extensions: [".tsx", ".ts", ".js"], // Расширения для импорта
    alias: {
      "@src": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          ...(isDev ? [] : ["thread-loader"]),
          {
            loader: "babel-loader",
            options: {
              plugins: isDev ? [require("react-refresh/babel")] : [],
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: ">0.25%, not dead",
                    useBuiltIns: "entry",
                    corejs: 3,
                  },
                ],
                "@babel/preset-typescript",
                ["@babel/preset-react", { runtime: "automatic" }],
              ],
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              url: {
                filter: (url) => !url.startsWith("/"),
              },
              importLoaders: 1, // Учитываем postcss-loader
            },
          },
          "postcss-loader", // Только для CSS
        ],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              url: {
                filter: (url) => !url.startsWith("/"), // Skip processing URLs that start with '/'
              },
            },
          },
          "sass-loader", // Только для SCSS
        ],
      },
      {
        test: /\.module\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[name]__[local]___[hash:base64:5]",
              },
              url: {
                filter: (url) => !url.startsWith("/"), // Skip processing URLs that start with '/'
              },
              importLoaders: 1,
            },
          },
          "sass-loader", // Только для SCSS
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "static",
              name: "[name].[hash].[ext]",
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new CleanWebpackPlugin(),
    new Dotenv({ silent: true }),
    ...(isDev ? [new ReactRefreshWebpackPlugin()] : []),
    new ForkTsCheckerWebpackPlugin({
      async: isDev,
      typescript: {
        diagnosticOptions: {
          syntactic: true,
          semantic: true,
        },
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public"),
          to: path.resolve(__dirname, isDev ? ".dev" : "dist"),
          globOptions: {
            ignore: ["**/index.html"],
          },
        },
      ],
    }),
    ...(isDev
      ? []
      : [
          new BundleAnalyzerPlugin({
            analyzerMode: "disabled",
            generateStatsFile: true,
          }),
        ]),
  ],
  devServer: {
    static: path.join(__dirname, "public"),
    port: 3000,
    open: false,
    historyApiFallback: {
      disableDotRule: true,
    },
    client: {
      overlay: false,
    },
    hot: isDev,
    allowedHosts: "all",
    liveReload: false,
  },
  optimization: {
    minimize: !isDev,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: true,
          mangle: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      chunks: "all",
    },
  },
  performance: {
    hints: false,
    maxEntrypointSize: 5120000,
    maxAssetSize: 5120000,
  },
  cache: {
    type: "filesystem",
    cacheDirectory: path.resolve(__dirname, ".webpack_cache"),
    allowCollectingMemory: true,
  },
  watchOptions: {
    ignored: [
      "**/.dev/**",
      "**/dist/**",
      "**/node_modules",
      "**/.tauri/**",
      "**/src-tauri/**",
    ],
  },
};

process.on("SIGINT", () => {
  process.exit(0);
});
