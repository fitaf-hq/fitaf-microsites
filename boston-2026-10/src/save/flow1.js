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

  // The offer box: the label of the offer a save made now would get — the Worker's own choice, on the date in
  // the Worker's send time zone. SPEC-save-offer-production § 10.7: when no offer is live (after the last one's
  // valid_to), no offer is offered: neither the box nor this flow is drawn. If the file breaks its at-most-one rule
  // (offerForSave throws), the box stays empty and the flow is drawn, as before.
  function chooseOffer() {
    try {
      var chosen = offerForSave(zonedDate(Date.now(), cfg.send_time_zone), cfg.offers);
      return chosen ? { live: true, label: chosen.label } : { live: false, label: "" };
    } catch (e) {
      return { live: true, label: "" };
    }
  }
  var offer = chooseOffer();

  // The event a save names (SPEC-save-offer-production § 9 item 2): the `?e=` code the page was opened with, read as the
  // analytics beacon reads it (qrEvent over QR_IDS, the page's analytics script's), else the page's own event.
  var eventId = qrEvent(location.search, QR_IDS) || cfg.event_id;

  // Where this flow sits (SPEC-rung4 § 2b, save the offer at the END): directly after the button that leaves for the
  // store — the result card's once a plan is chosen, the Family card's on Family — and nowhere before a plan is chosen.
  // Read off Flow 2's own panels, which app.js renders (as the share panel reads its card); never written here.
  // There is one Flow 1, moved between the two places: what was typed goes with it.
  var ANCHORS = { individual: "save-end", family: "save-end-family" };
  function placeOf() {
    if (!el("panel-family").hidden) return "family";
    if (!el("result").hidden) return "individual";
    return null;
  }

  // name: OFFER · EDITING · CHECKING · OUT_OF_AREA · EXPANSION_SAVED · VERIFYING · SENDING · ERROR · SAVED
  //       · PLAN · MENU.  kind: what is being saved ("offer" | "expansion"); error: ERROR's kind.
  //       place: Flow 2's, where this flow is shown ("individual" | "family" | null: not shown).
  var state = { name: "OFFER", kind: "offer", error: null, zip: "", email: "", place: null };

  function render(s) {
    var section = el("save");
    section.hidden = !s.place || !offer.live;
    el("offer-box").hidden = !offer.live;
    if (s.place && section.parentNode !== el(ANCHORS[s.place])) el(ANCHORS[s.place]).appendChild(section);
    var collapsed = s.name === "PLAN" || s.name === "MENU";
    var busy = s.name === "CHECKING" || s.name === "VERIFYING" || s.name === "SENDING";
    var outOfArea = s.name === "OUT_OF_AREA" || s.name === "EXPANSION_SAVED" ||
      (s.kind === "expansion" && (busy || s.name === "ERROR"));
    el("save-offer-label").textContent = offer.label;
    el("save-step-offer-label").textContent = offer.label; // the step names its offer where it asks (SPEC-save-offer-production § 1)
    el("save-open").hidden = collapsed;
    el("save-collapsed").hidden = !collapsed;
    el("save-form").hidden = s.name === "SAVED" || s.name === "EXPANSION_SAVED";
    el("save-out-of-area").hidden = !outOfArea || s.name === "EXPANSION_SAVED";
    el("save-ooa-zip").textContent = s.zip || "[ZIP]";
    el("save-error").hidden = s.name !== "ERROR";
    el("save-error").textContent = s.name === "ERROR" ? MESSAGES[s.error] || MESSAGES.other : "";
    el("save-submit").disabled = busy;
    el("save-expansion").disabled = busy;
    el("save-done").hidden = s.name !== "SAVED";
    el("save-done-email").textContent = s.name === "SAVED" ? s.email : "";
    el("save-expansion-done").hidden = s.name !== "EXPANSION_SAVED";
  }
  function go(next) {
    state = next;
    render(state);
  }
  function withName(name, extra) {
    var next = { name: name, kind: state.kind, error: null, zip: state.zip, email: state.email, place: state.place };
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
    next.place = placeOf();
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
  go(withName(location.hash === "#from-email" ? "PLAN" : "OFFER", { place: placeOf() }));
})();
