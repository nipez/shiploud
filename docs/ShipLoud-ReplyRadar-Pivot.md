# ShipLoud → ReplyRadar pivot brief
**Date:** Sep 7, 2026  
**For:** Nicholas + Cursor on https://github.com/nipez/shiploud  
**Status:** Product call, not a full rebuild. Keep the domain and brand. Change what the product *is*.

---

## 1. The call

ShipLoud’s original story was: journal what you shipped → draft posts about your product → grow by broadcasting.

What Nicholas actually opens and gets value from is **Reply radar**: public posts from builders he chose, sorted so the worthwhile ones float up, he writes the reply, opens X with it filled in, taps **I posted it**.

**Pivot:** ReplyRadar becomes the product. Journal / Posts about your own ship become optional (or later). The brand and domain stay ShipLoud / getshiploud.com.

---

## 2. Why it still makes sense under ShipLoud

“Ship loud” does not only mean “post about your own product.”

For founders at 0–1K followers, the loud move is often **showing up in other people’s threads** with a real reply: ship notes, numbers, blockers, asks. That is still building in public. It is just conversation-first instead of broadcast-first.

| Layer | Keep |
| --- | --- |
| Brand | ShipLoud (smile mark, cream/navy/orange or current dark skin) |
| Domain | getshiploud.com / app.getshiploud.com |
| Tagline shift | From “turn ship notes into X posts” → “know where to reply, write it, post on X” |
| Habit | Still a daily habit tool. Still approve-first. Still no auto-spam. |
| Receipts | Still prove the habit (replies posted, not vibes) |

**One-liner:** ShipLoud is the habit of shipping loud in the replies that matter.

**Elevator:** Most indie founders lurk-reply or go quiet. ShipLoud’s Reply radar shows public posts from builders you care about (active ones first), you write every reply, X posts it, receipts count what you actually did. We don’t auto-reply. X won’t let apps do that anyway.

Homepage should stop leading with “journal your ship → draft about your product” as the hero. Lead with Reply radar. Mentions of own-product drafts can sit lower as “also, if you want to broadcast.”

---

## 3. What stays / moves / waits

### Keep (core)
- Builders list (add anyone, remove, tags)
- Reply radar feed (public posts only, not full X timeline)
- Active first / Newest
- Topic chips (Launches, Numbers, Blockers, Asks) + search
- Write your own reply box
- **Reply on X** (intent URL, text prefilled)
- **I posted it** → Weekly receipts **Replies posted**
- Suggested follows / People (static starter list + add anyone)
- Connect X for **original** posts only (optional later)
- Multi-user + invites when recruiting 10

### Demote (not delete yet)
- Journal / Today as home
- Posts / draft generator as the main habit
- Homepage “ship journal → posts” as the primary story

### Do not revive
- Default AI suggested replies on every card (leaked, dry, wrong claim)
- In-app **Send reply** to other people (X pay-per-use block since Feb 2026)
- Paid X read API for the radar (cost kills the model)
- Claiming an “algorithm” of who to follow

### Optional later
- “Need ideas?” only on demand, quality bar high or hide
- Own-product Posts as a secondary tab once ReplyRadar is sticky

---

## 4. How to improve Reply radar (priority order)

### P0 — Make the habit stick
1. **Home = Reply radar.** First screen after login. Journal/Posts behind a “More” or secondary nav.
2. **Session goal.** Soft target: “3 replies today.” Progress on the page. Receipts already count; surface today’s count up top.
3. **Mark replied is one tap and sticky.** Keep I posted it. Show “Replied” state clearly. Don’t make people hunt.
4. **Empty / cold states that teach.** No builders → add 5 from Suggested. No posts → Refresh + explain public-only feed. Don’t show a blank void.

### P1 — Better “where to reply”
5. **Active first is the default story.** Copy should say why: more likes/reposts/replies than the rest of *this* feed (honest: relative to your list, not “viral on X”).
6. **Topic chips that match founder language.** Keep Launches / Numbers / Blockers / Asks. Tune classifiers so they don’t mis-bucket. Prefer precision over recall.
7. **Hide already-replied by default.** Toggle “Show replied.” Otherwise the feed feels done before you start.
8. **Per-builder mute / snooze.** “Hide @handle for 7 days” when someone is noisy or off-topic.
9. **Pin 3–5 “must reply” accounts.** Marc, Levels, etc. Always appear even if less “active” that day.

### P2 — Faster path to a good reply
10. **Write box always primary.** No auto AI list. Optional **Need ideas?** only after click; if ideas are generic, show nothing.
11. **Starter prompts by topic (not AI).** For Asks: “What’s the smallest version you tried?” For Numbers: “What moved that this week?” Templates that name the *type*, not a fake quote of the opener.
12. **Character count + paste-safe.** Keep Reply on X + Copy. On mobile, one big Reply on X.
13. **After Reply on X, confirm strip is obvious.** “Opened X. Tap I posted it if you sent it.”

### P3 — Proof and GTM fit
14. **Receipts = replies.** Rename anything that still sounds like “posts about your product” to reply habit. Follower snapshot can stay as a weekly check, secondary.
15. **Streak / week view.** Days you hit ≥1 or ≥3 replies. Screenshot-friendly for build-in-public.
16. **Invite flow for 10 founders.** “Reply habit for indie builders” one-liner in invite email/DM. Not “AI that posts for you.”

### Explicit non-goals (for now)
- Auto-sending replies
- Scraping full X home timeline
- Personalized ML “for you” ranking beyond simple engagement + topic rules
- Buying Enterprise X API to unlock replies
- Renaming the company / buying a new domain

---

## 5. Messaging under getshiploud.com

**Hero (proposed)**  
know where to reply →  
**Reply to the builders who matter. You write it. X posts it.**

**Sub**  
Public posts from people you add. Active ones first. No auto-spam. Built for founders shipping toward $10K MRR.

**Honest bit (keep)**  
We don’t fake engagement or auto-post. Growth still comes from you showing up. X doesn’t let apps reply for you. We open X with your text ready.

**Habit loop (new)**  
1. Add builders  
2. Open Reply radar  
3. Write the reply  
4. Reply on X  
5. I posted it → receipts  

**Old habit loop** (journal → drafts → copy) moves to a secondary “Broadcast” section or comes off the homepage until Posts earn their place again.

**Name usage**  
- Product surface: **Reply radar** (feature name users see)  
- Company / domain: **ShipLoud** / getshiploud.com  
- Optional product line: “ShipLoud ReplyRadar” in Cursor tickets; don’t force a second brand in the UI yet.

---

## 6. Cursor handoff (this week)

Repo: https://github.com/nipez/shiploud  

1. Make **Reply radar** the default route / first nav item after login.  
2. Move Journal + Posts to secondary (bottom of nav or “More”).  
3. Radar UX: hide replied by default; today reply count; tighten empty states.  
4. Do **not** re-enable default AI suggestions or in-app Send reply to others.  
5. Landing: rewrite hero + habit section to match §5 (waitlist CTA stays).  
6. Leave pricing copy (free in beta / founding $19) unless changing GTM.

**Done when:** a returning user lands on Reply radar, can clear 3 replies with I posted it, and the homepage no longer sells “journal your ship” as the main promise.

---

## 7. Open decisions for Nicholas

1. Kill Journal/Posts from nav entirely, or keep as secondary?  
2. Rename public product to “ReplyRadar by ShipLoud” or keep “ShipLoud” with Reply radar inside?  
3. Recruit the 10 founders on the ReplyRadar story now, or dogfood the pivoted home screen one more week first?

Recommendation: **ShipLoud brand + Reply radar home**, secondary Journal/Posts, recruit 10 on the reply-habit story after the home screen flip ships.

---

## Source of truth
- Live app: https://app.getshiploud.com  
- Marketing: https://www.getshiploud.com  
- Repo: https://github.com/nipez/shiploud  
- Constraint: X pay-per-use cannot API-reply to others unless they mentioned/quoted you (Feb 2026). Intent URL + human Post only.  
- This brief beats older marketing copy when they conflict.
