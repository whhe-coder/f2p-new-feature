# PRD: Bundles in F2P and Premium PC Business Accounts (Advanced feature)

- **Source (Confluence):** https://xsolla.atlassian.net/wiki/spaces/BE/pages/25272647819/PRD+-+Bundles+in+F2P+and+Premium+PC+Business+Accounts+Advanced+feature
- **Title (name of the feature):** Bundles in F2P and Premium PC Business Accounts — Advanced feature with setup guide built on Catalog frames
- **Author:** Viktor Sakson
- **Scope:** MVP
- **Related BRD:** Business Account - F2P PC variant; Business Account - Premium PC variant; PRD - Quick-Start Guide; PRD - Promotions; PRD - Regional restrictions; Next steps - Premium and F2P PC accounts; Xsolla docs - Bundles; Xsolla docs - Bundle with game keys
- **Dev allocation:** TBA
- **Approvals:** Gennady Klyachman (Product Director, Business Accounts); Eugene Neverov (F2P account product lead); Viktor Sakson (Premium PC account product lead); Maksim Shestopalov (product lead for Bundles)
- **Mockups:** Accounts prototype — Get Started · F2P PC Games — Figma; `bundles-advanced-setup.html`

## Description

Offer Bundles as an Advanced capability card on Get Started, next to the Promotions and Regional restrictions cards, once the partner's initial setup is completed. Clicking the card launches a step-by-step setup guide, built like the Quick-Start setup guides, in which the partner builds a bundle and later manages bundles using the embedded Catalog UI (Catalog frames) inside the guide steps, without leaving the guide page.

## Overview

A bundle lets a partner sell several items as one offer: virtual items, virtual currency and currency packages and, for premium games, keys for games, DLCs, soundtracks and edition upgrades. Bundles raise average order value and give players a discount incentive. Yet in Publisher Account they are reachable only through the Items catalog menu, and a partner must already know they exist, that items and groups should be created first, and how pricing, limits and display periods fit together.

The account next-steps list carries "Sell bundles" as an unstarted F2P/Premium deliverable with priority 3, and "Catalog frames" as a separate deliverable whose purpose is to use the Catalog UI for item creation steps inside guides.

This scope delivers:

- the Bundles card in the Advanced list;
- one setup guide that walks a partner from preparing items to a bundle checked in the store, then into everyday bundle management.

The guide embeds Catalog frames in its steps, so the partner builds the bundle in place. Where frames are not yet available, each step opens the embedded Catalog screen instead.

Follow-on features after the initial release add dynamic bundles, deeper links with time-limited offers, regional prices and purchase limits, and automatic detection of the store check.

## Deliverables

| ID | Deliverable | Platform | Component | Status | Description |
|---|---|---|---|---|---|
| D1 | Bundles Advanced capability card | Business Accounts | Free-to-play Account, Premium PC Account | [x] | One capability card in the Advanced list of Get Started, adjacent to the Promotions and Regional restrictions cards, offered after initial setup, with state, prerequisite handling and a button that launches the guide. |
| D2 | Bundles setup guide | Business Accounts | Free-to-play Account, Premium PC Account | [x] | One in-account step-by-step guide in the Quick-Start guide UI that takes a partner from the card to a live bundle and into bundle management. |
| D3 | Catalog frames for bundles (embedded Catalog UI) | Business Accounts | Free-to-play Account, Premium PC Account | [x] | Embedded Catalog UI components that render inside guide steps for creating groups, items and bundles and for managing existing bundles, with a fallback to the embedded Catalog screens. |

> **Note:** The deliverable status is marked [x] in the source PRD, while Dev allocation is TBA and Q2 says the mockups were not verified. Confirm the status before treating D1–D3 as delivered.

## Scope

### In scope

| ID | Deliverable / item | User story |
|---|---|---|
| D1-US1 | Advanced capability card | As a partner, I want to see "Bundles" in the Advanced list on Get Started next to Promotions and Regional restrictions, so that I discover that I can sell several items as one offer. |
| D1-US2 | Advanced capability card | As a partner, I want the card to show whether I already have a live bundle, so that I can tell what is in place and what I can still set up. |
| D1-US3 | Advanced capability card | As a partner still finishing my initial setup, I want Bundles offered only once that setup is done, and to be told what remains, so that I build the foundation first. |
| D1-US4 | Advanced capability card | As a partner, I want the card's button to launch the setup guide, so that I am walked through the setup instead of searching for it. |
| D2-US1 | Setup guide | As a partner, I want to click the Bundles card and land on a step-by-step guide, so that I can build a bundle myself without leaving my account. |
| D2-US2 | Setup guide | As a partner, I want the guide to open with an overview of what I will build and what I need to prepare, so that I gather items and decide a price before I start. |
| D2-US3 | Setup guide | As a partner, I want each step to show the Catalog tools right inside the guide, so that I do not jump between pages. |
| D2-US4 | Setup guide | As a partner who has no items or groups yet, I want to create them inside the guide, so that I can reach my first bundle in one session. |
| D2-US5 | Setup guide | As a partner, I want to add items of different types and set the quantity of each, so that the bundle contains exactly what I want to sell. |
| D2-US6 | Setup guide | As a partner, I want to make the bundle free or set its price in one or several currencies, so that it matches my store economy. |
| D2-US7 | Setup guide | As a partner, I want an optional step to limit how many bundles can be bought and for how long the bundle is shown, so that I can run limited offers. |
| D2-US8 | Setup guide | As a partner, I want to check the bundle in my store with a test purchase, so that I know players will see and buy it as intended. |
| D2-US9 | Setup guide | As a partner, I want to manage my bundles after launch from the same place, so that I can change contents, price or limits without searching the catalog. |
| D2-US10 | Setup guide | As a partner, I want the guide to track my progress and let me resume where I stopped, so that an interruption does not make me start over. |
| D2-US11 | Setup guide | As a partner, I want a clear confirmation when my bundle is live and a suggestion for what to set up next, so that I know I did it right and can keep going. |
| D2-US12 | Setup guide | As a partner, I want the floating setup widget to show my current step on any page, so that I can jump back into setup from anywhere in the account. |
| D2-US13 | Setup guide | As a partner, I want to reopen the guide after finishing it, so that I can build another bundle with the same guidance. |
| D3-US1 | Catalog frames | As a partner, I want to create groups, items and bundles in embedded Catalog UI inside the guide, so that I never leave the guide page. |
| D3-US2 | Catalog frames | As a partner, I want the embedded UI to follow the same rules and use the same data as Publisher Account, so that my catalog stays consistent wherever I edit it. |
| D3-US3 | Catalog frames | As a team member with existing Publisher Account roles, I want the same access rules inside the embedded UI, so that nobody gains or loses access. |
| D3-US4 | Catalog frames | As a partner, I want a direct link to the full Catalog screen if the embedded UI cannot load, so that I can still finish the step. |

### Mandatory content

- "Bundles" card in the Advanced list of Get Started in both accounts, adjacent to the Promotions and Regional restrictions cards, offered after initial setup is completed.
- Live, Available and Blocked card states driven by account data.
- One setup guide with overview, numbered steps, embedded Catalog UI in the steps, progress tracking, store check, management section, completion confirmation and floating widget entry.
- Embedded Catalog UI for groups, items and bundles, with fallback to the embedded Catalog screens.
- Publisher Account roles and permissions carried over unchanged.

### Exit criteria

- A partner in each account completes the guide end to end and ends with a bundle that a test purchase in the store confirms.
- A partner with no items completes the guide, creating items and a group inside the guide.
- Card shows Blocked before initial setup is completed and Available immediately after, in both accounts.
- The card moves to Live after guide completion without manual action.
- A partner edits and removes a bundle from the guide's management section.
- Existing bundles and catalog data remain unchanged in both accounts.
- Q4, Q6, Q7, Q8 and Q9 are closed and the capability taxonomy entry is signed off.

## Requirements

### D1 — Bundles Advanced capability card

Platform: Business Accounts · Component: Free-to-play Account, Premium PC Account. Productboard: not in Productboard (see Q3).

**Functional requirements**

- **D1-FR1** — The Advanced list of Get Started in both accounts contains a "Bundles" card placed next to the Promotions and Regional restrictions cards. It does not appear in the "Start with" list (see Q9).
- **D1-FR2** — The card shows a capability name, a one-to-two sentence description, a state badge (Live, Available or Blocked) and one primary button, following the Quick-Start card anatomy.
- **D1-FR3** — The card description states that several items can be sold as one offer. Examples adapt to the account: items and currency packages in F2P; games, DLCs and editions in Premium PC.
- **D1-FR4** — The card shows Live when at least one active bundle exists on the partner's project, and Available otherwise. State comes from account data, never from guide visits (see Q6).
- **D1-FR5** — On a Live card the button reads "Open" and opens the guide's bundle management section (D2). A secondary "View guide" link reopens the guide from its first step.
- **D1-FR6** — On an Available card the button reads "Set up" and launches the setup guide (D2), resuming at the current step if the partner already started.
- **D1-FR7** — The card becomes Available only after the partner's initial setup is completed, using the same definition and behaviour as the Promotions and Regional restrictions cards. Until then it shows Blocked, names the unfinished setup, and links to it (see Q7, Q8).
- **D1-FR8** — A Blocked card cannot launch the guide or open bundle management. It moves to Available on the next page load after initial setup is completed.

**Limitations:** Card grouping, ordering, empty state and error state follow the Quick-Start Guide PRD and are not re-specified here. Team-engagement warnings depend on taxonomy flags not yet defined.

### D2 — Bundles setup guide

Platform: Business Accounts · Component: Free-to-play Account, Premium PC Account. Productboard: not in Productboard (see Q3).

**Functional requirements**

- **D2-FR1** — Launching the card opens the guide inside the account shell as a dedicated guide page in the Quick-Start guide layout. There is one guide: "Build and manage bundles".
- **D2-FR2** — The guide opens on an overview stating the goal, the number of steps and a "before you start" list: items to include, price and currencies, optional limits, and the rules that a bundle cannot be empty or contain itself.
- **D2-FR3** — Steps are numbered in sequence. Each shows a title, a one-line description, a status (to do, current, done) and the embedded Catalog UI (D3) for that step inside the step panel.
- **D2-FR4** — The current step is the first step whose condition is unmet. It is re-evaluated on every page load and after every save in the embedded UI. The partner never marks detectable steps as done manually.
- **D2-FR5** — Steps that cannot be detected from account data carry an "I've done this" confirmation and are marked done only when the partner confirms.
- **D2-FR6** — Where a step offers alternative paths, the partner picks one path and the guide shows only that path's instructions. The other path stays selectable.
- **D2-FR7** — A step marked Optional can be skipped. A skipped step counts as done for progress and can be reopened at any time.
- **D2-FR8** — Guide progress persists per project. Reopening the guide from the card, the widget or a link resumes at the current step.
- **D2-FR9** — When the final step completes, the guide shows a success screen naming the bundle created, states that the capability is live, and offers "Manage bundles" and a suggested next capability.
- **D2-FR10** — On completion the card moves to Live. The guide stays reachable through the card's "View guide" link.
- **D2-FR11** — While the guide has an incomplete step, the floating setup widget appears on every account page with the capability name, current step label, a "Go to step" button and a "View full guide" link.
- **D2-FR12** — Guide step copy adapts to the account: virtual items, currency and currency packages in F2P; game keys, DLCs, soundtracks and editions in Premium PC (see Q14, Q17).

**Guide steps**

- **D2-FR13 — Step 1, Prepare items and groups:** The partner picks "I have items" or "Create items now" as alternative paths and creates missing groups or items in the embedded UI. Done when at least one catalog item exists (see Q10).
- **D2-FR14 — Step 2, Describe the bundle:** The partner sets an image (optional), SKU, one or several groups, name and description (optional). Done when a bundle is saved.
- **D2-FR15 — Step 3, Choose the contents:** The partner adds items of any supported type with a quantity for each SKU. Done when the bundle holds at least one item. Premium sees a notice that sales pause when included keys run out.
- **D2-FR16 — Step 4, Set the price:** The partner chooses a free bundle or a paid bundle priced in one or several real or virtual currencies, with a default currency and optional regional prices. Done when a price or free status is saved (see Q13).
- **D2-FR17 — Step 5, Set limits and display period (Optional):** The partner caps how many bundles can be bought and sets a display period with time zone, start and end, or no end date (see Q13).
- **D2-FR18 — Step 6, Check it in your store:** The partner confirms the bundle appears in the storefront and a test purchase delivers its contents. Done by partner confirmation (see Q16).

**Managing bundles**

- **D2-FR19** — The guide includes a "Manage bundles" section, reachable from the success screen and the Live card. It embeds the bundles list (D3).
- **D2-FR20** — From the list the partner can open a bundle to change its contents, price, limits and display period, and can remove a bundle (see Q12).

**Limitations:** Guide layout follows the existing Quick-Start guide pattern and is not verified against a mockup (see Q2). Step copy is illustrative until reviewed by the capability product lead. Dynamic bundles for partner-side personalization are not offered.

### D3 — Catalog frames for bundles (embedded Catalog UI)

Platform: Business Accounts · Component: Free-to-play Account, Premium PC Account. Productboard: not in Productboard (see Q3).

**Functional requirements**

- **D3-FR1** — Catalog frames render inside the guide step panel, so the partner creates groups, items and bundles without leaving the guide page.
- **D3-FR2** — Frames are available for creating a group, creating an item or currency package, creating a bundle (details, contents, price, limits, display period), and listing and editing bundles (see Q4).
- **D3-FR3** — Frames apply the same validation and business rules as Publisher Account, including no empty bundle and no bundle containing itself.
- **D3-FR4** — A save in a frame updates the step status within the guide without a manual page reload.
- **D3-FR5** — Frames take the account theme and language and fit the step panel width on supported screen sizes.
- **D3-FR6** — Access to each frame and action follows the user's existing Publisher Account roles. A user without Catalog access sees the step without the frame, plus a notice.
- **D3-FR7** — If a frame fails to load or is not yet available, the step shows a button that opens the full embedded Catalog screen for the same action (see Q5).
- **D3-FR8** — Items and bundles created in frames behave in storefront and in-game purchase flows exactly as those created in Publisher Account.

**Limitations:** Frames ship "As Is" from the Catalog UI with no account-specific changes. Whether a frame can open at a given stage of the bundle flow is not verified (see Q4). Item types offered follow what the project supports.

## Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | Embedded frames load with no material regression versus the Catalog screens in Publisher Account. The card and guide pages reach interactive state within the Quick-Start 3-second target. |
| Reliability | A frame failure never blocks the guide. The fallback button to the full Catalog screen appears within 5 seconds of a failed load. |
| Permissions | Existing Publisher Account roles apply unchanged in frames and guide. Xsolla-internal admin roles see the same card and guide as partners, marked as a partner-facing view. |
| Localisation | English only at first release. Card and guide names, descriptions, step copy and notices are held in the content model, not in component logic. |
| Accessibility | State badges and step statuses pair colour with a text label. Frames and buttons are keyboard-navigable with descriptive labels. WCAG 2.1 AA. |
| Browser / device | Desktop first, compatible with Mac 13" and 1366x768 screens. Sidebar and top bar are mobile friendly. |
| Analytics | Card button clicks, guide opened, step started, frame saved, step skipped and guide completed emit events carrying capability identifier, step, card state, account variant and timestamp. |
| Backward compatibility | Zero regressions in existing catalog, bundle data and API integrations for Publisher Account users after the frames ship. |

## Out of scope

| Item | Description |
|---|---|
| Dynamic bundles | Bundles whose contents are returned by the partner's server under partner-side personalization are not offered in the guide. |
| Automatic detection of the store check | Detecting a test purchase from account data instead of partner confirmation. |
| Bundle discounts and promo codes | Discounts, bonuses and codes applied to bundles belong to the Promotions PRD. |
| Regional restrictions on bundles | Specified in the Regional restrictions PRD. For game-key bundles they are currently configurable only via API (see Q15). |
| Regional prices as a capability | Country-based price matrices and PPP-adjusted pricing are a separate deliverable. The guide offers only the existing optional regional prices field. |
| Time-limited offers and purchase limits as capabilities | Broader seasonal-event and scarcity features are separate deliverables. The guide uses only the bundle's own display period and quantity limit. |
| Bundle analytics | Reporting on bundle sales belongs to the account Analytics sections. |
| Bulk or API bundle management | Importing or updating bundles in bulk or through the API is unchanged. |
| Guides for other capabilities | Setup guides for other Advanced or "Start with" cards are specified in their own documents. |
| Other accounts | Mobile Account and any account variant other than Free-to-play and Premium PC. |
| Card provisioning from contracts | The card is not populated from BD or CRM contract data. |

## Open questions & risks

| ID | Question / risk | Impact if unresolved | Affects |
|---|---|---|---|
| Q1 | No dedicated BRD exists for this feature. The next-steps list has "Sell bundles" with no description. Should a BRD be written (Monetization BRD format) before this PRD is baselined? | Overview rationale and business outcomes have no signed source; Related BRD stays empty | Header, Overview |
| Q2 | Mockups unverified: the accounts prototype and F2P Figma were not read during authoring, and the next-steps list shows design for "Sell bundles" and "Catalog frames" as still needed. | No field-level or layout requirements for the card, guide or frames; FRs stay behavioural | D1, D2, D3 |
| Q3 | Productboard was not searched. "Sell bundles" and "Catalog frames" may already exist as features and should be reused. | Duplicate features and broken traceability | D1, D2, D3 |
| Q4 | Which Catalog frames exist or are planned (group, item, currency package, game key, bundle create, bundle list and edit)? Can a frame open at a given stage of the bundle flow? What events does it emit? | Steps cannot be built as specified; step detection after save fails | D2, D3 |
| Q5 | Is the fallback to the full embedded Catalog screen acceptable for the first release if frames are not ready? Catalog frames are marked blocked with IGS. | Guide launch slips behind IGS if fallback is rejected | D2, D3 |
| Q6 | What makes the card Live: at least one active bundle, or any bundle? Does a bundle have an active or inactive state? | Wrong Live or Available badges; D1-FR4 cannot be built | D1 |
| Q7 | What marks "initial setup completed"? Use the same definition as the Promotions and Regional restrictions PRDs. | Cards unlock at different moments or never; D1-FR7 cannot be built | D1, D2 |
| Q8 | Before initial setup is completed, should the card show as Blocked with a notice, or be absent from the Advanced list? Align with the other Advanced cards. | The cards behave differently in the same list | D1 |
| Q9 | The taxonomy has no entry for Bundles: name, short description, product lead and position next to the other Advanced cards are undefined. | Card copy and approvals cannot be signed off | D1, D2 |
| Q10 | How many catalog items must exist before step 1 is done: one, or two or more? The docs define a bundle as a set of several items but only forbid an empty bundle. | Step 1 unlocks too early or blocks valid bundles | D2 |
| Q11 | Is skipping an Optional step supported by the Quick-Start guide framework, or does it need to be added? | D2-FR7 needs framework work | D2 |
| Q12 | Which management actions do frames support: change contents, price, limits and display period, deactivate, remove? What happens to bundles already purchased or in carts? | Management section promises actions that frames lack | D2, D3 |
| Q13 | Bundle price can include regional prices, and limits and display period overlap the separate Regional prices, Purchase-limit and Time-limited offers deliverables. Stay with the bundle's own settings, or leave these out of the guide? | Duplicated or conflicting capabilities in the same account | D2 |
| Q14 | For Premium PC, do game keys need to exist before a key bundle? Does the guide link to a key setup guide? Bundle sales pause when included keys run out. | Premium partners hit an empty key list at step 3 | D2 |
| Q15 | Regional restrictions for key bundles are configurable only via API. Does this limit the Regional restrictions PRD for bundles, and should the guide warn partners? | Partners expect restrictions that the UI cannot set | D2 |
| Q16 | Does a new bundle show in the storefront automatically, or does the partner add a bundles block or page? Step 6 copy depends on it. | Store check step sends the partner to the wrong place | D2 |
| Q17 | One shared flow is assumed for both accounts. Do steps or defaults differ per account beyond examples and the game-key notice? | If flows differ, D1–D3 split per account with a delivery order | D1, D2, D3 |
| Q18 | Which team owns the frames inside guides (IGS or the Business Accounts team), and who is the dev allocation? | Duplicate work or a gap between teams | D3 |
| Q19 | Is the Quick-Start guide framework available to reuse? Is guide progress per project or per user? Who approves guide copy? Align with the Promotions PRD. | Guides need their own framework or slip behind Quick-Start | D2 |
| R1 | Capability taxonomy for both variants is not signed off and is a sprint 0 blocker for card rendering. | D1 cannot be built | D1 |
| R2 | Catalog frames are blocked with IGS, which makes them the critical path for the in-place experience. | D3 delays D2 unless the fallback ships | D2, D3 |
| R3 | Runtime signals from Catalog are not confirmed for card Live state and step detection: item exists, bundle saved, contents present, price set. | Live, Blocked and step states fall back to static or manual | D1, D2 |
| R4 | This PRD reuses gating, card states and guide behaviour defined in the Promotions PRD. Changes there change this document. | Advanced capabilities diverge in behaviour | D1, D2 |
