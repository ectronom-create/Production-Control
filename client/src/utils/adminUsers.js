import { supabase } from "../supabaseClient";

/*
 * Account actions that need the server's secret key (create a login, set a
 * password, delete a login) go through the Supabase Edge Function
 * "admin-users". The function checks the caller's role itself:
 * admin → anyone, supervisor → operators only.
 */
async function call(action, payload) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, ...payload },
  });
  if (error) {
    let message = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    if (/Failed to send a request|fetch/i.test(message || "")) {
      message = "The account service is not reachable. Check that the admin-users function is deployed.";
    }
    throw new Error(message || "Account service error");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Create the users row + its login. Returns the new users row. */
export async function createAccount(user, password, { mustChange = true } = {}) {
  const data = await call("create", { user, password, must_change_password: mustChange });
  return data.user;
}

/** Set a new password; by default the person must change it at next login. */
export function setAccountPassword(userId, password, { mustChange = true } = {}) {
  return call("set_password", { user_id: userId, password, must_change_password: mustChange });
}

/** Delete the users row and its login. */
export function deleteAccount(userId) {
  return call("delete", { user_id: userId });
}
