.PHONY: test

test:
	node --test frontend/tests/*.test.cjs && deno test --allow-all supabase/functions/matches/*_test.ts
