# 06 Google auth, onboarding and profile
Status: todo · Model: Sonnet 5 · Blocked by: 04, 05

Auth.js Google provider with the Drizzle adapter on D1, session available in tRPC context and server components. `/sign-in`, sign out, `/welcome` onboarding after first sign-in (interests, then regions; skippable), `/profile` for editing. RegionSelector persists to user_regions when signed in, and to a cookie otherwise. Real Google credentials don't exist yet: make sign-in work locally with a dev-only credentials provider behind `NODE_ENV=development`, and verify the full flow with it.
