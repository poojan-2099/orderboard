/* OrderBoard — settings: database keys, WhatsApp, language, screen name. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  let host = null;

  function render(container) {
    host = container;
    const cfg = OB.db.appConfig || {};
    const connected = OB.db.ready;

    host.innerHTML = "";
    host.appendChild(u().el("div", { class: "page page-narrow" }, [
      u().el("div", { class: "page-head" }, [u().el("h2", { text: t("settingsTitle") })]),

      /* ---------- database ---------- */
      u().el("div", { class: "card" }, [
        u().el("div", { class: "section-head" }, [
          u().el("h3", { text: t("connection") }),
          u().el("span", { class: "badge " + (connected ? "badge-done" : "badge-cancelled"),
                           text: connected ? t("connected") : t("notConnected") })
        ]),
        u().el("p", { class: "muted small",
          text: "Settings → Data API gives the Project URL. Settings → API Keys gives the Publishable key — or, on an older project, the legacy \"anon / public\" key. Either works. Never paste a secret or service_role key. These normally live in config.js; setting them here overrides that on this device only." }),
        fld("Supabase URL", u().el("input", {
          class: "input", type: "url", id: "sbUrl", placeholder: "https://xxxx.supabase.co",
          value: localStorage.getItem("ob_sb_url") || OB_CONFIG.SUPABASE_URL || ""
        })),
        fld("Supabase publishable (anon) key", u().el("input", {
          class: "input", type: "text", id: "sbKey",
          placeholder: "sb_publishable_…   or   eyJhbGciOi…",
          value: localStorage.getItem("ob_sb_key") || OB_CONFIG.SUPABASE_ANON || ""
        })),
        u().el("div", { class: "form-actions" }, [
          u().el("button", { class: "btn btn-primary", text: t("saveSettings"), onclick: saveDb })
        ])
      ]),

      /* ---------- whatsapp ---------- */
      u().el("div", { class: "card" }, [
        u().el("div", { class: "section-head" }, [u().el("h3", { text: t("waSection") })]),
        u().el("p", { class: "muted small", text: t("waHelp") }),
        fld(t("waPhone"), u().el("input", {
          class: "input", type: "tel", id: "waPhone", placeholder: "+15551234567",
          value: cfg.whatsapp_phone || ""
        })),
        fld(t("waKey"), u().el("input", {
          class: "input", type: "text", id: "waKey", placeholder: "123456",
          value: cfg.whatsapp_apikey || ""
        })),
        u().el("p", { class: "muted small",
          text: "Saved in your database so the kitchen tablet can send too — no setup needed on their screen." }),
        u().el("div", { class: "form-actions" }, [
          u().el("button", { class: "btn btn-primary", text: t("saveSettings"), onclick: saveWa }),
          u().el("button", { class: "btn btn-ghost", text: t("waTest"), onclick: testWa }),
          u().el("button", { class: "btn btn-ghost", text: "🔎 Open test URL", onclick: openTestUrl })
        ])
      ]),

      /* ---------- shop ---------- */
      u().el("div", { class: "card" }, [
        u().el("div", { class: "section-head" }, [u().el("h3", { text: t("shopName") })]),
        fld(t("shopName"), u().el("input", {
          class: "input", type: "text", id: "shopName", value: cfg.shop_name || ""
        })),
        u().el("div", { class: "form-actions" }, [
          u().el("button", { class: "btn btn-primary", text: t("saveSettings"), onclick: saveShop })
        ])
      ]),

      /* ---------- this device ---------- */
      u().el("div", { class: "card" }, [
        u().el("div", { class: "section-head" }, [u().el("h3", { text: t("deviceSection") })]),
        fld(t("language"), u().el("div", { class: "seg" }, [
          segBtn("ਪੰਜਾਬੀ", "pa"),
          segBtn("English", "en")
        ])),
        fld(t("stationName"), u().el("input", {
          class: "input", type: "text", id: "station", value: u().station(),
          placeholder: "Kitchen / Front Desk"
        })),
        u().el("div", { class: "form-actions" }, [
          u().el("button", { class: "btn btn-primary", text: t("saveSettings"), onclick: saveDevice }),
          u().el("button", { class: "btn btn-ghost", text: "🔔 " + t("soundTest"),
                             onclick: () => u().beep(2) })
        ]),
        u().el("p", { class: "muted small", text: "Pending offline writes: " + OB.db.queueSize() })
      ])
    ]));
  }

  function fld(label, control) {
    return u().el("label", { class: "field" }, [
      u().el("span", { class: "label", text: label }), control
    ]);
  }

  function segBtn(label, lang) {
    return u().el("button", {
      class: "seg-btn" + (OB.i18n.lang === lang ? " on" : ""),
      type: "button", text: label,
      onclick: () => {
        OB.i18n.set(lang);
        OB.app.renderChrome();
        render(host);
      }
    });
  }

  /* ---------- savers ---------- */

  function saveDb() {
    const url = u().$("#sbUrl", host).value.trim();
    const key = u().$("#sbKey", host).value.trim();
    localStorage.setItem("ob_sb_url", url);
    localStorage.setItem("ob_sb_key", key);
    u().toast(t("saved") + " — reloading", "success");
    setTimeout(() => location.reload(), 700);
  }

  async function saveWa() {
    const phone = u().$("#waPhone", host).value.trim();
    const key = u().$("#waKey", host).value.trim();
    if (!OB.db.ready) { u().toast(t("notConnected"), "error"); return; }
    try {
      await OB.db.saveAppConfig({ whatsapp_phone: phone, whatsapp_apikey: key });
      u().toast(t("saved"), "success");
    } catch (e) {
      console.error(e);
      u().toast(t("errSave"), "error");
    }
  }

  async function saveShop() {
    if (!OB.db.ready) { u().toast(t("notConnected"), "error"); return; }
    try {
      await OB.db.saveAppConfig({ shop_name: u().$("#shopName", host).value.trim() });
      u().toast(t("saved"), "success");
      OB.app.renderChrome();
    } catch (e) { u().toast(t("errSave"), "error"); }
  }

  function saveDevice() {
    u().setStation(u().$("#station", host).value.trim() || "Front Desk");
    u().toast(t("saved"), "success");
  }

  /* ---------- whatsapp test ---------- */

  async function testWa() {
    if (!OB.notify.configured()) {
      u().toast("Add the number and API key first, then Save.", "error", 5000);
      return;
    }
    const ok = await OB.notify.send(
      "✅ Order Board test message — if you can read this, WhatsApp notifications are working.");
    u().toast(ok ? "Test sent — check WhatsApp" : t("waNotSent"), ok ? "success" : "error", 5000);
  }

  /* The browser cannot read CallMeBot's reply (no CORS headers), so this
     opens the exact request in a new tab where you can see the real answer. */
  function openTestUrl() {
    if (!OB.notify.configured()) {
      u().toast("Add the number and API key first, then Save.", "error", 5000);
      return;
    }
    const url = OB.notify.buildUrl("Order Board test from the settings page");
    window.open(url, "_blank", "noopener");
  }

  OB.views = OB.views || {};
  OB.views.settings = { render: render };
})();
