# PRD: QSG Live-service: Time-limited offers

- **Source (Confluence):** https://xsolla.atlassian.net/wiki/spaces/BE/pages/25274712082/PRD+-+QSG+Live-service+Time-limited+offers
- **Page heading:** Quick-Start Guide: Time-limited offers
- **Purpose:** Build spec for the Time-limited offers guide behind the Live-service Advanced card in the PA Quick-Start Guide.
- **Owner:** Eugene Neverov
- **Requestor:** XPS Product (Gennady Klyachman), confirm
- **Stakeholders:** Gennady Klyachman (Director of Product, XPS), IM/MIT lead (TBD), CSM lead (TBD), Feature PO (TBD)
- **BRD link:** https://xsolla.atlassian.net/wiki/spaces/~71202044b57edec0804c58b15b9db012e7438c/pages/25272483946
- **Jira epic:** TBD, created at build start
- **Target release:** TBD: Quick-Start Guide v2 launch train (parent PRD OQ-02)
- **Mockups:** Prototype: https://claude.ai/artifact/DQLuUycPMRwTTE6Fr3VJzy (feature 2). PNG screens: `qsg-live-service-advanced-screens.zip`, folder `02-time_limited`
- **Additional links:** Parent PRD v2: https://xsolla.atlassian.net/wiki/spaces/XPS/pages/24843157537
- **Version:** 0.1
- **Status:** Draft, BRD pending approval
- **Approved date:** (empty)

## Summary & goals

Live-service partners run weekly and seasonal events, but scheduling a time-boxed offer in PA means editing each item's display period separately and creating a matching discount by hand, with no view of what already overlaps. This release adds a 5-screen guide behind the "Time-limited offers" card in the Live-service Advanced section of the Quick-Start Guide. The card follows the parent PRD states (Live, Available, Blocked). The card never blocks; it works with a purchase link. The flow is fully self-service. The card turns Live when PA detects the capability is configured, not when the partner finishes reading.

## KPI

| KPI | Today | Target | When | Measured by |
|---|---|---|---|---|
| Time-limited offers guide completion rate | TBD baseline | Proposed: 65% | 3 months post-GA | `qsg_guide_opened`, `qsg_feature_enabled` |
| Live-service PC accounts with at least one scheduled offer per month | TBD baseline | Proposed: +30% vs baseline | 6 months post-GA | Account capability state (data source), `qsg_feature_enabled` |
| Overlapping discount incidents reported by partners | TBD baseline (SERVICE) | Proposed: -50% | 6 months post-GA | SERVICE desk tag per capability (data source), `qsg_schedule_conflict_shown` |

## Non-goals

- Changes to the underlying item display period and Promotions data model or APIs → owning product teams; the guide uses existing APIs only, except the items listed in Dependencies.
- Quick-Start index page, card anatomy, ordering and floating widget → parent PRD v2 (FR-01 to FR-15, FR-N1 to FR-N6).
- Premium PC variant of this guide → separate PRD if the Premium taxonomy includes it.
- Guide copy in languages other than English → v2, PA localisation pipeline.
- Personalised recommendations of when to use this capability → never at v1; the "What's next?" rule in parent FR-15 applies.

## User stories

Carried from the BRD.

### Partners (live-service PC publishers)

- As a live-service publisher, I want to schedule several items for the same event window in one step so that they go live and expire together.
- As a live-service publisher, I want to see overlapping discounts before I confirm so that players do not get an unexpected price.
- As a live-service publisher, I want to add a badge and countdown to event offers so that players notice the time limit.

### CSM and Support

- As a CSM, I want partners to schedule their own event offers so that event weeks do not generate manual requests.
- As a CSM, I want overlap warnings shown to the partner so that I stop fixing conflicting discounts after launch.

## Functional requirements

### Card on the Quick-Start page

How the capability card behaves on the index. Inherits parent FR-06 to FR-08 and adds capability-specific content.

| ID | Requirement | Acceptance criteria | Priority |
|---|---|---|---|
| CARD-01 | The card shows name "Time-limited offers", description "Create items or bundles visible only during a defined window (seasonal events, flash sales)", a state badge and a CTA | Card renders with all four elements for a live-service PC account; card is absent for Premium PC accounts | Must |
| CARD-02 | The card is never Blocked by the web shop prerequisite | Account without web shop: badge Available, CTA "Set up" opens the guide | Must |
| CARD-03 | The card shows no team-engagement warning | Available card renders without a warning block | Must |
| CARD-04 | The card turns Live when the capability is detected as configured on the account | After the completion signal of the last screen, the index shows badge Live and CTA "Open" on next load without manual refresh | Must |

### Guide shell

Behaviour shared by every screen of this guide. Inherits parent section 7.2.

| ID | Requirement | Acceptance criteria | Priority |
|---|---|---|---|
| GDE-01 | The guide opens with an overview: outcome, time estimate (20 mins) and what to have ready (items or bundles to feature, start and end dates) | Opening the guide shows the overview before any form field | Must |
| GDE-02 | Screens are numbered 1 to 5 with a progress bar and the current step label | Screen 3 shows "step 3 of 5" and a 3/5 progress bar | Must |
| GDE-03 | Progress is resumable and driven by account state | Partner leaves on screen 3 and returns next day: guide opens on screen 3 with saved values | Must |
| GDE-04 | Each screen deep-links to the PA section it edits | Every screen shows the PA breadcrumb and the matching left-nav item is active | Should |
| GDE-05 | The final screen shows the success state and a "What's next?" recommendation (parent FR-14, FR-15) | After completion: success notification plus one recommended next capability that is not Blocked | Must |

### Offer scheduling steps

What each of the 5 screens must do. Screen numbers match the prototype.

| ID | Requirement | Acceptance criteria | Priority |
|---|---|---|---|
| TLO-01 | One confirmation writes the same display period to every selected entry | Schedule 2 entries Oct 30 18:00 to Nov 2 23:59 Berlin: both entries show identical periods in catalog after confirm | Must |
| TLO-02 | Overlap calendar flags any existing discount on the same entry or group within the window | Existing weekend sale on Shards packages overlapping the window: row shown in warning colour plus warning notification naming both campaigns | Must |
| TLO-03 | Discount set in the guide is created as a linked promotion with the same period | Discount 30%: a discount promotion appears in Promotions with the offer window and the selected entries | Should |
| TLO-04 | Screen 1 "Pick offers" (Items catalog): Collects the entries the schedule will apply to. | Virtual currency itself can't be scheduled, only packages; up to 50 entries per schedule | Must |
| TLO-05 | Screen 2 "Set window" (Items catalog): Writes the `periods[]` field on each selected entry. | End must be after start; windows shorter than 1 hour show a warning | Must |
| TLO-06 | Screen 3 "Frame the offer" (Items catalog): Optionally creates a linked discount promotion. | Discount and schedule share the same period; countdown needs storefront support; purchase links show end date only | Must |
| TLO-07 | Screen 4 "Review calendar" (Items catalog): Detects overlapping discounts on the same entries or groups. | Overlap is a warning, not a blocker; largest discount wins, per current Promotions logic | Must |
| TLO-08 | Screen 5 "Go live" (Items catalog): Confirms the schedule and turns the card Live. | Schedules remain editable until the window starts; card state becomes Live | Must |

## Non-functional requirements

| ID | Category | Requirement | Target |
|---|---|---|---|
| NFR-01 | Performance | Guide screen reaches interactive state | p95 < 2 s on standard broadband (proposed; parent NFR-01 sets 3 s for the index) |
| NFR-02 | Performance | Overlap calendar query for up to 50 entries | p95 < 1 s; skeleton shown while loading |
| NFR-03 | Availability | Guide availability follows PA | Same monthly SLO as PA. TBD, owner: PA platform lead |
| NFR-04 | Security | Only PA roles allowed to edit the underlying settings can complete steps; others see read-only guide | Role check on every write; read-only banner for other roles |
| NFR-05 | Observability | Every screen view, completion and error emits an event | Events live and visible in the analytics dashboard before the Wave 1 gate |
| NFR-06 | Compatibility | Accessibility | WCAG 2.1 AA (parent NFR-02): state badges and calendar overlap colour paired with text |
| NFR-07 | Localization | Guide copy and dates | English at v1; dates formatted per browser locale; stored in UTC |

## UX & mockups

Prototype (interactive, all screens): https://claude.ai/artifact/DQLuUycPMRwTTE6Fr3VJzy. Open feature 2 in the left rail. PNG exports of every screen are in `qsg-live-service-advanced-screens.zip`, folder `02-time_limited`; attach them to this page. The prototype is a wireframe in XUI tokens, not a final design. Figma mockups are needed before build start (blocker).

| # | Screen | PA location | Heading | Key elements |
|---|---|---|---|---|
| 1 | Pick offers | Quick-Start Guide / Time-limited offers | What goes on sale for a limited time? | search; table: Entry, Type, Price, Visibility now; CTA "Schedule 2 offers", secondary "Cancel" |
| 2 | Set window | Items catalog / Schedule offers | Set the display window | Show in store: Always / Limited time; Time zone; Starts; Ends; switch: Repeat this window; CTA "Continue to framing", secondary "Back" |
| 3 | Frame the offer | Items catalog / Schedule offers | Make it feel urgent | Discount, %; Badge text; switch: Show countdown on store card; store card preview; CTA "Review schedule", secondary "Skip framing" |
| 4 | Review calendar | Items catalog / Schedule offers / Review | Check for overlaps | overlap calendar; warning notice: Two discounts overlap on Oct 31; CTA "Confirm schedule", secondary "Adjust dates" |
| 5 | Go live | Items catalog / Schedule offers | Offers scheduled | success notice: 2 offers scheduled; summary list; CTA "Back to Quick-Start Guide", secondary "View in catalog" |

States the prototype does not show:

- **Loading:** skeleton for pre-checks, tables and the calendar; never a blank screen.
- **Empty:** calendar with no other schedules shows only the new offers and the note "No overlaps".
- **Error:** failed save keeps entered values, shows a retry action and logs to monitoring (parent FR-10).
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
| `qsg_feature_enabled` | Capability detected as configured, card turns Live | `capability_id`, `days_since_opened` | Completion rate, adoption |
| `qsg_offer_framing_set` | Screen "Frame the offer" action | `capability_id`, `discount`, `countdown` | Diagnostic |
| `qsg_schedule_conflict_shown` | Screen "Review calendar" shows an overlap | `capability_id`, `count` | Overlapping discount incidents |

## Edge cases & error states

- End time before start time: inline error, Continue disabled.
- Window shorter than 1 hour: warning shown, partner can proceed.
- Entry is deleted after scheduling but before start: schedule is removed with the entry and the calendar drops it.
- Time zone changes during the guide: all displayed times recalculate; stored values are UTC.
- Network loss during save: values kept locally on the screen, retry action shown, no partial write.
- Two PA users edit the same capability at once: last write wins with a notice to the other user on next save that values changed.
- Capability configured outside the guide: guide reflects actual state and marks matching screens done (parent FR-11).

## Dependencies

| Dependency | Type | Needed by | Status |
|---|---|---|---|
| Item display period (`periods[]`) API | system | Wave 1 | Existing |
| Promotions discount API | system | Wave 1 | Existing |
| Overlap query across discounts and schedules | system | Wave 1 | New, needs Promotions team estimate |
| Capability state flag for Live detection | system | Wave 1 | Parent PRD, shared API |
| Figma mockups for all screens | team | Build start | Not started |

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Overlap query is expensive for large catalogs | Medium | Medium | Limit to selected entries and their groups; cache per guide session |
| Taxonomy changes rename or merge this card after build starts | Medium | Medium | Lock taxonomy entry before sprint 0 (Open decision 1) |
| Completion detection lags behind real configuration | Low | Medium | Loading state instead of stale badge (parent FR-11); nightly reconciliation job |

## Rollout plan

| Wave | Contents | Gate to next wave |
|---|---|---|
| Wave 1 | Guide behind feature flag for 5 to 10 live-service PC pilot accounts picked by CSM | 0 open P1 bugs, step save error rate < 1% for 14 days, at least 3 pilot accounts reach Live |
| Wave 2 | All live-service PC accounts, card visible in Advanced section | Guide completion rate at or above 50% of target for 30 days; no increase in capability-related tickets |
| GA | Flag removed, included in Quick-Start Guide release notes | - |

Rollback: turning the flag off hides the card and guide. Schedules created through the guide stay on the account because the guide only writes through existing APIs.

## Open decisions

1. Taxonomy: confirm this card, name and section against parent PRD v2 section 6.1. Owner: Gennady Klyachman, Director of Product XPS.
2. Approvers: name the Technical Director and Product Director of the executing team. Owner: Eugene Neverov (doc owner).
3. Parent taxonomy lists "Sales, discounts & offers". Is Time-limited offers that card, or a sub-flow of it? Owner: Eugene Neverov (doc owner).
4. Does the overlap calendar need to read discounts created outside the guide (API, bulk import) at v1? Owner: Eugene Neverov (doc owner).
5. NFR-03 availability target. Owner: PA platform lead.
6. Executing team and Jira epic. Owner: Gennady Klyachman, Director of Product XPS.

## References

- BRD: https://xsolla.atlassian.net/wiki/spaces/~71202044b57edec0804c58b15b9db012e7438c/pages/25272483946
- Parent PRD v2, Quick-Start Guide for Publisher Account: https://xsolla.atlassian.net/wiki/spaces/XPS/pages/24843157537
- Parent PRD v1: https://xsolla.atlassian.net/wiki/spaces/XPS/pages/24688820699
- Interactive prototype: https://claude.ai/artifact/DQLuUycPMRwTTE6Fr3VJzy

## Sign-off

An unsigned spec is a wish. A signed spec is a build order.

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical Director | TBD, confirm with requestor | Approved / Revisions needed / Hold | |
| Product Director | Gennady Klyachman, confirm | Approved / Revisions needed / Hold | |
