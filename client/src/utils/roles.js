// Where each role lands after sign-in.
export function homeFor(role) {
  if (role === "viewer") return "/management-dashboard";
  if (role === "operator") return "/my-profile";
  return "/dashboard";
}
