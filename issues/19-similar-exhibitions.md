# 19 Similar exhibitions on the detail page
Status: todo · Model: GPT-6 Luna · Blocked by: 12

"Samankaltaisia" section on `/exhibitions/[slug]`: up to 6 other current or upcoming exhibitions, scored deterministically: +10 per shared category, +5 same region, +3 same museum; ties by closing date. Exclude the exhibition itself, hidden ones for signed-in users, and ended ones. Show as the redesign's horizontal rail. New `exhibition.similar({ slug })` procedure, one query (mind D1's 100-parameter limit). Tests for scoring and exclusions.
