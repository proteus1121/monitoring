/**
 * Build step (npm run build, webpack.prerender.mjs): renders the home page to static HTML so search engines
 * and link previews get its text without running the app.
 *
 * build/index.html - the home page, the landing already in #root; the app replaces it once it starts
 * build/app.html   - the empty shell nginx serves for every other route of the app
 */
import fs from 'fs';
import path from 'path';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import { ApiProvider } from './lib/api/ApiProvider';
import { Landing } from './pages/HomePage';
import { store } from './redux/store';

const buildDir = process.argv[2] ?? path.resolve('build');
const indexFile = path.join(buildDir, 'index.html');

const markup = renderToString(
  <Provider store={store}>
    <StaticRouter location="/">
      <ApiProvider>
        <Routes>
          <Route index element={<Landing />} />
        </Routes>
      </ApiProvider>
    </StaticRouter>
  </Provider>
);

if (!markup.includes('<h1')) {
  throw new Error('Prerendered home page has no heading, markup: ' + markup.slice(0, 500));
}

const shell = fs.readFileSync(indexFile, 'utf8');
const root = '<div id="root"></div>';
if (!shell.includes(root)) {
  throw new Error(`${indexFile} has no ${root}, was it prerendered already?`);
}

fs.writeFileSync(path.join(buildDir, 'app.html'), shell);
fs.writeFileSync(indexFile, shell.replace(root, `<div id="root">${markup}</div>`));
console.log(`Prerendered the home page into ${indexFile} (${markup.length} characters)`);
