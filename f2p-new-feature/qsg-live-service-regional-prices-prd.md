# PRD: QSG Live-service: Regional prices for virtual goods

- **Source (Confluence):** https://xsolla.atlassian.net/wiki/spaces/BE/pages/25274712095/PRD+-+QSG+Live-service+Regional+prices+for+virtual+goods
- **Page heading:** Quick-Start Guide: Regional prices for virtual goods
- **Purpose:** Build spec for the Regional prices for virtual goods guide behind the Live-service Advanced card in the PA Quick-Start Guide.
- **Owner:** Eugene Neverov
- **Requestor:** XPS Product (Gennady Klyachman), confirm
- **Stakeholders:** Gennady Klyachman (Director of Product, XPS), IM/MIT lead (TBD), CSM lead (TBD), Feature PO (TBD)
- **BRD link:** https://xsolla.atlassian.net/wiki/spaces/~71202044b57edec0804c58b15b9db012e7438c/pages/25271861486
- **Jira epic:** TBD, created at build start
- **Target release:** TBD: Quick-Start Guide v2 launch train (parent PRD OQ-02)
- **Mockups:** Prototype: https://claude.ai/artifact/DQLuUycPMRwTTE6Fr3VJzy (feature 5). PNG screens: `qsg-live-service-advanced-screens.zip`, folder `05-regional_prices_vg`
- **Additional links:** Parent PRD v2: https://xsolla.atlassian.net/wiki/spaces/XPS/pages/24843157537
- **Version:** 0.1
- **Status:** Draft, BRD pending approval
- **Approved date:** (empty)

## Summary & goals

Live-service partners price currency packages in USD only because setting local prices per country in PA is a per-item, per-country task that nobody finishes. This release adds a 4-screen guide behind the "Regional prices for virtual goods" card in the Live-service Advanced section of the Quick-Start Guide. The card follows the parent PRD states (Live, Available, Blocked). The card never blocks. The flow is fully self-service. The card turns Live when every currency package in scope has regional prices.

## KPI

| KPI | Today | Target | When | Measured by |
|---|---|---|---|---|
| Regional prices guide completion rate | TBD baseline | Proposed: 70% | 3 months post-GA | `qsg_guide_opened`, `qsg_feature_enabled` |
| Live-service PC accounts with regional prices on all currency packages | TBD baseline | Proposed: +30% vs baseline | 6 months post-GA | Account capability state (data source), `qsg_feature_enabled` |
| Payment conversion in localised regions vs USD-only | TBD baseline | Proposed: +10% | 6 months post-GA | Payments data per country (data source), `qsg_regional_prices_applied` |

## Non-goals

- Changes to the suggested prices algorithm → Pricing team
- Regional restrictions (blocking sale by country) → separate guide, Regional restrictions for virtual goods
- Automatic price refresh on currency movements → v2
- Quick-Start index page, card anatomy, ordering and floating widget → parent PRD v2 (FR-01 to FR-15, FR-N1 to FR-N6)
- Guide copy in languages other than English → v2, PA localisation pipeline

## User stories

Carried from the BRD.

### Partners (live-service PC publishers)

- As a live-service publisher, I want to apply local prices to all my currency packages at once so that I do not edit 100 countries per item.
- As a live-service publisher, I want to review suggested prices before applying so that no region gets an unintended price.

### CSM and Support

- As a CSM, I want partners to localise prices on their own so that I stop preparing price matrices by hand.
- As a Risk analyst, I want large negative deltas confirmed explicitly so that arbitrage exposure is a conscious choice.

## Functional requirements

### Card on the Quick-Start page

How the capability card behaves on the index. Inherits parent FR-06 to FR-08 and adds capability-specific content.

| ID | Requirement | Acceptance criteria | Priority |
|---|---|---|---|
| CARD-01 | The card shows name "Regional prices for virtual goods", description "Optimize virtual item and currency package prices by region using PPP-adjusted or manual price matrices", a state badge and a CTA | Card renders with all four elements for a live-service PC account; card is absent for Premium PC accounts | Must |
| CARD-02 | The card is never Blocked by the web shop prerequisite | Account without web shop: badge Available, CTA "Set up" opens the guide | Must |
| CARD-03 | The card shows no team-engagement warning | Available card renders without a warning block | Must |
| CARD-04 | The card turns Live when regional prices are detected on the account's currency packages | After Apply, the index shows badge Live and CTA "Open" on next load without manual refresh | Must |

### Guide shell

Behaviour shared by every screen of this guide. Inherits parent section 7.2.

| ID | Requirement | Acceptance criteria | Priority |
|---|---|---|---|
| GDE-01 | The guide opens with an overview: outcome, time estimate (10 mins) and what to have ready (base price configured, price matrix or auto-suggested) | Opening the guide shows the overview before any form field | Must |
| GDE-02 | Screens are numbered 1 to 4 with a progress bar and the current step label | Screen 3 shows "step 3 of 4" and a 3/4 progress bar | Must |
| GDE-03 | Progress is resumable and driven by account state | Partner leaves on screen 3 and returns next day: guide opens on screen 3 with edits kept | Must |
| GDE-04 | Each screen deep-links to the PA section it edits | Every screen shows the PA breadcrumb and the matching left-nav item is active | Should |
| GDE-05 | The final screen shows the success state and a "What's next?" recommendation (parent FR-14, FR-15) | After completion: success notification plus one recommended next capability that is not Blocked | Must |

### Regional pricing steps

What each of the 4 screens must do. Screen numbers match the prototype.

| ID | Requirement | Acceptance criteria | Priority |
|---|---|---|---|
| RGP-01 | Scope step lists items without a base price and skips them | 3 packages, 1 without base price: that row shows "No base price, skipped" and apply count is 2 | Must |
| RGP-02 | Deltas more negative than 60% require explicit confirmation | Suggested price 65% below base: confirmation dialog lists affected countries before apply | Must |
| RGP-03 | Apply can be undone for 10 minutes | Undo within 10 minutes restores previous prices; after 10 minutes Undo is hidden | Should |
| RGP-04 | Screen 1 "Pick items" (Items catalog): Defines the scope of the price update. | Scope options: all currency packages, selected items, whole catalog; items without a base price are listed and skipped | Must |
| RGP-05 | Screen 2 "Choose method" (Items catalog): Selects the price source. | Matrix CSV columns: `sku`, `country_iso`, `currency`, `amount`; invalid rows reported, valid rows importable | Must |
| RGP-06 | Screen 3 "Review prices" (Items catalog): Previews prices per item and country before writing them. | Every cell editable; rounding switch applies local price endings; negative deltas above 60% need confirmation | Must |
| RGP-07 | Screen 4 "Apply" (Items catalog): Writes `prices[]` per item. | Success notice shows package and country counts; Undo available for 10 minutes; card state becomes Live | Must |

## Non-functional requirements

| ID | Category | Requirement | Target |
|---|---|---|---|
| NFR-01 | Performance | Guide screen reaches interactive state | p95 < 2 s on standard broadband (proposed; parent NFR-01 sets 3 s for the index) |
| NFR-02 | Performance | Suggested prices generation for up to 20 items | p95 < 3 s with progress indicator |
| NFR-03 | Availability | Guide availability follows PA | Same monthly SLO as PA. TBD, owner: PA platform lead |
| NFR-04 | Scalability | Bulk apply | Up to 500 items x 170 countries per run, batched, resumable on failure |
| NFR-05 | Observability | Every screen view, completion, error and apply emits an event | Events live and visible in the analytics dashboard before the Wave 1 gate |
| NFR-06 | Compatibility | Accessibility | WCAG 2.1 AA (parent NFR-02): negative deltas flagged with text, not colour alone |
| NFR-07 | Localization | Currency formatting | Prices shown in local currency format per country |

## UX & mockups

Prototype (interactive, all screens): https://claude.ai/artifact/DQLuUycPMRwTTE6Fr3VJzy. Open feature 5 in the left rail. PNG exports of every screen are in `qsg-live-service-advanced-screens.zip`, folder `05-regional_prices_vg`; attach them to this page. The prototype is a wireframe in XUI tokens, not a final design. Figma mockups are needed before build start (blocker).

| # | Screen | PA location | Heading | Key elements |
|---|---|---|---|---|
| 1 | Pick items | Items catalog / Regional prices | Which prices should adapt by region? | Scope: All currency packages / Selected items / Whole catalog; table: Package, Base price, Regional prices now; CTA "Continue to method", secondary "Cancel" |
| 2 | Choose method | Items catalog / Regional prices | How should we set local prices? | options: Suggested prices / Upload a price matrix / Set manually; CTA "Generate suggestions", secondary "Back" |
| 3 | Review prices | Items catalog / Regional prices / Review | Review suggested prices | table: Country, Currency, Suggested, vs. USD base; switch: Round to local price endings; CTA "Apply to 3 packages", secondary "Back" |
| 4 | Apply | Items catalog / Regional prices | Regional prices applied | success notice: 3 packages now have prices in 128 countries; CTA "Back to Quick-Start Guide", secondary "Undo" |

States the prototype does not show:

- **Loading:** progress indicator while suggestions are generated and while bulk apply runs.
- **Empty:** scope with no priced items shows "Set a base price first" with a link to the catalog.
- **Error:** matrix upload errors listed per row; failed apply resumes from the last batch.
- **Permission denied:** read-only guide with "Ask a project owner to complete this step".

**Prototype divergence:** the prototype shows "Before you start" on every Available card and uses the label Enabled. Build follows the parent PRD: team-engagement warning only on team-engaged cards, and the badge label is Live.

## Analytics & telemetry

| Event | Trigger | Parameters | Feeds KPI |
|---|---|---|---|
| `qsg_card_clicked` | Partner clicks the card CTA | `capability_id`, `card_state`, `variant`, `timestamp` | Completion rate |
| `qsg_guide_opened` | Guide overview is shown | `capability_id`, `entry` (card / widget / what_next) | Completion rate |
| `qsg_guide_step_viewed` | A screen is shown | `capability_id`, `step`, `step_name` | Completion rate (funnel) |
| `qsg_guide_step_completed` | A screen's primary CTA succeeds | `capability_id`, `step`, `duration_ms` | Completion rate (funnel) |
| `qsg_guide_error` | A save or check fails | `capability_id`, `step`, `error_code` | Operational |
| `qsg_feature_enabled` | Regional prices detected, card turns Live | `capability_id`, `days_since_opened` | Completion rate, accounts with regional prices |
| `qsg_regional_method` | Screen "Choose method" CTA | `capability_id`, `method` | Diagnostic |
| `qsg_regional_prices_reviewed` | Screen "Review prices" shown | `capability_id`, `countries` | Diagnostic |
| `qsg_regional_prices_applied` | Apply succeeds | `capability_id`, `items`, `countries`, `edited_cells`, `undo_used` | Conversion in localised regions |

## Edge cases & error states

- Matrix CSV with unknown SKU: row rejected, listed in an error summary, valid rows still importable.
- Matrix CSV with currency not supported in a country: row rejected with reason.
- Suggested prices unavailable (service error): method falls back to matrix and manual; notification explains.
- Partner edits a cell then changes method: confirmation before discarding edits.
- Network loss during apply: completed batches kept, retry resumes from the next batch.
- Two PA users edit the same prices at once: last write wins with a notice to the other user on next save that values changed.
- Capability configured outside the guide: guide reflects actual state and marks matching screens done (parent FR-11).

## Dependencies

| Dependency | Type | Needed by | Status |
|---|---|---|---|
| Suggested prices service | system | Wave 1 | Existing |
| Item `prices[]` bulk update | system | Wave 1 | Existing, confirm bulk limits |
| Capability state flag for Live detection | system | Wave 1 | Parent PRD, shared API |
| Figma mockups for all screens | team | Build start | Not started |

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Bulk update rate limits on large catalogs | Medium | Medium | Batch writes with progress indicator; resume on failure |
| Large negative deltas enable regional arbitrage | Medium | Medium | Confirmation above 60% (RGP-02); Risk team reviews threshold before Wave 2 |
| Taxonomy changes rename or merge this card after build starts | Medium | Medium | Lock taxonomy entry before sprint 0 (Open decision 1) |

## Rollout plan

| Wave | Contents | Gate to next wave |
|---|---|---|
| Wave 1 | Guide behind feature flag for 5 to 10 live-service PC pilot accounts picked by CSM | 0 open P1 bugs, apply error rate < 1% for 14 days, at least 3 pilot accounts reach Live |
| Wave 2 | All live-service PC accounts, card visible in Advanced section | Guide completion rate at or above 50% of target for 30 days; Risk sign-off on delta threshold |
| GA | Flag removed, included in Quick-Start Guide release notes | - |

Rollback: turning the flag off hides the card and guide. Prices written through the guide stay on the items; Undo covers the first 10 minutes after each apply.

## Open decisions

1. Taxonomy: confirm this card, name and section against parent PRD v2 section 6.1. Owner: Gennady Klyachman, Director of Product XPS.
2. Approvers: name the Technical Director and Product Director of the executing team. Owner: Eugene Neverov (doc owner).
3. Parent taxonomy combines "Regional prices & restrictions". Keep one card with two guides, or merge into one guide? Owner: Eugene Neverov (doc owner).
4. Negative delta confirmation threshold (60% proposed). Owner: Risk team lead.
5. NFR-03 availability target. Owner: PA platform lead.
6. Executing team and Jira epic. Owner: Gennady Klyachman, Director of Product XPS.

## References

- BRD: https://xsolla.atlassian.net/wiki/spaces/~71202044b57edec0804c58b15b9db012e7438c/pages/25271861486
- Parent PRD v2, Quick-Start Guide for Publisher Account: https://xsolla.atlassian.net/wiki/spaces/XPS/pages/24843157537
- Parent PRD v1: https://xsolla.atlassian.net/wiki/spaces/XPS/pages/24688820699
- Interactive prototype: https://claude.ai/artifact/DQLuUycPMRwTTE6Fr3VJzy

## Sign-off

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical Director | TBD, confirm with requestor | Approved / Revisions needed / Hold | |
| Product Director | Gennady Klyachman, confirm | Approved / Revisions needed / Hold | |
