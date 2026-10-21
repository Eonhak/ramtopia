import { NATIONS } from "./world.js";
const $ = (id) => document.getElementById(id);
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let user,
  room = null,
  timer = null,
  generation = 0,
  pending = false,
  callbacks = {},
  offset = 0;
async function request(path, data) {
  let response;
  try {
    response = await fetch(base + "/api/rooms" + path, {
      method: data ? "POST" : "GET",
      credentials: "include",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("게임 서버에 연결할 수 없습니다. 다시 시도하세요.");
  }
  const value = await response.json().catch(() => null);
  if (!response.ok || !value || !Object.hasOwn(value, "room"))
    throw new Error(value?.error || "게임 서버에 연결할 수 없습니다.");
  return value.room;
}
function message(text) {
  $("lobbyMessage").textContent = text;
  $("roomMessage").textContent = text;
}
function closeDialogs() {
  for (const id of ["modeDialog", "roomDialog", "nationDialog"]) $(id).close();
}
async function accept(value) {
  if (!value) return;
  if (value.serverNow) offset = value.serverNow - Date.now();
  if (value.unchanged) return;
  if (room?.code === value.code && room.version > value.version) return;
  room = value;
  renderRoom();
  if (room.game) {
    closeDialogs();
    await callbacks.onGame(room.game, room);
  } else {
    if (!$("roomDialog").open) {
      closeDialogs();
      $("roomDialog").showModal();
    }
  }
}
function schedule() {
  clearTimeout(timer);
  const session = generation;
  timer = setTimeout(async () => {
    if (session !== generation || !room) return;
    try {
      await accept(await request("/" + room.code + "?since=" + room.version));
      message("");
    } catch (e) {
      message(e.message);
      callbacks.onConnection?.(e.message);
    } finally {
      if (session === generation) schedule();
    }
  }, 1200);
}
function renderRoom() {
  if (!room) return;
  $("roomTitle").textContent = room.title;
  $("roomCode").textContent = room.code;
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("room", room.code);
  url.hash = "";
  $("inviteLink").value = url.href;
  const host = room.hostId === user.id,
    me = room.members.find((p) => p.userId === user.id);
  $("roomTimer").value = String(room.timeLimit);
  $("roomTimer").disabled = pending || !host || room.phase !== "lobby";
  $("roomPlayers").replaceChildren();
  for (const m of room.members) {
    const row = document.createElement("div");
    row.className = "room-player";
    const title = document.createElement("strong");
    title.textContent =
      m.nickname +
      (m.userId === room.hostId ? " · 방장" : "") +
      (m.userId === user.id ? " · 나" : "");
    const n = document.createElement("select");
    n.setAttribute("aria-label", m.nickname + " 나라");
    for (const nation of NATIONS) {
      const option = new Option(nation.name, nation.id);
      option.disabled = room.members.some(
        (other) => other.userId !== m.userId && other.nation === nation.id,
      );
      n.add(option);
    }
    n.value = m.nation;
    n.disabled = pending || m.userId !== user.id || room.phase !== "lobby";
    n.onchange = () =>
      command({ type: "nation", nation: n.value }).catch((e) =>
        message(e.message),
      );
    const ready = document.createElement("span");
    ready.textContent = m.ready ? "준비 완료" : "나라 선택 중";
    ready.className = m.ready ? "ready" : "";
    row.append(title, n, ready);
    $("roomPlayers").append(row);
  }
  $("resumeRoom").hidden = room.phase === "lobby";
  $("readyRoom").disabled = pending;
  $("leaveRoom").disabled = pending;
  $("readyRoom").hidden = room.phase !== "lobby";
  $("readyRoom").textContent = me?.ready ? "준비 취소" : "준비 완료";
  $("startRoom").hidden = !host || room.phase !== "lobby";
  $("startRoom").disabled =
    pending || room.members.length < 2 || !room.members.every((m) => m.ready);
  $("roomCount").textContent = room.members.length + " / 4명";
  $("roomHelp").textContent =
    room.phase === "lobby"
      ? "초대 링크나 방 코드를 공유하세요. 2~4명 모두 준비하면 방장이 시작할 수 있습니다."
      : "진행 중인 게임입니다.";
  $("leaveRoom").textContent =
    room.phase === "playing" ? "포기하고 방 나가기" : "방 나가기";
}
async function command(data) {
  if (pending) throw new Error("이전 요청을 처리 중입니다.");
  if (!room) throw new Error("방에 먼저 참가하세요.");
  pending = true;
  renderRoom();
  const session = generation;
  try {
    const result = await request("/" + room.code + "/action", {
      ...data,
      version: room.version,
    });
    if (session !== generation) return;
    if (result.left) {
      room = null;
      clearTimeout(timer);
      closeDialogs();
      callbacks.onLeave?.();
      showMode();
    } else await accept(result);
    return result;
  } catch (e) {
    if (room && session === generation)
      try {
        await accept(await request("/" + room.code));
      } catch {}
    throw e;
  } finally {
    pending = false;
    if (room) renderRoom();
    modeBusy(false);
  }
}
function modeBusy(value) {
  $("singleMode").disabled = value;
  $("createRoom").disabled = value;
  $("joinRoom").querySelector("button").disabled = value;
}
function showMode() {
  closeDialogs();
  $("modeDialog").showModal();
  message("");
}
async function perform(fn) {
  if (pending) return;
  pending = true;
  message("");
  modeBusy(true);
  try {
    await fn();
  } catch (e) {
    message(e.message);
  } finally {
    pending = false;
    if (room) renderRoom();
    modeBusy(false);
  }
}
$("singleMode").onclick = () => {
  closeDialogs();
  callbacks.onSingle(Number($("singleTimer").value));
};
$("createRoom").onclick = () =>
  perform(async () => {
    await accept(
      await request("", {
        title: $("newRoomTitle").value,
        timeLimit: Number($("newRoomTimer").value),
      }),
    );
    schedule();
  });
$("joinRoom").onsubmit = (e) => {
  e.preventDefault();
  perform(async () => {
    await accept(
      await request("/join", {
        code: $("joinCode").value.trim().toUpperCase(),
      }),
    );
    schedule();
  });
};
$("roomTimer").onchange = () =>
  command({ type: "settings", timeLimit: Number($("roomTimer").value) }).catch(
    (e) => message(e.message),
  );
$("readyRoom").onclick = () =>
  command({
    type: "ready",
    ready: !room.members.find((m) => m.userId === user.id).ready,
  }).catch((e) => message(e.message));
$("startRoom").onclick = () =>
  command({ type: "start" }).catch((e) => message(e.message));
$("resumeRoom").onclick = () => $("roomDialog").close();
$("leaveRoom").onclick = () => {
  if (
    room.phase === "playing" &&
    !confirm("이 게임을 포기하고 방에서 나갈까요?")
  )
    return;
  command({ type: "leave" }).catch((e) => message(e.message));
};
$("copyInvite").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("inviteLink").value);
    message("초대 링크를 복사했습니다.");
  } catch {
    $("inviteLink").focus();
    $("inviteLink").select();
    message("위 초대 링크를 복사해 보내주세요.");
  }
};
for (const id of ["modeDialog", "roomDialog"])
  $(id).addEventListener("cancel", (e) => e.preventDefault());
export const lobby = {
  async open(account, handlers) {
    this.stop();
    user = account;
    callbacks = handlers;
    const session = generation;
    showMode();
    modeBusy(true);
    try {
      const invite = new URL(location.href).searchParams.get("room");
      const value = invite
        ? await request("/join", { code: invite.toUpperCase() })
        : await request("/current");
      if (session !== generation) return;
      if (value) {
        await accept(value);
        schedule();
      }
      if (invite) {
        const url = new URL(location.href);
        url.searchParams.delete("room");
        history.replaceState(null, "", url);
      }
    } catch (e) {
      if (session === generation) message(e.message);
    } finally {
      if (session === generation) modeBusy(false);
    }
  },
  command,
  showMode,
  stop() {
    generation++;
    clearTimeout(timer);
    room = null;
    pending = false;
    for (const id of ["modeDialog", "roomDialog"]) $(id).close();
  },
  returnToRoom() {
    if (!room) return showMode();
    renderRoom();
    $("roomDialog").showModal();
  },
  now: () => Date.now() + offset,
};
