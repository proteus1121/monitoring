// npm run api-typegen:local: the OpenAPI spec of the local backend code (OpenApiSpecTest, no database or broker
// needed), then the client generated from it
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontend = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(frontend, '../..');
const spec = path.join(root, 'build', 'openapi.json');
const gradlew = path.join(root, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

execSync(`"${gradlew}" test --tests org.proteus1121.config.OpenApiSpecTest "-Dopenapi.out=${spec}"`, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});
execSync('npx @rtk-query/codegen-openapi openapi-config.ts', {
  cwd: frontend,
  stdio: 'inherit',
  env: { ...process.env, OPENAPI_SCHEMA: spec },
});
