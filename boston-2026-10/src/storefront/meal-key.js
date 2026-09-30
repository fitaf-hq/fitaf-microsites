// A meal's key (SPEC-rung2-cart-handoff.md § 11 item 2): 32-bit FNV-1a over the UTF-8 bytes of the meal's name AS THE
// PAGE SHOWS IT (whitespace collapsed and trimmed, exactly as fill B reads a card's title), written in base 36, its last
// 5 characters: the value modulo 36^5, with leading zeros when the base-36 text is shorter (1 name in about 2,600).
//
// ONE function, ONE source. scripts/handoff-link.mjs imports it to write a link; scripts/build-storefront.mjs inlines
// its text (mealKey.toString()) into the shipped fill-B script, as it inlines the plan counts. So the body below is
// what a visitor's browser runs: plain script (no module syntax inside it), no global but the language's own
// (encodeURIComponent and unescape turn the name into one character per UTF-8 byte; Math.imul multiplies modulo 2^32),
// and no `//` line inside it, which the shipped text would keep. R2-25 pins it against a second, independent
// implementation and FNV-1a's published vectors. SPEC-rung2-progress-and-checkout § 11: no `<` in it (the store's admin
// reads `<` and a letter as a tag), so the loop's test is written the other way round.
//
// SPEC-rung2-progress-and-checkout § 15.1: a LEADING MARKETING TAG is removed first, so "🟠NEW: Blackened Chicken Caesar
// Salad" and "Blackened Chicken Caesar Salad" share one key (the store dropped that tag from two names mid-week, and
// fill B refused them). A tag is: an emoji (a UTF-16 surrogate pair, or one character in U+2600–U+27BF), optional
// space, an uppercase word of 2 to 12 letters, optional space, a colon, and the space after it. "Optional space" is any
// run of whitespace, or none, so a card's title keys alike before and after its whitespace is collapsed (R2-25c); the
// rest of the space after the colon goes with the collapse and trim, as before. A name with no tag keys EXACTLY as
// before (R2-25's vectors); "Smart Oats: Almond Joy" has no emoji and keeps its words (R2-66). The pattern is written
// with \u escapes: the shipped text stays ASCII (§ 15.4), and a regular expression without the u flag reads a
// surrogate pair as two code units, which is what the first alternative matches.
export function mealKey(name) {
  var s = unescape(encodeURIComponent(String(name).replace(/^\s*([\ud800-\udbff][\udc00-\udfff]|[\u2600-\u27bf])\s*[A-Z]{2,12}\s*:\s/, "").replace(/\s+/g, " ").trim())), h = 0x811c9dc5;
  for (var i = 0; s.length > i; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ("0000" + (h >>> 0).toString(36)).slice(-5);
}
