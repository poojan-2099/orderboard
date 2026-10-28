/* OrderBoard — small shared helpers: formatting, toasts, modals, sound. */
(function () {
  const OB = (window.OB = window.OB || {});

  // Always-English months, for messages that leave the app (WhatsApp, CSV)
  const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];

  const util = {
    /* ---------- DOM ---------- */
    el(tag, attrs, children) {
      const n = document.createElement(tag);
      if (attrs) for (const k in attrs) {
        if (k === "class") n.className = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function")
          n.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined)
          n.setAttribute(k, attrs[k]);
      }
      (children || []).forEach((c) => {
        if (c === null || c === undefined || c === false) return;
        n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
      return n;
    },

    esc(s) {
      return String(s === null || s === undefined ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

    /* ---------- this screen's name, for "who did what" ---------- */
    station() { return localStorage.getItem("ob_station") || "Front Desk"; },

    /* The shop name, from the database when we have it. Before sign-in the
       database will not tell us anything, so config.js carries a copy purely
       so the sign-in screen and the header are not blank. */
    shopName() {
      const fromDb = OB.db && OB.db.appConfig && OB.db.appConfig.shop_name;
      const fromCfg = (typeof OB_CONFIG !== "undefined" && OB_CONFIG.SHOP_NAME) || "";
      return fromDb || fromCfg || OB.i18n.t("appName");
    },
    setStation(v) { localStorage.setItem("ob_station", v); },

    /* ---------- dates ---------- */
    todayISO() {
      const d = new Date();
      return [d.getFullYear(),
              String(d.getMonth() + 1).padStart(2, "0"),
              String(d.getDate()).padStart(2, "0")].join("-");
    },

    /* "2026-10-28" -> a real local Date (avoids UTC off-by-one) */
    parseDate(iso) {
      if (!iso) return null;
      const p = String(iso).split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]);
    },

    /* "28 Oct" / "28 ਅਕਤੂਬਰ", or Today/Tomorrow when close.
       opts.lang forces a language (the WhatsApp message is always English). */
    fmtDate(iso, opts) {
      const d = this.parseDate(iso);
      if (!d) return "";
      const forced = opts && opts.lang;
      const days = Math.round((d - this.parseDate(this.todayISO())) / 86400000);
      if (!(opts && opts.absolute)) {
        if (days === 0) return forced === "en" ? "Today"    : OB.i18n.t("today");
        if (days === 1) return forced === "en" ? "Tomorrow" : OB.i18n.t("tomorrow");
      }
      const m = forced === "en" ? EN_MONTHS[d.getMonth()] : OB.i18n.months()[d.getMonth()];
      const base = d.getDate() + " " + m;
      return (opts && opts.withYear) ? base + " " + d.getFullYear() : base;
    },

    /* "15:30" -> "3:30 PM" */
    fmtTime(t) {
      if (!t) return "";
      const p = String(t).split(":");
      let h = +p[0];
      const mm = p[1] || "00";
      const ap = h >= 12 ? "PM" : "AM";
      h = h % 12; if (h === 0) h = 12;
      return h + ":" + mm + " " + ap;
    },

    fmtDateTime(ts) {
      if (!ts) return "";
      const d = new Date(ts);
      const m = OB.i18n.months()[d.getMonth()];
      return d.getDate() + " " + m + ", " + this.fmtTime(
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
    },

    /* Has the due date/time already passed? */
    isOverdue(order) {
      if (order.status === "done" || order.status === "cancelled") return false;
      const d = this.parseDate(order.due_date);
      if (!d) return false;
      if (order.due_time) {
        const p = String(order.due_time).split(":");
        d.setHours(+p[0], +p[1] || 0, 0, 0);
      } else {
        d.setHours(23, 59, 59, 999);
      }
      return d.getTime() < Date.now();
    },

    /* Rough "2h left" / "3 days left" badge */
    dueIn(order) {
      const d = this.parseDate(order.due_date);
      if (!d) return "";
      if (order.due_time) {
        const p = String(order.due_time).split(":");
        d.setHours(+p[0], +p[1] || 0, 0, 0);
      } else { d.setHours(23, 59, 0, 0); }
      const mins = Math.round((d - Date.now()) / 60000);
      const pa = OB.i18n.lang === "pa";
      if (mins < 0) return OB.i18n.t("overdue");
      if (mins < 60) return pa ? mins + " ਮਿਨਟ" : mins + " min";
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return pa ? hrs + " ਘੰਟੇ" : hrs + " hr";
      const days = Math.round(hrs / 24);
      return pa ? days + " ਦਿਨ" : days + " days";
    },

    /* 50 -> "50", 50.5 -> "50.5" */
    fmtQty(q) {
      const n = Number(q);
      if (!isFinite(n)) return String(q);
      return (n % 1 === 0) ? String(n) : String(parseFloat(n.toFixed(2)));
    },

    /* ---------- toast ---------- */
    toast(msg, kind, ms) {
      let host = this.$("#ob-toasts");
      if (!host) {
        host = this.el("div", { id: "ob-toasts", class: "toasts" });
        document.body.appendChild(host);
      }
      const t = this.el("div", { class: "toast toast-" + (kind || "info"), text: msg });
      host.appendChild(t);
      setTimeout(() => {
        t.classList.add("out");
        setTimeout(() => t.remove(), 300);
      }, ms || 3200);
    },

    /* ---------- modal ---------- */
    modal(title, bodyNode, actions) {
      const back = this.el("div", { class: "modal-back" });
      const foot = this.el("div", { class: "modal-foot" });
      const close = () => back.remove();
      (actions || []).forEach((a) => {
        foot.appendChild(this.el("button", {
          class: "btn " + (a.class || "btn-ghost"),
          text: a.label,
          onclick: () => { const r = a.onClick && a.onClick(close); if (r !== false && !a.keepOpen) close(); }
        }));
      });
      const box = this.el("div", { class: "modal" }, [
        this.el("div", { class: "modal-head" }, [
          this.el("h3", { text: title }),
          this.el("button", { class: "modal-x", text: "×", onclick: close })
        ]),
        this.el("div", { class: "modal-body" }, [bodyNode]),
        foot
      ]);
      back.appendChild(box);
      back.addEventListener("click", (e) => { if (e.target === back) close(); });
      document.body.appendChild(back);
      const f = box.querySelector("input,textarea,select");
      if (f) setTimeout(() => f.focus(), 50);
      return close;
    },

    /* ---------- sound (no audio files needed) ---------- */
    beep(times) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this._ctx = this._ctx || new Ctx();
        const ctx = this._ctx;
        if (ctx.state === "suspended") ctx.resume();
        const n = times || 2;
        for (let i = 0; i < n; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = i % 2 === 0 ? 880 : 1180;
          g.gain.value = 0.0001;
          o.connect(g); g.connect(ctx.destination);
          const t0 = ctx.currentTime + i * 0.28;
          g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
          o.start(t0); o.stop(t0 + 0.26);
        }
      } catch (e) { /* audio blocked until user interacts — fine */ }
    },

    /* ---------- CSV ---------- */
    downloadCsv(filename, rows) {
      const body = rows.map((r) => r.map((c) => {
        const s = String(c === null || c === undefined ? "" : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",")).join("\n");
      // BOM so Excel reads Gurmukhi correctly
      const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
      const a = this.el("a", { href: URL.createObjectURL(blob), download: filename });
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },

    debounce(fn, ms) {
      let h;
      return function () {
        const args = arguments, self = this;
        clearTimeout(h);
        h = setTimeout(() => fn.apply(self, args), ms || 250);
      };
    }
  };

  OB.util = util;
})();
