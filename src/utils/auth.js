export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function getToken() {
  try {
    return sessionStorage.getItem("token");
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  window.location.replace("/");
}
