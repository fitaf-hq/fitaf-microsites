(function () {
  "use strict";
  // Rung 3, development build only. Shows the claim form once a plan is chosen (the URL fragment
  // rung 1 writes), and submits the plan with the claim. Returns nothing but { ok: true }.
  var plans = JSON.parse(document.getElementById("plan-data").textContent);
  var cfg = JSON.parse(document.getElementById("claim-data").textContent);
  var $ = function (id) { return document.getElementById(id); };
  var section = $("claim"), form = $("claim-form"), err = $("claim-error"), submit = $("claim-submit");
  var widget = null, pending = null;

  function chosen() {
    var h = location.hash.replace(/^#/, "");
    if (h === "family") return { plan: "family", meals_per_week: 1, label: "Family" };
    var m = /^([a-z]+)-(\d+)$/.exec(h);
    if (!m || plans.counts.indexOf(+m[2]) === -1) return null;
    for (var i = 0; i < plans.plans.length; i++) {
      if (plans.plans[i].id === m[1]) {
        return { plan: m[1], meals_per_week: +m[2], label: plans.plans[i].name + " · " + m[2] + " meals a week" };
      }
    }
    return null;
  }
  function show() {
    var c = chosen();
    section.hidden = !c;
    if (c) $("claim-plan").textContent = "For " + c.label;
  }
  function fail(message) {
    err.textContent = message;
    err.hidden = false;
    submit.disabled = false;
  }
  var MESSAGES = {
    email_or_mobile_required: "Enter an email or a mobile number — one is enough.",
    email_invalid: "That email address doesn't look right.",
    mobile_invalid: "Enter a 10-digit US mobile number.",
    zip_invalid: "Enter a five-digit ZIP code.",
    consent_sms_without_mobile: "To tick “Text me”, enter your mobile number.",
    consent_email_without_email: "To tick “Email me”, enter your email.",
    rate_limited: "Too many tries — please wait a minute and try again."
  };

  function payload(token) {
    var c = chosen();
    return {
      plan: c.plan,
      meals_per_week: c.meals_per_week,
      first_name: form.first_name.value,
      email: form.email.value,
      mobile: form.mobile.value,
      zip: form.zip.value,
      consent_email: form.consent_email.checked === true,
      consent_sms: form.consent_sms.checked === true,
      wording_version: cfg.wording_version,
      turnstile_token: token
    };
  }
  function send(token) {
    var body = payload(token);
    fetch(cfg.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (r.ok && r.j.ok === true) {
          var where = body.email.trim() && body.mobile.trim() ? "email and phone" : body.email.trim() ? "email" : "phone";
          $("claim-done-where").textContent = where;
          form.hidden = true;
          $("claim-done").hidden = false;
        } else {
          fail(MESSAGES[r.j.error] || "Something went wrong. Please try again.");
        }
      })
      .catch(function () { fail("Couldn't reach us. Check your connection and try again."); });
  }
  function checkLocally() {
    if (!form.email.value.trim() && !form.mobile.value.trim()) return MESSAGES.email_or_mobile_required;
    if (!/^\d{5}$/.test(form.zip.value.trim())) return MESSAGES.zip_invalid;
    if (form.consent_sms.checked && !form.mobile.value.trim()) return MESSAGES.consent_sms_without_mobile;
    if (form.consent_email.checked && !form.email.value.trim()) return MESSAGES.consent_email_without_email;
    return null;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.hidden = true;
    var problem = checkLocally();
    if (problem) return fail(problem);
    if (!window.turnstile) return fail("Still loading — please try again in a moment.");
    submit.disabled = true;
    if (widget === null) {
      widget = window.turnstile.render("#claim-turnstile", {
        sitekey: cfg.site_key,
        execution: "execute",
        appearance: "interaction-only",
        callback: function (token) { if (pending) { pending = null; send(token); } },
        "error-callback": function () { pending = null; fail("We couldn't check this request. Please try again."); }
      });
    } else {
      window.turnstile.reset(widget);
    }
    pending = true;
    window.turnstile.execute(widget);
  });

  window.addEventListener("hashchange", show);
  show();
})();
