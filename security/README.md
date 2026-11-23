# Security SQL Migration Steps

Run these two scripts **in order** in the **Supabase SQL Editor** to fully secure login.

---

## Step 1 — `01_login_function.sql` ✅ Run First

Creates the server-side `app_login` RPC and the `login_attempts` brute-force table.

**When to run:** Immediately — before or after deploying the new app version.  
**Effect:** The app will switch from plain-text password comparison to the secure bcrypt RPC.  
**Risk:** None — it supports both plain-text and hashed passwords during the transition.

```sql
-- Paste the contents of 01_login_function.sql here
```

---

## Step 2 — `02_lock_passwords.sql` ⚠️ Run ONLY After Verifying Login Works

Hashes all existing passwords with bcrypt, adds a trigger for new passwords,
and revokes the `password` column from the browser role.

**When to run:** ONLY after confirming that:
1. `01_login_function.sql` was successfully run ✅
2. The new app version is live on Vercel ✅
3. You have tested login successfully with the new app ✅

**Risk:** If run before Step 1, nobody can log in anymore (passwords hashed, RPC missing).

---

## Verification Checklist

After running Step 1:
- [ ] Open the app → try logging in normally → should work
- [ ] Check the browser console → should NOT see `app_login RPC not found` warning
- [ ] Try wrong password 8+ times → should see "Too many wrong attempts" message

After running Step 2:
- [ ] Login still works (bcrypt hashed passwords)
- [ ] In Supabase SQL Editor, run:
  ```sql
  SELECT count(*) AS plain_text_passwords_left
  FROM public.users
  WHERE password IS NOT NULL AND password !~ '^\$2[aby]\$';
  ```
  Should return **0**.
