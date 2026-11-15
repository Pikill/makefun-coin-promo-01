// MADE by an Agent — entry program for makefun-coin-promo-01.
//
// The coin is the entry. It was already launched on pump.fun by an agent,
// and this program's only job is to hand the grader the launch record:
// it reads LAUNCH.json from the repository root and copies it, byte for
// byte, into the output directory, where the gate expects to find it.
//
// Nothing here touches the network, the clock, or any randomness, so two
// runs write the same bytes. Before the copy, the record is checked
// against the gate's own shape from reference/gate.json: a JSON object of
// at most 16384 bytes holding exactly two fields, a mint that is a base58
// Solana address (32 to 44 characters, decoding to 32 bytes) and a create
// signature that is base58 of 64 to 88 characters (decoding to 64 bytes,
// a transaction signature) or 32 to 44 characters (a key, 32 bytes).
// A placeholder or hand-edited record fails loudly here, with its own
// exit code, instead of being handed in as a silent invalid. The output
// directory is only created once the record has passed every check, so a
// refused record leaves no empty output behind. After the copy the
// written bytes are read back and compared with the source, so a partial
// write can never pass as a clean one.

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, from reference/gate.json.
const MAX_LAUNCH_BYTES = 16384;
const MINT_MIN_CHARS = 32;
const MINT_MAX_CHARS = 44;
const SIGNATURE_MIN_CHARS = 64;
const SIGNATURE_MAX_CHARS = 88;
const KEY_MIN_CHARS = 32;
const KEY_MAX_CHARS = 44;
const PUBKEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

// Base58 alphabet, in order: no 0, O, I or l, so a mistyped character
// can never slip through as a look-alike.
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

// One exit code per failure mode, so a failed run says which check
// refused the record instead of only saying that something did.
const EXIT_UNREADABLE = 2;
const EXIT_OVERSIZE = 3;
const EXIT_UNPARSEABLE = 4;
const EXIT_NOT_OBJECT = 5;
const EXIT_WRONG_FIELDS = 6;
const EXIT_BAD_MINT = 7;
const EXIT_BAD_SIGNATURE = 8;
const EXIT_COPY_FAILED = 9;
const EXIT_VERIFY_FAILED = 10;

function fail(message: string, code: number): never {
  console.error('LAUNCH.json refused: ' + message);
  process.exit(code);
}

// True when value is a string of base58 characters within the length
// range; the alphabet check alone cannot tell a real address from a
// string of the right shape, so length is checked here and decoding in
// decodeBase58 below.
function isBase58Text(value: unknown, minChars: number, maxChars: number): boolean {
  return (
    typeof value === 'string' &&
    value.length >= minChars &&
    value.length <= maxChars &&
    BASE58_PATTERN.test(value)
  );
}

// Decode a base58 string to bytes. Leading '1's are leading zero bytes;
// the rest is one big base-58 number, read out byte by byte.
function decodeBase58(value: string): Buffer {
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === '1') {
    leadingZeros += 1;
  }
  const digits: number[] = [];
  for (const char of value) {
    const digit = BASE58_ALPHABET.indexOf(char);
    let carry = digit;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] * 58;
      digits[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const bytes = Buffer.alloc(leadingZeros + digits.length);
  for (let i = 0; i < digits.length; i += 1) {
    bytes[leadingZeros + i] = digits[digits.length - 1 - i];
  }
  return bytes;
}

// True when value is base58 text in range that decodes to exactly the
// expected number of bytes: a Solana address is 32 bytes, a transaction
// signature 64.
function isBase58DecodingTo(value: unknown, minChars: number, maxChars: number, bytes: number): boolean {
  if (!isBase58Text(value, minChars, maxChars)) {
    return false;
  }
  return decodeBase58(value as string).length === bytes;
}

function measureLaunchFile(source: string): number {
  try {
    return statSync(source).size;
  } catch (err) {
    fail('could not be read: ' + (err as Error).message, EXIT_UNREADABLE);
  }
}

function readLaunchRecord(source: string): { mint?: unknown; create_signature?: unknown } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(source, 'utf8'));
  } catch (err) {
    fail('could not be read or parsed: ' + (err as Error).message, EXIT_UNPARSEABLE);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('is not a JSON object', EXIT_NOT_OBJECT);
  }
  return parsed as { mint?: unknown; create_signature?: unknown };
}

// The launch file holds exactly the two fields the rules name: a stray
// field would mean the record was edited by hand after the launch.
function checkExactFields(record: { mint?: unknown; create_signature?: unknown }): void {
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== 'create_signature' || keys[1] !== 'mint') {
    fail('must hold exactly mint and create_signature', EXIT_WRONG_FIELDS);
  }
}

function checkMint(record: { mint?: unknown; create_signature?: unknown }): void {
  if (!isBase58DecodingTo(record.mint, MINT_MIN_CHARS, MINT_MAX_CHARS, PUBKEY_BYTES)) {
    fail('mint is not a base58 Solana address of 32 to 44 characters', EXIT_BAD_MINT);
  }
}

function checkSignature(record: { mint?: unknown; create_signature?: unknown }): void {
  const sig = record.create_signature;
  const asSignature = isBase58DecodingTo(sig, SIGNATURE_MIN_CHARS, SIGNATURE_MAX_CHARS, SIGNATURE_BYTES);
  const asKey = isBase58DecodingTo(sig, KEY_MIN_CHARS, KEY_MAX_CHARS, PUBKEY_BYTES);
  if (!asSignature && !asKey) {
    fail('create_signature is not a base58 signature of 64 to 88 characters or a key of 32 to 44', EXIT_BAD_SIGNATURE);
  }
}

function copyAndVerify(source: string, target: string): void {
  mkdirSync(outputDir, { recursive: true });
  try {
    copyFileSync(source, target);
  } catch (err) {
    fail('could not copy from ' + botDir + ': ' + (err as Error).message, EXIT_COPY_FAILED);
  }
  // Read the copy back and confirm it is the same bytes as the source.
  if (!readFileSync(target).equals(readFileSync(source))) {
    fail('the copy does not match the source', EXIT_VERIFY_FAILED);
  }
}

const source = join(botDir, 'LAUNCH.json');
const target = join(outputDir, 'LAUNCH.json');

const size = measureLaunchFile(source);
if (size > MAX_LAUNCH_BYTES) {
  fail('is ' + size + ' bytes, over the ' + MAX_LAUNCH_BYTES + ' byte cap', EXIT_OVERSIZE);
}

const record = readLaunchRecord(source);
checkExactFields(record);
checkMint(record);
checkSignature(record);
copyAndVerify(source, target);
