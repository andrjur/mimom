# Evidence release, 26 October 2026

Canonical source: `tools/sociotyper` in `andrjur/mimom`.

Release the Worker and client together. Do not publish the new client against the old `stability-1` Worker: old responses still support random fallback and model-selected rankings.

1. Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`.
2. Deploy the production Worker. No schema change is needed. Keep the existing D1, Workflow and encryption secret.
3. Verify `/api/typist/health` returns `release: evidence-2` and the selected provider is ready.
4. Publish `dist/` to `/sociotyper/`. Keep prior hashed assets for open tabs. Worker source modules remain under `tools/`, excluded from GitHub Pages.
5. Run a fictional text through the live site. Confirm request count, result, continuation and refund behavior. Health alone does not verify an analysis.

Default shared provider remains Knyazev. To switch to Dewiar, add `DEWIAR_API_KEY` using Wrangler secret input, set `INCLUDED_PROVIDER=dewiar`, keep `DEWIAR_MODEL=google/gemini-flash-latest`, optionally set `DEWIAR_REPORT_MODEL`. The old Knyazev `FINAL_MODEL` is not reused for other providers. BYOK works without changing the shared provider.

Verified locally: regression suite, all 16 table roundtrips, TypeScript, client build, production Worker dry run, Workflow/D1 owner isolation, idempotent charge and cancellation refund. Browser checks use a fictional local fixture and mock provider. Live Dewiar billing and real-person quality remain unverified.

Cloudflare CLI authentication was expired during preparation. Production deployment awaits refreshed login. Do not merge the paired static build until the Worker is deployed and verified.
