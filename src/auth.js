const $ = (id) => document.getElementById(id);
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let user = null,
  mode = "login",
  pending = false;
let accountVersion = 0;
const dialog = $("accountDialog");
function render() {
  $("accountButton").textContent = user ? user.nickname : "로그인";
  $("accountButton").title = user ? "내 계정" : "로그인 또는 회원가입";
  $("accountTitle").textContent = user
    ? "내 계정"
    : mode === "register"
      ? "새로운 왕국의 시작"
      : "왕국에 돌아오세요";
  $("accountTabs").hidden = !!user;
  $("accountForm").hidden = !!user;
  $("accountProfile").hidden = !user;
  $("nicknameField").hidden = mode !== "register";
  $("accountNickname").required = mode === "register";
  $("passwordHelp").hidden = mode !== "register";
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
    $("profileEmail").textContent = user.email;
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
$("closeAccount").onclick = () => dialog.close();
$("accountForm").onsubmit = async (e) => {
  e.preventDefault();
  if (pending) return;
  pending = true;
  accountVersion++;
  $("accountMessage").textContent = "";
  render();
  try {
    user = await request(mode, {
      email: $("accountEmail").value,
      password: $("accountPassword").value,
      ...(mode === "register" ? { nickname: $("accountNickname").value } : {}),
    });
    $("accountPassword").value = "";
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
  accountVersion++;
  render();
  try {
    await request("logout", {});
    user = null;
    $("accountMessage").textContent = "로그아웃되었습니다.";
  } catch (e) {
    $("accountMessage").textContent = e.message;
  } finally {
    pending = false;
    render();
  }
};
request("me")
  .then((value) => {
    if (accountVersion !== 0) return;
    user = value;
    render();
  })
  .catch(() => {});
render();
