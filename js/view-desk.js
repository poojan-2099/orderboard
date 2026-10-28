/* OrderBoard — front desk screen.
   Shows ongoing orders, surfaces kitchen comments loudly, and acts as the
   backstop for WhatsApp: if the kitchen device could not send the message,
   this screen retries it. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  let host = null;
  let backstopTimer = null;

  /* Which comments and completions this device has already announced. */
  const SEEN_KEY = "ob_seen_events";
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch (e) { return []; } }
  function markSeen(ids) {
    const s = seen().concat(ids);
    localStorage.setItem(SEEN_KEY, JSON.stringify(s.slice(-400)));
  }

  function render(container) {
    host = container;
    host.innerHTML = "";
    host.appendChild(u().el("div", { class: "page" }, [
      u().el("div", { class: "page-head" }, [
        u().el("h2", { text: t("deskTitle") }),
        u().el("div", { class: "page-head-right" }, [
          u().el("button", {
            class: "btn btn-ghost", id: "seenBtn", text: t("markSeen"),
            onclick: () => {
              markSeen(allEventIds());
              draw();
            }
          }),
          u().el("button", {
            class: "btn btn-ghost", text: "🔔",
            title: "Enable browser alerts",
            onclick: async () => {
              const ok = await OB.notify.askBrowserPermission();
              u().beep(1);
              u().toast(ok ? "Alerts on" : "Alerts blocked", ok ? "success" : "warn");
            }
          })
        ])
      ]),
      u().el("div", { id: "deskBody" })
    ]));

    if (backstopTimer) clearInterval(backstopTimer);
    backstopTimer = setInterval(whatsappBackstop, 45000);

    draw();
  }

  function allEventIds() {
    const ids = [];
    OB.store.orders.forEach((o) => {
      o.comments.forEach((c) => ids.push("c" + c.id));
      if (o.status === "done") ids.push("d" + o.id);
    });
    return ids;
  }

  function draw() {
    const body = u().$("#deskBody", host);
    if (!body) return;

    const all = OB.store.orders;
    const ongoing = all.filter((o) => o.status === "new" || o.status === "cooking");
    const doneToday = all.filter((o) => o.status === "done" && o.completed_at &&
      new Date(o.completed_at).toDateString() === new Date().toDateString())
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

    const seenSet = seen();
    const unread = [];
    ongoing.concat(doneToday).forEach((o) => {
      o.comments.forEach((c) => { if (seenSet.indexOf("c" + c.id) === -1) unread.push({ o: o, c: c }); });
    });

    body.innerHTML = "";

    /* --- unread kitchen notes banner --- */
    if (unread.length) {
      body.appendChild(u().el("div", { class: "alert-banner" }, [
        u().el("div", { class: "alert-title",
          text: "💬 " + unread.length + " " + t("newComments") }),
        u().el("div", { class: "alert-list" }, unread.slice(-5).map((x) =>
          u().el("div", { class: "alert-item" }, [
            u().el("strong", { text: "#" + x.o.order_no + " " + (x.o.customer_name || "") }),
            u().el("span", { text: " — " + x.c.body }),
            u().el("span", { class: "muted small", text: "  (" + (x.c.author || "") + ")" })
          ])
        ))
      ]));
    }

    /* --- ongoing --- */
    body.appendChild(section(t("ongoing"), ongoing.length, ongoing.length
      ? ongoing.map((o) => deskRow(o, seenSet))
      : [u().el("div", { class: "empty", text: t("noOrders") })]));

    /* --- completed today --- */
    body.appendChild(section(t("completedToday"), doneToday.length, doneToday.length
      ? doneToday.map((o) => deskRow(o, seenSet))
      : [u().el("div", { class: "empty", text: "—" })]));
  }

  function section(title, count, children) {
    return u().el("div", { class: "section" }, [
      u().el("div", { class: "section-head" }, [
        u().el("h3", { text: title }),
        u().el("span", { class: "pill", text: String(count) })
      ]),
      u().el("div", { class: "desk-list" }, children)
    ]);
  }

  function deskRow(o, seenSet) {
    const lang = OB.i18n.lang;
    const overdue = u().isOverdue(o);
    const newNotes = o.comments.filter((c) => seenSet.indexOf("c" + c.id) === -1);

    const cls = ["desk-row", "st-" + o.status];
    if (overdue) cls.push("overdue");
    if (o.urgent) cls.push("urgent");

    return u().el("div", { class: cls.join(" ") }, [
      u().el("div", { class: "dr-left" }, [
        u().el("div", { class: "dr-no", text: "#" + o.order_no }),
        u().el("div", { class: "badge badge-" + o.status, text: OB.i18n.statusLabel(o.status) })
      ]),

      u().el("div", { class: "dr-mid" }, [
        u().el("div", { class: "dr-cust" }, [
          u().el("strong", { text: o.customer_name || "-" }),
          o.order_name ? u().el("span", { class: "muted", text: " · " + o.order_name }) : null,
          o.customer_phone ? u().el("a", {
            class: "muted small phone-link", href: "tel:" + o.customer_phone,
            text: " ☎ " + o.customer_phone
          }) : null
        ]),
        u().el("div", { class: "dr-items", text: (o.items || []).map((i) =>
          u().fmtQty(i.qty) + " " + OB.catalog.unitLabel(i.unit, lang) + " " +
          OB.catalog.itemLabel(i, lang)).join(", ") }),
        newNotes.length
          ? u().el("div", { class: "dr-note new" }, [
              u().el("span", { class: "dot" }),
              u().el("span", { text: newNotes[newNotes.length - 1].body }),
              u().el("span", { class: "muted small",
                text: " — " + (newNotes[newNotes.length - 1].author || "") })
            ])
          : (o.comments.length
              ? u().el("div", { class: "dr-note" , text: "💬 " + o.comments[o.comments.length - 1].body })
              : null)
      ]),

      u().el("div", { class: "dr-right" }, [
        u().el("div", { class: "dr-due" + (overdue ? " bad" : ""),
          text: t("due") + ": " + u().fmtDate(o.due_date) +
                (o.due_time ? " " + u().fmtTime(o.due_time) : "") }),
        o.status === "done" ? waCell(o) : null
      ])
    ]);
  }

  /* The WhatsApp corner of a finished order.

     In "off" mode nothing sends by itself, so the only control is the wa.me
     link — tapping it opens WhatsApp with the message already written, and we
     stamp the order as sent so the row settles to a tick instead of nagging
     forever. With a real sender configured, the retry button comes back. */
  function waCell(o) {
    if (o.whatsapp_sent_at) {
      return u().el("div", { class: "dr-wa" }, [
        u().el("span", { class: "ok-text", text: "✓ " + t("waSent") })
      ]);
    }

    const tap = OB.notify.tapOnly();
    const link = u().el("a", {
      class: "btn btn-sm " + (tap ? "btn-primary" : "btn-ghost"),
      target: "_blank", rel: "noopener",
      href: OB.notify.waMeLink(o),
      text: tap ? "📲 " + t("openWhatsApp") : t("openWhatsApp"),
      onclick: () => {
        if (!tap || !OB.db.ready) return;
        // Let the link open first, then record it.
        setTimeout(async () => {
          try {
            await OB.db.markWhatsappSent(o.id, "Sent by hand from Front Desk");
            await OB.store.refresh();
          } catch (e) { console.warn("[OB] could not stamp whatsapp_sent_at", e); }
        }, 0);
      }
    });

    const kids = [];
    if (!tap) {
      kids.push(u().el("button", {
        class: "btn btn-sm btn-primary", text: t("resendWa"),
        onclick: async (e) => {
          e.target.disabled = true;
          const ok = await OB.notify.sendOrderDone(o);
          u().toast(ok ? t("waSent") : t("waNotSent"), ok ? "success" : "error");
          await OB.store.refresh();
        }
      }));
    }
    kids.push(link);
    return u().el("div", { class: "dr-wa" }, kids);
  }

  /* ---------- announce new things on this device ---------- */

  function announce() {
    if (!host || !u().$("#deskBody", host)) return;
    const seenSet = seen();
    const fresh = [];
    OB.store.orders.forEach((o) => {
      o.comments.forEach((c) => {
        if (seenSet.indexOf("c" + c.id) === -1) fresh.push({ kind: "comment", o: o, c: c });
      });
      if (o.status === "done" && seenSet.indexOf("d" + o.id) === -1) {
        fresh.push({ kind: "done", o: o });
      }
    });
    if (!fresh.length) return;

    // Only chime for things that just happened (avoid a wall of noise on first load)
    const recent = fresh.filter((x) => {
      const ts = x.kind === "done" ? x.o.completed_at : x.c.created_at;
      return ts && (Date.now() - new Date(ts).getTime()) < 10 * 60 * 1000;
    });

    if (recent.length) {
      u().beep(recent.some((x) => x.kind === "done") ? 3 : 2);
      const x = recent[recent.length - 1];
      if (x.kind === "done") {
        OB.notify.browserAlert("✅ Order #" + x.o.order_no + " done",
                               (x.o.customer_name || "") + " — ready");
      } else {
        OB.notify.browserAlert("💬 #" + x.o.order_no + " " + (x.o.customer_name || ""),
                               x.c.body);
      }
    }

    // mark completions seen immediately; leave comments unread until acknowledged
    markSeen(fresh.filter((x) => x.kind === "done").map((x) => "d" + x.o.id));
  }

  /* If the kitchen tablet failed to reach CallMeBot, try again from here. */
  async function whatsappBackstop() {
    if (!OB.notify.configured() || !OB.db.ready) return;
    const pending = OB.store.orders.filter((o) =>
      o.status === "done" && !o.whatsapp_sent_at && o.completed_at &&
      (Date.now() - new Date(o.completed_at).getTime()) > 60 * 1000);
    for (const o of pending) {
      const ok = await OB.notify.sendOrderDone(o);
      if (ok) console.log("[OB] whatsapp backstop sent for #" + o.order_no);
    }
    if (pending.length) await OB.store.refresh();
  }

  function destroy() {
    if (backstopTimer) { clearInterval(backstopTimer); backstopTimer = null; }
  }

  OB.views = OB.views || {};
  OB.views.desk = { render: render, draw: draw, announce: announce, destroy: destroy };
})();
