import path from 'path';
import { fileURLToPath } from 'url';

// Builds src/prerender.tsx for node; npm run build runs it after the app's build (see the file)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('webpack').Configuration} */
export default {
  entry: './src/prerender.tsx',
  target: 'node',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, '.prerender'),
    filename: 'prerender.cjs',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      // the styles come from the app's own build, here they are only imports to satisfy
      { test: /\.s?css$/, type: 'asset/source' },
      { test: /\.(png|jpe?g|gif|svg)$/i, type: 'asset/resource', generator: { emit: false } },
    ],
  },
  optimization: { minimize: false },
  performance: { hints: false },
};
