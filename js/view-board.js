/* OrderBoard — kitchen display. Big type, three columns, touch friendly.
   This is the screen that goes on the TV / mirrored iPad. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  let host = null;
  let clockTimer = null;

  const COLUMNS = [
    { status: "new",     key: "stNew",     cls: "col-new" },
    { status: "cooking", key: "stCooking", cls: "col-cooking" },
    { status: "done",    key: "stDone",    cls: "col-done" }
  ];

  function render(container) {
    host = container;
    host.innerHTML = "";

    host.appendChild(u().el("div", { class: "board-wrap", id: "boardWrap" }, [
      u().el("div", { class: "board-head" }, [
        u().el("h2", { class: "board-title", text: t("boardTitle") }),
        u().el("div", { class: "board-head-right" }, [
          u().el("span", { class: "clock", id: "boardClock" }),
          u().el("button", {
            class: "btn btn-ghost", id: "tvBtn", text: t("tvMode"),
            onclick: toggleTv
          })
        ])
      ]),
      u().el("div", { class: "board-cols", id: "boardCols" })
    ]));

    tick();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tick, 20000);   // refresh clock + "due in" badges

    draw();
  }

  function tick() {
    const c = u().$("#boardClock", host);
    if (!c) return;
    const d = new Date();
    c.textContent = u().fmtTime(
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
    // keep "2 hr left" badges honest without a full redraw
    if (u().$("#boardCols", host)) draw();
  }

  function toggleTv() {
    const on = document.body.classList.toggle("tv");
    localStorage.setItem("ob_tv", on ? "1" : "0");
    const b = u().$("#tvBtn", host);
    if (b) b.textContent = on ? t("exitTv") : t("tvMode");
    if (on) {
      // give the kitchen the whole screen if the browser allows it
      const r = document.documentElement.requestFullscreen;
      if (r) r.call(document.documentElement).catch(() => {});
      u().beep(1);   // also unlocks audio for later new-order beeps
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function draw() {
    const cols = u().$("#boardCols", host);
    if (!cols) return;

    const all = OB.store.orders;
    const scrolls = {};
    u().$$(".board-col-body", cols).forEach((n, i) => { scrolls[i] = n.scrollTop; });

    cols.innerHTML = "";

    COLUMNS.forEach((col, ci) => {
      let list = all.filter((o) => o.status === col.status);

      if (col.status === "done") {
        // only today's finished orders, newest first — keeps the column short
        list = list
          .filter((o) => o.completed_at &&
                  new Date(o.completed_at).toDateString() === new Date().toDateString())
          .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
      } else {
        list = list.sort(byUrgency);
      }

      const body = u().el("div", { class: "board-col-body" },
        list.length
          ? list.map((o) => card(o))
          : [u().el("div", { class: "empty", text: t("noOrders") })]);

      cols.appendChild(u().el("div", { class: "board-col " + col.cls }, [
        u().el("div", { class: "board-col-head" }, [
          u().el("span", { class: "col-name", text: t(col.key) }),
          u().el("span", { class: "col-count", text: String(list.length) })
        ]),
        body
      ]));

      if (scrolls[ci]) body.scrollTop = scrolls[ci];
    });
  }

  function byUrgency(a, b) {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const ao = u().isOverdue(a), bo = u().isOverdue(b);
    if (ao !== bo) return ao ? -1 : 1;
    const ad = a.due_date + " " + (a.due_time || "23:59");
    const bd = b.due_date + " " + (b.due_time || "23:59");
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a.order_no - b.order_no;
  }

  /* ---------- one order card ---------- */

  function card(o) {
    const lang = OB.i18n.lang;
    const overdue = u().isOverdue(o);
    const lastComment = o.comments.length ? o.comments[o.comments.length - 1] : null;

    const classes = ["ocard"];
    if (overdue) classes.push("overdue");
    if (o.urgent) classes.push("urgent");
    if (o.status === "done") classes.push("is-done");

    return u().el("div", { class: classes.join(" ") }, [

      /* header: number + due */
      u().el("div", { class: "ocard-top" }, [
        u().el("span", { class: "ono", text: "#" + o.order_no }),
        u().el("span", { class: "odue" + (overdue ? " bad" : "") }, [
          u().el("span", { class: "odue-date",
            text: u().fmtDate(o.due_date) + (o.due_time ? " · " + u().fmtTime(o.due_time) : "") }),
          o.status !== "done"
            ? u().el("span", { class: "odue-in" + (overdue ? " bad" : ""), text: u().dueIn(o) })
            : null
        ])
      ]),

      /* customer */
      u().el("div", { class: "ocust" }, [
        u().el("span", { class: "ocust-name", text: o.customer_name || "-" }),
        o.order_name ? u().el("span", { class: "ocust-sub", text: o.order_name }) : null
      ]),

      /* the items — the most important thing on this screen */
      u().el("ul", { class: "oitems" }, (o.items || []).map((i) =>
        u().el("li", {}, [
          u().el("span", { class: "iqty", text: u().fmtQty(i.qty) + " " + OB.catalog.unitLabel(i.unit, lang) }),
          u().el("span", { class: "iname", text: OB.catalog.itemLabel(i, lang) }),
          i.note ? u().el("span", { class: "inote", text: i.note }) : null
        ])
      )),

      /* order-level note from the front desk */
      o.notes ? u().el("div", { class: "onotes", text: "📝 " + o.notes }) : null,

      /* latest kitchen comment */
      lastComment
        ? u().el("div", { class: "ocomment" }, [
            u().el("span", { class: "ocomment-label", text: t("lastComment") + ":" }),
            u().el("span", { class: "ocomment-body", text: lastComment.body }),
            u().el("span", { class: "ocomment-meta",
              text: (lastComment.author || "") + " · " + u().fmtDateTime(lastComment.created_at) }),
            o.comments.length > 1
              ? u().el("button", {
                  class: "link-btn", text: "+" + (o.comments.length - 1),
                  onclick: () => showAllComments(o)
                })
              : null
          ])
        : null,

      /* actions */
      u().el("div", { class: "ocard-actions" },
        o.status === "new" ? [
          bigBtn(t("start"), "btn-start", () => setStatus(o, "cooking")),
          bigBtn(t("comment"), "btn-note", () => commentModal(o)),
          bigBtn(t("markDone"), "btn-done", () => setStatus(o, "done"))
        ] : o.status === "cooking" ? [
          bigBtn(t("markDone"), "btn-done btn-grow", () => setStatus(o, "done")),
          bigBtn(t("comment"), "btn-note", () => commentModal(o))
        ] : [
          u().el("span", { class: "done-stamp",
            text: "✓ " + u().fmtDateTime(o.completed_at) +
                  (o.completed_by ? " · " + o.completed_by : "") }),
          bigBtn(t("reopen"), "btn-ghost", () => setStatus(o, "cooking"))
        ]
      )
    ]);
  }

  function bigBtn(label, cls, onClick) {
    return u().el("button", { class: "btn btn-big " + cls, text: label, onclick: onClick });
  }

  /* ---------- actions ---------- */

  async function setStatus(o, status) {
    try {
      await OB.db.setStatus(o.id, status, u().station());
      if (status === "done") {
        u().beep(1);
        const fresh = (await OB.db.fetchOne(o.id)) || o;
        const sent = await OB.notify.sendOrderDone(fresh);
        u().toast(sent ? t("waSent") : (OB.notify.configured() ? t("waNotSent") : t("stDone")),
                  sent ? "success" : "info");
      }
      await OB.store.refresh();
    } catch (e) {
      console.error(e);
      OB.db.queue("setStatus", [o.id, status, u().station()]);
      u().toast(t("offline"), "warn");
    }
  }

  function commentModal(o) {
    const lang = OB.i18n.lang;
    const ta = u().el("textarea", {
      class: "input", rows: 3, placeholder: t("commentPh"), id: "cmtBody"
    });
    const nameInput = u().el("input", {
      class: "input", type: "text", value: u().station(), id: "cmtAuthor"
    });

    const chips = u().el("div", { class: "preset-chips" }, OB.i18n.presets().map((p) =>
      u().el("button", {
        type: "button", class: "chip chip-lg", text: lang === "pa" ? p.pa : p.en,
        onclick: () => {
          const txt = lang === "pa" ? p.pa : p.en;
          ta.value = ta.value ? ta.value + ". " + txt : txt;
          ta.focus();
        }
      })
    ));

    const body = u().el("div", { class: "cmt-form" }, [
      u().el("div", { class: "cmt-order", text: "#" + o.order_no + "  ·  " + (o.customer_name || "") }),
      u().el("div", { class: "field" }, [
        u().el("span", { class: "label", text: t("presets") }), chips
      ]),
      u().el("div", { class: "field" }, [
        u().el("span", { class: "label", text: t("addComment") }), ta
      ]),
      u().el("div", { class: "field" }, [
        u().el("span", { class: "label", text: t("yourName") }), nameInput
      ])
    ]);

    u().modal(t("addComment"), body, [
      { label: t("cancel"), class: "btn-ghost" },
      {
        label: t("send"), class: "btn-primary",
        onClick: async (close) => {
          const text = ta.value.trim();
          if (!text) return false;
          const who = nameInput.value.trim() || "Kitchen";
          u().setStation(who);
          try {
            await OB.db.addComment(o.id, text, who, lang);
            u().toast(t("saved"), "success");
            await OB.store.refresh();
          } catch (e) {
            OB.db.queue("addComment", [o.id, text, who, lang]);
            u().toast(t("offline"), "warn");
          }
          close();
        },
        keepOpen: true
      }
    ]);
  }

  function showAllComments(o) {
    const body = u().el("div", { class: "cmt-list" }, o.comments.map((c) =>
      u().el("div", { class: "cmt-item" }, [
        u().el("div", { class: "cmt-item-body", text: c.body }),
        u().el("div", { class: "cmt-item-meta",
          text: (c.author || "") + " · " + u().fmtDateTime(c.created_at) })
      ])
    ));
    u().modal("#" + o.order_no + " · " + t("history"), body,
              [{ label: t("close"), class: "btn-primary" }]);
  }

  function destroy() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  OB.views = OB.views || {};
  OB.views.board = { render: render, draw: draw, destroy: destroy };
})();
