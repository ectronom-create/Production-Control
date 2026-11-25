// Supabase Edge Function: admin-users
// Creates / deletes app users together with their Supabase Auth account and
// sets passwords. It runs with the service_role key (provided automatically
// by Supabase as an environment variable) — that key never reaches the browser.
//
// Who may do what:
//   admin       → any user, any role
//   supervisor  → operators only (Line Crew page)
//
// Deploy: Supabase Dashboard → Edge Functions → "Deploy a new function" →
// name it  admin-users  and paste this file. Turn "Verify JWT with legacy
// secret" OFF: sessions are signed with the new ECC key, and this function
// checks the caller itself (auth.getUser + role in public.users).

import { createClient } from "jsr:@supabase/supabase-js@2";

const EMAIL_DOMAIN = Deno.env.get("ECTRON_EMAIL_DOMAIN") ?? "ectron.local";
const ROLES = ["admin", "supervisor", "viewer", "operator"];
const MIN_PASSWORD = 8;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const emailFor = (userId: number) => `user-${userId}@${EMAIL_DOMAIN}`;

function passwordProblem(p: unknown, companyId = "", name = ""): string {
  const s = String(p ?? "");
  if (s.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`;
  const low = s.toLowerCase();
  if ((companyId && low === companyId.trim().toLowerCase()) || (name && low === name.trim().toLowerCase()))
    return "Password must not be the company ID or the name";
  if (isTrivialSequence(s)) return "Password is too easy to guess (repeated or sequential digits)";
  return "";
}

// Same rule as client/src/utils/userSecurity.js: 11111111, 12345678, 87654321…
function isTrivialSequence(p: string): boolean {
  if (p.length < 2) return false;
  if (/^(.)\1+$/.test(p)) return true;
  if (!/^\d+$/.test(p)) return false;
  const step = p.charCodeAt(1) - p.charCodeAt(0);
  if (Math.abs(step) !== 1) return false;
  for (let i = 2; i < p.length; i++) {
    const d = p.charCodeAt(i) - p.charCodeAt(i - 1);
    if (d !== step && d !== -9 * step) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  // Legacy service_role JWT, or the newer secret key (sb_secret_…) on projects
  // that use the new API keys.
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
      serviceKey = keys.default ?? Object.values(keys)[0] ?? "";
    } catch { /* ignore */ }
  }
  if (!serviceKey) return json(500, { error: "Service key is not configured" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── Who is calling? ──────────────────────────────────────────────────────
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) return json(401, { error: "Not signed in" });

  const { data: caller } = await admin
    .from("users")
    .select("id, name, access")
    .eq("auth_id", authData.user.id)
    .maybeSingle();
  const callerRole = (caller?.access ?? "").toLowerCase();
  if (!caller || !["admin", "supervisor"].includes(callerRole)) return json(403, { error: "Not allowed" });
  const isAdmin = callerRole === "admin";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const action = String(body.action ?? "");

  // A supervisor may only touch operators.
  const loadTarget = async (id: unknown) => {
    const { data } = await admin
      .from("users")
      .select("id, name, company_id, access, auth_id")
      .eq("id", Number(id))
      .maybeSingle();
    return data;
  };
  const mayManage = (role: string) => isAdmin || role === "operator";

  try {
    // ── create ───────────────────────────────────────────────────────────
    if (action === "create") {
      const u = (body.user ?? {}) as Record<string, string>;
      const access = String(u.access ?? "").toLowerCase();
      const name = String(u.name ?? "").trim();
      const companyId = String(u.company_id ?? "").trim();
      if (!name) return json(400, { error: "Name is required" });
      if (!ROLES.includes(access)) return json(400, { error: "Invalid role" });
      if (!mayManage(access)) return json(403, { error: "Supervisors can only add operators" });
      const problem = passwordProblem(body.password, companyId, name);
      if (problem) return json(400, { error: problem });

      const { data: row, error: insErr } = await admin
        .from("users")
        .insert([{
          name,
          company_id: companyId,
          email: String(u.email ?? ""),
          phone: String(u.phone ?? ""),
          access,
          team_name: String(u.team_name ?? ""),
          password: crypto.randomUUID(), // unused: login is Supabase Auth now
          must_change_password: body.must_change_password !== false,
        }])
        .select("id, name, company_id, email, phone, access, team_name, created_at, updated_at")
        .single();
      if (insErr) return json(400, { error: insErr.message });

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: emailFor(row.id),
        password: String(body.password),
        email_confirm: true,
        app_metadata: { app_user_id: row.id },
      });
      if (cErr || !created?.user) {
        await admin.from("users").delete().eq("id", row.id); // keep both sides in step
        return json(400, { error: cErr?.message ?? "Could not create login" });
      }
      await admin.from("users").update({ auth_id: created.user.id }).eq("id", row.id);
      return json(200, { user: row });
    }

    // ── set_password ─────────────────────────────────────────────────────
    if (action === "set_password") {
      const target = await loadTarget(body.user_id);
      if (!target) return json(404, { error: "User not found" });
      if (!mayManage(String(target.access).toLowerCase())) return json(403, { error: "Not allowed" });
      const problem = passwordProblem(body.password, target.company_id ?? "", target.name ?? "");
      if (problem) return json(400, { error: problem });

      if (target.auth_id) {
        const { error } = await admin.auth.admin.updateUserById(target.auth_id, { password: String(body.password) });
        if (error) return json(400, { error: error.message });
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: emailFor(target.id),
          password: String(body.password),
          email_confirm: true,
          app_metadata: { app_user_id: target.id },
        });
        if (error || !created?.user) return json(400, { error: error?.message ?? "Could not create login" });
        await admin.from("users").update({ auth_id: created.user.id }).eq("id", target.id);
      }
      await admin
        .from("users")
        .update({ must_change_password: body.must_change_password !== false })
        .eq("id", target.id);
      return json(200, { ok: true });
    }

    // ── delete ───────────────────────────────────────────────────────────
    if (action === "delete") {
      const target = await loadTarget(body.user_id);
      if (!target) return json(404, { error: "User not found" });
      if (!mayManage(String(target.access).toLowerCase())) return json(403, { error: "Not allowed" });
      if (target.id === caller.id) return json(400, { error: "You cannot delete your own account" });

      const { error: delErr } = await admin.from("users").delete().eq("id", target.id);
      if (delErr) return json(400, { error: delErr.message });
      if (target.auth_id) await admin.auth.admin.deleteUser(target.auth_id);
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("admin-users failed:", e);
    return json(500, { error: "Server error" });
  }
});
