// ============================================================
//  Order Board — WhatsApp notifier (Supabase Edge Function)
// ------------------------------------------------------------
//  Why this exists: the app is a static site, so anything it holds is public.
//  The Meta access token must never go there. This function runs on Supabase's
//  servers, holds the token as a secret, and is the only thing that can send.
//
//  The browser sends ONLY an order id. This function looks the order up itself
//  and sends to a fixed number from the secrets, so even if someone calls it
//  directly the worst they can do is re-send a real order's "ready" message to
//  the shop's own phone. No arbitrary messages.
//
//  Secrets to set (Dashboard > Edge Functions > Secrets):
//    WA_TOKEN      Meta permanent access token
//    WA_PHONE_ID   "Phone number ID" from the WhatsApp > API Setup page
//    WA_TO         where to send, digits only, e.g. 15551112222
//    WA_TEMPLATE   template name           (optional, default: order_ready)
//    WA_LANG       template language code  (optional, default: en_US)
//  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SendResult = {
  ok: boolean;
  mode?: string;
  id?: string;
  error?: string;
  code?: number;
  details?: string;
  status?: number;
  note?: string;
  fallbackError?: string;
  skipped?: string;
  at?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/* Template parameters may not contain newlines, tabs, or runs of spaces —
   Meta rejects the whole message if they do. */
function clean(v: unknown, max = 700): string {
  return String(v ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max) || "-";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const TOKEN    = Deno.env.get("WA_TOKEN");
  const PHONE_ID = Deno.env.get("WA_PHONE_ID");
  const TO       = (Deno.env.get("WA_TO") || "").replace(/[^\d]/g, "");
  const TEMPLATE = Deno.env.get("WA_TEMPLATE") || "order_ready";
  const LANG     = Deno.env.get("WA_LANG") || "en_US";

  const missing = [
    !TOKEN    && "WA_TOKEN",
    !PHONE_ID && "WA_PHONE_ID",
    !TO       && "WA_TO",
  ].filter(Boolean);
  if (missing.length) {
    return json({ ok: false, error: "Missing secrets: " + missing.join(", ") }, 500);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty body for ping */ }

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const dbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  // ---- connection test from the Settings screen ----
  if (body.test) {
    const r = await sendTemplate(["0", "Test message", "Order Board setup check", "Order Board"]);
    return json(r, r.ok ? 200 : 502);
  }

  // ---- normal path: look the order up ourselves ----
  const orderId = body.order_id;
  if (!orderId) return json({ ok: false, error: "order_id required" }, 400);

  const q = `${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}` +
            `&select=*,order_items(qty,unit,item_en,position)`;
  const res = await fetch(q, { headers: dbHeaders });
  if (!res.ok) {
    return json({ ok: false, error: `Could not read order (HTTP ${res.status})` }, 502);
  }
  const rows = await res.json();
  const order = rows?.[0];
  if (!order) return json({ ok: false, error: "Order not found" }, 404);

  // Don't send twice for the same order.
  if (order.whatsapp_sent_at && !body.force) {
    return json({ ok: true, skipped: "already sent", at: order.whatsapp_sent_at });
  }

  const items = (order.order_items ?? [])
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((i: any) => {
      const q = Number(i.qty);
      const qty = Number.isFinite(q) ? (q % 1 === 0 ? String(q) : String(+q.toFixed(2))) : i.qty;
      return `${qty} ${i.unit} ${i.item_en}`;
    })
    .join(", ");

  const params = [
    clean(order.order_no, 20),
    clean(order.customer_name, 120),
    clean(items, 700),
    clean(order.completed_by || "kitchen", 60),
  ];

  let result: SendResult = await sendTemplate(params);

  // If the 24h customer-service window happens to be open, plain text is nicer.
  // If the template failed for any other reason, this is also a useful fallback.
  if (!result.ok) {
    const text =
      `✅ Order #${params[0]} is ready\n\n` +
      `Customer: ${params[1]}\n` +
      `Items: ${params[2]}\n` +
      `Finished by: ${params[3]}`;
    const alt = await sendText(text);
    if (alt.ok) result = { ...alt, note: "sent as free-form (24h window open)" };
    else result.fallbackError = alt.error;
  }

  // Stamp the order so no other screen sends it again.
  if (result.ok) {
    await fetch(`${SB_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}`, {
      method: "PATCH",
      headers: { ...dbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ whatsapp_sent_at: new Date().toISOString() }),
    });
    await fetch(`${SB_URL}/rest/v1/order_events`, {
      method: "POST",
      headers: { ...dbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        order_id: orderId,
        kind: "whatsapp",
        body: "WhatsApp notification sent",
        author: "system",
      }),
    });
  }

  return json(result, result.ok ? 200 : 502);

  // ---------- Meta Graph API ----------

  async function graph(payload: unknown): Promise<SendResult> {
    const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = data?.error ?? {};
      return {
        ok: false,
        error: e.message || `HTTP ${r.status}`,
        code: e.code,
        details: e.error_data?.details,
        status: r.status,
      };
    }
    return { ok: true, id: data?.messages?.[0]?.id, mode: "sent" };
  }

  function sendTemplate(params: string[]): Promise<SendResult> {
    return graph({
      messaging_product: "whatsapp",
      to: TO,
      type: "template",
      template: {
        name: TEMPLATE,
        language: { code: LANG },
        components: [{
          type: "body",
          parameters: params.map((p) => ({ type: "text", text: p })),
        }],
      },
    }).then((r) => ({ ...r, mode: r.ok ? "template" : r.mode }));
  }

  function sendText(text: string): Promise<SendResult> {
    return graph({
      messaging_product: "whatsapp",
      to: TO,
      type: "text",
      text: { preview_url: false, body: text },
    });
  }
});
