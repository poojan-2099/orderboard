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
        u().el("div", { class: "section-head" }, [u().el("h3", { text: "WhatsApp notification" })]),

        fld("How to send", u().el("div", { class: "seg seg-wrap" }, [
          provBtn("Meta Cloud API", "edge"),
          provBtn("CallMeBot", "callmebot"),
          provBtn("Off \u2014 tap to send", "off")
        ])),

        /* ---- Meta Cloud API ---- */
        u().el("div", { id: "paneEdge", class: "prov-pane" }, [
          u().el("p", { class: "muted small",
            text: "The official WhatsApp Business API. Your Meta token stays secret inside a Supabase Edge Function \u2014 it is never in the website. Setup steps are in SETUP-NOTES.md on the shop computer." }),
          fld("Edge Function URL", u().el("input", {
            class: "input", type: "url", id: "waFnUrl",
            placeholder: OB.notify.functionUrl() || "https://xxxx.functions.supabase.co/notify-whatsapp",
            value: cfg.wa_function_url || ""
          })),
          u().el("p", { class: "muted small",
            text: "Leave blank to use this project's own function: " + (OB.notify.functionUrl() || "(set your Supabase URL first)") }),
          u().el("div", { class: "callout" }, [
            u().el("b", { text: "The number and token are NOT set here." }),
            u().el("span", { text: " They are Supabase secrets: Dashboard \u2192 Edge Functions \u2192 Secrets \u2192 WA_TOKEN, WA_PHONE_ID, WA_TO." })
          ])
        ]),

        /* ---- CallMeBot ---- */
        u().el("div", { id: "paneCmb", class: "prov-pane" }, [
          u().el("div", { class: "callout" }, [
            u().el("b", { text: "CallMeBot is full." }),
            u().el("span", { text: " Their free bot stopped handing out new API keys. Kept here in case it reopens \u2014 if you already have a key it still works." })
          ]),
          u().el("p", { class: "muted small", text: t("waHelp") }),
          fld(t("waPhone"), u().el("input", {
            class: "input", type: "tel", id: "waPhone", placeholder: "+15551234567",
            value: cfg.whatsapp_phone || ""
          })),
          fld(t("waKey"), u().el("input", {
            class: "input", type: "text", id: "waKey", placeholder: "123456",
            value: cfg.whatsapp_apikey || ""
          }))
        ]),

        /* ---- Off ---- */
        u().el("div", { id: "paneOff", class: "prov-pane" }, [
          u().el("p", { class: "muted small",
            text: "Nothing is sent automatically. When the kitchen marks an order done, the Front Desk screen beeps and shows the order with a \ud83d\udcf2 button that opens WhatsApp with the whole message already written \u2014 you just press send. No setup needed." }),
          fld("Front desk WhatsApp number (optional)", u().el("input", {
            class: "input", type: "tel", id: "waPhoneOff", placeholder: "+15551234567",
            value: cfg.whatsapp_phone || ""
          })),
          u().el("p", { class: "muted small",
            text: "Fill this in and the \ud83d\udcf2 button opens that chat directly. Leave it blank and WhatsApp asks you who to send to." })
        ]),

        u().el("div", { class: "form-actions" }, [
          u().el("button", { class: "btn btn-primary", text: t("saveSettings"), onclick: saveWa }),
          u().el("button", { class: "btn btn-ghost", id: "waTestBtn",
                             text: t("waTest"), onclick: testWa }),
          u().el("button", { class: "btn btn-ghost", id: "cmbUrlBtn",
                             text: "\ud83d\udd0e Open test URL", onclick: openTestUrl })
        ]),
        u().el("pre", { class: "test-out", id: "waOut", style: "display:none" })
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

      /* ---------- sign-in ---------- */
      u().el("div", { class: "card" }, [
        u().el("div", { class: "section-head" }, [
          u().el("h3", { text: t("accountSection") }),
          u().el("span", { class: "badge " + (OB.auth.signedIn() ? "badge-done" : "badge-cancelled"),
                           text: OB.auth.signedIn() ? t("unlocked") : t("unlock") })
        ]),
        OB.auth.signedIn()
          ? u().el("div", { class: "who-row" }, [
              u().el("button", {
                class: "btn btn-ghost", text: "\ud83d\udd12 " + t("lock"),
                onclick: async () => {
                  await OB.auth.signOut();
                  location.hash = "#/board";
                  location.reload();
                }
              })
            ])
          : u().el("div", { class: "who-row" }, [
              u().el("button", {
                class: "btn btn-primary", text: t("unlock"),
                onclick: () => { location.hash = "#/board"; }
              })
            ]),
        u().el("p", { class: "muted small",
          text: OB.auth.required()
            ? "One password for every screen. To change it: Supabase \u2192 Authentication \u2192 Users \u2192 " +
              (OB.auth.adminEmail() || "the shop account") + " \u2192 Reset password. Screens already unlocked stay unlocked."
            : "\u26a0 REQUIRE_LOGIN is false in config.js, so anyone with this link can read and change orders. Set it back to true." })
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

    provider = cfg.wa_provider || OB.notify.provider();
    paintProvider();
  }

  function fld(label, control) {
    return u().el("label", { class: "field" }, [
      u().el("span", { class: "label", text: label }), control
    ]);
  }

  let provider = null;   // the currently selected sender

  function provBtn(label, value) {
    return u().el("button", {
      class: "seg-btn", type: "button", text: label, "data-prov": value,
      onclick: () => { provider = value; paintProvider(); }
    });
  }

  function paintProvider() {
    u().$$("[data-prov]", host).forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-prov") === provider));
    const show = (id, on) => {
      const n = u().$(id, host);
      if (n) n.style.display = on ? "" : "none";
    };
    show("#paneEdge", provider === "edge");
    show("#paneCmb",  provider === "callmebot");
    show("#paneOff",  provider === "off");
    const b = u().$("#cmbUrlBtn", host);
    if (b) b.style.display = provider === "callmebot" ? "" : "none";
    // Nothing is sent in "off" mode, so the button previews the message instead.
    const tb = u().$("#waTestBtn", host);
    if (tb) tb.textContent = provider === "off" ? "\ud83d\udc41 Preview message" : t("waTest");
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
    const url = OB.db.normalizeUrl(u().$("#sbUrl", host).value);
    const key = u().$("#sbKey", host).value.trim();
    localStorage.setItem("ob_sb_url", url);
    localStorage.setItem("ob_sb_key", key);
    u().toast(t("saved") + " — reloading", "success");
    setTimeout(() => location.reload(), 700);
  }

  async function saveWa() {
    if (!OB.db.ready) { u().toast(t("notConnected"), "error"); return; }
    const val = (sel) => {
      const n = u().$(sel, host);
      return n && n.value.trim() ? n.value.trim() : null;
    };
    // The number lives in one column; which box holds it depends on the pane.
    const phone = provider === "off" ? val("#waPhoneOff") : val("#waPhone");
    const legacy = { whatsapp_phone: phone, whatsapp_apikey: val("#waKey") };
    const patch = Object.assign({
      wa_provider: provider,
      wa_function_url: val("#waFnUrl")
    }, legacy);

    // Remember the choice on this device too, so it survives a database that
    // does not have the wa_provider column yet.
    localStorage.setItem("ob_wa_provider", provider);

    try {
      await OB.db.saveAppConfig(patch);
      u().toast(t("saved"), "success");
      hideOut();
    } catch (e) {
      console.error(e);
      // The two provider columns arrived with the 2026-10-27 migration. If they
      // are missing, still save everything else rather than losing the lot.
      if (/wa_provider|wa_function_url|column|42703|PGRST204/i.test(
            (e.message || "") + " " + (e.code || ""))) {
        let second = "";
        try {
          await OB.db.saveAppConfig(legacy);
        } catch (e2) { second = "\n\nThe rest did not save either: " + (e2.message || e2); }

        showOut("Saved on this device \u2014 the shop database is one step behind.\n\n" +
                "Your sender choice (" + provider + ") is active on this screen right now,\n" +
                "but other devices will not pick it up until you run the migration:\n\n" +
                "  Supabase \u2192 SQL Editor \u2192 New query\n" +
                "  paste supabase/migrations/2026-10-27-whatsapp-provider.sql\n" +
                "  press Run\n\n" +
                "\u26a0 Do NOT re-run schema.sql \u2014 that would delete your orders." +
                second + "\n\n(" + (e.message || e) + ")");
        u().toast("Saved on this device \u2014 see the note below", "warn", 6000);
      } else {
        u().toast(t("errSave"), "error");
      }
    }
  }

  function hideOut() {
    const n = u().$("#waOut", host);
    if (n) { n.style.display = "none"; n.textContent = ""; }
  }

  function showOut(text) {
    const n = u().$("#waOut", host);
    if (!n) return;
    n.style.display = "";
    n.textContent = text;
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
    if (provider === "off") {
      // Nothing to send, but showing the real message proves the shop name,
      // dates and item lines all come out right.
      const sample = OB.store && OB.store.orders && OB.store.orders[0];
      showOut("Tap-to-send is on, so nothing is sent automatically.\n\n" +
              "When the kitchen marks an order done, the Front Desk screen beeps\n" +
              "and the \ud83d\udcf2 button opens WhatsApp with this text ready to send:\n\n" +
              "------------------------------------------\n" +
              (sample
                ? OB.notify.doneMessage(sample)
                : "(no orders yet — take one order, then press this again)"));
      u().toast("Nothing is sent in this mode — preview shown below", "info", 4000);
      return;
    }

    if (provider === "edge") {
      showOut("Calling the Edge Function…");
      const r = await OB.notify.sendViaEdge({ test: true });
      if (r.ok) {
        showOut("✅ Sent. Check WhatsApp on the number in your WA_TO secret.\n\n" +
                JSON.stringify(r, null, 2));
        u().toast("Test sent", "success");
      } else {
        showOut("❌ Failed.\n\n" + explainEdgeError(r) + "\n\n" + JSON.stringify(r, null, 2));
        u().toast("Test failed — see details below", "error", 6000);
      }
      return;
    }

    if (!OB.notify.configured()) {
      u().toast("Add the number and API key first, then Save.", "error", 5000);
      return;
    }
    const ok = await OB.notify.send(
      "✅ Order Board test message — if you can read this, WhatsApp notifications are working.");
    u().toast(ok ? "Test sent — check WhatsApp" : t("waNotSent"), ok ? "success" : "error", 5000);
  }

  /* Turn Meta's terse errors into something actionable. */
  function explainEdgeError(r) {
    const msg = String(r.error || "");
    if (/Missing secrets/i.test(msg))
      return "The function is deployed but its secrets are not set.\n" +
             "Supabase → Edge Functions → Secrets: add WA_TOKEN, WA_PHONE_ID, WA_TO.";
    if (/404|not found/i.test(msg) || r.status === 404)
      return "The function URL is wrong, or it is not deployed yet.\nExpected: " +
             OB.notify.functionUrl();
    if (/401|403|unauthor/i.test(msg))
      return "Supabase refused the call. Edge Functions → your function → Details:\n" +
             "either keep 'Verify JWT' ON and use your anon key, or switch it OFF.";
    if (/template/i.test(msg))
      return "Meta could not use your message template.\n" +
             "Create a Utility template named 'order_ready' with 4 variables, wait for\n" +
             "approval, or set the WA_TEMPLATE secret to your template's name.";
    if (/re-?engagement|24 hour|recipient/i.test(msg))
      return "Meta will not deliver to this number right now.\n" +
             "Add it under WhatsApp → API Setup → 'To' as a verified recipient,\n" +
             "and make sure the template is approved.";
    if (/token|OAuth|session|expired/i.test(msg))
      return "The Meta access token is invalid or expired.\n" +
             "Temporary tokens last 24 hours — create a permanent System User token.";
    return "See the raw response below — the 'message' field is Meta's own wording.";
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
