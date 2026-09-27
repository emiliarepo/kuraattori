# 53 Visit ratings shape the user's own recommendations
Status: done · Model: Opus 5.5 (low) · Follows: 45

A user's 👍/👎 on visited exhibitions become a learned affinity per category and per museum, which nudges their own Sinulle ranking (rail and home lead pick).

- **Scale:** category part up to 8, museum part up to 6, each `max * (1 - e^(-net / 3))`, sum capped at ±12. One rating ≈ 4 points; below a followed museum (15), a region (20) and a Kiinnostaa category (40).
- **Decay:** each rating halves every 365 days since the visit. Tastes drift, and without decay an early burst of ratings would pin the ranking for good.
- **Ei kiinnosta:** the learned reason is not a category match, so it never makes an exhibition eligible.
- **Reason:** "Pidit samankaltaisista" / "Pidit kohteesta <museo>" (en, sv too), only when the contribution is positive.
- **Cost:** one query per Sinulle request: visited, rated `user_exhibition` rows on the `(user_id, status)` index, joined to `exhibition` and `exhibition_category`. Per-user, never cached in KV.
- `rating-nudges.ts` (ticket 45) stays as it was: it proposes manual weight changes, which is a separate question.
- Tests: `src/domain/learned-affinity.test.ts`, a router case in `recommendation.test.ts`, `e2e/rating-signal.spec.ts`.
