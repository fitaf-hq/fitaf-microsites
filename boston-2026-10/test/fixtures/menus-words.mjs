// The words of the two-menu fixture week (test/fixtures/picks-menus/: SPEC-every-menu-and-nutrition.md § 4, "the cases
// build with invented lists in their own fixture words"). ⛔ data/messages.json names no list but `chefs-choice` until the
// Advisor approves another's name, so a week with a second list is made only with these words: data/messages.json with
// the invented list's name added after its own, and `chefs_choice.heading` carrying `{menu}`, so the heading names the
// menu shown (§ 2 item 2). Read by the site's cases (test/em-harness.mjs) and Storybook's fixture-menus date; never by the
// build or the content of a real week.

/** The invented list, its id as the fixture week's `lists` holds it and its name as the chooser shows it. */
export const FIXTURE_LIST = "fixture-two";
export const FIXTURE_LIST_NAME = "Fixture Two";
/** The heading with the menu's name (the committed phrase may carry `{menu}`, § 4; this one does). */
export const FIXTURE_HEADING = "{menu} ({week})";

/** `messages` (data/messages.json, parsed) with the fixture's words laid over it; the object given is not changed. */
export function menusMessages(messages) {
  const words = structuredClone(messages);
  words.menus = { ...words.menus, [FIXTURE_LIST]: FIXTURE_LIST_NAME };
  words.chefs_choice = { ...words.chefs_choice, heading: FIXTURE_HEADING };
  return words;
}
