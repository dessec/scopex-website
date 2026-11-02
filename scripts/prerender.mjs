import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
await build({build:{ssr:'src/prerender.tsx',outDir:'.prerender',emptyOutDir:true}});
const {render}=await import('../.prerender/prerender.js');
const html=await readFile('docs/index.html','utf8');
await writeFile('docs/index.html',html.replace('<div id="root"></div>','<div id="root">'+render()+'</div>'));
