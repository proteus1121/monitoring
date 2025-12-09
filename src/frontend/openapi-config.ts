import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: 'https://api.ssn.pp.ua/v3/api-docs',
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
