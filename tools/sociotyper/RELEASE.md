# Stability release

Canonical editable source: `tools/sociotyper` in andrjur/mimom. GitHub Pages excludes `tools` via `_config.yml`.

Build: `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`. Publish the contents of `dist` into `/sociotyper`; do not copy node_modules, .env, or .wrangler. Keep the previous hashed assets briefly so open tabs can finish loading. Commit source and output together. Review `git diff` before pushing.

Worker: `cd cloudflare-worker`; use `npx wrangler deploy --config wrangler.production.jsonc`. Read PRODUCTION-RU.md for the additive D1 migration and secrets. The GitHub check never deploys Worker or receives API credentials.

Verified locally: 24 model probes + synthesis via mock HTTP API; all three configured models; single credit charge for repeated job ID; foreign-owner isolation; repeated cancellation refunds once; three browser participants survive refresh; a running browser job restores its final result. Zero-confidence/alias regression test passes. These are infrastructure tests, not ten real Knyazev typings.

Production prerequisites: JOB_ENCRYPTION_KEY is server-only. KNYAZEV_API_KEY must be added by the account owner for included analyses; without it connect BYOK on the page. Real audio-provider and ten-run quality tests remain pending credentials.
