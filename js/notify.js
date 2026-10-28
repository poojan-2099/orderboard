/* OrderBoard — WhatsApp notification, plus on-screen alerts.

   Three senders, picked in Settings: "edge" (Supabase Edge Function -> Meta
   WhatsApp Cloud API), "callmebot" (the old free relay), and "off", where the
   front desk taps a wa.me link instead. "off" needs no setup at all.

   How CallMeBot works: a plain GET request to their endpoint delivers a
   WhatsApp message to one pre-approved number. The endpoint does not send
   CORS headers, so the browser will not let us read the reply — we send it
   with mode:"no-cors", which still delivers the request but gives us an
   opaque response. That means "sent" here means "handed to CallMeBot",
   not "confirmed delivered". The Settings screen has a Test button that
   opens the URL in a real tab so you can see the actual reply once. */
(function () {
  const OB = (window.OB = window.OB || {});
  const ENDPOINT = "https://api.callmebot.com/whatsapp.php";

  const notify = {
    /* Which sender to use:
         "edge"      -> Supabase Edge Function -> Meta WhatsApp Cloud API
         "callmebot" -> the old free relay (kept in case their new bot opens)
         "off"       -> no automatic send; the front desk taps to send
       Stored in the database so every screen agrees. */
    provider() {
      const p = (OB.db.appConfig || {}).wa_provider;
      if (p) return p;
      // The database may not have the wa_provider column yet (it arrived with the
      // 2026-10-27 migration). Fall back to this device's own choice so picking
      // a sender works straight away.
      const local = (localStorage.getItem("ob_wa_provider") || "").trim();
      if (local) return local;
      // Still nothing: infer from whatever is configured.
      if ((OB.db.appConfig || {}).wa_function_url) return "edge";
      if (this.creds().phone && this.creds().key) return "callmebot";
      return "off";
    },

    /* True when nothing sends by itself and the front desk taps a link. */
    tapOnly() { return this.provider() === "off"; },

    functionUrl() {
      const c = OB.db.appConfig || {};
      if (c.wa_function_url) return String(c.wa_function_url).trim();
      // Default to this project's own function endpoint.
      const base = OB.db.normalizeUrl(
        localStorage.getItem("ob_sb_url") || OB_CONFIG.SUPABASE_URL || "");
      return base ? base.replace(".supabase.co", ".functions.supabase.co") + "/notify-whatsapp" : "";
    },

    /* Ask the Edge Function to send. The browser passes only an order id —
       the function looks the order up and sends to its own fixed number, so
       nothing sensitive and no message text ever travels from the client. */
    async sendViaEdge(payload) {
      const url = this.functionUrl();
      if (!url) return { ok: false, error: "No function URL configured" };
      const key = (localStorage.getItem("ob_sb_key") || OB_CONFIG.SUPABASE_ANON || "").trim();
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: key,
            Authorization: "Bearer " + key
          },
          body: JSON.stringify(payload)
        });
        let data = {};
        try { data = await r.json(); } catch (e) {}
        if (!r.ok) return { ok: false, error: data.error || ("HTTP " + r.status), raw: data };
        return Object.assign({ ok: true }, data);
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    creds() {
      const c = OB.db.appConfig || {};
      // A per-device override wins, so you can test without touching the shop config.
      return {
        phone: (localStorage.getItem("ob_wa_phone") || c.whatsapp_phone || "").trim(),
        key:   (localStorage.getItem("ob_wa_key")   || c.whatsapp_apikey || "").trim()
      };
    },

    configured() {
      const p = this.provider();
      if (p === "edge") return !!this.functionUrl();
      if (p === "callmebot") { const c = this.creds(); return !!(c.phone && c.key); }
      return false;
    },

    buildUrl(text) {
      const c = this.creds();
      return ENDPOINT +
        "?phone="  + encodeURIComponent(c.phone.replace(/[^\d+]/g, "")) +
        "&text="   + encodeURIComponent(text) +
        "&apikey=" + encodeURIComponent(c.key);
    },

    /* The message the front desk receives when an order is finished. */
    doneMessage(order) {
      const u = OB.util;
      const shop = u.shopName();
      const lines = [];
      lines.push("✅ ORDER #" + order.order_no + " DONE");
      lines.push(shop);
      lines.push("");
      lines.push("Customer: " + (order.customer_name || "-"));
      if (order.order_name) lines.push("Order: " + order.order_name);
      if (order.customer_phone) lines.push("Phone: " + order.customer_phone);
      lines.push("Due: " + u.fmtDate(order.due_date, { absolute: true, lang: "en" }) +
                 (order.due_time ? " " + u.fmtTime(order.due_time) : ""));
      lines.push("");
      lines.push("Items:");
      (order.items || []).forEach((i) => {
        lines.push("  • " + u.fmtQty(i.qty) + " " + i.unit + " " +
                   (i.item_en || i.item_pa) + (i.note ? " (" + i.note + ")" : ""));
      });
      const comments = (order.comments || []);
      if (comments.length) {
        lines.push("");
        lines.push("Kitchen notes:");
        comments.slice(-4).forEach((c) => {
          lines.push("  - " + c.body + (c.author ? " [" + c.author + "]" : ""));
        });
      }
      lines.push("");
      lines.push("Finished by: " + (order.completed_by || "kitchen"));
      return lines.join("\n");
    },

    commentMessage(order, comment) {
      return "💬 Note on ORDER #" + order.order_no +
             " (" + (order.customer_name || "-") + ")\n\n" +
             comment.body + "\n\n— " + (comment.author || "kitchen");
    },

    /* Fire-and-forget send. Returns true if the request went out. */
    async send(text) {
      if (!this.configured()) return false;
      const url = this.buildUrl(text);
      try {
        await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
        return true;
      } catch (e) {
        console.warn("[OB] whatsapp send failed", e);
        return false;
      }
    },

    /* Send the "order done" message exactly once per order. */
    async sendOrderDone(order) {
      if (order.whatsapp_sent_at) return false;
      const p = this.provider();
      if (p === "off" || !this.configured()) return false;

      if (p === "edge") {
        // The function stamps whatsapp_sent_at itself, so no second write here.
        const r = await this.sendViaEdge({ order_id: order.id });
        if (!r.ok) console.warn("[OB] whatsapp (edge) failed:", r.error, r.raw || "");
        return !!r.ok;
      }

      const ok = await this.send(this.doneMessage(order));
      if (ok) {
        try { await OB.db.markWhatsappSent(order.id); } catch (e) { console.warn(e); }
      }
      return ok;
    },

    /* A manual wa.me link — the always-works fallback if CallMeBot is down
       or not configured. Opens WhatsApp with the message pre-typed. */
    waMeLink(order) {
      const c = this.creds();
      const num = (c.phone || "").replace(/[^\d]/g, "");
      // With no number saved, wa.me still opens WhatsApp with the text ready and
      // lets the sender pick the chat. Better than a dead link.
      return "https://wa.me/" + num + "?text=" +
             encodeURIComponent(this.doneMessage(order));
    },

    /* Browser notification + sound, for the front desk screen. */
    async askBrowserPermission() {
      if (!("Notification" in window)) return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      const p = await Notification.requestPermission();
      return p === "granted";
    },

    browserAlert(title, body) {
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body: body, tag: "ob-" + Date.now() });
        }
      } catch (e) { /* ignore */ }
    }
  };

  OB.notify = notify;
})();
