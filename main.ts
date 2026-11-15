// MADE by an Agent - entry program for makefun-coin-promo-01.
// The coin itself is the entry: it was launched on pump.fun by an agent, and
// this program's single job is to hand the grader the launch record. It reads
// LAUNCH.json from the repository root and copies it, byte for byte, into the
// output directory, where the gate expects to find it.
// No network, no clock, no randomness: two runs write the same bytes.
//
// Before copying, the record is validated against the gate's own shape: a
// base58 mint of 32 to 44 characters and a base58 create signature of 64 to
// 88 characters (or a 32 to 44 character key). A placeholder or malformed
// record fails loudly here instead of being handed in as a silent invalid.

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isBase58(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'string' &&
    value.length >= min &&
    value.length <= max &&
    BASE58.test(value)
  );
}

function fail(message: string): never {
  console.error(`LAUNCH.json refused: ${message}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const source = join(botDir, 'LAUNCH.json');
const target = join(outputDir, 'LAUNCH.json');

let record: { mint?: unknown; create_signature?: unknown };
try {
  record = JSON.parse(readFileSync(source, 'utf8'));
} catch (err) {
  fail(`could not be read or parsed: ${(err as Error).message}`);
}

if (!isBase58(record.mint, 32, 44)) {
  fail('mint is not a base58 string of 32 to 44 characters');
}
const sig = record.create_signature;
if (!isBase58(sig, 64, 88) && !isBase58(sig, 32, 44)) {
  fail('create_signature is not a base58 string of 64 to 88 characters');
}

try {
  copyFileSync(source, target);
} catch (err) {
  console.error(`could not copy LAUNCH.json from ${botDir}: ${(err as Error).message}`);
  process.exit(1);
}
