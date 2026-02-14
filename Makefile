.PHONY: build-frontend-ts test

build-frontend-ts:
	node scripts/build_frontend_ts.mjs

test:
	$(MAKE) build-frontend-ts
	node --test frontend/tests/*.test.cjs && deno test --allow-all supabase/functions/matches/*_test.ts
