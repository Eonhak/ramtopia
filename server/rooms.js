import { randomBytes } from "node:crypto";
import { gameOptions, AI_LEVELS } from "../src/game-options.js";
import { runBots } from "./ai.js";
import { NATIONS } from "../src/world.js";
import {
  createMatch,
  upgradeMatch,
  applyCommand,
  expireTurn,
  matchView,
  fail,
} from "./game.js";
export function createRooms(db, clock = Date.now) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, host_id INTEGER NOT NULL, phase TEXT NOT NULL, state TEXT NOT NULL, updated_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS room_members(room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id),PRIMARY KEY(room_code,user_id)); CREATE INDEX IF NOT EXISTS member_user ON room_members(user_id);`,
  );
  const save = (r) => {
    db.prepare(
      "UPDATE rooms SET host_id=?,phase=?,state=?,updated_at=? WHERE code=?",
    ).run(r.hostId, r.phase, JSON.stringify(r), clock(), r.code);
    return r;
  };
  const read = (code) => {
    const row = db
      .prepare("SELECT state FROM rooms WHERE code=?")
      .get(String(code).toUpperCase());
    if (!row) fail("초대 코드를 확인하세요.", 404);
    const r = JSON.parse(row.state);
    if (r.game && upgradeMatch(r.game)) {
      r.version++;
      save(r);
    }
    if (r.phase === "playing" && (expireTurn(r.game, clock()) || r.game.players[r.game.activeSeat]?.bot)) {
      runBots(r.game,clock());
      r.version++;
      if (r.game.finished) r.phase = "finished";
      save(r);
    }
    return r;
  };
  const current = (userId) => {
    const rows = db
      .prepare(
        "SELECT rooms.code FROM rooms JOIN room_members ON rooms.code=room_members.room_code WHERE user_id=? AND phase IN ('lobby','playing') ORDER BY updated_at DESC",
      )
      .all(userId);
    for (const row of rows) {
      const r = read(row.code);
      if (r.phase !== "finished") return r;
    }
    return null;
  };
  const seat = (r, u) => {
    const i = r.members.findIndex((p) => p.userId === u.id);
    if (
      i < 0 ||
      !db
        .prepare("SELECT 1 FROM room_members WHERE room_code=? AND user_id=?")
        .get(r.code, u.id)
    )
      fail("초대받아 참가한 방만 볼 수 있습니다.", 403);
    return i;
  };
  const view = (r, u, since) => {
    const i = seat(r, u);
    if (String(r.version) === since)
      return {
        unchanged: true,
        code: r.code,
        version: r.version,
        serverNow: clock(),
      };
    return {
      code: r.code,
      phase: r.phase,
      version: r.version,
      hostId: r.hostId,
      title: r.title,
      timeLimit: r.timeLimit,
      settings: r.settings || gameOptions(),
      members: r.members,
      selfSeat: i,
      serverNow: clock(),
      game: r.game ? matchView(r.game, i) : null,
    };
  };
  function validatedOptions(value) {try{return gameOptions(value);}catch(e){fail(e.message);}}
  function create(user, data) {
    if (current(user.id))
      fail("참가 중인 방이 있습니다. 먼저 나가거나 이어서 플레이하세요.", 409);
    const timeLimit = data.timeLimit ?? 300;
    if (![0, 300, 600].includes(timeLimit))
      fail("5분, 10분, 무한 중 선택하세요.");
    const title =
      typeof data.title === "string" ? data.title.trim().slice(0, 40) : "";
    const r = {
      code: randomBytes(5).toString("hex").toUpperCase(),
      title: title || "함께하는 왕국",
      hostId: user.id,
      phase: "lobby",
      version: 1,
      timeLimit,
      settings: validatedOptions(data.settings),
      members: [
        {
          userId: user.id,
          nickname: user.nickname,
          nation: "rome",
          ready: false,
        },
      ],
    };
    db.prepare("INSERT INTO rooms VALUES(?,?,?,?,?)").run(
      r.code,
      r.hostId,
      r.phase,
      JSON.stringify(r),
      clock(),
    );
    db.prepare("INSERT INTO room_members VALUES(?,?)").run(r.code, user.id);
    return view(r, user);
  }
  function join(user, data) {
    const r = read(data.code);
    const previous = current(user.id);
    if (previous && previous.code !== r.code)
      fail("다른 방에 참가 중입니다. 먼저 방에서 나가세요.", 409);
    if (r.members.some((p) => p.userId === user.id)) return view(r, user);
    if (r.phase !== "lobby") fail("이미 시작하거나 종료된 방입니다.", 409);
    if (r.members.length >= 8)
      fail("방은 최대 8명까지 참가할 수 있습니다.", 409);
    const n = NATIONS.find((n) => !r.members.some((p) => p.nation === n.id));
    r.members.push({
      userId: user.id,
      nickname: user.nickname,
      nation: n.id,
      ready: false,
    });
    r.version++;
    db.prepare("INSERT INTO room_members VALUES(?,?)").run(r.code, user.id);
    save(r);
    return view(r, user);
  }
  function action(user, code, data) {
    const original = read(code);
    seat(original, user);
    if (original.phase !== "lobby" && data.version !== original.version)
      fail("방 상태가 바뀌었습니다. 최신 상태로 다시 시도하세요.", 409);
    const r = structuredClone(original),
      s = seat(r, user),
      p = r.members[s];
    if (data.type === "leave") {
      if (r.phase === "playing") {
        if(!r.game.players[s].eliminated) applyCommand(r.game, s, { type: "resign" }, clock());
        runBots(r.game,clock());
        if (r.game.finished) r.phase = "finished";
      } else if (r.phase === "lobby") {
        r.members.splice(s, 1);
        if (r.hostId === user.id && r.members.length)
          r.hostId = r.members.find(m=>!m.bot)?.userId ?? r.members[0].userId;
      }
      // A playing seat remains stable for reconnecting opponents; membership is removed for this account.
      db.prepare(
        "DELETE FROM room_members WHERE room_code=? AND user_id=?",
      ).run(r.code, user.id);
      r.version++;
      if (!r.members.some(m=>!m.bot)) r.phase = "finished";
      save(r);
      return { left: true };
    }
    if (r.phase === "lobby") {
      if (data.type === "addBot") {
        if(user.id!==r.hostId) fail("방장만 AI를 추가할 수 있습니다.",403);
        if(r.members.length>=8) fail("AI 포함 최대 8명입니다.",409);
        const difficulty=data.difficulty || r.settings?.difficulty || "normal";
        if(!Object.hasOwn(AI_LEVELS,difficulty)) fail("AI 난이도를 확인하세요.");
        const id=-Math.max(1,...r.members.filter(m=>m.bot).map(m=>-m.userId+1));
        const n=NATIONS.find(n=>!r.members.some(m=>m.nation===n.id));
        r.members.push({userId:id,nickname:`AI ${-id} · ${AI_LEVELS[difficulty]}`,nation:n.id,ready:true,bot:true,difficulty});
        for(const m of r.members.filter(m=>!m.bot)) m.ready=false;
      } else if(data.type === "removeBot") {
        if(user.id!==r.hostId) fail("방장만 AI를 제거할 수 있습니다.",403);
        const i=r.members.findIndex(m=>m.bot&&m.userId===data.userId);
        if(i<0) fail("AI를 선택하세요.");
        r.members.splice(i,1); for(const m of r.members.filter(m=>!m.bot)) m.ready=false;
      } else if(data.type === "botDifficulty") {
        if(user.id!==r.hostId) fail("방장만 AI 난이도를 변경할 수 있습니다.",403);
        const bot=r.members.find(m=>m.bot&&m.userId===data.userId);
        if(!bot||!Object.hasOwn(AI_LEVELS,data.difficulty)) fail("AI 난이도를 확인하세요.");
        bot.difficulty=data.difficulty; bot.nickname=`AI ${-bot.userId} · ${AI_LEVELS[data.difficulty]}`;
        for(const m of r.members.filter(m=>!m.bot)) m.ready=false;
      } else if (data.type === "nation") {
        if (
          !NATIONS.some((n) => n.id === data.nation) ||
          r.members.some(m => m.userId !== (data.userId ?? user.id) && m.nation === data.nation)
        )
          fail("다른 나라를 선택하세요.");
        const member = data.userId === undefined ? p : r.members.find(m=>m.userId===data.userId && m.bot && user.id===r.hostId);
        if(!member) fail("AI 나라를 변경할 권한이 없습니다.",403);
        member.nation=data.nation; member.ready=!!member.bot;
      } else if (data.type === "ready") {
        if (typeof data.ready !== "boolean") fail("준비 상태를 확인하세요.");
        p.ready = data.ready;
      } else if (data.type === "settings") {
        if (user.id !== r.hostId) fail("방장만 설정할 수 있습니다.", 403);
        if (![0, 300, 600].includes(data.timeLimit ?? r.timeLimit))
          fail("시간 설정을 확인하세요.");
        r.timeLimit = data.timeLimit ?? r.timeLimit;
        r.settings=validatedOptions({...r.settings,...data.settings});
        for (const m of r.members) m.ready = !!m.bot;
      } else if (data.type === "start") {
        if (user.id !== r.hostId) fail("방장만 시작할 수 있습니다.", 403);
        if (r.members.length < 2 || !r.members.every((m) => m.ready))
          fail("2명 이상 모두 준비해야 시작할 수 있습니다.");
        r.game = createMatch(r.members, r.timeLimit, clock(),r.settings);
        r.phase = "playing";
      } else fail("대기실에서 할 수 없는 행동입니다.");
    } else if (r.phase === "playing") {
      applyCommand(r.game, s, data, clock());
      runBots(r.game,clock());
      if (r.game.finished) r.phase = "finished";
    } else fail("종료된 방입니다.", 409);
    r.version++;
    save(r);
    return view(r, user);
  }
  return {
    create,
    join,
    action,
    current: (user) => {
      const r = current(user.id);
      return r ? view(r, user) : null;
    },
    get: (u, c, since) => view(read(c), u, since),
  };
}
