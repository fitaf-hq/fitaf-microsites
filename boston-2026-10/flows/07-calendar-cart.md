# Flow 7 — the calendar cart (LATER)

**Status: a SKETCH, not for October.** Written now only so the framework decision can see it. Its
questions are listed, not answered.

## 1. The idea

Instead of choosing a plan and then meals, the visitor fills a **week laid out as days**: each day has
1–6 slots, and they drag meals from this week's menu into slots. The store's cart only ever sees
products and quantities; the calendar is **ours**.

Ideas that come with it:

- a live price meter that shows the next price rung ("buy more, save more");
- a size control per meal, row, column or the whole week (size is a variant);
- the calendar **saved with a claimed offer**, so it reopens even without a purchase;
- later, the schedule printed on each meal's label.

## 2. The state it would add

| state | size |
|---|---|
| the week | 7 days × up to 6 slots, each holding a meal and a size, or empty |
| the menu | this week's meals (an input, rebuilt weekly, like Chef's Choice) |
| derived | the count → the plan's price rung → the total; the plan (`mpid`) the count falls in |
| drag in progress | source, target, hover |
| saved | the calendar, attached to a claim (Flow 6 would gain a field, **not** PII) |

The derived part is where the complexity sits: **the count decides the rung**, so every drop can change
every price on the page.

## 3. Questions before it is designed

1. A count between rungs (for example 9): which plan does the cart use, and what does the meter say?
2. Can one calendar mix sizes across a plan boundary, given that the store prices by plan?
3. Does a saved calendar survive a menu change? A meal that leaves the menu leaves a hole: does the slot
   empty, or is it offered a substitute?
4. On a phone, is it drag, or tap a slot then tap a meal?
5. How does the calendar reach the store? Only through rung 2 (the store's own controls), so it inherits
   every one of rung 2's conditions.
