// ============================================================================
// SECURITY PHASE 1 — STEP 1b: move every app user to Supabase Auth
//
// Run ONCE on the work PC, after 03_auth_prepare.sql:
//     cd "C:\Users\Ectron_WH\Desktop\ai agent\PRODUCTION CONTROL  ؤؤ\server"
//     npm install
//     node ..\security\migrate-users-to-auth.mjs --dry-run     (shows what it will do)
//     node ..\security\migrate-users-to-auth.mjs              (does it)
//
// It asks for the service_role key (Supabase → Settings → API → service_role).
// The key is only used in memory for this run: never paste it in chat, in the
// app code, or in a file you commit.
//
// Each user keeps the SAME password: the bcrypt hash already stored in
// users.password is copied to the Auth account (the password itself is never
// seen). Users flagged must_change_password are asked for a new one at login.
// Safe to run again: users already linked (auth_id set) are skipped.
// ============================================================================

import { createRequire } from "node:module";
import readline from "node:readline/promises";
import { stdin, stdout, argv, env, exit } from "node:process";
import { randomBytes } from "node:crypto";

const require = createRequire(new URL("../server/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = env.SUPABASE_URL || "https://jmlpesgvewubbtsetkov.supabase.co";
const EMAIL_DOMAIN = env.ECTRON_EMAIL_DOMAIN || "ectron.local"; // must match the Edge Function
const DRY_RUN = argv.includes("--dry-run");
const isBcrypt = (h) => typeof h === "string" && /^\$2[aby]\$\d\d\$/.test(h);

async function askKey() {
  const fromEnv = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (fromEnv) return fromEnv.trim();
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const key = (await rl.question("Paste the service_role key and press Enter: ")).trim();
  rl.close();
  return key;
}

async function main() {
  const key = await askKey();
  // Newer Supabase projects show a secret key "sb_secret_..." instead of the
  // legacy service_role JWT. Both work with the admin API.
  if (key.startsWith("sb_publishable_")) {
    console.error("That is the publishable (public) key. Use the secret / service_role key. Nothing was changed.");
    exit(1);
  }
  if (!key.startsWith("sb_secret_")) try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString());
    if (payload.role !== "service_role") throw new Error();
  } catch {
    console.error("That is not the service_role key (it looks like a different key). Nothing was changed.");
    exit(1);
  }

  const db = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: users, error } = await db
    .from("users")
    .select("id, name, company_id, access, password, auth_id, must_change_password")
    .order("id");
  if (error) {
    console.error("Could not read users:", error.message);
    console.error("Did you run security/03_auth_prepare.sql first?");
    exit(1);
  }

  // Existing Auth accounts by e-mail (for re-runs)
  const existing = new Map();
  for (let page = 1; ; page++) {
    const { data, error: listErr } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (listErr) { console.error("Could not list Auth users:", listErr.message); exit(1); }
    for (const u of data.users) existing.set((u.email || "").toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }

  let linked = 0, created = 0, skipped = 0, failed = 0, tempPasswords = [];
  console.log(`\n${users.length} users. ${DRY_RUN ? "DRY RUN — nothing will be changed.\n" : ""}`);

  for (const u of users) {
    const label = `#${u.id} ${u.name} (${u.company_id || "no ID"}, ${u.access})`;
    if (u.auth_id) { skipped++; continue; }
    const email = `user-${u.id}@${EMAIL_DOMAIN}`;

    let authId = existing.get(email);
    if (!authId) {
      const attrs = { email, email_confirm: true, app_metadata: { app_user_id: u.id } };
      let mustChange = u.must_change_password;
      if (isBcrypt(u.password)) {
        attrs.password_hash = u.password;              // same password as today
      } else if (typeof u.password === "string" && u.password.length >= 8) {
        attrs.password = u.password;                   // old plain-text row
      } else {
        const temp = randomBytes(6).toString("base64url") + "7a"; // letters + digits
        attrs.password = temp;
        mustChange = true;
        tempPasswords.push({ id: u.id, name: u.name, company_id: u.company_id, temp });
      }
      if (DRY_RUN) { console.log(`would create login for ${label}`); created++; continue; }

      const { data, error: cErr } = await db.auth.admin.createUser(attrs);
      if (cErr || !data?.user) { console.error(`FAILED ${label}: ${cErr?.message}`); failed++; continue; }
      authId = data.user.id;
      created++;
      if (mustChange && !u.must_change_password) {
        await db.from("users").update({ must_change_password: true }).eq("id", u.id);
      }
    } else if (DRY_RUN) {
      console.log(`would link existing login for ${label}`);
      linked++;
      continue;
    }

    const { error: upErr } = await db.from("users").update({ auth_id: authId }).eq("id", u.id);
    if (upErr) { console.error(`FAILED to link ${label}: ${upErr.message}`); failed++; continue; }
    linked++;
    console.log(`ok   ${label}`);
  }

  console.log(`\nDone. created: ${created}, linked: ${linked}, already linked: ${skipped}, failed: ${failed}`);
  if (tempPasswords.length) {
    console.log("\nThese accounts had no usable password. Give each person this TEMPORARY password;");
    console.log("they must choose a new one at the first login:");
    for (const t of tempPasswords) console.log(`  ${t.company_id || t.name}  →  ${t.temp}`);
  }
  if (failed) exit(2);
}

main().catch((e) => { console.error(e); exit(1); });
