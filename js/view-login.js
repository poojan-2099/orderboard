/* OrderBoard — the unlock screen. One password for the whole site; the account
   it belongs to is fixed in config.js, so nobody has to remember a username.
   Nothing else is reachable from here, Settings included. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  function render(container) {
    const pass = u().el("input", {
      class: "input input-lg", type: "password", id: "loginPass",
      autocomplete: "current-password", placeholder: "••••••••"
    });
    const err = u().el("div", { class: "login-err", style: "display:none" });
    const btn = u().el("button", { class: "btn btn-primary btn-big", text: t("unlock") });

    function show(msg) { err.style.display = ""; err.textContent = msg; }

    async function submit() {
      const p1 = pass.value;
      if (!p1) { show(t("unlockFill")); return; }
      btn.disabled = true;
      btn.textContent = t("unlocking");
      const r = await OB.auth.signIn(p1);
      if (r.ok) {
        // Reload rather than patching a half-built app: every view then starts
        // with the session already in place.
        location.reload();
        return;
      }
      btn.disabled = false;
      btn.textContent = t("unlock");
      pass.value = "";
      pass.focus();
      show(explain(r));
    }

    const form = u().el("form", { class: "login-card", onsubmit: (ev) => {
      ev.preventDefault(); submit();
    } }, [
      u().el("div", { class: "login-logo", text: "🍬" }),
      u().el("h2", { text: u().shopName() }),
      u().el("p", { class: "login-sub", text: t("unlockSub") }),
      err,
      u().el("label", { class: "field" }, [
        u().el("span", { class: "label", text: t("password") }), pass
      ]),
      btn,
      u().el("p", { class: "login-foot", text: t("unlockHelp") })
    ]);

    container.innerHTML = "";
    container.appendChild(u().el("div", { class: "login-wrap" }, [form]));
  }

  /* Supabase's wording is accurate but terse; say what to do about it.

     "Invalid login credentials" covers two very different problems: a wrong
     password, and an account that does not exist under the email this app
     signs in with. Naming that email is the difference between a two-minute
     fix and an evening of retyping a password that was never wrong. */
  function explain(r) {
    const m = String(r.error || "");
    if (/invalid login credentials/i.test(m)) {
      return t("unlockBad") + "\n\n" + t("unlockAccount") + " " + OB.auth.adminEmail();
    }
    if (/email not confirmed/i.test(m)) return t("unlockUnconfirmed");
    if (/rate|too many/i.test(m)) return t("unlockTooMany");
    if (/failed to fetch|network/i.test(m)) return t("unlockOffline");
    if (/ADMIN_EMAIL/i.test(m)) return m;
    return m;
  }

  OB.views = OB.views || {};
  OB.views.login = { render: render };
})();
