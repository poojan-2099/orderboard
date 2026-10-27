/* OrderBoard — Supabase data layer.
   Handles reads, writes, live updates, and an offline write queue. */
(function () {
  const OB = (window.OB = window.OB || {});
  const QUEUE_KEY = "ob_pending_writes";

  const db = {
    client: null,
    ready: false,
    appConfig: {},
    _channel: null,
    _listeners: [],

    /* ---------- setup ---------- */

    init() {
      const url = (localStorage.getItem("ob_sb_url") || OB_CONFIG.SUPABASE_URL || "").trim();
      const key = (localStorage.getItem("ob_sb_key") || OB_CONFIG.SUPABASE_ANON || "").trim();
      if (!url || !key || typeof supabase === "undefined") {
        this.ready = false;
        return false;
      }
      this.client = supabase.createClient(url, key, {
        realtime: { params: { eventsPerSecond: 5 } }
      });
      this.ready = true;
      return true;
    },

    /* ---------- change notifications ---------- */

    onChange(fn) {
      this._listeners.push(fn);
      return () => {
        this._listeners = this._listeners.filter((f) => f !== fn);
      };
    },

    _fire(payload) {
      this._listeners.forEach((f) => {
        try { f(payload); } catch (e) { console.error("[OB] listener error", e); }
      });
    },

    /* Live updates over websocket, with a polling fallback. */
    startLive() {
      if (!this.ready || this._channel) return;
      this._channel = this.client
        .channel("orderboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" },
            (p) => this._fire({ source: "realtime", table: "orders", payload: p }))
        .on("postgres_changes", { event: "*", schema: "public", table: "order_items" },
            (p) => this._fire({ source: "realtime", table: "order_items", payload: p }))
        .on("postgres_changes", { event: "*", schema: "public", table: "order_events" },
            (p) => this._fire({ source: "realtime", table: "order_events", payload: p }))
        .subscribe();

      const secs = Math.max(5, OB_CONFIG.POLL_SECONDS || 15);
      setInterval(() => this._fire({ source: "poll" }), secs * 1000);
    },

    /* ---------- app config (shared across all screens) ---------- */

    async loadAppConfig() {
      if (!this.ready) return {};
      const { data, error } = await this.client
        .from("app_config").select("*").eq("id", 1).maybeSingle();
      if (error) { console.warn("[OB] app_config read failed", error.message); return {}; }
      this.appConfig = data || {};
      return this.appConfig;
    },

    async saveAppConfig(patch) {
      if (!this.ready) throw new Error("not connected");
      const { data, error } = await this.client
        .from("app_config")
        .update(Object.assign({}, patch, { updated_at: new Date().toISOString() }))
        .eq("id", 1).select().maybeSingle();
      if (error) throw error;
      this.appConfig = data || this.appConfig;
      return this.appConfig;
    },

    /* ---------- reads ---------- */

    /* Everything the kitchen board and front desk need:
       all open orders, plus anything finished in the last 36 hours. */
    async fetchActive() {
      if (!this.ready) return [];
      // Strip milliseconds and quote the value: PostgREST uses "." as its
      // own separator inside or(), so an unquoted ISO timestamp breaks it.
      const since = new Date(Date.now() - 36 * 3600 * 1000)
        .toISOString().replace(/\.\d{3}Z$/, "Z");
      const { data, error } = await this.client
        .from("orders")
        .select("*, order_items(*), order_events(*)")
        .or('status.in.(new,cooking),completed_at.gte."' + since + '"')
        .order("urgent", { ascending: false })
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: true })
        .order("order_no", { ascending: true });
      if (error) throw error;
      return (data || []).map(shape);
    },

    async fetchRange({ from, to, status, q }) {
      if (!this.ready) return [];
      let query = this.client
        .from("orders")
        .select("*, order_items(*), order_events(*)")
        .gte("order_date", from)
        .lte("order_date", to)
        .order("order_no", { ascending: false });
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      let rows = (data || []).map(shape);
      if (q) {
        const n = q.trim().toLowerCase();
        rows = rows.filter((o) =>
          String(o.order_no).includes(n) ||
          (o.customer_name || "").toLowerCase().includes(n) ||
          (o.order_name || "").toLowerCase().includes(n) ||
          (o.customer_phone || "").includes(n) ||
          o.items.some((i) => (i.item_en || "").toLowerCase().includes(n) ||
                              (i.item_pa || "").includes(n))
        );
      }
      return rows;
    },

    async fetchOne(id) {
      if (!this.ready) return null;
      const { data, error } = await this.client
        .from("orders").select("*, order_items(*), order_events(*)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? shape(data) : null;
    },

    /* ---------- writes ---------- */

    async createOrder(order, items) {
      const { data, error } = await this.client
        .from("orders").insert(order).select().single();
      if (error) throw error;
      const rows = items.map((it, idx) => ({
        order_id: data.id, qty: it.qty, unit: it.unit,
        item_en: it.item_en, item_pa: it.item_pa || null,
        note: it.note || null, position: idx
      }));
      if (rows.length) {
        const r = await this.client.from("order_items").insert(rows);
        if (r.error) throw r.error;
      }
      return data;
    },

    async updateOrder(id, patch, items) {
      const { error } = await this.client.from("orders").update(patch).eq("id", id);
      if (error) throw error;
      if (items) {
        const del = await this.client.from("order_items").delete().eq("order_id", id);
        if (del.error) throw del.error;
        const rows = items.map((it, idx) => ({
          order_id: id, qty: it.qty, unit: it.unit,
          item_en: it.item_en, item_pa: it.item_pa || null,
          note: it.note || null, position: idx
        }));
        if (rows.length) {
          const ins = await this.client.from("order_items").insert(rows);
          if (ins.error) throw ins.error;
        }
      }
      await this.client.from("order_events").insert({
        order_id: id, kind: "edited", body: "Order edited", author: OB.util.station()
      });
    },

    async setStatus(id, status, who) {
      const actor = who || OB.util.station();
      const patch = { status: status, updated_by: actor };
      if (status === "done") {
        patch.completed_at = new Date().toISOString();
        patch.completed_by = actor;
      } else {
        // reopening clears the completion stamp so the order looks genuinely open
        patch.completed_at = null;
        patch.completed_by = null;
        patch.whatsapp_sent_at = null;
      }
      if (status === "cooking") patch.started_at = new Date().toISOString();
      const { error } = await this.client.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },

    async addComment(id, body, author, lang) {
      const { error } = await this.client.from("order_events").insert({
        order_id: id, kind: "comment", body: body,
        author: author || OB.util.station(), lang: lang || OB.i18n.lang
      });
      if (error) throw error;
    },

    async markWhatsappSent(id, note) {
      await this.client.from("orders")
        .update({ whatsapp_sent_at: new Date().toISOString() }).eq("id", id);
      await this.client.from("order_events").insert({
        order_id: id, kind: "whatsapp", body: note || "WhatsApp notification sent",
        author: OB.util.station()
      });
    },

    async deleteOrder(id) {
      const { error } = await this.client.from("orders").delete().eq("id", id);
      if (error) throw error;
    },

    /* ---------- offline write queue ----------
       If the network drops mid-save we stash the write and retry. */

    queue(kind, args) {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      q.push({ kind: kind, args: args, at: Date.now() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    },

    queueSize() {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]").length;
    },

    async flushQueue() {
      if (!this.ready) return 0;
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      if (!q.length) return 0;
      const left = [];
      let done = 0;
      for (const job of q) {
        try {
          if (job.kind === "createOrder")  await this.createOrder(job.args[0], job.args[1]);
          else if (job.kind === "setStatus")  await this.setStatus.apply(this, job.args);
          else if (job.kind === "addComment") await this.addComment.apply(this, job.args);
          done++;
        } catch (e) {
          left.push(job);
        }
      }
      localStorage.setItem(QUEUE_KEY, JSON.stringify(left));
      if (done) this._fire({ source: "flush" });
      return done;
    }
  };

  /* Normalise a row from Supabase into a predictable shape. */
  function shape(row) {
    const items  = (row.order_items  || []).slice().sort((a, b) => a.position - b.position);
    const events = (row.order_events || []).slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return Object.assign({}, row, {
      items: items,
      events: events,
      comments: events.filter((e) => e.kind === "comment")
    });
  }

  OB.db = db;
})();
