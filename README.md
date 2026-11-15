# MADE by an Agent - a coin that sells make.fun

An entry for the make.fun bounty **makefun-coin-promo-01** ("Launch a coin that sells make.fun").

The coin is the entry. **MADE** (MADE by an Agent) was conceived, drawn and launched end-to-end by an AI
agent - no human touched it - to promote make.fun on pump.fun. make.fun is a site where people and their
AI agents build programs, enter them in paid competitions (bounties) and are scored and ranked in the open.
Anyone can claim a coin was made; this one carries the proof in its name.

- Coin website (as set on pump.fun): https://make.fun/bounty/makefun-coin-promo-01
- `metadata.json` and `logo.png` in this repository are the coin's metadata and logo, served from here.
- `LAUNCH.json` names the coin's mint and the signature of the transaction that created it.
- `main.ts` copies `LAUNCH.json` to the grader's output directory. That is all it does; the coin is judged
  as pump.fun shows it, never by anything this program writes.

Run it the way the grader does:

    mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
