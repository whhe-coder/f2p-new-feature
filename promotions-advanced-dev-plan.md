# Dev Plan: Promotions Advanced feature (F2P and Premium PC)

- **Source PRD:** [promotions-advanced-prd.md](promotions-advanced-prd.md) (Confluence: PRD - Promotions in F2P and Premium PC Business Accounts, Advanced feature)
- **Branch:** `feat/new-feature-prd`
- **Status:** Draft, revision 2. Blocked on the open decisions in section 1 and the items to confirm in section 7.
- **Revision 2:** Updated after a review against the PRD. Changes: scope split per account repo, Advanced list location, separate state for the initial setup and the Advanced guides, explicit step confirmation, overview page, "View guide" link, D1 access gap, analytics source, and a mapping from exit criteria to verification.

## Scope of this plan

This plan delivers the **Free-to-play account only**, in `free-to-play-pc`.

The PRD covers two accounts. Premium PC is a separate repository (`premium-pc-games`, with its own `src/pages/GetStarted` and sidebar config). Project rules forbid changes to sibling account repos from this work. So:

- Premium PC delivery needs its own owner and plan (see C1 in section 7).
- Parts that both accounts can share go to `business-account-shared-library`, then get imported back. Candidates: the card-state rule, the promotions read client, and the guide content model (task 0.1).
- The PRD exit criteria say "in each account". This plan meets them for F2P only. Premium PC sign-off depends on C1.

## 0. Context from the codebase

| Area | What exists today | Implication |
|---|---|---|
| Get Started registry | `src/pages/GetStarted/setups/index.ts` holds `SETUPS` (3 launch paths). `SetupPathId` in `setup-wizard/types.ts` is a closed union. `SetupSelection.tsx:29` renders every `SETUPS` entry that is not `hidden` in the "Start with" grid. | Do **not** register the guides in `SETUPS`. If you add them, they show in "Start with" (breaks D2-FR1). If you mark them `hidden`, the widget and resume logic skip them (breaks D3-FR10). Use a separate `ADVANCED_GUIDES` registry. |
| Selection screen | `selection/SelectionScreen.tsx:27-31` redirects to the current setup's hub when the project has a `currentSetupId`. Only `?switch=1` shows the picker. | A partner who finished the initial setup never sees this screen. The Advanced list cannot live **only** here (task 2.4). |
| Current setup | `useTrackCurrentSetup.ts:20` dispatches `setCurrentSetup` when `SetupScreen` opens a setup. `useSetupProgress` reads that one id. It feeds `SetupGuideWidget`, `SetupProgressBadge` and `resolveEntry`. | The project tracks one current setup. If the promotions guides use `SetupScreen` unchanged, they replace the initial setup in the widget, the badge and the "Get started" entry. The guides need their own state (task 3.4). |
| Step completion | `verify` steps are backend-derived (`useSetupStatus`). Steps without `verify` are marked passed on Next **or Skip** (`SetupScreen.tsx:476-477`, `markStepPassed`). | "Walked past" is not "confirmed". D3-FR5 needs an explicit confirmation state (task 3.2). |
| Progress storage | `getStartedLocal` writes to `localStorage` (`getStartedLocal.ts:201`), versioned by `SCHEMA_VERSION`. | Progress lives in one browser. D3-FR7 (per project, resume from anywhere) needs shared storage (Q14, C2). |
| Setup content model | `SetupConfig` has `setupItemIds` ("What you'll set up"), `analytics` (Metrika event names only), `hidden`, final-page layout. | There is no field for the overview "before you start" list (D3-FR2) or for card state in analytics events. |
| Promotions API | No promotions or discount client in `src/core/apis/`. | A new read client is needed for Live and step detection (PRD R2). |
| Promotions route | `src/routes/inside/storefront.ts:5-11` mounts `/storefront` on `layouts/storefront/index.tsx:63`, which renders `RemoteModule name="storefront"`. Promotions is a sub-route inside that remote. | D1 is mainly verification, not a new embed. |
| Sidebar | `src/layouts/sidebar/project-sidebar-v2/nav-items-config.tsx:225-229`, LiveOps group, has a **Promotions** item → `/projects/${projectId}/storefront/promotions`. It has **no** `privileges`. The `/storefront` route guard checks only catalog, delivery and project-settings privileges. | Access gap for D1-FR5 and D1-US4 (task 1.4). |
| Analytics | Guide events: `src/pages/GetStarted/setup-wizard/guideAnalytics.ts`. `selection/analytics.ts` is the onboarding-form goal map (`Record<SetupPathId, …>`). | New fields need tracking-plan rows (task 4.1). If `SetupPathId` stays closed, `selection/analytics.ts` needs no change. |
| Locales | Only `src/locales/en.json` is hand-edited. | New copy goes there. Smartcat fills the rest. |

## 1. Open decisions (block the build)

These come from the PRD open questions and from section 7. Each one changes code, so resolve it before the task it blocks.

| Ref | Decision | Blocks |
|---|---|---|
| Q4 | What makes a card **Live**: an active promotion of that type, or an account flag? | 2.2 |
| Q5 | What counts as **initial setup completed**? | 2.3 |
| Q10 | Blocked card vs. hidden card before setup is done | 2.3 |
| Q6 | Where bonus promotions sit (under which card, or a third card) | 2.1, 3.1 |
| Q7 | Is F2P the "Live-service PC" variant for card selection? | 2.1 |
| Q14 | Guide progress per project or per user, and where it is stored | 3.4 |
| Q15 | Are partner-confirmed test steps acceptable for v1? | 3.2 |
| Q16 | Reuse the Quick-Start framework, and who approves copy | 3.* |
| R1 | Capability taxonomy sign-off (sprint 0 blocker) | 2.* |
| R2 | Promotions list endpoint and fallback behaviour without it | 2.2, 3.3 |
| P1–P5, C1–C3 | Items to confirm, see section 7 | as listed there |

## 2. Tasks by deliverable

### Shared

0.1 **Shared library.** For each of these, decide whether it goes to `business-account-shared-library`: the card-state rule (2.2, 2.3), the promotions read client (2.2), and the guide content model (3.1). Put a part there only if Premium PC will use it (C1). Otherwise keep it in this repo.

### D1: Promotions section (embedded module)

1.1 **Verify the existing route.** The `storefront` remote serves `/projects/:id/storefront/promotions` (`routes/inside/storefront.ts`, `layouts/storefront`). Confirm that the remote renders the Publisher Account Promotions module, and that no link inside it redirects out (PRD R3). If a link goes out, record it as a gap. Do not rewrite the module.
1.2 **Existing promotions.** On stage, open a project that already has promotions in Publisher Account. Confirm status, values and redemption are unchanged in the embedded section (D1-FR3, exit criterion).
1.3 **Sidebar.** Keep the Promotions item in the LiveOps group. Confirm `visibility` and `hidden` for the F2P account.
1.4 **Access gap (fix).** Add the Promotions privilege(s) to the nav item at `nav-items-config.tsx:225-229` so `filter-accessible-nav-items` hides it from users without Promotions access (D1-FR5). The `/storefront` route guard requires catalog and delivery privileges, so a user with Promotions access only cannot open the section (breaks D1-US4). Give the promotions sub-route its own guard with the Promotions privilege. The privilege names are C3. Update `rbac-contract.test.ts`.
1.5 **Stable address.** Record `/projects/${projectId}/storefront/promotions` as a constant. Cards and guide steps link to it (D1-FR6).

### D2: Advanced cards

2.1 **Registry.** Add `ADVANCED_GUIDES` with the card model (`id`, name, description, account examples, guide config). Keep it apart from `SETUPS`. Then the "Start with" grid, the onboarding-form goal map and the resume redirect stay unchanged (D2-FR1).
2.2 **Live state.** Add a read-only client in `src/core/apis/promotions.ts` (list active promotions by type). Expose it through a hook, for example `useAdvancedCardState`. Live means the Q4 rule holds. Keep the rule in one module.
2.3 **Blocked / Available.** Add a rule for "initial setup completed" (Q5). It reads the initial setup's status, not `currentSetupId`, because opening a guide must not change the answer. Blocked cards name the unfinished setup and link to it (D2-FR7). A Blocked card cannot launch a guide or open Promotions. It moves to Available on the next page load after the initial setup completes (D2-FR8). Do not reuse `requiredStepIds`, which is per setup.
2.4 **Advanced list location.** Build an `AdvancedList` component. Mount it where a partner can reach it after the initial setup. Proposed: the initial setup's hub and its all-done final page, and also the selection screen under `?switch=1`. The final location is P1.
2.5 **Card UI.** Each card shows name, description, a badge (Live / Available / Blocked, with a text label) and one primary button (D2-FR2):
   - Live: "Open" goes to the address in 1.5, and a secondary **"View guide"** link reopens the guide (D2-FR5, D3-FR9, D3-US7).
   - Available: "Set up" launches the guide and resumes at the current step (D2-FR6).
   - Blocked: disabled button, plus the unfinished setup's name and link (D2-FR7).
2.6 **Account variants.** Card copy comes from the content model, not component logic (D2-FR9, D3-FR11). This repo carries the F2P examples (virtual items, currency packs). Premium PC copy belongs to C1.

### D3: Setup guides

3.1 **Two guide configs.** Add `advanced/promotions-discounts/config.tsx` and `advanced/promo-codes-coupons/config.tsx`, registered in `ADVANCED_GUIDES`. Mount them on their own route (for example `get-started/advanced/:guideId`). Reuse the presentation parts of the engine (`SetupHub`, `SetupWizard`, step cards). Do **not** go through `SetupScreen`'s `useTrackCurrentSetup`, so the initial setup stays the current setup (D3-FR1).
3.2 **Overview page (new).** Add an overview content field: goal, what the partner will accomplish, and a "before you start" list. Derive the step count from the steps. The guide opens on this page the first time. It opens on the current step when the partner resumes (D3-FR2, D3-FR7).
3.3 **Steps.** Define steps per PRD D3-FR12 to D3-FR22. Each step is one of two kinds:
   - **Detectable** (`verify`): only where a list endpoint gives a read-only signal (catalog item exists, active promotion exists, code exists). The partner never marks these done (D3-FR4).
   - **Confirmed**: shows an "I've done this" control. It is done only when the partner confirms (D3-FR5). Next and Skip move the partner along but **never** complete it. Store confirmations apart from `markStepPassed`.
   Which steps without a "Done when" line are detectable and which are confirmed is P3. Use `requiredStepIds` only where a step truly cannot be done before another.
3.4 **Verifiers.** Add `verifiers.ts` per guide. List endpoints only. Never call an `ensure*` helper.
3.5 **Progress state.** Add a separate `advancedGuides` state keyed by project and guide. It holds the selected path and the confirmed step ids. It does not touch `currentSetupId`. Storage follows Q14 and P2: D3-FR7 asks for per-project progress that resumes from any device, which `localStorage` cannot give. If shared storage is not ready for v1, use `localStorage` as an interim with a new schema version, and list the cross-device gap in the MR.
3.6 **Completion.** Success screen that names what was set up, states that the capability is live, and suggests the next capability (D3-FR8). The card moves to Live from account data, with no manual action (D3-FR9).
3.7 **Floating widget.** Extend `useSetupProgress` and `SetupGuideWidget` to also consider incomplete Advanced guides. Show capability name, current step label, "Go to step" and "View full guide" (D3-FR10). The rule for which guide the widget shows when more than one is incomplete is P4. Proposed: the initial setup while it is incomplete, then the most recently opened incomplete Advanced guide. `SetupProgressBadge` and `resolveEntry` keep reporting the initial setup only.
3.8 **Alternative paths (code type step).** Store the selected path per guide (3.5). Show only that path's instructions. Keep the other path selectable (D3-FR6).
3.9 **Copy and locale.** Add keys under `host.pages.getStarted.advanced.promotionsDiscounts.*` and `...promoCodesCoupons.*` in `src/locales/en.json` only. Include overview, card, step, confirmation, success and `hub.*` copy.
3.10 **Style.** If a new accent is needed, add it in `style.css`.

### Cross-cutting

4.1 **Analytics.** The PRD events (card button click, guide opened, step button clicked, guide completed) need capability id, step, card state, account variant and timestamp. `SetupConfig.analytics` carries only Metrika event names, and the engine sends nothing for a setup that has no `analytics` block. Get the event names and fields from the tracking plan first (C2). Then add an analytics block to `ADVANCED_GUIDES` and send the extra fields through `setup-wizard/guideAnalytics.ts`.
4.2 **Accessibility.** Badges and step status carry a text label, not colour alone. Buttons are keyboard-navigable and have descriptive labels. WCAG 2.1 AA (PRD NFR).
4.3 **Admin view.** Xsolla-internal admins see the same cards and guides, marked as a partner-facing view (PRD NFR). Today `useSetupProgress.ts:117` lets admins through with no mark. Add the mark on cards, guides and widget.
4.4 **Performance.** Cards and guide pages reach interactive state within 3 seconds. Fetch card state once per page load.
4.5 **Layout.** Check cards, guides and widget at 1366x768 and on a 13" Mac (PRD NFR).
4.6 **Stale data.** Guide progress from earlier builds must not break the new steps. Version the new `advancedGuides` storage.

## 3. Test plan (write first, run only when asked)

Per project policy, tests are written before the code but **not executed** unless the user asks.

| Layer | Target |
|---|---|
| Unit | Card state rule (Live / Available / Blocked); initial-setup-completed rule (Q5) does not change when a guide is opened; verifiers with mocked list responses; current-step logic; **Skip and Next do not complete a confirmed step**; selected path persists |
| Component | `AdvancedList` in each mount point (2.4); card badges, primary button and "View guide" link per state; Blocked card names and links the unfinished setup; overview page content; success screen; widget shows capability name, current step, "Go to step", "View full guide" |
| State | Opening a guide does not change `currentSetupId`, the "Get started" entry or `SetupProgressBadge`; Blocked → Available on the next load after the initial setup completes (D2-FR8) |
| Access | `filter-accessible-nav-items.test.ts`: Promotions hidden without the Promotions privilege; `rbac-contract.test.ts`: Promotions-only user can open the sub-route |
| Routing | Promotions sub-route renders inside the account shell; no redirect to Publisher Account (R3) |
| Analytics | Each PRD event fires with capability id, step, card state, account variant and timestamp |
| Accessibility | Badges and step statuses have a text label; buttons reachable by keyboard |
| Locale | `locales/index.test.ts` still passes with the new keys |
| E2E (opt-in) | Both guides end to end; see `CLAUDE.md` `test:e2e:visual` for the screenshot baseline process |

Skipped future behaviour (real-data Live state until R2 closes, automatic test-step detection) goes in as skipped tests with an activation condition, per the project placeholder policy.

### Exit criteria → verification

| PRD exit criterion | How this plan verifies it (F2P) |
|---|---|
| Each guide end to end, live offer and live code applied in a real purchase | Manual run of both guides on stage, with a real test purchase and a real redemption; recorded in the MR "Stage verification" section |
| Blocked before initial setup, Available immediately after | State tests (D2-FR8) plus a stage check on a new project |
| Card moves to Live after completion without manual action | Unit test on the card-state rule plus the stage run above; depends on R2 |
| Existing promotions unchanged | Task 1.2 on stage |
| No partner-reported regression in the release window | Post-release monitoring; user-owned |
| Q4, Q5, Q6, Q7, Q10 closed; taxonomy signed off | Section 1 resolved before the related task starts |
| Same criteria in the Premium PC account | Not covered here; see C1 |

## 4. Verification before merge

- Local `pnpm dev:stage` is **not** verification for the MR (`CLAUDE.md`).
- MR needs stage verification: `pnpm release` to stage, then preview the tag. Fill in the "Stage verification" section.
- Release and merge are owned by the user (project memory). This plan does not include them.

## 5. Suggested order

1. Resolve section 1 and section 7 with the PRD owners. C1 and P1 come first, because they decide where the code goes.
2. Task 1.1 and 1.2 (verify the existing Promotions route and existing data).
3. Task 1.4 once C3 gives the privilege names.
4. Tests for 2.2, 2.3, 3.3, 3.5 (write first).
5. D2 cards (2.1 to 2.6), then D3 guides (3.1 to 3.10).
6. Cross-cutting (4.1 to 4.6).
7. Stage verification and MR (user-owned release).

## 6. Risks

| Risk | Mitigation |
|---|---|
| Live and Blocked rules are undefined (Q4, Q5) | Keep rules in one module so they change in one place. |
| Promotions list endpoint is not confirmed (PRD R2) | Confirm the endpoint with the Catalog team before 2.2. Without it, cards never reach Live and "Review and activate" (D3-FR15) and "Create the codes" (D3-FR19) lose their signal, which breaks an exit criterion. Any fallback (for example "Available only" or partner confirmation) needs product sign-off first (P5, R2). Do not ship a fallback by default. |
| Embedded Publisher Account screens link back out (R3) | Check during 1.1. If present, file the gap rather than rewriting the module. |
| Guides replace the initial setup in the widget and entry points | Separate `advancedGuides` state (3.5) and a separate route (3.1). Covered by the State tests. |
| Progress lost across devices or teammates | Shared storage per Q14 and P2. If interim `localStorage` ships, list the gap in the MR. |
| Premium PC not delivered with F2P | C1 names the owner and plan. Shared parts go to `business-account-shared-library` (0.1). |
| Two guides diverge from the Quick-Start guide | Reuse the engine's presentation parts; do not copy the Quick-Start code. |
| Taxonomy sign-off slips (R1) | Build D1 and the registry first, which do not depend on it. |

## 7. Items to confirm

### PRD ambiguities (confirm with the PRD owners)

| ID | Question | PRD ref | Plan default until answered | Blocks |
|---|---|---|---|---|
| P1 | Where does the Advanced list live? Today Get Started is "one current setup plus its hub", and a partner who finished the initial setup is redirected to that hub. Which page shows the list, and where does the partner land after the initial setup? | D2-FR1, Q10, Q16 | Initial setup hub, its all-done final page, and the selection screen under `?switch=1` | 2.4 |
| P2 | Are guide progress and "I've done this" confirmations shared by the project team or kept per user? Are they stored in the backend or locally? | D3-FR7, Q14 | Per project, interim `localStorage` (cross-device gap listed in the MR) | 3.5 |
| P3 | D3-FR13, FR14, FR17, FR18 and FR20 have no "Done when". Are they detectable, confirmed by the partner, or informational? If they happen in the same Promotions form as the step that is detectable, must each one be confirmed? | D3-FR4, D3-FR5 | Informational: done when the next detectable step is done | 3.3 |
| P4 | When the initial setup and both promotions guides are incomplete, which one does the floating widget show? | D3-FR10 | Initial setup first, then the most recently opened Advanced guide | 3.7 |
| P5 | Type boundaries for Live: under which card does a bonus promotion count (Q6)? Does a promo code whose reward is a discount also make "Sales, discounts & offers" Live (Q4)? | D2-FR4, Q4, Q6 | Each card counts only its own promotion types | 2.2 |

### Delivery and access (confirm with the account leads)

| ID | Question | Blocks |
|---|---|---|
| C1 | Who delivers Premium PC, in `premium-pc-games`, and on what timeline? Which shared parts go to `business-account-shared-library`? | 0.1, exit criteria for Premium PC |
| C2 | Is there a tracking-plan row for each PRD analytics event, with the field names for card state, account variant and capability id? | 4.1 |
| C3 | What are the Publisher Account privilege names for viewing and managing Promotions? | 1.4 |
