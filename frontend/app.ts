const PROJECT_REF = "niilyhwgzffvbmtyfgnw";
const FUNCTION_NAME = "matches";

const isLanIp = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(location.hostname);
const isLocalHostname = ["127.0.0.1", "localhost", "0.0.0.0"].includes(location.hostname) || location.hostname.endsWith(".local");
const isLocal = isLocalHostname || isLanIp;
const API_BASE = isLocal
  ? `http://127.0.0.1:54321/functions/v1/${FUNCTION_NAME}`
  : `https://${PROJECT_REF}.functions.supabase.co/${FUNCTION_NAME}`;
const UPDATE_REPO_OWNER = "YusukeMukaiyama";
const UPDATE_REPO_NAME = "mahjong_portfolio";

const $ = (id) => document.getElementById(id);
let latestUpdateDateLabel = null;
let latestUpdateLoading = false;

function formatIsoToYmd(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function setHomeFooterText(label) {
  const textEl = $("homeFooterText");
  if (!textEl) return;
  textEl.textContent = `最終アップデート日付：${label}`;
}

function setHomeFooterVisible(visible) {
  const footer = $("homeFooter");
  if (!footer) return;
  footer.classList.toggle("hidden", !visible);
}

async function ensureLatestUpdateDate() {
  if (latestUpdateDateLabel) return;
  if (latestUpdateLoading) return;
  latestUpdateLoading = true;
  try {
    const url = `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`;
    const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const iso = data && typeof data.pushed_at === "string" ? data.pushed_at : null;
    const ymd = iso ? formatIsoToYmd(iso) : null;
    latestUpdateDateLabel = ymd || "不明";
  } catch {
    latestUpdateDateLabel = "不明";
  } finally {
    latestUpdateLoading = false;
    setHomeFooterText(latestUpdateDateLabel || "不明");
  }
}

function getHistoryRowDisplayName(row, participantNameById, fallbackNames) {
  if (typeof resolveHistoryRowName === "function") {
    return resolveHistoryRowName(row, participantNameById, fallbackNames);
  }
  const pid = row?.participant_id != null ? String(row.participant_id) : "";
  if (pid && participantNameById && typeof participantNameById.get === "function") {
    const fromMap = participantNameById.get(pid);
    if (typeof fromMap === "string" && fromMap.length) return fromMap;
  }
  const displayName = typeof row?.display_name === "string" ? row.display_name.trim() : "";
  if (displayName) return displayName;
  const seatIndex = Number(row?.seat_index);
  if (Number.isInteger(seatIndex) && Array.isArray(fallbackNames) && seatIndex >= 0 && seatIndex < fallbackNames.length) {
    const fb = fallbackNames[seatIndex];
    if (typeof fb === "string" && fb.length) return fb;
  }
  return Number.isInteger(seatIndex) ? `Seat ${seatIndex}` : "Seat ?";
}

// ------- UI helpers -------
function showToast(message, type = "success", timeout = 3000) {
  const container = $("toastContainer");
  if (!container) return;
  const div = document.createElement("div");
  div.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => div.remove(), timeout);
}
function showError(msg) {
  const box = $("errorBox");
  if (!box) return;
  box.textContent = msg || "";
  box.style.display = msg ? "block" : "none";
}
function showDetailError(msg) {
  const box = $("detailError");
  if (!box) return;
  box.textContent = msg || "";
  box.style.display = msg ? "block" : "none";
}
function showScoreError(msg) {
  const box = $("detailScoreError");
  if (!box) return;
  box.textContent = msg || "";
  box.style.display = msg ? "block" : "none";
}
function translateValidationMessage(msg) {
  if (!msg || typeof msg !== "string") return "";
  const map = [
    { k: "scores must have 4 items", v: "スコアは4人分すべて入力してください。" },
    { k: "invalid score item", v: "スコアの形式が不正です。もう一度入力してください。" },
    { k: "seat_index must be 0..3", v: "内部エラー: 座席番号が不正です。ページを再読み込みしてやり直してください。" },
    { k: "raw_score must be multiple of 100", v: "各スコアは100点単位で入力してください。" },
    { k: "each seat_index must appear once", v: "4人分それぞれ1回ずつ入力してください。" },
    { k: "scores must include seat_index 0..3", v: "4人分のスコアをすべて入力してください。" },
    { k: "sum must be 100000", v: "合計は100000点です。入力値を確認してください。" },
    { k: "game number must be a positive integer", v: "対象ゲーム番号が不正です。画面を再読み込みしてやり直してください。" },
    { k: "同時更新が発生しました", v: "他のユーザー更新と競合しました。再読み込みしてもう一度お試しください。" },
    { k: "not found", v: "対局が見つかりません。" },
    { k: "oka_points / uma_low / uma_high は整数で入力してください", v: "オカ・ウマは整数で入力してください。" },
    { k: "ウマは自然数で入力してください", v: "ウマは自然数（例: 5-10 のように）で入力してください。" },
    { k: "ウマは high >= low となるように入力してください", v: "ウマは「low-high」で high が low 以上になるように入力してください。" },
  ];
  const found = map.find((x) => msg.includes(x.k));
  return found ? found.v : msg;
}
function friendlyApiError(status, msg, fallback) {
  if (status === 404) return "対象のデータが見つかりません。やり直してください。";
  if (status === 409) return translateValidationMessage(msg) || msg || "他のユーザー更新と競合しました。再読み込みしてお試しください。";
  if (status === 422 || status === 400) return translateValidationMessage(msg) || fallback;
  return "システムエラーが発生しました。時間を置いて再度お試しください。";
}
function setBusy(btn, busy, labelBusy) {
  if (!btn) return;
  if (busy) {
    btn.setAttribute("disabled", "true");
    btn.dataset.label = btn.textContent;
    if (labelBusy) btn.textContent = labelBusy;
  } else {
    btn.removeAttribute("disabled");
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

// ------- router -------
function go(path) {
  if (!path) path = "/";
  try {
    if (/^https?:\/\//.test(path)) {
      const u = new URL(path);
      path = u.hash && u.hash.startsWith("#") ? u.hash : u.pathname + u.search + (u.hash || "");
    }
  } catch {}
  if (path.startsWith("#")) location.hash = path;
  else {
    if (!path.startsWith("/")) path = "/" + path;
    location.hash = "#" + path;
  }
}
function route() {
  const info = typeof resolveRouteView === "function"
    ? resolveRouteView(location.hash || "", location.pathname)
    : (() => {
        const hash = location.hash || "";
        const path = hash.startsWith("#") && hash.length > 1 ? hash.slice(1) : location.pathname;
        const m = path.match(/^\/matches\/([^/]+)$/);
        return m ? { view: "detail", matchId: decodeURIComponent(m[1]) } : { view: "home", matchId: null };
      })();
  if (info.view === "detail" && info.matchId) {
    $("homeView").classList.add("hidden");
    $("listSection")?.classList.add("hidden");
    $("detailView").classList.remove("hidden");
    setHomeFooterVisible(false);
    loadMatchDetail(info.matchId);
  } else {
    $("detailView").classList.add("hidden");
    $("homeView").classList.remove("hidden");
    $("listSection")?.classList.remove("hidden");
    setHomeFooterVisible(true);
    if (!latestUpdateDateLabel) {
      setHomeFooterText("取得中...");
      void ensureLatestUpdateDate();
    } else {
      setHomeFooterText(latestUpdateDateLabel);
    }
    loadMatches();
  }
}

// ------- create match -------
async function createMatch() {
  showError("");
  const title = $("title").value.trim();
  const p1 = $("p1").value.trim();
  const p2 = $("p2").value.trim();
  const p3 = $("p3").value.trim();
  const p4 = $("p4").value.trim();

  const okaSel = $("oka_select").value;
  let oka_points = okaSel === "custom" ? Number($("oka_custom").value) : Number(okaSel);

  const umaSel = $("uma_select").value;
  let uma_low, uma_high, umaText = umaSel;
  if (umaSel === "custom") umaText = $("uma_custom").value.trim();
  const mU = umaText.match(/^(\d+)\s*-\s*(\d+)$/);
  if (mU) { uma_low = Number(mU[1]); uma_high = Number(mU[2]); }
  else { showError("ウマは『low-high』の形式（例: 5-15）で入力してください"); return; }

  const names = [p1, p2, p3, p4];
  if (names.some((n) => n.length === 0)) { showError("参加者は4人必要です（名前は空欄不可）"); return; }
  if (new Set(names.map((n) => n.toLowerCase())).size !== 4) { showError("名前は重複不可です"); return; }
  if (![oka_points, uma_low, uma_high].every(Number.isInteger)) { showError("oka_points / uma_low / uma_high は整数で入力してください"); return; }
  if (oka_points < 0 || oka_points > 100000 || (okaSel === "custom" && oka_points % 100 !== 0)) { showError("オカは0〜100000、100点単位で入力してください"); return; }
  if (uma_low <= 0 || uma_high <= 0) { showError("ウマは自然数で入力してください（例: low=5, high=10）"); return; }
  if (uma_high < uma_low) { showError("ウマは high >= low となるように入力してください"); return; }

  const btn = $("createBtn");
  try {
    setBusy(btn, true, "作成中...");
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || undefined, participants: names, oka_points, uma_low, uma_high }),
    });
    const data = await res.json();
    if (!res.ok) { showError(friendlyApiError(res.status, data?.error, "作成に失敗しました")); return; }

    ["title","p1","p2","p3","p4"].forEach((id) => ($(id).value = ""));
    $("oka_select").value = "30000"; $("oka_custom").value = ""; $("oka_custom_wrap").style.display = "none";
    $("uma_select").value = "5-15"; $("uma_custom").value = ""; $("uma_custom_wrap").style.display = "none";
    // モーダルを閉じて詳細へ遷移
    try { window.closeCreateModal && window.closeCreateModal(); } catch {}
    if (data && data.id) {
      go(`/matches/${encodeURIComponent(data.id)}`);
    } else {
      showToast("対局を作成しました");
      await loadMatches();
    }
  } catch {
    showError("通信に失敗しました。ネットワークをご確認の上、再度お試しください。");
  } finally {
    setBusy(btn, false);
  }
}

// ------- list view -------
function renderMatches(list) {
  const root = $("matchesList");
  root.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "対局はまだありません。上のフォームから新しく作成しましょう。";
    root.appendChild(empty);
    return;
  }
  list.forEach((m) => {
    const when = new Date(m.updated_at);
    const gameCount = typeof m.game_count === "number" ? m.game_count : 0;

    const link = document.createElement("a");
    link.href = `/#/matches/${encodeURIComponent(m.id)}`;
    link.className = "card-link";
    link.setAttribute("aria-label", `対局「${m.title}」を開く`);

    const card = document.createElement("div"); card.className = "match-card";
    const title = document.createElement("h3"); title.className = "match-title"; title.textContent = m.title || "(無題)"; card.appendChild(title);

    if (Array.isArray(m.participants) && m.participants.length) {
      const chips = document.createElement("div"); chips.className = "chips";
      m.participants.forEach((name) => { const chip = document.createElement("span"); chip.className = "chip"; chip.textContent = name; chips.appendChild(chip); });
      card.appendChild(chips);
    }

    const meta = document.createElement("div"); meta.className = "card-meta";
    const pill1 = document.createElement("span"); pill1.className = "pill"; pill1.textContent = `オカ ${m.oka_points}`;
    const pill2 = document.createElement("span"); pill2.className = "pill"; pill2.textContent = `ウマ ${Math.abs(m.uma_low)}/${Math.abs(m.uma_high)}`;
    const pill3 = document.createElement("span"); pill3.className = "pill"; pill3.textContent = `対局数 ${gameCount}`;
    const pill4 = document.createElement("span"); pill4.className = "pill"; pill4.textContent = `更新 ${when.toLocaleString("ja-JP")}`;
    meta.append(pill1, pill2, pill3, pill4); card.appendChild(meta);

    const actions = document.createElement("div"); actions.className = "card-actions";
    const openBtn = document.createElement("button"); openBtn.className = "btn btn-primary"; openBtn.textContent = "詳細を開く";
    openBtn.addEventListener("click", (ev) => { ev.preventDefault(); go(`/matches/${encodeURIComponent(m.id)}`); });
    actions.appendChild(openBtn); card.appendChild(actions);

    link.appendChild(card); root.appendChild(link);
  });
}
async function loadMatches() {
  try {
    const root = $("matchesList");
    if (root) {
      root.innerHTML = "";
      for (let i = 0; i < 6; i++) {
        const sk = document.createElement("div");
        sk.className = "skeleton skeleton-card";
        const l1 = document.createElement("div"); l1.className = "skeleton-line"; l1.style.width = "60%"; l1.style.marginBottom = "10px";
        const l2 = document.createElement("div"); l2.className = "skeleton-line"; l2.style.width = "90%"; l2.style.marginBottom = "6px";
        const l3 = document.createElement("div"); l3.className = "skeleton-line"; l3.style.width = "40%";
        sk.append(l1, l2, l3); root.appendChild(sk);
      }
    }
    const res = await fetch(API_BASE, { method: "GET" });
    const list = await res.json();
    renderMatches(Array.isArray(list) ? list : []);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  }
}

// ------- detail view -------
let currentMatchId = null;
let currentParticipants = []; // [{id,name,seat_priority}]
let currentActiveGameNumber = null;

async function loadMatchDetail(id) {
  showDetailError("");
  $("detailTitle").textContent = "対局詳細";
  $("gameTabs").innerHTML = "";
  const bodyEl = $("gameTableBody");
  if (bodyEl) {
    bodyEl.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4; td.textContent = "読み込み中..."; tr.appendChild(td); bodyEl.appendChild(tr);
  }
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "GET" });
    const m = await res.json();
    if (!res.ok) {
      showDetailError(friendlyApiError(res.status, m?.error, `読み込みに失敗しました (${res.status})`));
      const tabs = $("gameTabs");
      const tbody = $("gameTableBody");
      const cardList = $("gameCardList");
      if (tabs) tabs.innerHTML = "";
      if (tbody) tbody.innerHTML = "";
      if (cardList) cardList.innerHTML = "";
      return;
    }
    renderDetail(m);
  } catch {
    showDetailError("通信に失敗しました。ネットワークをご確認の上、再度お試しください。");
  }
}

function renderDetail(m) {
  currentMatchId = m.id;
  currentParticipants = (m.participants || []).slice();

  $("detailTitle").textContent = m.title;
  // 次のゲーム数（例: 10半荘目）をタイトル横に表示
  const nextGameEl = $("nextGameIndicator");
  if (nextGameEl) {
    const games = Array.isArray(m.games) ? m.games : [];
    const maxNo = games.length ? Math.max(...games.map(g => g.number || 0)) : 0;
    const next = maxNo + 1;
    nextGameEl.innerHTML = `<span class="num">${next}</span><span class="unit">半荘目</span>`;
  }
  $("detailStart").textContent = m.start_points;
  $("detailOka").textContent = m.oka_points;
  $("detailUma").textContent = `${Math.abs(m.uma_low)} / ${Math.abs(m.uma_high)}`;

  // 名前入力：テキスト入力からプルダウンに変更
  // 対局参加者（作成時の名前）を選択肢として表示し、席順デフォルトを選択状態にする
  const defaults = [0,1,2,3].map(i => currentParticipants.find(p => p.seat_priority === i)?.name || "");
  const options = (currentParticipants || []).map(p => p.name);
  ["seat0name","seat1name","seat2name","seat3name"].forEach((id, i) => {
    const sel = $(id);
    if (!sel) return;
    // 再描画時も常に選択肢を作り直す
    sel.innerHTML = "";
    // プレースホルダー（手動でクリアできるよう有効のまま）
    const ph = document.createElement("option");
    ph.value = ""; ph.textContent = "選択";
    sel.appendChild(ph);
    options.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
    // 席順のデフォルト名を優先して選択
    const def = defaults[i];
    if (def && options.includes(def)) sel.value = def;
  });
  ["seat0","seat1","seat2","seat3"].forEach((id) => { if ($(id) && !$(id).value) $(id).value = "25000"; });

  // 座席名セレクトの一意制約とオートフィル（北家残り1名の自動入力）
  bindSeatNameUniqueHandlers();
  enforceUniqueSeatNames();

  renderTotals(m);
  renderGames(m);
  drawTrendChartFromGames(m);
}

// 4つのセレクトで同一名が重複しないように、他の席で選択済みの名前を選択不能にする
function enforceUniqueSeatNames() {
  const sels = ["seat0name","seat1name","seat2name","seat3name"].map(id => $(id)).filter(Boolean);
  if (sels.length !== 4) return;
  const allNames = (currentParticipants || []).map(p => p.name);

  // 現在の選択を取得
  let s0 = sels[0].value; // 東家: 制約なし（全員から選択可）
  let s1 = sels[1].value; // 南家: 東家で選ばれた人以外
  let s2 = sels[2].value; // 西家: 東家/南家で選ばれた人以外
  const skipAuto = !!window.__skipAutoAssignSeatNames;

  // 南家の許容候補: 東家の選択以外
  const allow1 = allNames.filter(n => n !== s0);
  if (!skipAuto) {
    if (!allow1.includes(s1) && allow1.length) {
      s1 = allow1[0];
      sels[1].value = s1;
    }
  }

  // 西家の許容候補: 東家/南家の選択以外
  const allow2 = allNames.filter(n => n !== s0 && n !== s1);
  if (!skipAuto) {
    if (!allow2.includes(s2) && allow2.length) {
      s2 = allow2[0];
      sels[2].value = s2;
    }
  }

  // 北家の自動確定: 残り1名なら自動設定
  const remain = allNames.filter(n => n !== s0 && n !== s1 && n !== s2);
  if (remain.length === 1) {
    sels[3].value = remain[0];
  }

  // option の活性/非活性設定
  // 東家: 全員選択可能
  Array.from(sels[0].options).forEach(opt => { opt.disabled = false; });
  // 南家: 東家選択者のみ非活性（ただし自身の選択は残す）
  Array.from(sels[1].options).forEach(opt => {
    opt.disabled = (opt.value === s0) && (opt.value !== s1);
  });
  // 西家: 東家/南家の選択者を非活性（ただし自身の選択は残す）
  Array.from(sels[2].options).forEach(opt => {
    const dis = (opt.value === s0 || opt.value === s1) && (opt.value !== s2);
    opt.disabled = dis;
  });
  // 北家: 残り1名が決まっていれば他は非活性
  if (remain.length === 1) {
    Array.from(sels[3].options).forEach(opt => { opt.disabled = (opt.value !== remain[0]); });
  } else {
    Array.from(sels[3].options).forEach(opt => { opt.disabled = false; });
  }
}

function bindSeatNameUniqueHandlers() {
  const ids = ["seat0name","seat1name","seat2name","seat3name"];
  ids.forEach(id => {
    const sel = $(id);
    if (!sel || sel.__uniqueBound) return;
    sel.addEventListener('change', () => enforceUniqueSeatNames());
    sel.__uniqueBound = true;
  });
}

// 登録成功時に、名前セレクトと点数入力をプレースホルダー表示（空）に戻す
function resetEntryFieldsToPlaceholders() {
  try {
    window.__skipAutoAssignSeatNames = true;
    ["seat0name","seat1name","seat2name","seat3name"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    ["seat0","seat1","seat2","seat3"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    enforceUniqueSeatNames();
  } finally {
    window.__skipAutoAssignSeatNames = false;
  }
}

// ライブ差分表示は不要（登録時のみメッセージに差分を表示）

function renderGames(m) {
  const holder = $("detailGames");
  let tabs = $("gameTabs");
  let tbody = $("gameTableBody");
  if (!holder) return;

  tabs.innerHTML = "";
  tbody.innerHTML = "";
  const cardList = $("gameCardList");
  if (cardList) cardList.innerHTML = "";
  const games = Array.isArray(m.games) ? m.games : [];
  if (!games.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4; td.textContent = "ゲームはまだ登録されていません。上のフォームから登録しましょう。";
    tr.appendChild(td); tbody.appendChild(tr);
    return;
  }

  const gameByNo = new Map();
  games.forEach(g => gameByNo.set(g.number, g));
  if (!currentActiveGameNumber || !gameByNo.has(currentActiveGameNumber)) currentActiveGameNumber = games[0].number;

  // tabs
  games.forEach(g => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (g.number === currentActiveGameNumber ? " tab-active" : "");
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", g.number === currentActiveGameNumber ? "true" : "false");
    btn.textContent = `Game ${g.number}`;
    btn.addEventListener("click", () => { currentActiveGameNumber = g.number; renderGames(m); });
    tabs.appendChild(btn);
  });

  // table rows for active game
  const g = gameByNo.get(currentActiveGameNumber);
  const rows = (g.results || []).slice().sort((a,b)=> a.seat_index - b.seat_index);

  // 表示名は API の participant_id/display_name を優先して解決する
  const fallbackNames = [0,1,2,3].map(i => currentParticipants.find(p => p.seat_priority === i)?.name || `Seat ${i}`);
  const participantNameById = new Map((currentParticipants || []).map((p) => [String(p.id), p.name]));

  // Mobile card list rendering
  rows.forEach(r => {
    const displayName = getHistoryRowDisplayName(r, participantNameById, fallbackNames);
    const tr = document.createElement("tr");
    const tdRank = document.createElement("td"); tdRank.textContent = String(r.rank);
    const tdName = document.createElement("td"); tdName.textContent = displayName;
    const tdScore = document.createElement("td");
    const inp = document.createElement("input");
    inp.type = "text"; inp.setAttribute('inputmode','numeric'); inp.setAttribute('pattern','[0-9\\-]*'); inp.className = 'score-input';
    inp.value = String(r.raw_score); inp.id = `editScore-${r.seat_index}`;
    tdScore.appendChild(inp);
    const tdTotal = document.createElement("td"); tdTotal.textContent = r.pt_total.toFixed(1);
    tr.appendChild(tdRank); tr.appendChild(tdName); tr.appendChild(tdScore); tr.appendChild(tdTotal);
    tbody.appendChild(tr);

    // Card view for mobile
    if (cardList) {
      const card = document.createElement("div");
      card.className = "table-card";

      const rowTop = document.createElement("div");
      rowTop.className = "row";
      const left = document.createElement("div");
      const rankBadge = document.createElement("span"); rankBadge.className = "rank-badge"; rankBadge.textContent = String(r.rank);
      const nameEl = document.createElement("span"); nameEl.className = "name"; nameEl.textContent = displayName;
      left.appendChild(rankBadge); left.appendChild(nameEl);
      const totalEl = document.createElement("div"); totalEl.textContent = r.pt_total.toFixed(1) + "pt";
      totalEl.className = (r.pt_total > 0 ? "pos" : (r.pt_total < 0 ? "neg" : ""));
      rowTop.appendChild(left); rowTop.appendChild(totalEl);

      const rowBottom = document.createElement("div");
      const inp2 = document.createElement("input"); inp2.type = "text"; inp2.setAttribute('inputmode','numeric'); inp2.setAttribute('pattern','[0-9\\-]*'); inp2.className = 'score-input'; inp2.value = String(r.raw_score); inp2.id = `editScoreCard-${r.seat_index}`;
      inp2.style.width = "100%"; inp2.style.textAlign = "right";
      rowBottom.appendChild(inp2);

      card.appendChild(rowTop);
      card.appendChild(rowBottom);
      cardList.appendChild(card);
    }
  });
}

function renderTotals(m) {
  const tbody = $("totalsTable");
  tbody.innerHTML = "";
  // サーバ計算済みの participant_id ベース (cumulative_scores) を優先
  const byPid = new Map();
  const totalsSrv = Array.isArray(m.cumulative_scores) ? m.cumulative_scores : [];
  totalsSrv.forEach((t) => { if (t && typeof t.participant_id === 'string') byPid.set(t.participant_id, t.total || 0); });

  // Fallback: games[].results[].participant_id から合算
  if (byPid.size === 0) {
    const games = Array.isArray(m.games) ? m.games : [];
    games.forEach(g => {
      (g.results || []).forEach((r) => {
        const pid = r.participant_id;
        if (pid && typeof r?.pt_total === 'number') byPid.set(pid, (byPid.get(pid) || 0) + r.pt_total);
      });
    });
  }

  if (byPid.size === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td"); td.colSpan = 3; td.textContent = "まだスコアなし";
    tr.appendChild(td); tbody.appendChild(tr);
    return;
  }
  const rows = (currentParticipants || []).slice().sort((a,b)=>a.seat_priority-b.seat_priority).map(p => ({
    name: p.name,
    participant_id: p.id,
    total: byPid.get(p.id) || 0,
  }));
  rows.sort((a, b) => (b.total - a.total));
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    const tdRank = document.createElement("td"); tdRank.innerHTML = `<span class="rank-badge">${i+1}</span>`;
    const tdName = document.createElement("td"); tdName.textContent = r.name;
    const tdTotal = document.createElement("td"); tdTotal.textContent = `${r.total.toFixed(1)}pt`;
    tdTotal.className = (r.total > 0 ? "pos" : (r.total < 0 ? "neg" : "")) + " score";
    tr.appendChild(tdRank); tr.appendChild(tdName); tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });
}

// ------- スコア登録（名前はローカル保存のみ。サーバへは送らない） -------
async function submitScores() {
  showScoreError("");
  const id = currentMatchId;
  if (!id) return;

  // 入力値
  const namesBySeat = [ $("seat0name").value.trim(), $("seat1name").value.trim(), $("seat2name").value.trim(), $("seat3name").value.trim() ];
  const scores = [0,1,2,3].map(i => Number($(`seat${i}`).value));

  // 参加者ID解決（名前→id）
  const nameToId = new Map((currentParticipants || []).map(p => [String(p.name), String(p.id)]));
  const players = [0,1,2,3].map(i => {
    const nm = namesBySeat[i];
    const pid = nameToId.get(nm || '') || undefined;
    return { seat_index: i, participant_id: pid, display_name: nm || undefined, name: nm || undefined };
  });
  if (players.some(p => !p.participant_id)) { showScoreError("参加者の選択が不正です"); return; }

  // バリデーション（スコア）
  if (scores.some(v => !Number.isInteger(v))) { showScoreError("整数で入力してください"); return; }
  if (scores.some(v => v % 100 !== 0)) { showScoreError("raw_score は100点単位"); return; }
  const sum = scores.reduce((a,b)=>a+b,0);
  if (sum !== 100000) {
    const delta = 100000 - sum; // >0: 不足, <0: 過剰
    const msg = `${Math.abs(delta)}点${delta > 0 ? '不足' : '過剰'}`;
    showScoreError(`現在合計: ${sum}点、${msg}`);
    return;
  }

  // 送信用（サーバは seat_index / raw_score のみを使用）
  const payload = {
    scores: [0,1,2,3].map(i => ({ seat_index: i, raw_score: scores[i] })),
    players
  };

  const btn = $("saveGameBtn");
  try {
    setBusy(btn, true, "登録中...");

    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showScoreError(friendlyApiError(res.status, data?.error, "登録できませんでした"));
      return;
    }

    renderDetail(data);
    // 次回入力に向けてプレースホルダーへリセット
    resetEntryFieldsToPlaceholders();
    showToast("ゲームを登録しました");
  } catch {
    showScoreError("通信に失敗しました。ネットワークをご確認の上、再度お試しください。");
  } finally {
    setBusy(btn, false);
  }
}

// ------- 累計pt 推移グラフ（Canvas） -------
// Pastel color palette for trend lines (blue/green/pink/yellow)
const TREND_COLORS = ["#93c5fd","#86efac","#f9a8d4","#fde68a"]; // pastel

// Canvas: High-DPI aware resize (keeps aspect from width/height attributes)
function resizeCanvasToDisplaySize(canvas) {
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const attrW = Number(canvas.getAttribute('width')) || 900;
  const attrH = Number(canvas.getAttribute('height')) || 320;
  const aspect = Number(canvas.dataset.aspect) || (attrH / attrW);
  const cssWidth = Math.max(1, canvas.clientWidth || (canvas.parentElement?.clientWidth || attrW));
  const cssHeight = Math.max(1, Math.round(cssWidth * aspect));
  const pxWidth = Math.round(cssWidth * dpr);
  const pxHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== pxWidth || canvas.height !== pxHeight) {
    canvas.width = pxWidth;
    canvas.height = pxHeight;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
  }
  const ctx = canvas.getContext('2d');
  // map 1 unit = 1 CSS pixel after this transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: cssWidth, height: cssHeight, dpr };
}

function drawTrendChartFromGames(m) {
  const canvas = $("trendCanvas"); if (!canvas) return;
  const games = Array.isArray(m.games) ? m.games : [];
  // keep last games for resize redraws
  try { window.__lastGames = games.slice(); } catch {}

  // responsive + high DPI sizing
  const resized = resizeCanvasToDisplaySize(canvas);
  if (!resized) return;
  const ctx = resized.ctx;

  // 参加者IDごとの累計（表示順は participants の seat_priority）
  const ordered = (currentParticipants || []).slice().sort((a,b)=>a.seat_priority-b.seat_priority);
  const ids = ordered.map(p=>p.id);
  const namesById = ordered.map(p=>p.name);
  const totals = [0,0,0,0];
  const series = [0,1,2,3].map(()=>[]); // 各人の {x: gameNo, y: total}
  const seatIndexToOrderedIdx = new Map([0,1,2,3].map(i=>[i, ordered.findIndex(p=>p.seat_priority===i)]));

  games.forEach(g => {
    (g.results || []).forEach(r => {
      const pid = r.participant_id;
      let idx = pid ? ids.indexOf(pid) : -1;
      if (idx < 0) idx = seatIndexToOrderedIdx.get(r.seat_index) ?? -1;
      if (idx >=0 && idx < 4) totals[idx] += r.pt_total;
    });
    const no = g.number;
    [0,1,2,3].forEach(i => series[i].push({ x: no, y: +totals[i] }));
  });

  // スケール
  const allPts = series.flat();
  const minX = games.length ? games[0].number : 0;
  const maxX = games.length ? games[games.length-1].number : 1;
  const ys = allPts.map(p => p.y).concat(0);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const padY = Math.max(10, Math.round((maxY - minY) * 0.1));
  const yMin = Math.floor((minY - padY) * 10) / 10;
  const yMax = Math.ceil((maxY + padY) * 10) / 10;

  const margin = { left: 60, right: 20, top: 20, bottom: 40 };
  const W = resized.width, H = resized.height;
  const X = (x) => maxX === minX ? margin.left : margin.left + (x - minX) * (W - margin.left - margin.right) / (maxX - minX);
  const Y = (y) => yMax === yMin ? H - margin.bottom : H - margin.bottom - (y - yMin) * (H - margin.top - margin.bottom) / (yMax - yMin);

  // クリア
  ctx.clearRect(0,0,W,H);
  ctx.font = "12px system-ui";

  // グリッド
  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
  const steps = 5;
  for (let i=0;i<=steps;i++){
    const yy = yMin + (yMax - yMin) * i / steps;
    const ypx = Y(yy);
    ctx.beginPath(); ctx.moveTo(margin.left, ypx); ctx.lineTo(W - margin.right, ypx); ctx.stroke();
    ctx.fillStyle = "#6b7280"; ctx.fillText(yy.toFixed(1), 4, ypx + 4);
  }
  (games || []).forEach(g => {
    const xpx = X(g.number);
    ctx.beginPath(); ctx.moveTo(xpx, H - margin.bottom); ctx.lineTo(xpx, H - margin.bottom + 4); ctx.strokeStyle = "#9ca3af"; ctx.stroke();
    ctx.fillStyle = "#6b7280"; ctx.fillText(String(g.number), xpx - 6, H - margin.bottom + 16);
  });
  ctx.strokeStyle = "#9ca3af";
  ctx.strokeRect(margin.left, margin.top, W - margin.left - margin.right, H - margin.top - margin.bottom);

  // ライン（滑らかな曲線） + マーカー
  const hoverDot = (window.__trendLocked || window.__trendHover) || null; // { i, game }
  // Catmull-Rom → Cubic Bezier 変換で滑らかに
  function drawSmoothLine(pixels) {
    if (!pixels.length) return;
    if (pixels.length === 1) { ctx.moveTo(pixels[0].x, pixels[0].y); return; }
    ctx.moveTo(pixels[0].x, pixels[0].y);
    for (let i = 0; i < pixels.length - 1; i++) {
      const p0 = pixels[i - 1] || pixels[i];
      const p1 = pixels[i];
      const p2 = pixels[i + 1];
      const p3 = pixels[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  [0,1,2,3].forEach((i) => {
    const pts = series[i];
    if (!pts.length) return;
    const pix = pts.map(p => ({ x: X(p.x), y: Y(p.y) }));
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = TREND_COLORS[i % TREND_COLORS.length];
    drawSmoothLine(pix);
    ctx.stroke();
    // 各頂点に●マーカー
    pts.forEach((p) => {
      const x = X(p.x), y = Y(p.y);
      const active = hoverDot && hoverDot.i === i && hoverDot.game === p.x;
      const r = active ? 6 : 4;
      ctx.fillStyle = TREND_COLORS[i % TREND_COLORS.length];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (active) { ctx.strokeStyle = '#11182744'; ctx.lineWidth = 2; ctx.stroke(); }
    });
  });

  // ホバー中の縦ガイド（ゲーム単位）
  const hl = window.__trendHighlight;
  if (hl != null) {
    const xpx = X(hl);
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,.9)';
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(xpx, margin.top); ctx.lineTo(xpx, H - margin.bottom); ctx.stroke();
    ctx.restore();
  }
  // ホバー中の水平ガイド
  if (hoverDot) {
    const i = hoverDot.i;
    const pts = series[i] || [];
    const p = pts.find(pp => pp.x === hoverDot.game);
    if (p) {
      const ypx = Y(p.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(148,163,184,.5)';
      ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(margin.left, ypx); ctx.lineTo(W - margin.right, ypx); ctx.stroke();
      ctx.restore();
    }
  }

  // 吹き出し: アクティブな点にキャンバス内で表示
  if (hoverDot) {
    const i = hoverDot.i;
    const pts = series[i] || [];
    const p = pts.find(pp => pp.x === hoverDot.game);
    if (p) {
      const px = X(p.x), py = Y(p.y);
      const name = namesById[i] || ("Seat " + i);
      const text = `${name}: ${p.y.toFixed(1)}pt`;

      const isLight = document.body.classList.contains('theme-light');
      const bg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(17,24,39,0.92)';
      const fg = isLight ? '#0b1220' : '#e6edf3';
      const bd = isLight ? 'rgba(10,20,30,0.18)' : 'rgba(255,255,255,0.10)';

      const padX = 8, padY = 6, corner = 6, arrowW = 10, arrowH = 8, gap = 8;
      const metrics = ctx.measureText(text);
      let w = Math.ceil(metrics.width) + padX * 2; if (w < 80) w = 80;
      const h = 14 + padY * 2; // 12pxフォント基準

      let x0 = Math.round(px - w / 2);
      let y0 = Math.round(py - h - arrowH - gap);
      let above = true;
      if (x0 < margin.left) x0 = margin.left;
      if (x0 + w > W - margin.right) x0 = W - margin.right - w;
      if (y0 < margin.top) { y0 = Math.round(py + arrowH + gap); above = false; if (y0 + h > H - margin.bottom) y0 = H - margin.bottom - h; }

      ctx.save();
      ctx.shadowColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;

      // 角丸矩形
      ctx.beginPath();
      const x1 = x0, y1 = y0, x2 = x0 + w, y2 = y0 + h, r = corner;
      ctx.moveTo(x1 + r, y1);
      ctx.arcTo(x2, y1, x2, y2, r);
      ctx.arcTo(x2, y2, x1, y2, r);
      ctx.arcTo(x1, y2, x1, y1, r);
      ctx.arcTo(x1, y1, x2, y1, r);
      // 矢印
      const tipX = Math.max(x1 + r + 8, Math.min(px, x2 - r - 8));
      if (above) {
        ctx.moveTo(tipX - arrowW/2, y2);
        ctx.lineTo(px, py + 1);
        ctx.lineTo(tipX + arrowW/2, y2);
      } else {
        ctx.moveTo(tipX - arrowW/2, y1);
        ctx.lineTo(px, py - 1);
        ctx.lineTo(tipX + arrowW/2, y1);
      }
      ctx.closePath();

      ctx.fillStyle = bg; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = bd; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = fg; ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, x0 + padX, y0 + padY + 12);
      ctx.restore();
    }
  }

  // 凡例
  const legend = $("trendLegend");
  if (legend) {
    legend.innerHTML = "";
    [0,1,2,3].forEach((i) => {
      const item = document.createElement("div"); item.style.display = "flex"; item.style.alignItems = "center"; item.style.gap = "6px";
      const sw = document.createElement("span"); sw.style.display = "inline-block"; sw.style.width = "14px"; sw.style.height = "3px";
      sw.style.background = TREND_COLORS[i % TREND_COLORS.length];
      const label = document.createElement("span"); label.textContent = namesById[i];
      item.appendChild(sw); item.appendChild(label); legend.appendChild(item);
    });
  }

  // インタラクション用のジオメトリとデータを保存
  try {
    window.__trendGeom = { margin, W, H, minX, maxX, yMin, yMax };
    window.__trendGames = games.map(g => g.number);
    window.__trendNames = namesById;
    window.__trendSeries = series; // arrays of {x,y}
    window.__lastGames = games.slice();
  } catch {}

  ensureTrendTooltip();
  bindTrendPointerOnce(canvas);
}

function ensureTrendTooltip() {
  const holder = document.getElementById('trendContainer');
  if (!holder) return null;
  let tip = document.getElementById('trendTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'trendTooltip';
    tip.className = 'trend-tooltip';
    tip.style.display = 'none';
    holder.appendChild(tip);
  }
  return tip;
}

function bindTrendPointerOnce(canvas) {
  if (!canvas || canvas.__trendBound) return;
  const tip = ensureTrendTooltip();
  function selectFromPointCoords(clientX, clientY) {
    const geom = window.__trendGeom; const games = window.__trendGames || [];
    if (!geom || !games.length) return { type: 'none' };
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const X = (gNo) => geom.maxX === geom.minX ? geom.margin.left : geom.margin.left + (gNo - geom.minX) * (geom.W - geom.margin.left - geom.margin.right) / (geom.maxX - geom.minX);
    const Y = (val) => geom.yMax === geom.yMin ? geom.H - geom.margin.bottom : geom.H - geom.margin.bottom - (val - geom.yMin) * (geom.H - geom.margin.top - geom.margin.bottom) / (geom.yMax - geom.yMin);

    // 近接ヒット（広め半径）
    let best = Infinity; let bestDot = null; const R = 28;
    const series = window.__trendSeries || [];
    [0,1,2,3].forEach(i => {
      (series[i] || []).forEach(p => {
        const sx = X(p.x), sy = Y(p.y);
        const d = Math.hypot(sx - x, sy - y);
        if (d < best) { best = d; bestDot = { i, game: p.x, px: sx, py: sy, y: p.y }; }
      });
    });
    if (bestDot && best <= R) return { type: 'dot', bestDot };

    // Xにスナップし、そのゲームでYが最も近い人
    let nearest = games[0]; let bestX = Infinity;
    games.forEach(g => { const dx = Math.abs(X(g) - x); if (dx < bestX) { bestX = dx; nearest = g; } });
    let bestI = -1; let bestDy = Infinity; let vy = null;
    [0,1,2,3].forEach(i => {
      const arr = series[i] || []; const row = arr.find(p => p.x === nearest);
      if (!row) return; const yy = Y(row.y); const dy = Math.abs(yy - y);
      if (dy < bestDy) { bestDy = dy; bestI = i; vy = row.y; }
    });
    if (bestI >= 0) return { type: 'snap', bestDot: { i: bestI, game: nearest, px: X(nearest), py: Y(vy), y: vy } };
    return { type: 'none' };
  }
  const onMove = (ev) => {
    const geom = window.__trendGeom; const games = window.__trendGames || [];
    if (!geom || !games.length) return;
    const rect = canvas.getBoundingClientRect();
    const client = ev.touches ? ev.touches[0] : ev;
    const x = client.clientX - rect.left;
    const y = client.clientY - rect.top;

    const X = (gNo) => geom.maxX === geom.minX ? geom.margin.left : geom.margin.left + (gNo - geom.minX) * (geom.W - geom.margin.left - geom.margin.right) / (geom.maxX - geom.minX);
    const Y = (val) => geom.yMax === geom.yMin ? geom.H - geom.margin.bottom : geom.H - geom.margin.bottom - (val - geom.yMin) * (geom.H - geom.margin.top - geom.margin.bottom) / (geom.yMax - geom.yMin);

    // 最近傍の●を探索
    let best = Infinity; let bestDot = null; // {i, game, px, py, y}
    [0,1,2,3].forEach(i => {
      const s = window.__trendSeries[i] || [];
      s.forEach(p => {
        const px = X(p.x), py = Y(p.y);
        const dx = px - x, dy = py - y; const d2 = dx*dx + dy*dy;
        if (d2 < best) { best = d2; bestDot = { i, game: p.x, px, py, y: p.y }; }
      });
    });
    const within = bestDot && Math.sqrt(best) <= 20; // タップでも反応しやすく
    if (within) {
      window.__trendHover = { i: bestDot.i, game: bestDot.game };
      window.__trendHighlight = bestDot.game;
      drawTrendChartFromGames({ games: window.__lastGames || [] });
      if (tip) tip.style.display = 'none';
      return;
      const names = window.__trendNames || [];
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px;">Game ${bestDot.game}</div>` +
        `<div><span style="display:inline-block;width:10px;height:3px;background:${TREND_COLORS[bestDot.i%TREND_COLORS.length]};margin-right:6px;"></span>` +
        `${names[bestDot.i] || ('Seat ' + bestDot.i)}: ${bestDot.y.toFixed(1)}pt</div>`;
      tip.style.display = 'block';
      const w = tip.offsetWidth || 160;
      const tx = Math.min(Math.max(geom.margin.left, x + 12), geom.W - w - 8);
      const ty = Math.max(geom.margin.top + 8, Math.min(bestDot.py - 28, geom.H - geom.margin.bottom - 8));
      tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
      return;
    }

    // 最近傍のゲーム（X）をフォールバック: そのゲームでYが最も近い人を選択
    let nearest = games[0]; let bestX = Infinity;
    games.forEach(g => { const dx = Math.abs(X(g) - x); if (dx < bestX) { bestX = dx; nearest = g; } });
    let bestI = -1; let bestDy = Infinity; let vy = null;
    [0,1,2,3].forEach(i => {
      const arr = (window.__trendSeries[i] || []);
      const row = arr.find(p => p.x === nearest);
      if (!row) return; const yy = Y(row.y); const dy = Math.abs(yy - y);
      if (dy < bestDy) { bestDy = dy; bestI = i; vy = row.y; }
    });
    if (bestI >= 0) {
      window.__trendHover = { i: bestI, game: nearest };
      window.__trendHighlight = nearest;
    } else {
      window.__trendHover = null; window.__trendHighlight = nearest;
    }
    drawTrendChartFromGames({ games: window.__lastGames || [] });
    if (tip) tip.style.display = 'none';
    return;

    if (!tip) return;
    const names = window.__trendNames || [];
    const at = (arr, gameNo) => arr.find(p => p.x === nearest)?.y ?? 0;
    const lines = [0,1,2,3].map(i => {
      const vy = at(window.__trendSeries[i] || [], nearest);
      const sw = `<span style="display:inline-block;width:10px;height:3px;background:${TREND_COLORS[i%TREND_COLORS.length]};margin-right:6px;"></span>`;
      return `${sw}${names[i] || ('Seat ' + i)}: ${vy.toFixed(1)}pt`;
    });
    tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px;">Game ${nearest}</div>${lines.map(l=>`<div>${l}</div>`).join('')}`;
    tip.style.display = 'block';
    const w2 = tip.offsetWidth || 160;
    const tx2 = Math.min(Math.max(geom.margin.left, x + 12), geom.W - w2 - 8);
    const ty2 = geom.margin.top + 8;
    tip.style.left = tx2 + 'px'; tip.style.top = ty2 + 'px';
  };
  const onLeave = () => { if (!window.__trendLocked) { window.__trendHighlight = null; window.__trendHover = null; if (tip) tip.style.display = 'none'; drawTrendChartFromGames({ games: window.__lastGames || [] }); } };
  const onClick = (ev) => {
    const point = ev.changedTouches ? ev.changedTouches[0] : ev;
    const sel = selectFromPointCoords(point.clientX, point.clientY);
    if (sel.type === 'dot' || sel.type === 'snap') {
      window.__trendLocked = { i: sel.bestDot.i, game: sel.bestDot.game };
      window.__trendHighlight = sel.bestDot.game;
    } else {
      window.__trendLocked = null; window.__trendHover = null; window.__trendHighlight = null;
    }
    drawTrendChartFromGames({ games: window.__lastGames || [] });
  };
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchstart', onMove, { passive: true });
  canvas.addEventListener('touchmove', onMove, { passive: true });
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchend', onClick);
  canvas.__trendBound = true;
}

// ------- submit edited game -------
async function saveEditedGame() {
  const errBox = $("detailScoreError");
  if (errBox) { errBox.style.display = "none"; errBox.textContent = ""; }
  if (!currentMatchId || currentActiveGameNumber == null) return;
  const vals = [0,1,2,3].map(i => {
    const card = document.getElementById(`editScoreCard-${i}`);
    const table = document.getElementById(`editScore-${i}`);
    const el = (card && card.offsetParent !== null) ? card : table;
    return Number((el || {}).value);
  });
  if (vals.some(v => !Number.isInteger(v))) { showScoreError("整数で入力してください"); return; }
  if (vals.some(v => v % 100 !== 0)) { showScoreError("raw_score は100点単位"); return; }
  const sum = vals.reduce((a,b)=>a+b,0);
  if (sum !== 100000) {
    const delta = 100000 - sum; // >0: 不足, <0: 過剰
    const msg = `${Math.abs(delta)}点${delta > 0 ? '不足' : '過剰'}`;
    showScoreError(`現在合計: ${sum}点、${msg}`);
    return;
  }

  const btn = $("saveGameEditBtn");
  try {
    setBusy(btn, true, "保存中...");
    const payload = { scores: [0,1,2,3].map((i) => ({ seat_index: i, raw_score: vals[i] })) };
    const res = await fetch(`${API_BASE}/${encodeURIComponent(currentMatchId)}/games/${currentActiveGameNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showScoreError(friendlyApiError(res.status, data?.error, "修正できませんでした"));
      return;
    }
    renderDetail(data);
    showToast(`Game ${currentActiveGameNumber} を修正しました`);
  } catch {
    showScoreError("通信に失敗しました。ネットワークをご確認の上、再度お試しください。");
  } finally {
    setBusy(btn, false);
  }
}

// ------- events -------
window.addEventListener("DOMContentLoaded", () => {
  $("createBtn").addEventListener("click", createMatch);
  // Create modal open/close handlers
  const overlay = $("createModalOverlay");
  const modal = $("createModal");
  function openCreateModal() {
    if (!overlay || !modal) return;
    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
    $("title")?.focus();
  }
  function closeCreateModal() {
    if (!overlay || !modal) return;
    overlay.classList.add("hidden");
    modal.classList.add("hidden");
  }
  window.closeCreateModal = closeCreateModal;
  $("openCreateModalBtn")?.addEventListener("click", openCreateModal);
  $("createModalCloseBtn")?.addEventListener("click", closeCreateModal);
  $("createModalCancelBtn")?.addEventListener("click", closeCreateModal);
  overlay?.addEventListener("click", closeCreateModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCreateModal(); });
  $("backBtn").addEventListener("click", (e) => { e.preventDefault(); go("/"); });
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);
  $("saveGameBtn").addEventListener("click", submitScores);
  $("saveGameEditBtn")?.addEventListener("click", saveEditedGame);

  const themeBtn = $("themeToggle");
  if (themeBtn) {
    const applyTheme = (t) => {
      document.body.classList.toggle("theme-light", t === "light");
      document.body.classList.toggle("theme-dark", t === "dark");
    };
    let saved = localStorage.getItem("theme");
    if (!saved) saved = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(saved);
    themeBtn.addEventListener("click", () => {
      const now = document.body.classList.contains("theme-dark") ? "dark" : "light";
      const next = now === "dark" ? "light" : "dark";
      applyTheme(next); localStorage.setItem("theme", next);
    });
  }
  $("oka_select").addEventListener("change", () => { $("oka_custom_wrap").style.display = $("oka_select").value === "custom" ? "block" : "none"; });
  $("uma_select").addEventListener("change", () => { $("uma_custom_wrap").style.display = $("uma_select").value === "custom" ? "block" : "none"; });

  // リサイズ時にグラフを再描画
  window.addEventListener("resize", () => {
    if (currentMatchId) {
      // 最新の詳細を再取得せず、そのまま描画し直すために一度 tabs の active state を維持して描画
      const canvas = $("trendCanvas"); if (canvas) drawTrendChartFromGames({ games: (window.__lastGames || []) });
    }
  });

  route();
});
