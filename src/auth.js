const $ = (id) => document.getElementById(id);
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let user = null,
  mode = "login",
  pending = false;
const dialog = $("accountDialog");
let onAuthenticated = () => {},
  onSignedOut = () => {};
function render() {
  $("accountButton").textContent = user ? user.nickname : "로그인";
  $("accountButton").title = user ? "내 계정" : "로그인 또는 회원가입";
  $("accountTitle").textContent = user
    ? "내 계정"
    : mode === "register"
      ? "새로운 왕국의 시작"
      : "왕국에 돌아오세요";
  $("closeAccount").hidden = !user || pending;
  $("accountTabs").hidden = !!user;
  $("accountForm").hidden = !!user;
  $("accountProfile").hidden = !user;
  $("nicknameField").hidden = mode !== "register";
  $("accountNickname").required = mode === "register";
  $("passwordHelp").hidden = mode !== "register";
  const loginId = $("accountUsername");
  loginId.minLength = mode === "register" ? 3 : 1;
  loginId.maxLength = mode === "register" ? 24 : 254;
  if (mode === "register") loginId.pattern = "[A-Za-z0-9_]{3,24}";
  else loginId.removeAttribute("pattern");
  $("usernameHelp").hidden = !!user || mode !== "register";
  $("accountPassword").autocomplete =
    mode === "register" ? "new-password" : "current-password";
  $("submitAccount").textContent = pending
    ? "연결 중…"
    : mode === "register"
      ? "회원가입"
      : "로그인";
  $("submitAccount").disabled = pending;
  $("logoutAccount").disabled = pending;
  $("loginTab").setAttribute("aria-pressed", String(mode === "login"));
  $("registerTab").setAttribute("aria-pressed", String(mode === "register"));
  if (user) {
    $("accountWelcome").textContent = `${user.nickname}님, 환영합니다.`;
    $("profileUsername").textContent = "아이디: " + (user.username || user.email);
  }
}
async function request(path, data) {
  let response;
  try {
    response = await fetch(base + "/api/auth/" + path, {
      method: data ? "POST" : "GET",
      credentials: "include",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("계정 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || !Object.hasOwn(payload, "user"))
    throw new Error(
      payload?.error ||
        "계정 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.",
    );
  return payload.user;
}
for (const [id, next] of [
  ["loginTab", "login"],
  ["registerTab", "register"],
])
  $(id).onclick = () => {
    if (pending) return;
    mode = next;
    $("accountMessage").textContent = "";
    render();
  };
$("accountButton").onclick = () => {
  render();
  $("accountMessage").textContent = "";
  dialog.showModal();
};
$("closeAccount").onclick = () => {
  if (user && !pending) dialog.close();
};
dialog.addEventListener("cancel", (e) => {
  if (!user || pending) e.preventDefault();
});
$("accountForm").onsubmit = async (e) => {
  e.preventDefault();
  if (pending) return;
  pending = true;
  $("accountMessage").textContent = "";
  render();
  try {
    user = await request(mode, {
      username: $("accountUsername").value,
      password: $("accountPassword").value,
      ...(mode === "register" ? { nickname: $("accountNickname").value } : {}),
    });
    $("accountPassword").value = "";
    dialog.close();
    await onAuthenticated(user);
    $("accountMessage").textContent =
      mode === "register" ? "가입이 완료되었습니다." : "로그인되었습니다.";
  } catch (e) {
    $("accountMessage").textContent = e.message;
  } finally {
    pending = false;
    render();
  }
};
$("logoutAccount").onclick = async () => {
  if (pending) return;
  pending = true;
  render();
  try {
    await request("logout", {});
    user = null;
    mode = "login";
    $("accountPassword").value = "";
    onSignedOut();
    if (!dialog.open) dialog.showModal();
    $("accountMessage").textContent = "로그아웃되었습니다.";
  } catch (e) {
    $("accountMessage").textContent = e.message;
  } finally {
    pending = false;
    render();
  }
};
export async function requireAccount(callbacks) {
  onAuthenticated = callbacks.onAuthenticated;
  onSignedOut = callbacks.onSignedOut;
  pending = true;
  render();
  dialog.showModal();
  try {
    user = await request("me");
    if (user) {
      dialog.close();
      await onAuthenticated(user);
    }
  } catch (error) {
    $("accountMessage").textContent = error.message;
  } finally {
    pending = false;
    render();
  }
}
render();
