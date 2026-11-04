// Franchise prospectus requests: website form -> Resend automation + Google Sheet row + team alert email.
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
const NOTIFY_TO = "info@thezeromilesmeatcompany.co.uk";
const NOTIFY_FROM = "ZMMC Website <info@thezeromilesmeatcompany.co.uk>";
const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1TPS0n_XklCvS9LL_A9jXnW_PjstbdfB4W465bQNyRt0/edit";

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

    const status = {
      sequence: results[0].status === "fulfilled" ? (repeat ? "skipped-repeat" : "started") : "failed",
      sheet: results[1].status === "fulfilled" ? "added" : "failed",
    };
    const notified = await notifyTeam(env, lead, repeat, status).then(() => "sent", (err) => {
      console.error(String(err));
      return "failed";
    });

    return reply(200, {
      ok: results.every((r) => r.status === "fulfilled"),
      ...status,
      notify: notified,
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

const escapeHtml = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Alert email to the team for every request, with Reply-To set to the lead.
async function notifyTeam(env, lead, repeat, status) {
  const problems = [
    status.sequence === "failed" && "The prospectus emails did NOT start. Please send the prospectus manually.",
    status.sheet === "failed" && "The lead was NOT added to the Google Sheet. Please add it manually.",
  ].filter(Boolean);
  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Area", lead.location],
    ["Farm type", lead.farmType],
    ["Message", lead.message],
    ["Source", lead.source],
    ["Form", lead.formLocation],
    ...lead.utm.map(([k, v]) => [k, v]),
  ].filter(([, v]) => v);
  const emailsLine = repeat
    ? "Repeat request within 30 days, so the prospectus emails were not sent again."
    : status.sequence === "started"
      ? "Prospectus email sent. Call booking follow-ups go out after 1 day and 5 days."
      : "";

  const gold = "#D6BF86", ink = "#131A17";
  const button = (href, label) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${gold};color:${ink};font:600 14px Arial,sans-serif;text-decoration:none;padding:10px 18px;border-radius:4px;margin:0 8px 8px 0;">${label}</a>`;
  const html = `<!doctype html><html><body style="margin:0;background:#EFE8D6;padding:24px 12px;font-family:Arial,sans-serif;color:${ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:${ink};padding:18px 24px;color:${gold};font:700 18px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">${repeat ? "Repeat" : "New"} franchise prospectus request</td></tr>
${problems.map((p) => `<tr><td style="background:#F8D7D3;color:#7A1F14;padding:12px 24px;font:600 14px Arial,sans-serif;">⚠ ${escapeHtml(p)}</td></tr>`).join("")}
<tr><td style="padding:20px 24px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;">
${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5B6660;width:110px;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 0;vertical-align:top;white-space:pre-wrap;">${escapeHtml(v)}</td></tr>`).join("")}
</table></td></tr>
${emailsLine ? `<tr><td style="padding:8px 24px 0;font-size:13px;color:#5B6660;">${escapeHtml(emailsLine)}</td></tr>` : ""}
<tr><td style="padding:18px 24px 20px;">
${button(`mailto:${lead.email}`, "Reply")}${lead.phone ? button(`tel:${lead.phone.replace(/[^\d+]/g, "")}`, "Call") : ""}${button(SHEET_LINK, "Open sheet")}
</td></tr></table></body></html>`;
  const text = [
    `${repeat ? "Repeat" : "New"} franchise prospectus request`,
    ...problems.map((p) => `WARNING: ${p}`),
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    emailsLine,
    `Sheet: ${SHEET_LINK}`,
  ].join("\n");

  const res = await resend(env, "/emails", "POST", {
    from: NOTIFY_FROM,
    to: [NOTIFY_TO],
    reply_to: lead.email,
    subject: `${problems.length ? "⚠ " : ""}${repeat ? "Repeat" : "New"} franchise enquiry: ${lead.name}${lead.location ? ` (${lead.location})` : ""}`,
    html,
    text,
  });
  if (!res.ok) throw new Error(`Notify failed: ${res.status} ${await res.text()}`);
}
