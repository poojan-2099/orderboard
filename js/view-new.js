/* OrderBoard — front desk order entry.
   Normal way: paste the customer's WhatsApp / text message, check the
   preview, press Create Order (parsing lives in js/parse.js).
   The full typing form is still there underneath for anything unusual,
   and is used on its own when editing an existing order. */
(function () {
  const OB = (window.OB = window.OB || {});
  const u = () => OB.util;
  const t = (k, a) => OB.i18n.t(k, a);

  let itemRows = [];      // working list of line items
  let editingId = null;   // set when editing an existing order
  let host = null;
  let draft = null;       // order read from the pasted message

  function blankRow() {
    return { qty: "", unit: "lb", item_en: "", item_pa: "", note: "" };
  }

  function render(container, editOrder) {
    host = container;
    editingId = editOrder ? editOrder.id : null;
    itemRows = editOrder && editOrder.items.length
      ? editOrder.items.map((i) => ({
          qty: u().fmtQty(i.qty), unit: i.unit,
          item_en: i.item_en || "", item_pa: i.item_pa || "", note: i.note || ""
        }))
      : [blankRow(), blankRow()];

    const o = editOrder || {};
    draft = null;

    host.innerHTML = "";
    const page = u().el("div", { class: "page" }, [
      u().el("div", { class: "page-head" }, [
        u().el("h2", { text: editingId ? t("edit") + " #" + o.order_no : t("newOrderTitle") })
      ])
    ]);
    host.appendChild(page);

    if (editingId) {
      page.appendChild(buildForm(o));
    } else {
      page.appendChild(buildPasteCard());
      page.appendChild(u().el("div", { id: "pastePreview" }));
      page.appendChild(u().el("details", { class: "manual", id: "manualBox" }, [
        u().el("summary", { text: t("typeManually") }),
        u().el("div", { id: "formHost" }, [buildForm(o)])
      ]));
    }
    drawItems();
  }

  /* ---------- paste a message ---------- */

  function buildPasteCard() {
    const ta = u().el("textarea", {
      class: "input paste-box", id: "pasteBox", rows: 7,
      placeholder: t("pastePh"), spellcheck: "false",
      oninput: u().debounce(() => readMessage(ta.value), 200)
    });
    // paste should show the result straight away, not after the debounce
    ta.addEventListener("paste", () => setTimeout(() => readMessage(ta.value), 0));

    const pasteBtn = u().el("button", {
      type: "button", class: "btn btn-ghost", text: "📋  " + t("pasteBtn"),
      onclick: async () => {
        try {
          const txt = await navigator.clipboard.readText();
          ta.value = txt; readMessage(txt);
        } catch (e) { u().toast(t("pasteDenied"), "warn", 5000); ta.focus(); }
      }
    });
    if (!(navigator.clipboard && navigator.clipboard.readText)) pasteBtn.style.display = "none";

    setTimeout(() => ta.focus(), 50);
    return u().el("div", { class: "card paste-card" }, [
      u().el("div", { class: "section-head" }, [
        u().el("h3", { text: t("pasteTitle") }),
        pasteBtn,
        u().el("button", { type: "button", class: "btn btn-ghost", text: t("clearForm"),
                           onclick: () => { ta.value = ""; readMessage(""); ta.focus(); } })
      ]),
      u().el("p", { class: "muted small paste-hint", text: t("pasteHint") }),
      ta
    ]);
  }

  function readMessage(text) {
    const out = u().$("#pastePreview", host);
    if (!out) return;
    if (!String(text).trim()) { draft = null; out.innerHTML = ""; return; }
    draft = OB.parse.order(text);
    drawPreview();
  }

  function drawPreview() {
    const out = u().$("#pastePreview", host);
    out.innerHTML = "";
    const d = draft;
    const lang = OB.i18n.lang;

    const box = (label, name, type, value, needed, placeholder) => {
      const a = { class: "input" + (needed && !value ? " need" : ""), type: type,
                  value: value || "",
                  oninput: (e) => { d[name] = e.target.value; e.target.classList.remove("need"); } };
      if (placeholder) a.placeholder = placeholder;
      return u().el("label", { class: "field" }, [
        u().el("span", { class: "label", text: label }),
        u().el("input", a),
        !d.found[name] && needed ? u().el("span", { class: "hint-warn small", text: t("checkThis") }) : null
      ]);
    };

    // missing date/time: fall back to the same defaults as the form
    if (!d.due_date) d.due_date = u().todayISO();
    if (!d.due_time) d.due_time = "17:00";

    const itemList = u().el("div", { class: "pv-items" });
    if (!d.items.length) {
      itemList.appendChild(u().el("p", { class: "hint-warn", text: t("noItemsFound") }));
    }
    d.items.forEach((it, idx) => {
      const warn = !it.matched ? t("notInMenu") : (it.guessedQty ? t("qtyGuessed") : "");
      itemList.appendChild(u().el("div", { class: "pv-item" + (warn ? " warn" : "") }, [
        u().el("span", { class: "pv-mark", text: warn ? "⚠️" : "✓" }),
        u().el("input", {
          class: "input pv-qty", type: "number", step: "0.25", min: "0",
          value: u().fmtQty(it.qty),
          oninput: (e) => { it.qty = parseFloat(e.target.value) || 0; }
        }),
        u().el("select", { class: "input pv-unit", onchange: (e) => { it.unit = e.target.value; } },
          OB.catalog.units.map((un) =>
            u().el("option", Object.assign({ value: un.v }, it.unit === un.v ? { selected: "selected" } : {}),
                   [lang === "pa" ? un.pa : un.en]))),
        u().el("div", { class: "pv-name" }, [
          u().el("strong", { text: OB.catalog.itemLabel(it, lang) }),
          it.matched ? u().el("span", { class: "muted small",
                                        text: " " + (lang === "pa" ? it.item_en : it.item_pa) }) : null,
          it.note ? u().el("div", { class: "small", text: "📝 " + it.note }) : null,
          warn ? u().el("div", { class: "hint-warn small", text: warn + "  ·  “" + it.raw + "”" }) : null,
          // one tap to swap a flagged item for the menu item it probably is
          !it.matched && it.suggest ? u().el("button", {
            type: "button", class: "chip pv-suggest",
            text: t("useSuggestion") + " " + (lang === "pa" ? it.suggest.pa : it.suggest.en),
            onclick: () => {
              it.item_en = it.suggest.en; it.item_pa = it.suggest.pa; it.matched = true;
              if (!/\d/.test(it.raw) && it.suggest.unit) it.unit = it.suggest.unit;
              drawPreview();
            }
          }) : null
        ]),
        u().el("button", {
          type: "button", class: "icon-btn danger", title: t("removeItem"), text: "✕",
          onclick: () => { d.items.splice(idx, 1); drawPreview(); }
        })
      ]));
    });

    const createBtn = u().el("button", {
      type: "button", class: "btn btn-primary btn-lg pv-create",
      text: "✓  " + t("createOrder"),
      onclick: () => createFromDraft(createBtn)
    });

    out.appendChild(u().el("div", { class: "card pv-card" }, [
      u().el("h4", { class: "pv-head", text: t("readFromMsg") }),
      u().el("div", { class: "grid g3" }, [
        box(t("customerName"), "customer_name", "text", d.customer_name, true,
            lang === "pa" ? "ਗਾਹਕ ਦਾ ਨਾਂ" : "Customer name"),
        box(t("customerPhone"), "customer_phone", "tel", d.customer_phone, false),
        box(t("orderName"), "order_name", "text", d.order_name, false, t("orderNamePh"))
      ]),
      u().el("div", { class: "grid g3" }, [
        box(t("dueDate"), "due_date", "date", d.due_date, true),
        box(t("dueTime"), "due_time", "time", d.due_time, true),
        u().el("label", { class: "field urgent-field" }, [
          u().el("span", { class: "label", text: " " }),
          u().el("label", { class: "switch" }, [
            u().el("input", Object.assign({ type: "checkbox",
                                            onchange: (e) => { d.urgent = e.target.checked; } },
                                          d.urgent ? { checked: "checked" } : {})),
            u().el("span", { class: "switch-ui" }),
            u().el("span", { class: "switch-text", text: "⚠️ " + t("urgent") })
          ])
        ])
      ]),
      u().el("div", { class: "section-head" }, [
        u().el("h3", { text: t("items") }),
        u().el("span", { class: "muted small", text: t("items_n", d.items.length) })
      ]),
      itemList,
      u().el("label", { class: "field" }, [
        u().el("span", { class: "label", text: t("notes") }),
        u().el("textarea", { class: "input", rows: 2,
                             oninput: (e) => { d.notes = e.target.value; } }, [d.notes || ""])
      ]),
      d.skipped.length ? u().el("div", { class: "pv-skipped" }, [
        u().el("span", { class: "muted small", text: t("notUnderstood") + ":" }),
        u().el("ul", {}, d.skipped.map((l, i) => u().el("li", { class: "muted small" }, [
          l + "  ",
          u().el("button", {
            type: "button", class: "chip pv-addnote", text: "+ " + t("addToNotes"),
            onclick: () => {
              d.notes = (d.notes ? d.notes + "\n" : "") + l;
              d.skipped.splice(i, 1);
              drawPreview();
            }
          })
        ])))
      ]) : null,
      u().el("div", { class: "form-actions" }, [
        createBtn,
        u().el("button", { type: "button", class: "btn btn-ghost btn-lg", text: t("editInForm"),
                           onclick: openDraftInForm })
      ])
    ]));
  }

  function draftOrder() {
    return {
      order_date: u().todayISO(),
      due_date: draft.due_date || u().todayISO(),
      due_time: draft.due_time || null,
      customer_name: String(draft.customer_name || "").trim(),
      customer_phone: String(draft.customer_phone || "").trim() || null,
      order_name: String(draft.order_name || "").trim() || null,
      notes: String(draft.notes || "").trim() || null,
      urgent: !!draft.urgent,
      created_by: u().station()
    };
  }

  function draftItems() {
    return draft.items.filter((i) => i.qty > 0).map((i) => ({
      qty: i.qty, unit: i.unit || "lb",
      item_en: i.item_en, item_pa: i.item_pa || "", note: i.note || ""
    }));
  }

  function createFromDraft(btn) {
    const order = draftOrder();
    if (!order.customer_name) {
      u().toast(t("requiredCustomer"), "error");
      const f = u().$("#pastePreview input", host); if (f) f.focus();
      return;
    }
    const items = draftItems();
    if (!items.length) { u().toast(t("requiredItems"), "error"); return; }
    submit(order, items, btn, "✓  " + t("createOrder"));
  }

  // hand the pasted order to the full form for anything the preview can't do
  function openDraftInForm() {
    const order = draftOrder();
    itemRows = draftItems().map((i) => ({
      qty: u().fmtQty(i.qty), unit: i.unit, item_en: i.item_en, item_pa: i.item_pa, note: i.note
    }));
    if (!itemRows.length) itemRows.push(blankRow());
    const fh = u().$("#formHost", host);
    fh.innerHTML = "";
    fh.appendChild(buildForm(order));
    drawItems();
    const mb = u().$("#manualBox", host);
    mb.open = true;
    mb.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- the full form ---------- */

  function buildForm(o) {
    const today = u().todayISO();
    return (
      u().el("form", { class: "card form", id: "orderForm",
                       onsubmit: (e) => { e.preventDefault(); save(); } }, [

        /* ---- dates row ---- */
        u().el("div", { class: "grid g3" }, [
          field(t("orderDate"), inp("order_date", "date", o.order_date || today, true)),
          field(t("dueDate"),   inp("due_date", "date", o.due_date || today, true)),
          field(t("dueTime"),   inp("due_time", "time", o.due_time ? String(o.due_time).slice(0, 5) : "17:00"))
        ]),

        /* ---- customer row ---- */
        u().el("div", { class: "grid g3" }, [
          field(t("customerName"), inp("customer_name", "text", o.customer_name || "", true,
                                       OB.i18n.lang === "pa" ? "ਗਾਹਕ ਦਾ ਨਾਂ" : "Customer name")),
          field(t("customerPhone"), inp("customer_phone", "tel", o.customer_phone || "", false, "+1 555 123 4567")),
          field(t("orderName"), inp("order_name", "text", o.order_name || "", false, t("orderNamePh")))
        ]),

        /* ---- items ---- */
        u().el("div", { class: "section" }, [
          u().el("div", { class: "section-head" }, [
            u().el("h3", { text: t("items") }),
            u().el("span", { class: "muted small", id: "itemCount" })
          ]),
          u().el("div", { class: "quickpick" }, [
            u().el("span", { class: "muted small qp-label", text: t("quickPick") + ":" })
          ].concat(OB.catalog.favourites().map((s) =>
            u().el("button", {
              type: "button", class: "chip",
              text: OB.i18n.lang === "pa" ? s.pa : s.en,
              onclick: () => addItemFromCatalog(s)
            })
          ))),
          u().el("div", { class: "items", id: "itemsHost" }),
          u().el("button", {
            type: "button", class: "btn btn-ghost btn-wide",
            text: "+  " + t("addItem"),
            onclick: () => { itemRows.push(blankRow()); drawItems(); focusLastItem(); }
          })
        ]),

        /* ---- notes + urgent ---- */
        u().el("div", { class: "grid g2" }, [
          field(t("notes"), u().el("textarea", {
            name: "notes", rows: 3, class: "input",
            placeholder: OB.i18n.lang === "pa" ? "ਜਿਵੇਂ: ਘੱਟ ਮਿੱਠਾ" : "e.g. less sweet, no nuts"
          }, [o.notes || ""])),
          u().el("label", { class: "field urgent-field" }, [
            u().el("span", { class: "label", text: " " }),
            u().el("label", { class: "switch" }, [
              u().el("input", Object.assign({ type: "checkbox", name: "urgent" },
                                            o.urgent ? { checked: "checked" } : {})),
              u().el("span", { class: "switch-ui" }),
              u().el("span", { class: "switch-text", text: "⚠️ " + t("urgent") })
            ])
          ])
        ]),

        /* ---- actions ---- */
        u().el("div", { class: "form-actions" }, [
          u().el("button", { type: "submit", class: "btn btn-primary btn-lg",
                             text: t("saveOrder") }),
          u().el("button", { type: "button", class: "btn btn-ghost btn-lg", text: t("clearForm"),
                             onclick: () => render(host, null) })
        ])
      ])
    );
  }

  /* ---------- small builders ---------- */

  function field(label, control) {
    return u().el("label", { class: "field" }, [
      u().el("span", { class: "label", text: label }), control
    ]);
  }

  function inp(name, type, value, required, placeholder) {
    const a = { name: name, type: type, class: "input", value: value || "" };
    if (required) a.required = "required";
    if (placeholder) a.placeholder = placeholder;
    return u().el("input", a);
  }

  /* ---------- line items ---------- */

  function drawItems() {
    const wrap = u().$("#itemsHost", host);
    if (!wrap) return;
    wrap.innerHTML = "";
    const lang = OB.i18n.lang;

    itemRows.forEach((row, idx) => {
      const unitSel = u().el("select", {
        class: "input",
        onchange: (e) => { row.unit = e.target.value; }
      }, OB.catalog.units.map((un) =>
        u().el("option", Object.assign({ value: un.v }, row.unit === un.v ? { selected: "selected" } : {}),
               [lang === "pa" ? un.pa : un.en])
      ));

      const nameInput = u().el("input", {
        class: "input item-name", type: "text", list: "ob-items",
        placeholder: t("searchItem"),
        value: lang === "pa" ? (row.item_pa || row.item_en) : (row.item_en || row.item_pa),
        oninput: (e) => setItemName(row, e.target.value),
        onchange: (e) => {
          setItemName(row, e.target.value);
          // if the typed text matches the catalog, fill in both languages
          const hit = OB.catalog.find(e.target.value);
          if (hit) {
            row.item_en = hit.en; row.item_pa = hit.pa;
            e.target.value = lang === "pa" ? hit.pa : hit.en;
            u().$(".item-alt", e.target.closest(".item-row")).textContent =
              lang === "pa" ? hit.en : hit.pa;
          }
        }
      });

      const altText = (() => {
        const hit = OB.catalog.find(row.item_en || row.item_pa);
        if (!hit) return "";
        return lang === "pa" ? hit.en : hit.pa;
      })();

      wrap.appendChild(u().el("div", { class: "item-row" }, [
        u().el("div", { class: "item-qty" }, [
          u().el("input", {
            class: "input", type: "number", step: "0.25", min: "0",
            placeholder: t("quantity"), value: row.qty,
            oninput: (e) => { row.qty = e.target.value; }
          })
        ]),
        u().el("div", { class: "item-unit" }, [unitSel]),
        u().el("div", { class: "item-main" }, [
          nameInput,
          u().el("span", { class: "item-alt muted small", text: altText })
        ]),
        u().el("div", { class: "item-note" }, [
          u().el("input", {
            class: "input", type: "text", placeholder: t("itemNote"), value: row.note,
            oninput: (e) => { row.note = e.target.value; }
          })
        ]),
        u().el("button", {
          type: "button", class: "icon-btn danger", title: t("removeItem"), text: "✕",
          onclick: () => {
            itemRows.splice(idx, 1);
            if (!itemRows.length) itemRows.push(blankRow());
            drawItems();
          }
        })
      ]));
    });

    const filled = itemRows.filter((r) => (r.item_en || r.item_pa).trim()).length;
    const cnt = u().$("#itemCount", host);
    if (cnt) cnt.textContent = t("items_n", filled);
  }

  function setItemName(row, value) {
    const lang = OB.i18n.lang;
    const hit = OB.catalog.find(value);
    if (hit) { row.item_en = hit.en; row.item_pa = hit.pa; return; }
    // free text the catalog does not know — store it in the typing language
    if (lang === "pa") { row.item_pa = value; row.item_en = row.item_en || value; }
    else { row.item_en = value; row.item_pa = ""; }
  }

  function addItemFromCatalog(s) {
    // reuse the first empty row if there is one
    let target = itemRows.find((r) => !(r.item_en || r.item_pa).trim());
    if (!target) { target = blankRow(); itemRows.push(target); }
    target.item_en = s.en;
    target.item_pa = s.pa;
    drawItems();
    focusQtyOf(itemRows.indexOf(target));
  }

  function focusLastItem() {
    const rows = u().$$(".item-row .item-main input", host);
    if (rows.length) rows[rows.length - 1].focus();
  }

  function focusQtyOf(idx) {
    const rows = u().$$(".item-row", host);
    if (rows[idx]) { const q = rows[idx].querySelector("input"); if (q) q.focus(); }
  }

  /* ---------- save ---------- */

  async function save() {
    const f = u().$("#orderForm", host);
    const fd = new FormData(f);

    const customer = String(fd.get("customer_name") || "").trim();
    if (!customer) { u().toast(t("requiredCustomer"), "error"); return; }

    const items = itemRows
      .filter((r) => (r.item_en || r.item_pa).trim())
      .map((r) => ({
        qty: parseFloat(r.qty) || 1,
        unit: r.unit || "lb",
        item_en: (r.item_en || r.item_pa).trim(),
        item_pa: (r.item_pa || "").trim(),
        note: (r.note || "").trim()
      }));

    if (!items.length) { u().toast(t("requiredItems"), "error"); return; }

    const order = {
      order_date: fd.get("order_date") || u().todayISO(),
      due_date:   fd.get("due_date")   || u().todayISO(),
      due_time:   fd.get("due_time") || null,
      customer_name: customer,
      customer_phone: String(fd.get("customer_phone") || "").trim() || null,
      order_name: String(fd.get("order_name") || "").trim() || null,
      notes: String(fd.get("notes") || "").trim() || null,
      urgent: fd.get("urgent") === "on",
      created_by: u().station()
    };

    submit(order, items, f.querySelector('button[type="submit"]'), t("saveOrder"));
  }

  async function submit(order, items, btn, label) {
    btn.disabled = true;
    btn.textContent = t("loading");

    try {
      if (editingId) {
        await OB.db.updateOrder(editingId, order, items);
        u().toast(t("savedOk"), "success");
        location.hash = "#/log";
      } else {
        const saved = await OB.db.createOrder(order, items);
        u().toast(t("savedOk") + "  #" + saved.order_no, "success");
        render(host, null);   // fresh blank form, ready for the next customer
      }
      OB.store.refresh();
    } catch (e) {
      console.error(e);
      if (!editingId) {
        // keep the order so nothing is lost; retry when the network returns
        OB.db.queue("createOrder", [order, items]);
        u().toast(t("offline"), "warn", 5000);
        render(host, null);
      } else {
        u().toast(t("errSave"), "error", 5000);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  OB.views = OB.views || {};
  OB.views.newOrder = { render: render };
})();
