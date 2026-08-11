# Payaswini O~Bele — Product & Engineering Specification

**Status:** Draft v1 — for review before implementation
**Naming note:** this spec uses **Tool Owner** in place of "Provider" to match the existing Prisma `UserRole` enum (`TOOL_OWNER`, `OPERATOR`, `FARMER`, `ADMIN`). Same actor, same responsibilities — just aligned to the codebase.

---

## 1. Product Vision

Small-scale farmers around Kasaragod / Dakshina Kannada (Kerala–Karnataka border) cannot afford to buy agricultural tools that cost tens of thousands of rupees (e.g. a carbon fiber telescopic pole at ₹60–70k) for occasional use. O~Bele lets them rent the tool **and, where needed, the skilled labour to operate it**, coordinated by the platform so the Tool Owner and Farmer never need to negotiate logistics directly.

This is **not** a delivery marketplace and not a general equipment-rental listing site. The defining mechanic is the **Operator as a physical and operational bridge**: someone who fetches the tool from the Tool Owner, transports it, operates it at the farm, and returns it — a role with no direct analogue in Zomato/Swiggy/Instamart, so those platforms' UX patterns should be borrowed selectively, not copied wholesale.

Initial launch geography is a **single small radius** (Kasaragod area), not a multi-city rollout. Every MVP decision should assume: no delivery fleet, no warehouses, minimal operational staff, and an admin who manually smooths over the early gaps (see §14, Assignment).

---

## 2. Actors & Permissions

| Actor | Core capability | Auth requirement |
|---|---|---|
| **Farmer** | Browse without login; requests service (tool + optional operator) | OTP, only required at request time |
| **Tool Owner** | Lists equipment, accepts/rejects requests, hands over/receives tool | OTP + basic KYC before listing |
| **Operator** | Fetches tool, transports, operates, returns | OTP + skill profile + admin approval |
| **Admin** | Approves owners/operators/equipment, manually assigns operators (MVP), resolves disputes, adjusts pricing, views audit logs | Internal account, RBAC-gated |

A single phone number can plausibly hold multiple roles (a Tool Owner who is also sometimes a Farmer) — **OPEN BUSINESS DECISION**: do you want to support multi-role accounts at launch, or keep them strictly separate initially and merge later? Given your earlier decision that a user's `UserRole` shouldn't be a single exclusive field, multi-role support is already the intended direction — this spec assumes that.

---

## 3. Core Business Model

```
FARMER  →  requests [Tool + optional Operator]
TOOL OWNER  →  owns and lists the tool, accepts/rejects the request
OPERATOR  →  fetches tool from Owner → travels to Farmer → operates → returns tool to Owner
PLATFORM  →  coordinates matching, payment, and communication between all three
```

Two service modes farmers can choose between (framed like delivery-vs-pickup):

- **Operator brings tool + operates it** (full service)
- **Farmer collects tool + operates it themself** — only allowed if the Tool Owner has explicitly granted that farmer permission/verification (this was already a stated requirement of yours)

**Confirmed requirement.** A third and fourth combination (farmer collects, operator meets them to operate; farmer provides transport, operator just operates) are **proposed features**, not confirmed — flag as Phase 2 unless you have real demand signal.

---

## 4. Farmer Experience

### 4.1 Guest browsing (no forced login)
On open, farmer sees: approximate location (auto-detected or manual), search, categories, nearby tools, popular equipment. **Confirmed requirement** — this directly avoids the friction problem your earlier review flagged (register page duplicating OTP login).

### 4.2 Authentication — deferred to point of need
OTP is requested only when the farmer moves to actually request a service, not on page load. Functions: send/verify/resend OTP, expiry, attempt limit, rate limit (per phone + per IP, matching the hardening already done on the login flow), session persistence, logout.

### 4.3 Profile — minimal by default
MVP: name, phone, one farm location. **Proposed, not required at launch:** multiple saved farm locations, taluk/district structured fields, identity verification. Collect only what a booking actually needs; expand later based on real friction, not speculative completeness.

### 4.4 Service request flow
```
Select tool → Select service mode → Select date/time →
Select farm location → Enter duration/area → Price estimate → Confirm
```
Cancel and modify-before-acceptance should exist from MVP — a farmer needing to fix a typo'd address shouldn't have to cancel and re-book.

### 4.5 Price breakdown (confirmed requirement)
Show itemized cost, not a lump sum:
```
Tool rental          ₹500
Operator labour       ₹900
Transportation        ₹300
Platform fee           ₹50
GST                    ₹Y
─────────────────────────
Total                ₹XXXX
```
This matters for trust with first-time users unfamiliar with rental-with-labour pricing — it's not just a UI nicety.

### 4.6 Order tracking
Full state visibility (see §9 for the state machine) with operator name/photo/rating once assigned, masked-number call, in-app chat, cancel, report issue.

**Live GPS tracking of the operator is explicitly a "maybe, later" —** don't build it just because delivery apps have it. At a single-radius MVP scale, a simple status + phone call is probably sufficient. **OPEN BUSINESS DECISION.**

### 4.7 Completion, history, payments
Standard: farmer confirms completion or reports an issue, rates operator/tool/owner separately, views past/upcoming/cancelled bookings, downloads invoice. Payment methods: UPI-first (matches your existing Razorpay integration), card, netbanking; cash is a **proposed feature** requiring its own reconciliation logic — flag as Phase 2 unless cash is a real expectation in your launch market.

---

## 5. Tool Owner Experience

- **Registration:** OTP + business/individual name + location + bank details (for payout) + basic verification. Full KYC document upload can be Phase 2 if it slows onboarding of your first handful of owners.
- **Equipment management:** name, category, photos, specs, rental price, operator requirement (does this tool require a skilled operator or can farmers self-operate with permission?), availability calendar, condition status.
- **Incoming requests:** accept/reject/reschedule, view estimated earnings before accepting.
- **Handover (🔥 flagged correctly as high-priority):** since an operator is physically taking a real, valuable asset, this needs: condition checklist, before-handover photos, OTP-based handover confirmation, timestamp. This is worth building properly at MVP — a damaged/missing tool dispute with no evidence trail is the kind of incident that could kill trust in the whole platform early.
- **Earnings dashboard:** today/week/month, pending vs settled, payout status.

---

## 6. Operator Experience

- **Registration:** OTP, profile, experience, **skill profile per tool type** (an operator competent on a sprayer isn't necessarily competent on a power tiller — this needs explicit per-tool skill flags, not a single "operator" boolean).
- **Availability:** online/offline toggle, working hours, service radius, current assignment.
- **Assignment:** receive → accept/reject → timeout → reassignment. See §7 for how assignment actually works at MVP.
- **Job execution:** navigate to owner → collect tool → navigate to farmer → start/pause/resume work → mark complete → return tool → confirm return with owner.
- **Earnings:** base wage + travel compensation + any extra-work adjustment, itemized (not just a lump total) — same trust reasoning as farmer-side pricing.

---

## 7. Operator Assignment — MVP approach

You correctly identified the right MVP shape already: **don't build an automated assignment engine on day one.**

```
System shows admin/ops person:
  Operator A — 2.3km — Available
  Operator B — 3.1km — Available
  Operator C — 4.7km — Busy

Admin selects: Assign A
```

This is deliberately manual because (a) you'll have very few operators at launch, so a scoring algorithm is solving a problem you don't have yet, and (b) you get to observe real assignment patterns before encoding them into logic. **Confirmed MVP approach.**

**Phase 2+:** once there's enough operator volume that manual assignment becomes a bottleneck, introduce filtering (skill → availability → radius) and ranking (distance, workload, rating) — research actual assignment/dispatch algorithms at that point rather than guessing now.

---

## 8. Equipment Handover & Return

Both directions (Owner→Operator and Operator→Owner) should use the same pattern:

```
Arrival → OTP confirmation → condition-check photos → checklist → confirm → status updates
```

Data to capture each time: photos, condition rating, accessories checklist, timestamp, GPS location. This becomes your equipment condition history (Owner → Rental 1 → Rental 2 → Maintenance → Rental 3), which matters both for dispute resolution and for Owners deciding whether to keep listing a tool that's degrading.

---

## 9. Service Lifecycle — State Machine

This is the backbone of the whole system. Every transition needs an explicit actor, precondition, and side effects.

| State | Triggered by | Preconditions | Money | Notifications |
|---|---|---|---|---|
| `REQUESTED` | Farmer | Valid tool/date/location, price locked | Payment authorized (not captured) | Owner notified |
| `OWNER_PENDING` | System | — | — | — |
| `OWNER_ACCEPTED` | Tool Owner | Owner has capacity | — | Farmer notified, operator search begins |
| `OPERATOR_PENDING` | System | Owner accepted | — | — |
| `OPERATOR_ASSIGNED` | Admin (MVP) / System (later) | Operator available & skilled | — | Operator notified |
| `OPERATOR_ACCEPTED` | Operator | Within assignment timeout | — | Farmer + Owner notified |
| `FETCHING_TOOL` | Operator | Accepted | — | — |
| `TOOL_COLLECTED` | Operator + Owner (mutual confirm) | Handover checklist complete | — | Farmer notified |
| `TRAVELLING_TO_FARM` | Operator | Tool collected | — | — |
| `ARRIVED` | Operator | — | — | Farmer notified |
| `WORK_STARTED` | Operator | Farmer present/confirmed | — | — |
| `WORK_PAUSED` / `WORK_RESUMED` | Operator | — | — | — |
| `WORK_COMPLETED` | Operator | — | Payment capture triggered | Farmer asked to confirm |
| `RETURNING_TOOL` | Operator | Farmer confirmed (or timeout) | — | — |
| `TOOL_RETURNED` | Operator + Owner (mutual confirm) | Return checklist complete | Owner payout scheduled | — |
| `INSPECTION` | Owner | — | Damage → dispute flow | — |
| `COMPLETED` | System | Inspection passed | Settlement finalized | Rating prompts sent |

**Failure/cancellation states** (parallel branches, not shown above): `CANCELLED_BY_FARMER`, `CANCELLED_BY_OWNER`, `CANCELLED_BY_OPERATOR`, `CANCELLED_BY_PLATFORM`, `FAILED_NO_OPERATOR`, `DISPUTED`. Each needs its own refund/penalty rule — see §11.

**Concurrency cases to explicitly handle** (these are real bugs waiting to happen, not edge-case paranoia):
- Two farmers requesting the same tool for overlapping windows — needs a DB-level uniqueness/locking constraint, not just UI-level availability checks.
- Operator accepts an assignment right as the admin reassigns it to someone else.
- Payment succeeds but the booking fails immediately after (network blip) — needs idempotency keys on payment + booking creation, and a reconciliation job.
- Duplicate booking submissions from a double-tapped "Confirm" button — idempotency key on the request itself.

---

## 10. Pricing Engine

```
TOTAL = Tool charge + Operator wage + Transportation
        + Additional work + Platform fee + GST − Discounts
```

**Confirmed for MVP:** daily tool pricing (matches what's already in your schema/UI), itemized breakdown, platform fee, GST.
**Open questions:**
- Hourly vs area-based vs crop-based pricing — **OPEN BUSINESS DECISION**, don't build all of them speculatively.
- Who absorbs the cost when actual work time exceeds the estimate (e.g. quoted 2h, took 2h35m)? **OPEN BUSINESS DECISION** — this needs a real business rule (e.g. free grace period + per-unit overage charge) before you can build the completion flow properly.

---

## 11. Cancellations & Disputes

Four actors can cancel (Farmer, Owner, Operator, Platform), each with different consequences — this needs a small rules table (cancellation deadline, fee, refund %, any penalty to the cancelling party) rather than one generic "cancel" button with one generic refund behavior.

Disputes should support: evidence upload (photos, timeline, chat log), admin review, resolution (refund/compensation/penalty), and an audit trail. Given the physical-asset-handover nature of this business (§8), disputes over tool condition are the most likely dispute type — the handover/return checklist data directly feeds this.

---

## 12. Ratings

Separate ratings for tool, owner, operator, and overall service — not one combined score. Guardrails: only completed bookings can review, one review per booking, basic abuse/moderation reporting.

---

## 13. Notifications & Communication

Start minimal: SMS/push for the state transitions that actually matter to the farmer (accepted, operator assigned, arriving, completed) rather than every single state change. Masked-number calling and in-app chat between farmer and operator, without exposing permanent personal numbers, is a genuine trust/safety requirement given operators are strangers visiting a farmer's property.

---

## 14. Admin / Operations

Admin dashboard needs, at minimum for MVP: approve owners/operators/equipment, manually assign operators (§7), cancel/refund/resolve disputes, and **audit logs** — who changed what, when, from what state to what state. This isn't optional polish; it's what lets you answer "I didn't cancel that booking" disputes credibly.

---

## 15. Non-Functional / Infrastructure Guidance

Given this is a low-capital MVP for a single small geography:

- **Architecture:** modular monolith (Next.js + Prisma/Postgres, which you already have) — no microservices, no Kafka, no Kubernetes, no Elasticsearch. None of these are justified by your current or near-term scale.
- **Realtime:** simple polling or Postgres `LISTEN/NOTIFY` for status updates is enough at this volume — don't add WebSocket infrastructure until you have a concrete reason (e.g. live GPS tracking actually gets greenlit).
- **Location:** you need geocoding, reverse geocoding, and radius search (Postgres + PostGIS extension, or simpler haversine-distance queries at this scale — PostGIS may be overkill for a single-radius launch).
- **Payments:** Razorpay webhook handling needs to be idempotent and reconciled against a ledger, not just a single `order.total` field — see §10's settlement note below.

**Settlement — build a ledger, not a single total.** For every completed booking, record exactly where the money went (Tool Owner share, Operator share, platform fee, tax) as separate ledger entries, not just `order.total = 2000`. This is what lets you answer "why was I paid ₹700 and not ₹900" later without guesswork.

---

## 16. MVP Scope (Phase 1)

- Farmer: guest browse → OTP at request → basic request flow → price breakdown → order tracking (status only, no live GPS) → confirm/rate
- Tool Owner: registration → equipment listing → accept/reject → handover/return checklist with photos + OTP
- Operator: registration → skill profile → manual assignment (admin picks from a suggested list) → job execution → return
- Admin: approvals, manual assignment, basic dispute resolution, audit log
- Payments: Razorpay, UPI-first, single ledger-based settlement
- **Explicitly excluded from MVP:** live GPS tracking, automated assignment algorithm, cash payments, multiple pricing models beyond daily rate, wallet/credits

## 17. Phase 2 (once MVP has real usage data)
Automated operator assignment (skill/availability/radius/distance scoring — research algorithms at that point), additional pricing models, saved multiple farm locations, identity verification, coupon/discount system, richer analytics dashboard.

## 18. Phase 3
Live GPS tracking (only if farmer feedback actually asks for it), advanced fraud detection, expansion to additional geographic radii/regions (with the locale-neutral groundwork already laid), wallet/advance payment.

---

## 19. Implementation Roadmap — smallest vertical slice first

Rather than building every screen first, the recommended dependency order:

1. **Role model finishes** (already in progress — `TOOL_OWNER`/`OPERATOR` schema, multi-role support)
2. **State machine skeleton** in the DB (booking status enum + transition logging) — even before every UI exists, get the states and audit log right
3. **One tool, one owner, one operator, one farmer** — hand-wire a single booking through the entire lifecycle manually (even via admin panel / API calls, not polished UI) to validate the state machine actually works end to end
4. **Farmer request flow UI** on top of the now-proven backend
5. **Owner accept/reject + handover checklist UI**
6. **Admin manual assignment UI**
7. **Operator job execution UI**
8. **Payment integration + ledger**
9. **Notifications** (start with SMS for the 4-5 states that matter)
10. **Ratings, history, dashboards** — polish layer once the core loop is proven

---

## 20. Open Business Decisions (must be resolved before full build)

- Multi-role accounts (Farmer who is also a Tool Owner) — supported at launch or later?
- Overage-time billing rule (who pays for work exceeding the estimate?)
- Live operator GPS tracking — needed at launch or deferred pending user feedback?
- Cash payment support — expected by your launch market or not?
- Pricing model beyond flat daily rate (hourly/area/crop-based) — which, if any, at launch?
- Self-operate permission mechanism — how does a Tool Owner actually grant/verify farmer permission to self-operate a tool?

---

*This document is a starting specification, not a finished contract — sections marked OPEN BUSINESS DECISION need your input before an implementing engineer (human or AI) should build against them.*