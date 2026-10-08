/* Coherencia del repositorio: una sola versión, cifras de pruebas veraces y README sin servicios de terceros. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const pkg = JSON.parse(read('frontend/package.json')) as { version: string };
const readme = read('README.md');

const files = (dir: string, re: RegExp) =>
  (readdirSync(join(root, dir), { recursive: true }) as string[]).filter((f) => re.test(f) && !f.includes('node_modules')).map((f) => read(join(dir, f)));
const countVitest = () => files('frontend/src', /\.test\.ts$/).reduce((n, s) => n + (s.match(/^\s*(it|test)\(/gm)?.length ?? 0), 0);
const countPytest = () => files('backend/tests', /^test_.*\.py$/).reduce((n, s) => n + (s.match(/^\s*def test_/gm)?.length ?? 0), 0);

describe('coherencia del repositorio', () => {
  it('la versión es la misma en package.json, la API, el README y el CHANGELOG', () => {
    const api = read('backend/app/__init__.py').match(/__version__ = "([^"]+)"/)?.[1];
    const changelog = read('CHANGELOG.md').match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
    expect(api).toBe(pkg.version);
    expect(changelog).toBe(pkg.version);
    expect(readme).toContain(`version: ${pkg.version}`);
  });

  it('las cifras de pruebas del README coinciden con las pruebas reales', () => {
    const vitest = countVitest();
    const pytest = countPytest();
    // Las insignias de shields.io van codificadas en la URL («Vitest%2030»).
    const plain = readme.replace(/%20/g, ' ').replace(/%C2%B7/g, '·');
    const mentions = [...plain.matchAll(/Vitest[^0-9\n]{0,12}(\d+)|(\d+) pruebas con Vitest/g)].map((m) => Number(m[1] ?? m[2]));
    const pymentions = [...plain.matchAll(/Pytest[^0-9\n]{0,12}(\d+)|(\d+) pruebas con Pytest/g)].map((m) => Number(m[1] ?? m[2]));
    expect(mentions.length).toBeGreaterThan(0);
    expect(pymentions.length).toBeGreaterThan(0);
    for (const n of mentions) expect(n, 'pruebas de Vitest citadas en el README').toBe(vitest);
    for (const n of pymentions) expect(n, 'pruebas de Pytest citadas en el README').toBe(pytest);
  });

  it('el README solo carga imágenes locales o insignias de shields.io', () => {
    const hosts = [...readme.matchAll(/<img[^>]+src="(https?:\/\/[^/"]+)/g), ...readme.matchAll(/!\[[^\]]*\]\((https?:\/\/[^/)]+)/g)].map((m) => m[1]);
    expect(hosts.filter((h) => h !== 'https://img.shields.io')).toEqual([]);
  });

  it('los artefactos de compilación de TypeScript no se versionan', () => {
    expect(read('.gitignore')).toMatch(/^\*\.tsbuildinfo$/m);
  });
});
