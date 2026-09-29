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
  // the Worker's send time zone. If none can be chosen (offers.json breaks its one-general rule), it stays empty.
  function offerLabel() {
    try {
      return offerForSave(zonedDate(Date.now(), cfg.send_time_zone), cfg.offers).label;
    } catch (e) {
      return "";
    }
  }
  var offer = offerLabel();

  // name: OFFER · EDITING · CHECKING · OUT_OF_AREA · EXPANSION_SAVED · VERIFYING · SENDING · ERROR · SAVED
  //       · PLAN · MENU.  kind: what is being saved ("offer" | "expansion"); error: ERROR's kind.
  var state = { name: "OFFER", kind: "offer", error: null, zip: "", email: "" };

  function render(s) {
    var collapsed = s.name === "PLAN" || s.name === "MENU";
    var busy = s.name === "CHECKING" || s.name === "VERIFYING" || s.name === "SENDING";
    var outOfArea = s.name === "OUT_OF_AREA" || s.name === "EXPANSION_SAVED" ||
      (s.kind === "expansion" && (busy || s.name === "ERROR"));
    el("save-offer-label").textContent = offer;
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
    // Out of area, the flow has no PLAN edge (the offer cannot be used there): only the menu link remains.
    el("save-skip-plan").hidden = outOfArea;
  }
  function go(next) {
    state = next;
    render(state);
  }
  function withName(name, extra) {
    var next = { name: name, kind: state.kind, error: null, zip: state.zip, email: state.email };
    for (var k in extra || {}) next[k] = extra[k];
    return next;
  }

  // ---- transitions (flows/01 § 3) ----
  function focusField() { if (state.name === "OFFER") go(withName("EDITING")); }
  function editOrRetry() {
    if (state.name === "ERROR" || state.name === "OUT_OF_AREA") go(withName("EDITING", { kind: "offer" }));
  }
  function buildMyPlan() {
    go(withName("PLAN"));
    var target = document.getElementById("panel-individual");
    if (target && target.scrollIntoView) target.scrollIntoView();
  }
  function seeMenu() { go(withName("MENU")); } // no menu input exists yet, so no link calls this
  function reopen() { go(withName("EDITING", { kind: "offer" })); }

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
      event_id: cfg.event_id,
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
  el("save-skip-plan").addEventListener("click", buildMyPlan);
  el("save-reopen").addEventListener("click", reopen);
  var menu = el("save-skip-menu");
  if (menu) menu.addEventListener("click", seeMenu);

  // A visit from the email's link opens at Flow 2, with this flow collapsed to one line.
  if (location.hash === "#from-email") state = withName("PLAN");
  render(state);
})();
