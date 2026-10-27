/* OrderBoard — order history: filter, search, inspect, export. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  let host = null;
  let rows = [];
  let filters = null;

  function defaultFilters() {
    const to = u().todayISO();
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const from = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
                  String(d.getDate()).padStart(2, "0")].join("-");
    return { from: from, to: to, status: "all", q: "" };
  }

  function render(container) {
    host = container;
    filters = filters || defaultFilters();
    host.innerHTML = "";

    const statusSel = u().el("select", { class: "input", id: "fStatus" },
      [["all", t("all")], ["new", t("stNew")], ["cooking", t("stCooking")],
       ["done", t("stDone")], ["cancelled", t("stCancelled")]].map(([v, label]) =>
        u().el("option", Object.assign({ value: v }, filters.status === v ? { selected: "selected" } : {}),
               [label])));

    host.appendChild(u().el("div", { class: "page" }, [
      u().el("div", { class: "page-head" }, [u().el("h2", { text: t("logTitle") })]),

      u().el("div", { class: "card filters" }, [
        fld(t("from"), u().el("input", { class: "input", type: "date", id: "fFrom", value: filters.from })),
        fld(t("to"),   u().el("input", { class: "input", type: "date", id: "fTo", value: filters.to })),
        fld(t("status"), statusSel),
        fld(t("search"), u().el("input", {
          class: "input", type: "search", id: "fQ", value: filters.q,
          placeholder: OB.i18n.lang === "pa" ? "ਨਾਂ, ਨੰਬਰ, ਮਿਠਾਈ…" : "name, number, item…"
        })),
        u().el("div", { class: "filter-actions" }, [
          u().el("button", { class: "btn btn-primary", text: t("search"), onclick: load }),
          u().el("button", { class: "btn btn-ghost", text: "⬇ " + t("exportCsv"), onclick: exportCsv })
        ])
      ]),

      u().el("div", { id: "logBody" }, [u().el("div", { class: "empty", text: t("loading") })])
    ]));

    // live search as you type
    const q = u().$("#fQ", host);
    q.addEventListener("input", u().debounce(() => { readFilters(); drawRows(); }, 300));
    [u().$("#fFrom", host), u().$("#fTo", host), u().$("#fStatus", host)]
      .forEach((n) => n.addEventListener("change", load));

    load();
  }

  function fld(label, control) {
    return u().el("label", { class: "field" }, [
      u().el("span", { class: "label", text: label }), control
    ]);
  }

  function readFilters() {
    filters = {
      from: u().$("#fFrom", host).value || filters.from,
      to:   u().$("#fTo", host).value   || filters.to,
      status: u().$("#fStatus", host).value,
      q: u().$("#fQ", host).value
    };
  }

  async function load() {
    readFilters();
    const body = u().$("#logBody", host);
    body.innerHTML = "";
    body.appendChild(u().el("div", { class: "empty", text: t("loading") }));
    try {
      rows = await OB.db.fetchRange({ from: filters.from, to: filters.to, status: filters.status });
      drawRows();
    } catch (e) {
      console.error(e);
      body.innerHTML = "";
      body.appendChild(u().el("div", { class: "empty", text: t("errSave") }));
    }
  }

  function visibleRows() {
    const n = (filters.q || "").trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((o) =>
      String(o.order_no).includes(n) ||
      (o.customer_name || "").toLowerCase().includes(n) ||
      (o.order_name || "").toLowerCase().includes(n) ||
      (o.customer_phone || "").includes(n) ||
      o.items.some((i) => (i.item_en || "").toLowerCase().includes(n) ||
                          (i.item_pa || "").includes(n)));
  }

  function drawRows() {
    const body = u().$("#logBody", host);
    const list = visibleRows();
    body.innerHTML = "";

    if (!list.length) {
      body.appendChild(u().el("div", { class: "empty", text: t("noResults") }));
      return;
    }

    const lang = OB.i18n.lang;
    const table = u().el("table", { class: "table" }, [
      u().el("thead", {}, [u().el("tr", {}, [
        u().el("th", { text: t("orderNo") }),
        u().el("th", { text: t("customer") }),
        u().el("th", { text: t("items") }),
        u().el("th", { text: t("dueDate") }),
        u().el("th", { text: t("status") }),
        u().el("th", { text: t("completed") }),
        u().el("th", { text: "" })
      ])]),
      u().el("tbody", {}, list.map((o) =>
        u().el("tr", { class: o.urgent ? "urgent-row" : "" }, [
          u().el("td", { class: "mono", text: "#" + o.order_no }),
          u().el("td", {}, [
            u().el("div", { text: o.customer_name || "-" }),
            o.order_name ? u().el("div", { class: "muted small", text: o.order_name }) : null
          ]),
          u().el("td", { class: "cell-items", text: (o.items || []).map((i) =>
            u().fmtQty(i.qty) + " " + OB.catalog.unitLabel(i.unit, lang) + " " +
            OB.catalog.itemLabel(i, lang)).join(", ") }),
          u().el("td", { text: u().fmtDate(o.due_date, { absolute: true }) +
                               (o.due_time ? " " + u().fmtTime(o.due_time) : "") }),
          u().el("td", {}, [u().el("span", { class: "badge badge-" + o.status,
                                             text: OB.i18n.statusLabel(o.status) })]),
          u().el("td", { class: "muted small", text: o.completed_at ? u().fmtDateTime(o.completed_at) : "—" }),
          u().el("td", { class: "row-actions" }, [
            u().el("button", { class: "btn btn-sm btn-ghost", text: t("details"),
                               onclick: () => detail(o) }),
            u().el("button", { class: "btn btn-sm btn-ghost", text: t("edit"),
                               onclick: () => OB.router.go("#/new", o) }),
            u().el("button", { class: "btn btn-sm btn-ghost danger", text: t("del"),
                               onclick: () => confirmDelete(o) })
          ])
        ])
      ))
    ]);

    body.appendChild(u().el("div", { class: "card table-wrap" }, [table]));
    body.appendChild(u().el("div", { class: "muted small result-count",
      text: list.length + (OB.i18n.lang === "pa" ? " ਆਰਡਰ" : " orders") }));
  }

  /* ---------- detail drawer ---------- */

  function detail(o) {
    const lang = OB.i18n.lang;
    const body = u().el("div", { class: "detail" }, [
      u().el("div", { class: "detail-grid" }, [
        kv(t("customer"), o.customer_name),
        kv(t("customerPhone"), o.customer_phone || "—"),
        kv(t("orderName"), o.order_name || "—"),
        kv(t("orderDate"), u().fmtDate(o.order_date, { absolute: true, withYear: true })),
        kv(t("dueDate"), u().fmtDate(o.due_date, { absolute: true, withYear: true }) +
                         (o.due_time ? " " + u().fmtTime(o.due_time) : "")),
        kv(t("status"), OB.i18n.statusLabel(o.status)),
        kv(t("created"), u().fmtDateTime(o.created_at) + (o.created_by ? " · " + o.created_by : "")),
        kv(t("completed"), o.completed_at
          ? u().fmtDateTime(o.completed_at) + (o.completed_by ? " · " + o.completed_by : "")
          : "—"),
        kv("WhatsApp", o.whatsapp_sent_at ? "✓ " + u().fmtDateTime(o.whatsapp_sent_at) : "—")
      ]),

      u().el("h4", { text: t("items") }),
      u().el("ul", { class: "detail-items" }, (o.items || []).map((i) =>
        u().el("li", { text: u().fmtQty(i.qty) + " " + OB.catalog.unitLabel(i.unit, lang) + "  " +
                             OB.catalog.itemLabel(i, lang) + (i.note ? "  (" + i.note + ")" : "") }))),

      o.notes ? u().el("div", { class: "detail-notes", text: "📝 " + o.notes }) : null,

      u().el("h4", { text: t("history") }),
      u().el("div", { class: "timeline" }, (o.events || []).map((e) =>
        u().el("div", { class: "tl-item tl-" + e.kind }, [
          u().el("span", { class: "tl-time", text: u().fmtDateTime(e.created_at) }),
          u().el("span", { class: "tl-kind", text: e.kind }),
          u().el("span", { class: "tl-body", text: e.body || "" }),
          u().el("span", { class: "tl-who", text: e.author || "" })
        ])))
    ]);

    u().modal("#" + o.order_no + " · " + t("details"), body,
              [{ label: t("close"), class: "btn-primary" }]);
  }

  function kv(k, v) {
    return u().el("div", { class: "kv" }, [
      u().el("span", { class: "k", text: k }),
      u().el("span", { class: "v", text: v === null || v === undefined ? "—" : String(v) })
    ]);
  }

  /* ---------- delete ---------- */

  function confirmDelete(o) {
    const input = u().el("input", { class: "input", type: "text", placeholder: String(o.order_no) });
    const body = u().el("div", {}, [
      u().el("p", { text: t("delConfirm") + " " + o.order_no }),
      u().el("p", { class: "muted small",
        text: (o.customer_name || "") + " — " + (o.items || []).length + " " + t("items") }),
      input
    ]);
    u().modal(t("del") + " #" + o.order_no, body, [
      { label: t("cancel"), class: "btn-ghost" },
      {
        label: t("del"), class: "btn-danger", keepOpen: true,
        onClick: async (close) => {
          if (input.value.trim() !== String(o.order_no)) {
            u().toast(t("delConfirm"), "error");
            return false;
          }
          try {
            await OB.db.deleteOrder(o.id);
            u().toast(t("saved"), "success");
            close();
            await load();
            OB.store.refresh();
          } catch (e) {
            u().toast(t("errSave"), "error");
          }
        }
      }
    ]);
  }

  /* ---------- export ---------- */

  function exportCsv() {
    const lang = OB.i18n.lang;
    const list = visibleRows();
    const head = ["Order #", "Order date", "Due date", "Due time", "Customer", "Phone",
                  "Order name", "Items (EN)", "Items (PA)", "Qty total", "Status",
                  "Urgent", "Created", "Created by", "Completed", "Completed by",
                  "WhatsApp sent", "Comments", "Notes"];
    const body = list.map((o) => [
      o.order_no, o.order_date, o.due_date, o.due_time || "",
      o.customer_name, o.customer_phone || "", o.order_name || "",
      (o.items || []).map((i) => u().fmtQty(i.qty) + " " + i.unit + " " + (i.item_en || "")).join("; "),
      (o.items || []).map((i) => u().fmtQty(i.qty) + " " + i.unit + " " + (i.item_pa || "")).join("; "),
      (o.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0),
      o.status, o.urgent ? "yes" : "",
      o.created_at || "", o.created_by || "",
      o.completed_at || "", o.completed_by || "",
      o.whatsapp_sent_at || "",
      (o.comments || []).map((c) => (c.author || "") + ": " + c.body).join(" | "),
      o.notes || ""
    ]);
    u().downloadCsv("orderboard-" + filters.from + "-to-" + filters.to + ".csv",
                    [head].concat(body));
  }

  OB.views = OB.views || {};
  OB.views.log = { render: render, reload: load };
})();
