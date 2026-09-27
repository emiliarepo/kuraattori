# 05 tRPC routers

Status: done · Model: GPT-6 Luna · Blocked by: 02, 03

Routers from spec §11 over the Drizzle schema: exhibition (list with the filter input + cursor paging, bySlug, endingSoon, upcoming, new), museum (list, bySlug, exhibitions), category.list, profile (get, updateRegions, updateInterests; protected), userExhibition.setStatus / listByStatus (protected; the user always comes from the session), recommendation.forYou (protected; uses src/domain ranking). Validate every input with Zod. Include one integration-style test for list filtering against a seeded in-memory SQLite.
