# PRD: Promotions (discounts, bonuses, promo codes) in F2P and Premium PC Business Accounts — Advanced feature

- **Source (Confluence):** https://xsolla.atlassian.net/wiki/spaces/BE/pages/25265799473/PRD+-+Promotions+in+F2P+and+Premium+PC+Business+Accounts+Advanced+feature
- **Author:** Viktor Sakson
- **Scope:** MVP
- **Related BRD:** Business Account - F2P PC variant; Business Account - Premium PC variant; BRD - Quick-Start Guide for Publisher Account; Bulk Upload of Promocodes and Coupons in Publisher Account - BRD
- **Dev allocation:** TBA
- **Approvals:** Gennady Klyachman (Product Director, Business Accounts); Eugene Neverov (F2P account product lead); Viktor Sakson (Premium PC account product lead); Maksim Shestopalov (product lead, Catalogue)
- **Mockups:** Accounts prototype — Get Started

## Description

Embed the Publisher Account Promotions section — discounts, bonus promotions, coupons and promo codes — into the Free-to-play and Premium PC Business Accounts. Promotions is offered as two cards in the Advanced list of Get Started once the partner's initial setup is completed. Clicking a card launches a step-by-step setup guide, built like the Quick-Start setup guides, that takes the partner to a live promotion.

## Overview

Partners cannot easily find the promotion tools they are contracted for. Publisher Account presents a navigation tree of settings rather than a list of capabilities, and advanced features attached during contracting go unactivated because they are never surfaced. For free-to-play partners the cost is higher: F2P revenue depends on live-ops mechanics such as promotions that drive repeat spend, and a partner who never reaches them never compounds that revenue. For premium partners launch day is the revenue peak, and promo codes are a core tool for early adopters and creator campaigns.

The F2P and Premium PC accounts embed every Publisher Account module "As Is", including Promotions under LiveOps, yet Promotions is not presented as a capability a partner can discover, start and track. The account next-steps list carries "Run promo campaigns" and "Bonuses, promocodes" as unstarted F2P/Premium deliverables, and the Quick-Start Advanced tier names "Sales, discounts & offers" and "Promo codes & coupons" without a defined build.

This scope delivers the embedded Promotions section in both accounts, two Advanced cards that are offered once initial setup is completed, and one setup guide per card modelled on the Quick-Start guide UI: an overview, numbered steps that deep-link into the right screens, automatic progress tracking, a completion confirmation and a floating widget entry. Follow-on features after the initial release add a simplified Promotions interface per account and further guide refinements.

## Deliverables

| ID | Deliverable | Platform | Component | Status | Description |
|---|---|---|---|---|---|
| D1 | Promotions section (embedded Publisher Account module) | Business Accounts | Free-to-play Account, Premium PC Account | [x] | Publisher Account Promotions module (discounts, bonus promotions, coupons, promo codes) embedded "As Is" in the LiveOps sidebar group. One shared flow for both accounts. |
| D2 | Promotions Advanced capability cards | Business Accounts | Free-to-play Account, Premium PC Account | [x] | Two capability cards in the Advanced list of Get Started — "Sales, discounts & offers" and "Promo codes & coupons" — offered after initial setup, with state, prerequisite handling and buttons that launch the guides. |
| D3 | Promotions setup guides | Business Accounts | Free-to-play Account, Premium PC Account | [x] | Two in-account step-by-step guides in the Quick-Start guide UI, one per card, that take a partner from the card to a live discount, bonus, promo code or coupon. |

> **Note:** The deliverable status is marked [x] in the source PRD, while Dev allocation is TBA and Q2 says the mockups were not verified. Confirm the status before treating D1–D3 as delivered.

## Scope

### In scope

| ID | Deliverable / item | User story |
|---|---|---|
| D1-US1 | Promotions section | As a partner using the F2P or Premium PC account, I want to open Promotions from the LiveOps group of my sidebar without leaving the account, so that I can run promotions in the same context as the rest of my setup. |
| D1-US2 | Promotions section | As a partner, I want to create and manage discounts, bonus promotions, coupons and promo codes with the same capabilities as in Publisher Account, so that moving to my account does not remove tools I already use. |
| D1-US3 | Promotions section | As a partner who already runs promotions in Publisher Account, I want to see them unchanged in my account, so that my live campaigns are not disrupted by the switch. |
| D1-US4 | Promotions section | As a team member with existing Publisher Account roles, I want the same access rules inside the embedded Promotions section, so that nobody gains or loses access after the switch. |
| D2-US1 | Advanced capability cards | As a partner, I want to see "Sales, discounts & offers" and "Promo codes & coupons" in the Advanced list on Get Started, so that I discover the promotion tools available to my account. |
| D2-US2 | Advanced capability cards | As a partner, I want each card to show whether that capability is already live on my account, so that I can tell what is running and what I can still set up. |
| D2-US3 | Advanced capability cards | As a partner still finishing my initial setup, I want Promotions offered only once that setup is done, and to be told what remains, so that I build the foundation first. |
| D2-US4 | Advanced capability cards | As a partner, I want the card's button to launch the setup guide for that capability, so that I am walked through the setup instead of searching for it. |
| D3-US1 | Setup guides | As a partner, I want to click a Promotions card and land on a step-by-step guide for that capability, so that I can configure it myself without leaving my account. |
| D3-US2 | Setup guides | As a partner, I want the guide to open with an overview of what I will accomplish and what I need to prepare, so that I can gather everything before I start. |
| D3-US3 | Setup guides | As a partner, I want numbered steps that each open the right Promotions or Catalog screen, so that I do not have to hunt through the sidebar. |
| D3-US4 | Setup guides | As a partner, I want the guide to track my progress and let me resume where I stopped, so that an interruption does not make me start over. |
| D3-US5 | Setup guides | As a partner, I want a clear confirmation when my promotion or codes are live and a suggestion for what to set up next, so that I know I did it right and can keep going. |
| D3-US6 | Setup guides | As a partner, I want the floating setup widget to show my current Promotions step on any page, so that I can jump back into setup from anywhere in the account. |
| D3-US7 | Setup guides | As a partner, I want to reopen a guide after finishing it, so that I can review my settings or troubleshoot later. |

### Mandatory content

- Promotions item under LiveOps in both the Free-to-play and Premium PC account sidebars, opening the embedded section.
- Feature parity between the embedded section and Publisher Account Promotions for discounts, bonus promotions, coupons and promo codes.
- "Sales, discounts & offers" and "Promo codes & coupons" cards in the Advanced list of Get Started in both accounts, offered after initial setup is completed.
- Live, Available and Blocked card states driven by account data.
- One setup guide per card with overview, numbered steps, deep links, progress tracking, completion confirmation and floating widget entry.
- Publisher Account roles and permissions carried over unchanged.

### Exit criteria

- A partner in each account completes each guide end to end and ends with a live discount or bonus offer, and a live promo code or coupon, applied in a real purchase flow.
- Cards show Blocked before initial setup is completed and Available immediately after, in both accounts.
- The card moves to Live after guide completion without manual action.
- Promotions created before the switch remain active and unchanged in both accounts.
- No partner-reported regression in existing Promotions behaviour during the release window.
- Q4, Q5, Q6, Q7 and Q10 are closed and the capability taxonomy entries for both cards are signed off.

## Requirements

### D1 — Promotions section (embedded Publisher Account module)

Platform: Business Accounts · Component: Free-to-play Account, Premium PC Account

**Functional requirements**

- **D1-FR1** — The LiveOps sidebar group in both accounts shows a "Promotions" item that opens the embedded Promotions section inside the account shell, with no redirect to Publisher Account.
- **D1-FR2** — The embedded section lets a partner create and manage discounts, bonus promotions, coupons and promo codes using the same screens and business rules as Publisher Account.
- **D1-FR3** — Promotions already created for the partner's project in Publisher Account appear in the embedded section with unchanged status, values and redemption behaviour.
- **D1-FR4** — A promotion created in the embedded section applies to the project's storefront and in-game purchase flows exactly as one created in Publisher Account.
- **D1-FR5** — Access to the section and to each action inside it follows the user's existing Publisher Account roles. A user without Promotions access cannot open the section.
- **D1-FR6** — The embedded section has a stable in-account address, so that cards and guide steps can link to it directly.

**Limitations:** The section ships "As Is": no account-specific simplification and no change to promotion logic. Availability of bulk code upload follows Publisher Account. Field-level and layout detail is not specified until the mockups are verified (see Q2).

### D2 — Promotions Advanced capability cards

Platform: Business Accounts · Component: Free-to-play Account, Premium PC Account

**Functional requirements**

- **D2-FR1** — The Advanced list of Get Started in both accounts contains a "Sales, discounts & offers" card and a "Promo codes & coupons" card. Neither appears in the "Start with" list.
- **D2-FR2** — Each card shows a capability name, a one-to-two sentence description, a state badge (Live, Available or Blocked) and one primary button, following the Quick-Start card anatomy.
- **D2-FR3** — The "Sales, discounts & offers" card names time-limited discounts and bonus rewards. The "Promo codes & coupons" card names promo codes and coupons (see Q6).
- **D2-FR4** — A card shows Live when at least one active promotion of its type exists on the partner's project. State comes from account data, never from guide visits (see Q4).
- **D2-FR5** — On a Live card the button reads "Open" and opens the embedded Promotions section (D1). A secondary "View guide" link reopens the setup guide (D3).
- **D2-FR6** — On an Available card the button reads "Set up" and launches the setup guide (D3) for that capability, resuming at the current step if the partner already started.
- **D2-FR7** — Both cards become Available only after the partner's initial setup is completed. Until then they show Blocked, name the unfinished setup, and link to it (see Q5, Q10).
- **D2-FR8** — A Blocked card cannot launch a guide or open Promotions. It moves to Available on the next page load after initial setup is completed.
- **D2-FR9** — Both cards behave identically in both accounts. Card examples adapt to the account: virtual items and currency packs in F2P, game keys and DLCs in Premium PC (see Q8).

**Limitations:** Card grouping, ordering, empty state and error state follow the Quick-Start Guide PRD and are not re-specified here. Team-engagement warnings depend on taxonomy flags not yet defined (see Q12).

### D3 — Promotions setup guides

Platform: Business Accounts · Component: Free-to-play Account, Premium PC Account

**Functional requirements**

- **D3-FR1** — Launching a card opens its guide inside the account shell as a dedicated guide page in the Quick-Start guide layout. There is one guide per card: "Sales, discounts & offers" and "Promo codes & coupons".
- **D3-FR2** — The guide opens on an overview stating the goal, what the partner will accomplish, the number of steps, and a "before you start" list of what to prepare.
- **D3-FR3** — Steps are numbered in sequence. Each shows a title, a one-line description, a status (to do, current, done) and one button that opens the matching Promotions or Catalog screen.
- **D3-FR4** — The current step is the first step whose condition is unmet, re-evaluated on every page load. The partner never marks detectable steps as done manually.
- **D3-FR5** — Steps that cannot be detected from account data carry an "I've done this" confirmation and are marked done only when the partner confirms.
- **D3-FR6** — Where a step offers alternative paths, the partner picks one path and the guide shows only that path's instructions. The other path stays selectable.
- **D3-FR7** — Guide progress persists per project. Reopening the guide from the card, the widget or a link resumes at the current step.
- **D3-FR8** — When the final step completes, the guide shows a success screen naming what was set up, states that the capability is live, and suggests the next capability to set up.
- **D3-FR9** — On completion the card moves to Live. The guide stays reachable through the card's "View guide" link.
- **D3-FR10** — While a guide has an incomplete step, the floating setup widget appears on every account page with the capability name, current step label, a "Go to step" button and a "View full guide" link.
- **D3-FR11** — Guide step copy adapts to the account: virtual items, currency packs and bundles in F2P; game keys, editions and DLCs in Premium PC.

**"Sales, discounts & offers" guide — steps**

- **D3-FR12 — Step 1, Choose what to promote:** The partner picks the items, bundles or game keys the offer applies to. Done when at least one catalog item exists.
- **D3-FR13 — Step 2, Choose the offer:** The partner selects a discount on the chosen items, or a bonus item or currency added to the purchase, in the embedded Promotions section.
- **D3-FR14 — Step 3, Set schedule and limits:** The partner sets start and end dates and, where needed, regions and per-player limits for the offer.
- **D3-FR15 — Step 4, Review and activate:** The partner checks the resulting price or bonus and activates the offer. Done when an active promotion exists.
- **D3-FR16 — Step 5, Check it in your store:** The partner confirms the offer appears on the storefront and a test purchase applies it. Done by partner confirmation.

**"Promo codes & coupons" guide — steps**

- **D3-FR17 — Step 1, Choose the reward:** The partner decides what the code gives: a discount, a bonus item or currency, or an item through a predefined offer.
- **D3-FR18 — Step 2, Choose the code type:** The partner picks a shared promo code or a one-time coupon linked to a predefined offer. The two are shown as alternative paths.
- **D3-FR19 — Step 3, Create the codes:** The partner enters a code, or uploads a file of codes where bulk upload is available in Publisher Account (see Q13). Done when a code exists.
- **D3-FR20 — Step 4, Set validity and limits:** The partner sets validity dates and the number of redemptions allowed per code.
- **D3-FR21 — Step 5, Let players redeem:** The partner adds the promo code block to the storefront or connects redemption in the game. Done by partner confirmation.
- **D3-FR22 — Step 6, Test a redemption:** The partner redeems a code and confirms the reward was granted. Done by partner confirmation.

**Limitations:** Guide layout follows the existing Quick-Start guide pattern and is not verified against a mockup (see Q2). Step copy is illustrative until reviewed by the capability product leads. Partner-confirmed steps stay confirmation-based until account data can detect test purchases and redemptions (see Q15).

## Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | Embedded Promotions section loads with no material regression versus Publisher Account today. Cards and guide pages reach interactive state within the Quick-Start 3-second target. |
| Permissions | Existing Publisher Account roles apply unchanged in the embedded section and guides. Xsolla-internal admin roles see the same cards and guides as partners, marked as a partner-facing view. |
| Localisation | English only at first release. Card and guide names, descriptions, step copy and notices are held in the content model, not in component logic. |
| Accessibility | State badges and step statuses pair colour with a text label. Buttons are keyboard-navigable with descriptive labels. WCAG 2.1 AA. |
| Browser / device | Desktop first, compatible with Mac 13" and 1366x768 screens. Sidebar and top bar are mobile friendly. |
| Analytics | Card button clicks, guide opened, step button clicked and guide completed emit events carrying capability identifier, step, card state, account variant and timestamp. |
| Backward compatibility | Zero regressions in existing Promotions data, behaviour and API integrations for Publisher Account users after the embed ships. |

## Out of scope

| ID | Deliverable / item | Description |
|---|---|---|
| D1-US5 | Simplified Promotions interface | A simplified Promotions interface that shows only the promotion types the partner's game uses. |
| — | Bulk code upload | Upload of up to 10,000 promo codes and coupons by file or API is specified in the Bulk Upload BRD. It appears in the embedded section and in the code-creation step when it ships in Publisher Account, with no account-specific work here. |
| — | Automatic detection of test steps | Detecting test purchases and test redemptions from account data instead of partner confirmation. |
| — | Guides for other capabilities | Setup guides for other Advanced or "Start with" cards are specified in their own documents. |
| — | Promotion logic | Calculation, stacking, redemption rules and catalog APIs for promotions are unchanged. |
| — | Promotions analytics | Promotions and coupons performance reporting (redemptions, revenue with promotion versus baseline) belongs to the account Analytics sections. |
| — | Time-limited offers | Items or bundles visible only in a defined window are a separate deliverable in the account next-steps list. |
| — | Storefront promotion blocks | Promo code input and bonus or discount indicators on Shop Builder storefronts are unchanged. |
| — | Other next-steps items | Purchase limits, regional prices and restrictions, subscriptions and catalog frames are separate deliverables. |
| — | Other accounts | Mobile Account and any account variant other than Free-to-play and Premium PC. |
| — | Card provisioning from contracts | Cards are not populated from BD or CRM contract data. |

## Open questions & risks

| ID | Question / risk | Impact if unresolved | Affects |
|---|---|---|---|
| Q1 | No dedicated BRD exists for this feature; only the account, Quick-Start and bulk-upload BRDs. Should a BRD be written (Monetization BRD format) before this PRD is baselined? | Overview rationale and business outcomes have no signed source; Related BRD stays empty | Header, Overview |
| Q2 | Mockups unverified: the accounts prototype and F2P Figma could not be read during authoring, no Premium Figma link exists, and the guide layout is inferred from the Quick-Start PRD. | No field-level or layout requirements for Promotions, cards or guides; FRs stay behavioural | D1, D2, D3 |
| Q3 | Productboard was not searched. "Run promo campaigns" and "Bonuses, promocodes" may already exist as features and should be reused. | Duplicate features and broken traceability | D1, D2, D3 |
| Q4 | What makes a promotion card Live: at least one active promotion of its type, or an account-level enabled flag? | Wrong Live or Available badges; D2-FR4 cannot be built | D2 |
| Q5 | What marks "initial setup completed": every "Start with" capability done, at least one done, or the Instant Onboarding flow finished? | Cards unlock too early or never; D2-FR7 cannot be built | D2, D3 |
| Q6 | Where do bonus promotions sit: under "Sales, discounts & offers", under "Promo codes & coupons", or as a third card? "Promo codes & coupons" also has no short description or product lead in the taxonomy. | Bonuses undiscoverable; guide scope and card copy cannot be signed off | D2, D3 |
| Q7 | Is the F2P account the "Live-service PC" variant in the Quick-Start taxonomy? The Quick-Start PRD names Premium PC and Live-service PC; the account PRD names F2P. | F2P may receive the wrong card set | D2 |
| Q8 | One shared flow is assumed for both accounts. Do card copy, guide steps or Promotions defaults differ per account beyond examples? | If flows differ, D1–D3 split per account with a delivery order | D1, D2, D3 |
| Q9 | Both account PRDs already list Promotions (LiveOps) as an "As Is" module in their inventories. Which PRD owns the embed, and who is the dev allocation for D1? | Duplicate work or a gap between three PRDs | D1 |
| Q10 | Before initial setup is completed, should the Promotions cards show as Blocked with a notice, or be absent from the Advanced list? The draft assumes Blocked. | Partners either see locked options or do not know Promotions exists; D2-FR7 changes | D2 |
| Q11 | Do the Quick-Start cards and guides ship in the account launch train or as a fast-follow (Quick-Start open question)? | Cards may launch after the embed, leaving Promotions undiscoverable | D2, D3 |
| Q12 | Do these capabilities carry a team-engagement warning (for example connecting redemption in the game needing Integration), and what duration copy applies? | Partners not warned about Xsolla-side steps | D2, D3 |
| Q13 | Has bulk code upload shipped in Publisher Account? "Bonuses, promocodes — upload promocodes" is listed as unstarted. | Partners expect code upload that the embedded section and guide step 3 lack | D1, D3 |
| Q14 | Is guide progress shared by every team member on the project, or kept per user? | Duplicate or conflicting progress across teammates; D3-FR7 changes | D3 |
| Q15 | Are partner-confirmed test steps acceptable for the first release, or must test purchases and redemptions be detected from account data? | Guides may show steps done that were never tested | D3 |
| Q16 | Is the Quick-Start guide framework (step list, progress, floating widget) available to reuse, and who writes and approves guide copy? | Guides need their own framework or slip behind Quick-Start | D3 |
| R1 | Capability taxonomy for both variants is not signed off and is a sprint 0 blocker for card rendering. | D2 cannot be built | D2 |
| R2 | Runtime signals are not confirmed from Catalog for card Live state and guide step detection: item exists, promotion active, code exists. | Live, Blocked and step states fall back to static or manual | D2, D3 |
| R3 | Embedded Publisher Account screens may contain links that return the user to Publisher Account. | Breaks the no-redirect requirement | D1, D3 |
