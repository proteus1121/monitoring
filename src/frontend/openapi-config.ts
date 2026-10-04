import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  // the deployed API, or the spec of the local code with OPENAPI_SCHEMA (npm run api-typegen:local)
  schemaFile: process.env.OPENAPI_SCHEMA ?? 'https://api.ssn.pp.ua/v3/api-docs',
  apiFile: './src/redux/api.ts',
  apiImport: 'api',
  tag: true,
  outputFile: './src/redux/generatedApi.ts',
  hooks: {
    queries: true,
    lazyQueries: true,
    mutations: true,
  },
  exportName: 'generatedApi',
};

export default config;
