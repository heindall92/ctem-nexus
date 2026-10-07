/* Fichero dorado compartido con el backend: shared/golden-demo.json.
 * `npm run golden` lo regenera; `npm test` comprueba que el motor TS sigue produciendo lo mismo.
 * backend/tests/test_parity.py comprueba que el motor Python coincide. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { prioritize } from './engine';

const file = resolve(__dirname, '../../../shared/golden-demo.json');

it('coincide con shared/golden-demo.json', () => {
  const input = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES };
  const r = prioritize(input);
  const expected = {
    scored: r.scored.map(({ id, score, band, hopsToCrown, onAttackPath, explanation }) => ({ id, score, band, hopsToCrown, onAttackPath, explanation })),
    paths: r.graph.paths.length,
    chokePoints: r.graph.chokePoints,
    summary: r.summary,
  };
  if (process.env.GOLDEN === '1' || !existsSync(file)) {
    writeFileSync(file, JSON.stringify({ engineVersion: r.version, input, expected }, null, 2) + '\n');
  }
  const golden = JSON.parse(readFileSync(file, 'utf8'));
  expect(expected).toEqual(golden.expected);
});
