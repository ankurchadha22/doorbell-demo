(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};

  // Name, tagline and optional lines from config.js.
  function fill(sel, value) {
    if (!value) return;
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = value; });
  }
  fill("[data-name]", cfg.name);
  fill("[data-tagline]", cfg.tagline);
  if (cfg.name && document.title) {
    document.title = document.title.replace(/Doorbell/g, cfg.name);
  }
  if (cfg.behind) {
    document.querySelectorAll("[data-behind]").forEach(function (el) {
      var p = el.querySelector("[data-behind-text]");
      if (p) p.textContent = cfg.behind;
      el.hidden = false;
    });
  }
  document.querySelectorAll("[data-contact]").forEach(function (el) {
    if (cfg.contact) el.textContent = cfg.contact;
  });

  function cleanDomain(raw) {
    return String(raw || "").trim().toLowerCase()
      .replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  }

  function say(el, text, kind) {
    el.textContent = text;
    el.className = "note" + (kind ? " note-" + kind : "");
    el.hidden = false;
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res;
    });
  }

  // Waitlist forms (email only, optional hidden domain).
  document.querySelectorAll("form[data-waitlist]").forEach(function (form) {
    var out = form.querySelector("[data-out]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.elements.email.value.trim();
      if (!form.elements.email.checkValidity()) {
        say(out, "Please enter a valid email address.", "warn");
        form.elements.email.focus();
        return;
      }
      if (!cfg.waitlistEndpoint) {
        say(out, "The waiting list isn't open yet. Nothing was sent or stored. Please check back soon.", "warn");
        return;
      }
      var body = { email: email };
      if (form.elements.domain && form.elements.domain.value) body.domain = form.elements.domain.value;
      var btn = form.querySelector("button");
      btn.disabled = true;
      say(out, "Sending.", "");
      postJSON(cfg.waitlistEndpoint, body).then(function () {
        say(out, "Thank you. You are on the list. We will write when there is a place for you.", "ok");
        form.reset();
      }).catch(function () {
        say(out, "That did not go through. Please try again in a moment.", "err");
      }).then(function () { btn.disabled = false; });
    });
  });

  // Scan form on scan.html.
  var scan = document.querySelector("form[data-scan]");
  if (scan) {
    var out = scan.querySelector("[data-out]");
    var follow = document.getElementById("scan-waitlist");
    var params = new URLSearchParams(window.location.search);
    var initial = cleanDomain(params.get("domain"));

    var run = function () {
      var domain = cleanDomain(scan.elements.domain.value);
      if (!domain || domain.indexOf(".") < 1) {
        say(out, "Please enter a domain, such as yourcompany.com.", "warn");
        scan.elements.domain.focus();
        return;
      }
      scan.elements.domain.value = domain;
      if (!cfg.scanEndpoint) {
        say(out, "The free scan is opening to a waiting list first. Leave your email and we will scan " + domain + " as soon as it opens.", "warn");
        if (follow) {
          follow.hidden = false;
          follow.querySelector("[data-domain-label]").textContent = domain;
          follow.querySelector("input[name=domain]").value = domain;
          follow.querySelector("input[name=email]").focus();
        }
        return;
      }
      var btn = scan.querySelector("button");
      btn.disabled = true;
      say(out, "Requesting a scan of " + domain + ".", "");
      postJSON(cfg.scanEndpoint, { domain: domain }).then(function () {
        say(out, "Scan requested for " + domain + ". It reads public pages at a polite rate, so it can take a few minutes.", "ok");
      }).catch(function () {
        say(out, "The scan could not be started. Please try again in a moment.", "err");
      }).then(function () { btn.disabled = false; });
    };

    scan.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    if (initial) { scan.elements.domain.value = initial; run(); }
  }
})();
