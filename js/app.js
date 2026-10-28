/* OrderBoard — app shell: store, router, boot. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  /* ============================================================
     Store — one shared list of active orders for every view
     ============================================================ */
  const store = {
    orders: [],
    _refreshing: false,
    _again: false,

    async refresh() {
      if (!OB.db.ready) return;
      if (this._refreshing) { this._again = true; return; }
      this._refreshing = true;
      try {
        this.orders = await OB.db.fetchActive();
        onStoreUpdated();
      } catch (e) {
        console.error("[OB] refresh failed", e);
      } finally {
        this._refreshing = false;
        if (this._again) { this._again = false; this.refresh(); }
      }
    },

    byId(id) { return this.orders.find((o) => String(o.id) === String(id)); }
  };

  /* Count of open orders, used for the "new order arrived" beep */
  let lastOpenIds = null;

  function onStoreUpdated() {
    // beep on the kitchen screen when a genuinely new order shows up
    const openIds = store.orders
      .filter((o) => o.status === "new")
      .map((o) => o.id);

    if (lastOpenIds !== null && OB_CONFIG.SOUND_ON_NEW_ORDER) {
      const fresh = openIds.filter((id) => lastOpenIds.indexOf(id) === -1);
      if (fresh.length && router.current === "#/board") u().beep(2);
    }
    lastOpenIds = openIds;

    // let the active view repaint
    if (router.current === "#/board" && OB.views.board.draw) OB.views.board.draw();
    if (router.current === "#/desk") {
      if (OB.views.desk.draw) OB.views.desk.draw();
      if (OB.views.desk.announce) OB.views.desk.announce();
    }
    renderBadges();
  }

  /* ============================================================
     Router
     ============================================================ */
  const ROUTES = {
    "#/new":      { view: () => OB.views.newOrder, key: "navNew" },
    "#/board":    { view: () => OB.views.board,    key: "navBoard" },
    "#/desk":     { view: () => OB.views.desk,     key: "navDesk" },
    "#/log":      { view: () => OB.views.log,      key: "navLog" },
    // Reachable at #/settings and via the gear icon in the header, but kept off
    // the navbar so kitchen staff can't wander into it by accident.
    "#/settings": { view: () => OB.views.settings, key: "navSettings", offNav: true }
  };

  const router = {
    current: null,
    _arg: null,

    go(hash, arg) {
      this._arg = arg || null;
      if (location.hash === hash) this.mount();
      else location.hash = hash;
    },

    mount() {
      const main = u().$("#main");

      /* Signed out: show the sign-in screen instead of any view. Settings is
         the one exception, so a wrong database key can still be corrected
         from the locked screen. */
      if (OB.auth.gateActive() && location.hash !== "#/settings") {
        this.current = "#/login";
        document.body.classList.add("signed-out");
        document.body.classList.remove("on-board");
        OB.views.login.render(main);
        u().$$("#nav a").forEach((a) => a.classList.remove("on"));
        return;
      }
      document.body.classList.toggle("signed-out", OB.auth.gateActive());

      const hash = ROUTES[location.hash] ? location.hash : "#/board";
      // let the outgoing view clear its timers
      if (this.current && this.current !== hash) {
        const old = ROUTES[this.current];
        const ov = old && old.view();
        if (ov && ov.destroy) ov.destroy();
      }
      this.current = hash;

      const v = ROUTES[hash].view();
      const arg = this._arg; this._arg = null;

      try {
        v.render(main, arg);
      } catch (e) {
        console.error("[OB] view error", e);
        main.innerHTML = "";
        main.appendChild(u().el("div", { class: "empty", text: String(e.message || e) }));
      }

      u().$$("#nav a").forEach((a) =>
        a.classList.toggle("on", a.getAttribute("href") === hash));

      document.body.classList.toggle("on-board", hash === "#/board");
    }
  };

  /* ============================================================
     Chrome — header + nav
     ============================================================ */
  function renderChrome() {
    const shop = u().shopName();

    const navRoutes = Object.keys(ROUTES).filter((h) => !ROUTES[h].offNav);
    const nav = u().el("nav", { id: "nav" }, navRoutes.map((h) =>
      u().el("a", { href: h, class: "navlink" }, [
        u().el("span", { text: t(ROUTES[h].key) }),
        u().el("span", { class: "nav-badge", id: "badge-" + h.slice(2) })
      ])
    ));

    const head = u().$("#appHead");
    head.innerHTML = "";
    head.appendChild(u().el("div", { class: "brand" }, [
      u().el("span", { class: "logo", text: "🍬" }),
      u().el("span", { class: "brand-name", text: shop })
    ]));
    head.appendChild(nav);
    head.appendChild(u().el("div", { class: "head-right" }, [
      u().el("span", { class: "conn " + (OB.db.ready ? "ok" : "bad"),
                       title: OB.db.ready ? t("connected") : t("notConnected") }),
      u().el("button", {
        class: "head-icon-btn", text: "⚙",
        title: t("navSettings"), "aria-label": t("navSettings"),
        onclick: () => { location.hash = "#/settings"; }
      }),
      u().el("button", {
        class: "lang-toggle", text: OB.i18n.lang === "pa" ? "EN" : "ਪੰ",
        title: t("language"),
        onclick: () => {
          OB.i18n.set(OB.i18n.other());
          renderChrome();
          router.mount();
        }
      })
    ]));

    u().$$("#nav a").forEach((a) =>
      a.classList.toggle("on", a.getAttribute("href") === router.current));

    renderBadges();
  }

  function renderBadges() {
    const open = store.orders.filter((o) => o.status === "new").length;
    const cooking = store.orders.filter((o) => o.status === "cooking").length;
    const b = u().$("#badge-board");
    if (b) {
      const n = open + cooking;
      b.textContent = n ? String(n) : "";
      b.classList.toggle("show", !!n);
    }
    const d = u().$("#badge-desk");
    if (d) {
      let unread = 0;
      try {
        const seen = JSON.parse(localStorage.getItem("ob_seen_events") || "[]");
        store.orders.forEach((o) => o.comments.forEach((c) => {
          if (seen.indexOf("c" + c.id) === -1) unread++;
        }));
      } catch (e) { /* ignore */ }
      d.textContent = unread ? String(unread) : "";
      d.classList.toggle("show", !!unread);
    }
  }

  /* ============================================================
     Boot
     ============================================================ */
  /* Fill the <datalist> the order form uses for item autocomplete,
     with both the English and Punjabi name of every catalog item. */
  function buildItemDatalist() {
    const dl = u().$("#ob-items");
    if (!dl) return;
    dl.innerHTML = "";
    OB.catalog.sweets.forEach((s) => {
      dl.appendChild(u().el("option", { value: s.en, label: s.pa }));
      if (s.pa) dl.appendChild(u().el("option", { value: s.pa, label: s.en }));
    });
  }

  async function boot() {
    OB.i18n.set(OB.i18n.lang);
    buildItemDatalist();
    if (localStorage.getItem("ob_tv") === "1") document.body.classList.add("tv");

    const ok = OB.db.init();

    // Who is at this screen? Everything below depends on it: with the login
    // gate on, the database will refuse these reads until we have a session.
    if (ok) await OB.auth.restore();
    const locked = ok && OB.auth.gateActive();

    if (ok && !locked) {
      await OB.db.loadAppConfig();
      OB.db.startLive();
      OB.db.onChange(u().debounce(() => store.refresh(), 400));
      await store.refresh();
      OB.db.flushQueue();
      // retry queued writes whenever the network comes back
      window.addEventListener("online", () => OB.db.flushQueue());
    }

    renderChrome();
    window.addEventListener("hashchange", () => router.mount());
    if (!location.hash || !ROUTES[location.hash]) {
      location.hash = ok ? "#/board" : "#/settings";
    }
    router.mount();

    if (!ok) {
      u().toast(t("setupNeeded"), "warn", 8000);
    }

    // first tap anywhere unlocks audio on iPad / Safari
    const unlock = () => { u().beep(0); document.removeEventListener("pointerdown", unlock); };
    document.addEventListener("pointerdown", unlock, { once: true });
  }

  OB.store = store;
  OB.router = router;
  OB.app = { renderChrome: renderChrome, boot: boot };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
