/* OrderBoard — WhatsApp notification via CallMeBot, plus on-screen alerts.

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
    creds() {
      const c = OB.db.appConfig || {};
      // A per-device override wins, so you can test without touching the shop config.
      return {
        phone: (localStorage.getItem("ob_wa_phone") || c.whatsapp_phone || "").trim(),
        key:   (localStorage.getItem("ob_wa_key")   || c.whatsapp_apikey || "").trim()
      };
    },

    configured() {
      const c = this.creds();
      return !!(c.phone && c.key);
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
      const shop = (OB.db.appConfig && OB.db.appConfig.shop_name) || "Order Board";
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
      if (!this.configured()) return false;
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
