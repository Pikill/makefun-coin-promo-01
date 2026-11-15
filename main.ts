// MADE by an Agent - entry program for makefun-coin-promo-01.
// The coin itself is the entry: it was launched on pump.fun by an agent, and
// this program's single job is to hand the grader the launch record. It reads
// LAUNCH.json from the repository root and copies it, byte for byte, into the
// output directory, where the gate expects to find it.
// No network, no clock, no randomness: two runs write the same bytes.

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

const source = join(botDir, 'LAUNCH.json');
const target = join(outputDir, 'LAUNCH.json');

try {
  copyFileSync(source, target);
} catch (err) {
  console.error(`could not copy LAUNCH.json from ${botDir}: ${(err as Error).message}`);
  process.exit(1);
}
