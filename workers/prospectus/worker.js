// Franchise prospectus requests: website form -> Resend automation + Google Sheet row.
// Secrets (set in Cloudflare, never in this file): RESEND_API_KEY, SHEET_WEBHOOK_URL, SHEET_SECRET.
// Binding: LEADS (KV namespace) for duplicate and rate-limit checks.

const ALLOWED_ORIGINS = [
  "https://thezeromilesmeatcompany.co.uk",
  "https://www.thezeromilesmeatcompany.co.uk",
];
const EVENT_NAME = "franchise.prospectus_requested";
const SEGMENT_ID = "98f3a97d-8a6a-4314-84ed-4e8e088b85e6";
const DUPLICATE_WINDOW_SECONDS = 30 * 24 * 60 * 60;
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { ok: false });

    if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, { ok: false });

    let form;
    try {
      form = await request.formData();
    } catch {
      return reply(400, { ok: false });
    }
    const field = (name) => String(form.get(name) || "").trim().slice(0, 2000);

    // Bots fill hidden fields; real visitors never see this one.
    if (field("company_website")) return reply(200, { ok: true });

    const name = field("name");
    const email = field("email").toLowerCase();
    if (!name || !EMAIL_RE.test(email)) return reply(400, { ok: false, error: "invalid" });

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipKey = `ip:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const ipCount = Number((await env.LEADS.get(ipKey)) || 0);
    if (ipCount >= MAX_SUBMISSIONS_PER_IP_PER_HOUR) return reply(429, { ok: false });
    await env.LEADS.put(ipKey, String(ipCount + 1), { expirationTtl: 3600 });

    const lead = {
      name,
      email,
      phone: field("phone"),
      location: field("area_of_interest") || field("area"),
      farmType: field("farm_type"),
      message: field("message"),
      source: field("lead_source") || "Website form",
      formLocation: field("form_location"),
      utm: ["utm_source", "utm_medium", "utm_campaign", "utm_term", "gclid"]
        .map((k) => [k, field(k)])
        .filter(([, v]) => v),
    };

    const repeat = Boolean(await env.LEADS.get(`lead:${email}`));
    const results = await Promise.allSettled([
      repeat ? Promise.resolve("skipped: repeat within 30 days") : startSequence(env, lead),
      addSheetRow(env, lead, repeat),
    ]);
    if (!repeat && results[0].status === "fulfilled") {
      await env.LEADS.put(`lead:${email}`, new Date().toISOString(), { expirationTtl: DUPLICATE_WINDOW_SECONDS });
    }
    results.forEach((r) => r.status === "rejected" && console.error(String(r.reason)));

    return reply(200, {
      ok: results.every((r) => r.status === "fulfilled"),
      sequence: results[0].status === "fulfilled" ? (repeat ? "skipped-repeat" : "started") : "failed",
      sheet: results[1].status === "fulfilled" ? "added" : "failed",
    });
  },
};

async function resend(env, path, method, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "zmmc-prospectus-worker/1.0",
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function startSequence(env, lead) {
  const [firstName, ...rest] = lead.name.split(/\s+/);
  const contact = { first_name: firstName, last_name: rest.join(" "), unsubscribed: false };

  const created = await resend(env, "/contacts", "POST", { email: lead.email, ...contact, segments: [{ id: SEGMENT_ID }] });
  if (!created.ok) {
    const updated = await resend(env, `/contacts/${encodeURIComponent(lead.email)}`, "PATCH", contact);
    if (!updated.ok) throw new Error(`Resend contact failed: ${created.status} / ${updated.status} ${await updated.text()}`);
  }

  const sent = await resend(env, "/events/send", "POST", {
    event: EVENT_NAME,
    email: lead.email,
    payload: {
      form_location: lead.formLocation,
      lead_source: lead.source,
      farm_type: lead.farmType,
      area: lead.location,
    },
  });
  if (!sent.ok) throw new Error(`Resend event failed: ${sent.status} ${await sent.text()}`);
  return "started";
}

async function addSheetRow(env, lead, repeat) {
  if (!env.SHEET_WEBHOOK_URL) return "sheet not configured";
  const notes = [
    lead.farmType && `Farm type: ${lead.farmType}`,
    lead.formLocation && `Form: ${lead.formLocation}`,
    ...lead.utm.map(([k, v]) => `${k}: ${v}`),
    repeat && "Repeat request (emails not resent)",
  ].filter(Boolean).join(" · ");

  const res = await fetch(env.SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: env.SHEET_SECRET,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      location: lead.location,
      message: lead.message,
      source: lead.source,
      nextAction: repeat ? "" : "Prospectus emails sent – book intro call",
      notes,
    }),
  });
  const text = await res.text();
  if (!res.ok || !text.includes('"ok":true')) throw new Error(`Sheet failed: ${res.status} ${text.slice(0, 200)}`);
  return "added";
}
