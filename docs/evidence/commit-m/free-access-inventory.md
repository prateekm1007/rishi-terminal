# Commit M1 — free-access inventory (classified, pre-deletion)

Generated: 2026-10-02T02:43:54.219Z · commit `f1f30b02d03780d9e677c74f563686e7c4f05b62` · scanner: `scripts/freeAccessInventory.mjs`

Scan vocabulary (Coder Directions §6): `TIER_CONFIG`, `WisdomTier`, `isPremium`, `isDisciple`, `canAccess`, `canViewStock`, `getRishisVisible`, `getRishisByTier`, `student`, `disciple`, `seeker`, `tierExpiresAt`, `tier_purchased`, `pricing`, `upgrade`, `checkout`, `Razorpay`, `paid`, `premium`.
**1089 occurrences across 131 files.** Every matching file is classified below; an unclassified match fails the scanner.

## Summary by category

| Category | Files | Occurrences | Disposition |
|---|---|---|---|
| runtime-entitlement — runtime entitlement - tier gates feature access | 22 | 204 | REMOVE the entitlement condition (M3/M5) — feature stays, gate goes |
| payment-surface — payment purchase surface (UI + HTTP) | 13 | 157 | RETIRE (M4) — /api/payment 410, dead payment UI/code deleted, records/migrations preserved |
| ui-copy — UI copy / navigation touching tiers or pricing | 9 | 60 | UPDATE (M4/M6) — honest copy; no upgrade/plan language remains |
| db-persistence — database persistence / historical payment record (PRESERVED) | 6 | 142 | PRESERVE verbatim (historical DB schema / payment records / evidence) |
| dead-code — unused code carrying tier semantics | 1 | 15 | DELETE (Rule 17) — unused module carrying a tier axis |
| documentation — documentation / configuration / legal copy | 16 | 73 | UPDATE (M6) — stale commercial claims removed, FD-7 resolved; historical reports preserved |
| test — test coverage / tooling | 25 | 242 | UPDATE/DELETE with the code under test; fail-first free-access tests added (M2) |
| legitimate-concept — legitimate non-entitlement concept (display rank, XP level, market terminology, provenance anti-upgrade) | 39 | 196 | KEEP — display rank, XP level, market terminology, provenance anti-upgrade, auth |

## File-by-file classification

### runtime-entitlement — runtime entitlement - tier gates feature access

| File | Matched terms | Note |
|---|---|---|
| `app/api/auth/me/route.ts` | seeker×1, tierExpiresAt×2 | returns tier + tierExpiresAt to clients (feeds client gates) |
| `app/api/chat/personas/route.ts` | getRishisByTier×2 | serves the caller tier roster |
| `app/api/chat/route.ts` | student×2, disciple×2, seeker×5, premium×1 | persona 403 by tier + tier-keyed DAILY_QUOTA |
| `app/api/gurus/route.ts` | isPremium×2, student×1, disciple×1, seeker×2, paid×3, premium×7 | isPremium() locks crypto/commodity guru verdicts into teasers |
| `app/api/rishis/[symbol]/route.ts` | TIER_CONFIG×2, paid×1, premium×1 | verdict slice by TIER_CONFIG[user.tier].rishisVisible |
| `app/commodities/page.tsx` | seeker×1, premium×4 | premium flag + UpgradePrompt + category gate |
| `app/crypto/page.tsx` | student×1, seeker×2, premium×3 | premium flag + UpgradePrompt + locked-teaser copy |
| `app/stock/[symbol]/page.tsx` | TIER_CONFIG×2, seeker×2, upgrade×1, paid×2, premium×1 | RSC embeds only the seeker slice |
| `components/chat/RishiChat.tsx` | seeker×1 | roster-fallback surface described as the seeker set {damani} |
| `components/crypto/CryptoDetailClient.tsx` | paid×1 | premium-locked guru verdict display |
| `components/lab/CompareTab.tsx` | student×1, disciple×1, seeker×3, upgrade×3, paid×3 | verdict upgrade only for paid tiers |
| `components/lab/IntelligenceTab.tsx` | student×1, disciple×1, seeker×3, upgrade×2, paid×2 | verdict upgrade only for paid tiers |
| `components/stock/KnowledgeGraphView.tsx` | upgrade×1, paid×2 | comments describe the paid-tier graph upgrade path (logic is prop-driven) |
| `components/stock/RishiGrid.tsx` | WisdomTier×2, student×2, seeker×1, pricing×2, upgrade×4, paid×1, premium×4 | upgrade banner / lock teasers keyed on tier |
| `components/stock/StockPageClient.tsx` | student×1, disciple×1, seeker×2, paid×3 | skips verdict upgrade when tier === seeker |
| `hooks/useTier.ts` | WisdomTier×3, seeker×3, tierExpiresAt×4, premium×1 | client tier state that drives client-side gates |
| `lib/auth/session.ts` | student×2, disciple×2, seeker×9, tierExpiresAt×11 | Tier type + resolveTier — DB tier currently drives product policy |
| `lib/chat/personaAccess.ts` | getRishisByTier×1, student×3, disciple×3, seeker×3 | getRishisByTier / isPersonaAllowed — tier roster for chat personas |
| `lib/chat/rishiEngine.ts` | getRishisByTier×1, student×1, disciple×1 | client fallback engine personas carry the access axis as tier |
| `lib/consensus/sanitize.ts` | seeker×1, paid×2 | sanitizes verdicts to a tier visibility count (comments describe the paid slice) |
| `lib/premium.ts` | TIER_CONFIG×5, WisdomTier×8, isPremium×1, isDisciple×1, canAccess×1, canViewStock×1, getRishisVisible×1, student×6, disciple×7, seeker×9, paid×1 | TIER_CONFIG, tier predicates, anonymous stock-view counter — the tier model itself |
| `lib/scoring/slimIndex.ts` | TIER_CONFIG×2, seeker×2, upgrade×1, paid×4, premium×1 | freeScores sliced to seeker visibility |

### payment-surface — payment purchase surface (UI + HTTP)

| File | Matched terms | Note |
|---|---|---|
| `app/api/payment/route.ts` | tier_purchased×1, Razorpay×19 | Razorpay order create (POST) + client verify (PUT) |
| `app/api/payment/webhook/route.ts` | Razorpay×12, paid×2 | Razorpay webhook -> grant_tier_for_payment |
| `app/pricing/layout.tsx` | student×1, disciple×1, seeker×1, pricing×2 | pricing page metadata mentioning tiers |
| `app/pricing/page.tsx` | TIER_CONFIG×2, WisdomTier×6, student×3, disciple×3, seeker×7, pricing×16, checkout×1, Razorpay×2, paid×1, premium×2 | paid-tier storefront with upgrade buttons + Razorpay checkout |
| `components/premium/PaymentButton.tsx` | WisdomTier×1, student×1, disciple×1, pricing×1, checkout×6, Razorpay×16, premium×1 | Razorpay Checkout integration |
| `components/premium/UpgradePrompt.tsx` | pricing×1, upgrade×1, premium×3 | upgrade modal (Rs 499/year paid perks) |
| `lib/payments/grantTier.ts` | student×2, disciple×2, tierExpiresAt×1, Razorpay×8 | grant RPC wrapper + TIER_PRICES (499/1999 INR paise) |
| `lib/payments/signatures.ts` | checkout×1, Razorpay×5 | Razorpay signature verification |
| `next.config.js` | upgrade×3, checkout×4, Razorpay×6 | CSP allows checkout.razorpay.com / api.razorpay.com origins — obsolete once payments retire |
| `package-lock.json` | Razorpay×4 | transitive lock entries — regenerated when the dependency is removed |
| `package.json` | Razorpay×1 | unused razorpay npm dependency (no importers; checkout loads via script tag) |
| `proxy.ts` | Razorpay×1 | webhook matcher/routing comment |
| `scripts/checkEnv.ts` | Razorpay×5 | env checker referencing RAZORPAY vars |

### ui-copy — UI copy / navigation touching tiers or pricing

| File | Matched terms | Note |
|---|---|---|
| `components/dashboard/DashboardClient.tsx` | pricing×1 | View Plans CTA to /pricing — relabel (no plans exist) |
| `components/Sidebar.tsx` | pricing×2 | nav link to /pricing — kept (page becomes the free-access notice) |
| `messages/bn.json` | student×1, disciple×1, seeker×1, pricing×2, upgrade×1, premium×1 | locale copy (same treatment as en.json) |
| `messages/en.json` | student×2, disciple×3, seeker×3, pricing×3, upgrade×3, premium×2 | locale copy: pricing/tiers/personaLocked keys (updated), formula premium strings (kept) |
| `messages/gu.json` | student×1, disciple×1, seeker×1, pricing×2, upgrade×1 | locale copy (same treatment as en.json) |
| `messages/hi.json` | student×1, disciple×1, seeker×1, pricing×2, upgrade×1, premium×1 | locale copy (same treatment as en.json) |
| `messages/mr.json` | student×1, disciple×1, seeker×1, pricing×2, upgrade×1, premium×1 | locale copy (same treatment as en.json) |
| `messages/ta.json` | student×1, disciple×1, seeker×1, pricing×2, upgrade×1, premium×1 | locale copy (same treatment as en.json) |
| `messages/te.json` | student×1, disciple×1, seeker×1, pricing×2, upgrade×1, premium×1 | locale copy (same treatment as en.json) |

### db-persistence — database persistence / historical payment record (PRESERVED)

| File | Matched terms | Note |
|---|---|---|
| `docs/evidence/commit-l/prod-ai-ugly-path-anonymous.json` | premium×1 | historical Commit-L evidence — preserved verbatim |
| `lib/db/migrations/001_initial_schema.sql` | student×1, disciple×1, seeker×3, tierExpiresAt×1, tier_purchased×1, Razorpay×5, paid×1, premium×1 | users.tier, tier_expires_at, transactions(tier_purchased) — historical schema; PRESERVED (Coder Directions 12) |
| `lib/db/migrations/002_supabase_auth.sql` | seeker×4, tierExpiresAt×5 | handle_new_user trigger defaulting tier — historical; PRESERVED |
| `lib/db/migrations/007_grant_tier_rpc.sql` | student×5, disciple×5, seeker×5, tierExpiresAt×13, tier_purchased×2, upgrade×4, Razorpay×7, paid×7 | grant_tier_for_payment RPC — historical settlement logic; PRESERVED |
| `production-receipt.json` | student×1, disciple×1, seeker×1 | historical deployment receipt (probe output mentions tiers) — superseded by the M12 receipt |
| `production-ugly-path-matrix.json` | student×41, disciple×17, seeker×9 | historical probe evidence — superseded by the M11 matrix |

### dead-code — unused code carrying tier semantics

| File | Matched terms | Note |
|---|---|---|
| `lib/fno/rishiPrompts.ts` | getRishisByTier×1, student×3, disciple×3, seeker×3, premium×5 | zero runtime importers (only its test) — F&O fnoAccess tier axis + getRishisByTier |

### documentation — documentation / configuration / legal copy

| File | Matched terms | Note |
|---|---|---|
| `.env.example` | Razorpay×5 | RAZORPAY_* section + CHAT_MODEL default |
| `app/privacy/page.tsx` | Razorpay×1 | privacy copy: subscription/tier/Razorpay statements — updated to reflect the free product + retained historical records |
| `app/terms/page.tsx` | student×1, disciple×1, pricing×2, paid×4 | terms section 4 (paid tiers and refunds) — rewritten for the free product; counsel review still FD-14 |
| `AUDIT_FINDINGS_COMPREHENSIVE.md` | disciple×1, pricing×1, paid×1, premium×5 | historical audit report — preserved verbatim (evidence) |
| `AUDIT_REPORT_20260616_233109.md` | paid×1, premium×1 | historical audit report — preserved verbatim (evidence) |
| `CONSTITUTION.md` | student×1, disciple×1, seeker×1, pricing×1, paid×5, premium×1 | governing rules — DO NOT MODIFY (tier mentions are rule evidence) |
| `data/security-master/SOURCES.md` | paid×1 | NSE column documentation (PAID UP VALUE is an exchange field name) |
| `docs/AI_LOOP.md` | upgrade×2 | AI loop doc tier references |
| `docs/DATA_SOURCES.md` | Razorpay×1 | data-source doc mentioning tiers |
| `docs/FREE_OPEN_DATA_RESEARCH.md` | premium×1 | provider research mention (premium = paid API tier of a vendor) |
| `docs/PAID_CONTENT.md` | student×2, disciple×2, seeker×2, upgrade×1, paid×8 | paid/free matrix — superseded by the free-access decision |
| `docs/PROVENANCE.md` | pricing×1 | pricing field-name mention (data provenance, not commerce) |
| `docs/RELEASE.md` | Razorpay×2 | release notes mentioning tiers |
| `docs/ROADMAP-STATUS.md` | pricing×1, upgrade×1, Razorpay×1, paid×2 | FD-7 register + tier references |
| `docs/ROADMAP.md` | disciple×1, tierExpiresAt×2, pricing×2, Razorpay×1, paid×4 | task definitions mentioning pricing |
| `README.md` | pricing×1 | pricing mention in overview |

### test — test coverage / tooling

| File | Matched terms | Note |
|---|---|---|
| `scripts/evalChatRunner.ts` | student×1, disciple×1, seeker×1 | eval harness tier field — updated with the quota change |
| `scripts/prodReceipt.mjs` | student×1, disciple×1, seeker×1 | receipt generator tier probes — updated for the M12 receipt |
| `scripts/prodUglyPathAnonymous.mjs` | premium×2 | anonymous probe (premium mention) — updated for the M11 matrix |
| `scripts/prodUglyPathMatrix.mjs` | student×4, disciple×7, seeker×7, tierExpiresAt×4 | tier probes — updated for the M11 matrix |
| `test/chat.grounding.l2.test.ts` | upgrade×9 | provenance ANTI-UPGRADE tests (AI concept, not commerce) — kept |
| `test/chat.limits.test.ts` | disciple×1, seeker×1, tierExpiresAt×1 | quota by tier expectations — updated to the single free quota |
| `test/chat.provider.test.ts` | disciple×1, tierExpiresAt×1 | provider tests with tier mocks — updated |
| `test/chat.quota.assembly.test.ts` | disciple×1, tierExpiresAt×1 | quota assembly by tier — updated |
| `test/chat.quota.order.test.ts` | disciple×1, tierExpiresAt×1 | quota order (tier mention in mocks) — updated |
| `test/chat.route.canonicalEvidence.test.ts` | disciple×1, tierExpiresAt×1 | route tests with tier mocks — updated |
| `test/chat.route.personaAuth.test.ts` | student×9, disciple×8, seeker×10, tierExpiresAt×1, premium×1 | persona 403-by-tier contract — replaced by all-personas-for-all-users contract |
| `test/clientBoundary.test.ts` | paid×2 | client-graph boundary incl. premium.ts import rules — updated |
| `test/csp.headers.test.ts` | upgrade×7 | upgrade-insecure-requests CSP tests — kept |
| `test/evalChat.golden.test.ts` | disciple×3, tierExpiresAt×4 | golden-set tier references — updated |
| `test/fixtures/eval-chat/golden.ts` | student×1, disciple×6, seeker×2, upgrade×3 | golden questions tier references — updated |
| `test/fno.registry.test.ts` | getRishisByTier×4, student×5, disciple×4, seeker×6 | F&O tier policy verbatim expectations — deleted with the dead module |
| `test/payments.grantTier.test.ts` | student×1, disciple×4, tierExpiresAt×1, Razorpay×3 | grant RPC wrapper tests — deleted with the retired surface |
| `test/payments.signatures.test.ts` | checkout×2, Razorpay×1, paid×1 | signature tests — deleted with the retired surface |
| `test/persona.registry.test.ts` | getRishisByTier×4, student×14, disciple×8, seeker×9 | registry access-axis expectations — updated |
| `test/rishis.route.test.ts` | TIER_CONFIG×3, student×8, disciple×3, seeker×8, tierExpiresAt×7, paid×1, premium×1 | tier-slice expectations for /api/rishis/[symbol] — updated |
| `test/seo.sitemap.test.ts` | pricing×1 | /pricing sitemap entry — kept (page remains as the free-access notice) |
| `test/session.tier.test.ts` | student×3, disciple×8, seeker×11, paid×2 | resolveTier policy tests — subject removed in M3 |
| `test/setup.ts` | Razorpay×2 | test bootstrap tier references — updated |
| `test/webhook.grantStatus.test.ts` | Razorpay×3 | webhook grant tests — deleted with the retired surface |
| `test/webhook.signature.test.ts` | Razorpay×7 | webhook signature tests — deleted; replaced by the 410 retirement contract |

### legitimate-concept — legitimate non-entitlement concept (display rank, XP level, market terminology, provenance anti-upgrade)

| File | Matched terms | Note |
|---|---|---|
| `app/sitemap.ts` | pricing×1 | /pricing sitemap entry — kept (route remains as the free-access notice) |
| `components/bonds/BondDetailClient.tsx` | premium×2 | bond premium market term |
| `components/gamification/ProgressBar.tsx` | seeker×4 | XP level display (EnlightenmentLevel) |
| `components/markets/WorldMarketsGrid.tsx` | pricing×1 | pricing-power market commentary |
| `components/stock/WisdomSidebar.tsx` | pricing×1, premium×1 | pricing-power lesson copy |
| `data/economyPlus/macroData.bn.ts` | pricing×6, premium×2 | macro glossary (locale) |
| `data/economyPlus/macroData.mr.ts` | pricing×6, premium×2 | macro glossary (locale) |
| `data/economyPlus/macroData.ta.ts` | pricing×6, premium×2 | macro glossary (locale) |
| `data/economyPlus/macroData.te.ts` | pricing×6, premium×2 | macro glossary (locale) |
| `data/economyPlus/macroData.ts` | pricing×5, premium×2 | macro glossary (pricing power, risk premium) |
| `data/glossary.ts` | pricing×9, paid×3 | glossary definitions (pricing power) |
| `data/news/index.ts` | upgrade×3 | seed news copy (rating upgrades) |
| `data/rishi-portfolios/global-plays.ts` | pricing×6, paid×1, premium×2 | investment thesis copy (pricing power) |
| `data/stockDetails/index.ts` | pricing×1, premium×1 | stock commentary (premium as valuation concept) |
| `data/stocks/index.ts` | paid×1 | comment describing the N1 boundary + Zaggle PREPAID company name |
| `lib/adapters/stockAdapter.ts` | pricing×1 | Core pricing field-group comment |
| `lib/ai/evidence.ts` | upgrade×8 | provenance ANTI-UPGRADE vocabulary — AI provenance concept, not commerce |
| `lib/ai/router.ts` | upgrade×1 | anti-upgrade wording rule in the model contract |
| `lib/ai/schemas.ts` | upgrade×1 | anti-upgrade comment |
| `lib/chat/registry.ts` | getRishisByTier×1, student×25, disciple×10, seeker×4, pricing×2, paid×2, premium×4 | rank axis = display (kept); access + fnoAccess axes = entitlement (removed in M3) |
| `lib/chat/registryDisplay.ts` | student×1, premium×2 | rank strings / formula copy (Listing Premium, PE Premium) / bios (Graham student) |
| `lib/fno/strategyEngine.ts` | premium×5 | options premium = price paid for an option (market term) |
| `lib/gamification/index.ts` | seeker×6, pricing×1 | EnlightenmentLevel XP progress names (Seeker/Apprentice/Practitioner/Rishi) — achievement levels, NOT payment tiers |
| `lib/gurus/crypto.ts` | paid×1 | comment describing the (now removed) paid-verdict boundary — comment updated in M3 |
| `lib/livePrice.ts` | pricing×1 | live pricing module comment |
| `lib/scorers/bond/buffett.ts` | premium×2 | bond premium valuation term |
| `lib/scorers/commentary.ts` | pricing×2 | valuation commentary (premium = valuation concept) |
| `lib/scorers/commodity/crude.ts` | premium×1 | commodity commentary |
| `lib/scorers/commodity/danielyergin.ts` | pricing×1, premium×1 | energy commentary |
| `lib/scorers/commodity/jimrogers.ts` | pricing×1 | commodity commentary |
| `lib/scorers/config.ts` | pricing×1, premium×1 | pillar weight labels (premium as valuation concept) |
| `lib/scorers/graham.ts` | premium×1 | margin-of-safety commentary |
| `lib/scorers/pillars/moat.ts` | pricing×1, premium×13 | pricing-power pillar (13 mentions — the moat concept) |
| `lib/types/asset.ts` | pricing×1 | Core pricing field-group comment |
| `lib/wisdom/graph.ts` | pricing×1 | wisdom graph copy |
| `lib/wisdom/parallels.ts` | pricing×2, paid×1, premium×1 | wisdom parallels copy |
| `lib/wisdom/stockParallels.ts` | pricing×9, premium×2 | wisdom parallels copy |
| `lib/wisdom/universalParallels.ts` | premium×1 | wisdom parallels copy |
| `scripts/populateSecurityMasterImpl.ts` | paid×1 | NSE PAID UP VALUE exchange column name |

