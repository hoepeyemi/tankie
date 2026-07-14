import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist/server', { recursive: true });

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  outfile: 'dist/server/index.js',
  platform: 'node',
  format: 'cjs',
  target: 'es2020',
  external: ['@devvit/protos'],
});

console.log('Server built → dist/server/index.js');
