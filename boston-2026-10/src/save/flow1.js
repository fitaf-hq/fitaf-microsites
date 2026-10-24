(function () {
  "use strict";
  // Flow 1 — save the offer (flows/01-save-offer.md § 3). Development build only.
  // One state object; one render(state), the only code that writes the DOM; transitions named after the
  // rows of the flow's table. `classifyZip` is inlined by the build from src/worker/zip-class.js;
  // `offerForSave` and `zonedDate` from src/worker/offers.js and zoned-time.js (SPEC-rung4 § 2a).
  var cfg = JSON.parse(document.getElementById("save-data").textContent);
  var el = function (id) { return document.getElementById(id); };
  var EMAIL_RE = new RegExp(cfg.email_pattern);
  var MESSAGES = {
    email_invalid: "That email address doesn't look right.",
    zip_invalid: "Enter a five-digit ZIP code.",
    rate_limited: "Too many tries — please wait a minute and try again.",
    turnstile_failed: "We couldn't check this request. Please try again.",
    loading: "Still loading — please try again in a moment.",
    network: "Couldn't reach us. Check your connection and try again.",
    other: "Something went wrong. Please try again."
  };
  // SPEC-ui-and-copy-pass § 1 item 3 (the Advisor's note f-save-errors): an error about a field is shown under that field
  // and marks it; every other error is about the whole save, shown above the button that made it.
  var FIELD_ERRORS = { email_invalid: "email", zip_invalid: "zip" };

  // The offer box: the label of the offer a save made now would get — the Worker's own choice, on the date in
  // the Worker's send time zone. SPEC-save-offer-production § 10.7: when no offer is live (after the last one's
  // valid_to), no offer is offered: the box is not drawn. SPEC-ui-and-copy-pass § 1.2 item 3 (the Advisor, 2026-10-23: "We
  // should still save"): this flow is, with no offer: its own lead, button, fine print and done line (DRAFT § 1, "After
  // the offer ends"), no offer line and no date held; the Worker keeps the save with nothing due. If the file breaks its
  // at-most-one rule (offerForSave throws), the box stays empty and the flow is drawn, as before.
  // § 10.9: the step says the date the pricing is held until, as the Worker will for a save made now: the later of the
  // offer's last day and tomorrow (the day its E1 is due). SPEC-ui-and-copy-pass § 1 item 1: the box prints the offer's
  // headline (its label when it has none); the step's line keeps the label, as /o and the email do.
  function chooseOffer() {
    try {
      var today = zonedDate(Date.now(), cfg.send_time_zone);
      var chosen = offerForSave(today, cfg.offers);
      return chosen
        ? { live: true, label: chosen.label, line: chosen.headline || chosen.label, held: longDate(heldUntil(chosen, addDays(today, 1))) }
        : { live: false, label: "", line: "", held: "" };
    } catch (e) {
      return { live: true, label: "", line: "", held: "" };
    }
  }
  var offer = chooseOffer();

  // The event a save names (SPEC-save-offer-production § 9 item 2): the `?e=` code the page was opened with, read as the
  // analytics beacon reads it (qrEvent over QR_IDS, the page's analytics script's), else the page's own event.
  var eventId = qrEvent(location.search, QR_IDS) || cfg.event_id;

  // Where this flow sits (SPEC-rung4 § 2b, save the offer at the END): directly after the result card, whose last thing
  // leaves for the store. SPEC-ui-and-copy-pass § 1 item 2 (the Advisor, 2026-10-23: "a UX evolution from the initial
  // brief"): shown only while the card's checkout button is shown (#cc-checkout, a week's cart for the answers),
  // never beside Choose your meals alone, never on Family. Read off what app.js and the card's script drew (both run
  // before this script, on the page and on each hashchange, so this reads them after they have drawn); never written here.
  var ANCHOR = "save-end";
  function besideCheckout() {
    var checkout = el("cc-checkout");
    return !!checkout && !el("panel-individual").hidden && !el("result").hidden && !el("cc-list").hidden && !checkout.hidden;
  }

  // name: OFFER · EDITING · CHECKING · OUT_OF_AREA · EXPANSION_SAVED · VERIFYING · SENDING · ERROR · SAVED
  //       · PLAN · MENU.  kind: what is being saved ("offer" | "expansion"); error: ERROR's kind.
  //       beside: whether the card's checkout button is shown, so this flow with it.
  var state = { name: "OFFER", kind: "offer", error: null, zip: "", email: "", beside: false };

  // § 1 item 3: a field's error under the field, the field marked (aria-invalid, and aria-describedby naming the error).
  function fieldError(field, words) {
    var input = el("save-" + field);
    var message = el("save-" + field + "-error");
    message.hidden = !words;
    message.textContent = words;
    if (words) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", message.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  function render(s) {
    var section = el("save");
    var later = !offer.live; // § 1.2 item 3: after the last offer's end, the step with no offer
    section.hidden = !s.beside;
    el("offer-box").hidden = !offer.live;
    if (s.beside && section.parentNode !== el(ANCHOR)) el(ANCHOR).appendChild(section);
    var collapsed = s.name === "PLAN" || s.name === "MENU";
    var busy = s.name === "CHECKING" || s.name === "VERIFYING" || s.name === "SENDING";
    var saved = s.name === "SAVED" || s.name === "EXPANSION_SAVED";
    var outOfArea = s.name === "OUT_OF_AREA" || s.name === "EXPANSION_SAVED" ||
      (s.kind === "expansion" && (busy || s.name === "ERROR"));
    var error = s.name === "ERROR" ? MESSAGES[s.error] || MESSAGES.other : "";
    var field = s.name === "ERROR" ? FIELD_ERRORS[s.error] || null : null;
    el("save-offer-label").textContent = offer.line;
    el("save-step-offer-label").textContent = offer.label; // the step names its offer where it asks (SPEC-save-offer-production § 1)
    el("save-held-date").textContent = offer.held;
    el("save-open").hidden = collapsed;
    el("save-collapsed").hidden = !collapsed;
    // § 1 item 2: after a save the step goes away (its offer line, the lead, the form and its fine print); the done line
    // stays where the step was.
    el("save-step-offer").hidden = saved || later;
    el("save-lead").hidden = saved || later;
    el("save-lead-later").hidden = saved || !later;
    el("save-email-help").hidden = later; // after the end no link is sent tomorrow: the field's own help line
    el("save-email-help-later").hidden = !later;
    el("save-form").hidden = saved;
    el("save-submit").hidden = later;
    el("save-submit-later").hidden = !later;
    el("save-notice").hidden = later;
    el("save-notice-later").hidden = !later;
    // § 1 item 3: out of area, its line and button take the place of the offer's own (the tick, Save my offer and the fine
    // print), directly after the fields, which stay for the ZIP code to be corrected.
    el("save-offer-part").hidden = outOfArea;
    el("save-out-of-area").hidden = !outOfArea || s.name === "EXPANSION_SAVED";
    el("save-ooa-zip").textContent = s.zip || "[ZIP]";
    fieldError("email", field === "email" ? error : "");
    fieldError("zip", field === "zip" ? error : "");
    el("save-error").hidden = !error || !!field || s.kind !== "offer";
    el("save-error").textContent = el("save-error").hidden ? "" : error;
    el("save-expansion-error").hidden = !error || !!field || s.kind !== "expansion";
    el("save-expansion-error").textContent = el("save-expansion-error").hidden ? "" : error;
    el("save-submit").disabled = busy;
    el("save-submit-later").disabled = busy;
    el("save-expansion").disabled = busy;
    el("save-done").hidden = s.name !== "SAVED" || later;
    el("save-done-email").textContent = s.name === "SAVED" && !later ? s.email : "";
    el("save-done-later").hidden = s.name !== "SAVED" || !later;
    el("save-done-later-email").textContent = s.name === "SAVED" && later ? s.email : "";
    el("save-expansion-done").hidden = s.name !== "EXPANSION_SAVED";
  }
  function go(next) {
    state = next;
    render(state);
  }
  function withName(name, extra) {
    var next = { name: name, kind: state.kind, error: null, zip: state.zip, email: state.email, beside: state.beside };
    for (var k in extra || {}) next[k] = extra[k];
    return next;
  }

  // ---- transitions (flows/01 § 3) ----
  function focusField() { if (state.name === "OFFER") go(withName("EDITING")); }
  function editOrRetry() {
    if (state.name === "ERROR" || state.name === "OUT_OF_AREA") go(withName("EDITING", { kind: "offer" }));
  }
  // § 2b item 3: no "Build my plan" skip at the end, where the visitor has built the plan; PLAN is reached from the
  // email's link (#from-email) alone.
  function seeMenu() { go(withName("MENU")); } // no menu input exists yet, so no link calls this
  function reopen() { go(withName("EDITING", { kind: "offer" })); }
  // Flow 2 moved on (a plan chosen or changed, Family, back): this flow follows it, its own state unchanged.
  function choiceChanged() {
    var next = {};
    for (var k in state) next[k] = state[k];
    next.beside = besideCheckout();
    go(next);
  }

  function saveMyOffer() {
    var email = el("save-email").value.trim();
    var zip = el("save-zip").value.trim();
    go(withName("CHECKING", { kind: "offer", email: email, zip: zip }));
    if (!EMAIL_RE.test(email)) return go(withName("ERROR", { error: "email_invalid" }));
    if (!/^\d{5}$/.test(zip)) return go(withName("ERROR", { error: "zip_invalid" }));
    if (classifyZip(zip, cfg.zips) !== "in") return go(withName("OUT_OF_AREA"));
    verify();
  }
  function tellMeWhenYouDeliver() {
    go(withName("VERIFYING", { kind: "expansion" }));
    verify();
  }

  // VERIFYING: the bot check (Turnstile, invisible). Its token is checked by the Worker, then discarded.
  var widget = null;
  var pending = false;
  function verify() {
    if (!window.turnstile) return go(withName("ERROR", { error: "loading" }));
    go(withName("VERIFYING"));
    pending = true;
    if (widget === null) {
      widget = window.turnstile.render("#save-turnstile", {
        sitekey: cfg.site_key,
        execution: "execute",
        appearance: "interaction-only",
        callback: function (token) { if (pending) { pending = false; botCheckPassed(token); } },
        "error-callback": function () { pending = false; go(withName("ERROR", { error: "turnstile_failed" })); }
      });
    } else {
      window.turnstile.reset(widget);
    }
    window.turnstile.execute(widget);
  }

  function botCheckPassed(token) {
    go(withName("SENDING"));
    // ⛔ Exactly these fields. Nothing from Flow 2 or the share calculator is sent.
    var body = {
      kind: state.kind,
      email: state.email,
      zip: state.zip,
      consent_marketing: state.kind === "offer" && el("save-marketing").checked === true,
      event_id: eventId,
      wording_version: cfg.wording_version,
      turnstile_token: token
    };
    fetch(cfg.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (r.ok && r.j.ok === true) go(withName(state.kind === "expansion" ? "EXPANSION_SAVED" : "SAVED"));
        else go(withName("ERROR", { error: r.j.error }));
      })
      .catch(function () { go(withName("ERROR", { error: "network" })); });
  }

  el("save-form").addEventListener("submit", function (e) { e.preventDefault(); saveMyOffer(); });
  el("save-email").addEventListener("focus", focusField);
  el("save-zip").addEventListener("focus", focusField);
  el("save-email").addEventListener("input", editOrRetry);
  el("save-zip").addEventListener("input", editOrRetry);
  el("save-expansion").addEventListener("click", tellMeWhenYouDeliver);
  el("save-reopen").addEventListener("click", reopen);
  var menu = el("save-skip-menu");
  if (menu) menu.addEventListener("click", seeMenu);
  window.addEventListener("hashchange", choiceChanged);

  // Every visit opens at Flow 2 (§ 2b item 1); a visit from the email's link has this flow collapsed to one line.
  go(withName(location.hash === "#from-email" ? "PLAN" : "OFFER", { beside: besideCheckout() }));
})();
