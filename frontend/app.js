const PROJECT_REF = "niilyhwgzffvbmtyfgnw";
const FUNCTION_NAME = "matches";

// Consider LAN hostnames/IPs (e.g., *.local, 192.168.x.x, 10.x.x.x) as local dev
const isLanIp = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(location.hostname);
const isLocalHostname = location.hostname === "127.0.0.1" || location.hostname === "localhost" || location.hostname === "0.0.0.0" || location.hostname.endsWith('.local');
const isLocal = isLocalHostname || isLanIp;
const API_BASE = isLocal
  ? `http://127.0.0.1:54321/functions/v1/${FUNCTION_NAME}`
  : `https://${PROJECT_REF}.functions.supabase.co/${FUNCTION_NAME}`;

const $ = (id) => document.getElementById(id);

// Toast utility
function showToast(message, type = 'success', timeout = 3000) {
  const container = $("toastContainer");
  if (!container) return;
  const div = document.createElement('div');
  div.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => { div.remove(); }, timeout);
}

function showError(msg) {
  const box = $("errorBox");
  box.textContent = msg || "";
  box.style.display = msg ? "block" : "none";
}

function showDetailError(msg) {
  const box = $("detailError");
  box.textContent = msg || "";
  box.style.display = msg ? "block" : "none";
}

function showScoreError(msg) {
  const box = $("detailScoreError");
  box.textContent = msg || "";
  box.style.display = msg ? "block" : "none";
}

function translateValidationMessage(msg) {
  if (!msg || typeof msg !== 'string') return '';
  const map = [
    { k: 'scores must have 4 items', v: 'スコアは4人分すべて入力してください。' },
    { k: 'invalid score item', v: 'スコアの形式が不正です。もう一度入力してください。' },
    { k: 'seat_index must be 0..3', v: '内部エラー: 座席番号が不正です。ページを再読み込みしてやり直してください。' },
    { k: 'raw_score must be multiple of 100', v: '各スコアは100点単位で入力してください。' },
    { k: 'each seat_index must appear once', v: '4人分それぞれ1回ずつ入力してください。' },
    { k: 'scores must include seat_index 0..3', v: '4人分のスコアをすべて入力してください。' },
    { k: 'sum must be 100000', v: '合計は100000点にしてください。入力値を確認してください。' },
    { k: 'not found', v: '対局が見つかりません。' },
    { k: 'oka_points / uma_low / uma_high は整数で入力してください', v: 'オカ・ウマは整数で入力してください。' },
    { k: 'ウマは自然数で入力してください', v: 'ウマは自然数（例: 5-10 のように）で入力してください。' },
    { k: 'ウマは high >= low となるように入力してください', v: 'ウマは「low-high」で high が low 以上になるように入力してください。' },
  ];
  const found = map.find((x) => msg.includes(x.k));
  return found ? found.v : msg;
}

function friendlyApiError(status, msg, fallback) {
  if (status === 404) return '対象のデータが見つかりません。やり直してください。';
  if (status === 422 || status === 400) return translateValidationMessage(msg) || fallback;
  return 'システムエラーが発生しました。時間を置いて再度お試しください。';
}

function setBusy(btn, busy, labelBusy) {
  if (!btn) return;
  if (busy) {
    btn.setAttribute('disabled', 'true');
    btn.dataset.label = btn.textContent;
    if (labelBusy) btn.textContent = labelBusy;
  } else {
    btn.removeAttribute('disabled');
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

function go(path) {
  history.pushState({}, "", path);
  route();
}

function route() {
  const path = location.pathname;
  const m = path.match(/^\/matches\/([^\/]+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    $("homeView").classList.add("hidden");
    const listSec = $("listSection");
    if (listSec) listSec.classList.add('hidden');
    $("detailView").classList.remove("hidden");
    loadMatchDetail(id);
  } else {
    $("detailView").classList.add("hidden");
    $("homeView").classList.remove("hidden");
    const listSec = $("listSection");
    if (listSec) listSec.classList.remove('hidden');
    loadMatches();
  }
}

// (検索/ソートは不要のためロジック削除)

async function createMatch() {
  showError("");
  const title = $("title").value.trim();
  const p1 = $("p1").value.trim();
  const p2 = $("p2").value.trim();
  const p3 = $("p3").value.trim();
  const p4 = $("p4").value.trim();
  // Oka: select or custom
  const okaSel = $("oka_select").value;
  let oka_points;
  if (okaSel === 'custom') {
    oka_points = Number($("oka_custom").value);
  } else {
    oka_points = Number(okaSel);
  }

  // Uma: select low-high or custom text low-high
  const umaSel = $("uma_select").value;
  let uma_low, uma_high;
  let umaText = umaSel;
  if (umaSel === 'custom') {
    umaText = $("uma_custom").value.trim();
  }
  const mU = umaText.match(/^(\d+)\s*-\s*(\d+)$/);
  if (mU) {
    uma_low = Number(mU[1]);
    uma_high = Number(mU[2]);
  } else {
    showError("ウマは『low-high』の形式（例: 5-15）で入力してください");
    return;
  }

  // Simple front-side validations
  const names = [p1, p2, p3, p4];
  if (names.some((n) => n.length === 0)) {
    showError("参加者は4人必要です（名前は空欄不可）");
    return;
  }
  if (new Set(names.map((n) => n.toLowerCase())).size !== 4) {
    showError("名前は重複不可です");
    return;
  }
  if (![oka_points, uma_low, uma_high].every((n) => Number.isInteger(n))) {
    showError("oka_points / uma_low / uma_high は整数で入力してください");
    return;
  }
  if (oka_points < 0 || oka_points > 100000 || (okaSel === 'custom' && oka_points % 100 !== 0)) {
    showError("オカは0〜100000、100点単位で入力してください");
    return;
  }
  if (uma_low <= 0 || uma_high <= 0) {
    showError("ウマは自然数で入力してください（例: low=5, high=10）");
    return;
  }
  if (uma_high < uma_low) {
    showError("ウマは high >= low となるように入力してください");
    return;
  }

  try {
    const btn = $("createBtn");
    setBusy(btn, true, '作成中...');
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        participants: names,
        oka_points,
        uma_low,
        uma_high,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showError(friendlyApiError(res.status, data?.error, '作成に失敗しました'));
      setBusy(btn, false);
      return;
    }

    // Clear inputs and reset selectors
    ["title","p1","p2","p3","p4"].forEach((id) => $(id).value = "");
    const okaSelEl = $("oka_select");
    if (okaSelEl) { okaSelEl.value = '30000'; }
    $("oka_custom").value = "";
    $("oka_custom_wrap").style.display = 'none';
    const umaSelEl = $("uma_select");
    if (umaSelEl) { umaSelEl.value = '5-15'; }
    $("uma_custom").value = "";
    $("uma_custom_wrap").style.display = 'none';
    await loadMatches();
    setBusy(btn, false);
    showToast('対局を作成しました');
  } catch (e) {
    showError('通信に失敗しました。ネットワークをご確認の上、再度お試しください。');
  }
}

function renderMatches(list) {
  const root = $("matchesList");
  root.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '対局はまだありません。上のフォームから新しく作成しましょう。';
    root.appendChild(empty);
    return;
  }
  list.forEach((m) => {
    const when = new Date(m.updated_at);
    const gameCount = typeof m.game_count === 'number' ? m.game_count : 0;
    const link = document.createElement('a');
    link.href = `/matches/${encodeURIComponent(m.id)}`;
    link.className = 'card-link';
    link.setAttribute('aria-label', `対局「${m.title}」を開く`);
    link.addEventListener('click', (ev) => { ev.preventDefault(); go(link.href); });

    const card = document.createElement('div');
    card.className = 'match-card';

    const title = document.createElement('h3');
    title.className = 'match-title';
    title.textContent = m.title || '(無題)';
    card.appendChild(title);

    if (Array.isArray(m.participants) && m.participants.length) {
      const chips = document.createElement('div');
      chips.className = 'chips';
      m.participants.forEach(name => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = name;
        chips.appendChild(chip);
      });
      card.appendChild(chips);
    }

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const pill1 = document.createElement('span'); pill1.className = 'pill'; pill1.textContent = `オカ ${m.oka_points}`;
    const pill2 = document.createElement('span'); pill2.className = 'pill'; pill2.textContent = `ウマ ${Math.abs(m.uma_low)}/${Math.abs(m.uma_high)}`;
    const pill3 = document.createElement('span'); pill3.className = 'pill'; pill3.textContent = `対局数 ${gameCount}`;
    const pill4 = document.createElement('span'); pill4.className = 'pill'; pill4.textContent = `更新 ${when.toLocaleString('ja-JP')}`;
    meta.appendChild(pill1); meta.appendChild(pill2); meta.appendChild(pill3); meta.appendChild(pill4);
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-primary';
    openBtn.textContent = '詳細を開く';
    openBtn.addEventListener('click', (ev) => { ev.preventDefault(); go(link.href); });
    actions.appendChild(openBtn);
    card.appendChild(actions);

    link.appendChild(card);
    root.appendChild(link);
  });
}

async function loadMatches() {
  try {
    // skeletons while loading
    const root = $("matchesList");
    if (root) {
      root.innerHTML = '';
      for (let i=0;i<6;i++) {
        const sk = document.createElement('div');
        sk.className = 'skeleton skeleton-card';
        const l1 = document.createElement('div'); l1.className = 'skeleton-line'; l1.style.width = '60%'; l1.style.marginBottom = '10px';
        const l2 = document.createElement('div'); l2.className = 'skeleton-line'; l2.style.width = '90%'; l2.style.marginBottom = '6px';
        const l3 = document.createElement('div'); l3.className = 'skeleton-line'; l3.style.width = '40%';
        sk.appendChild(l1); sk.appendChild(l2); sk.appendChild(l3);
        root.appendChild(sk);
      }
    }
    const res = await fetch(API_BASE, { method: "GET" });
    const list = await res.json();
    renderMatches(Array.isArray(list) ? list : []);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  }
}

async function loadMatchDetail(id) {
  showDetailError("");
  $("detailTitle").textContent = "対局詳細";
  $("detailParticipants").innerHTML = "";
  $("detailGames").textContent = "読み込み中...";

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "GET" });
    const m = await res.json();
    if (!res.ok) {
      showDetailError(friendlyApiError(res.status, m?.error, `読み込みに失敗しました (${res.status})`));
      $("detailGames").textContent = "";
      return;
    }
    renderDetail(m);
  } catch (e) {
    showDetailError('通信に失敗しました。ネットワークをご確認の上、再度お試しください。');
  }
}

let currentMatchId = null;
let currentParticipants = [];

function renderDetail(m) {
  currentMatchId = m.id;
  currentParticipants = (m.participants || []).slice();
  $("detailTitle").textContent = m.title;
  $("detailStart").textContent = m.start_points;
  $("detailOka").textContent = m.oka_points;
  $("detailUma").textContent = `${Math.abs(m.uma_low)} / ${Math.abs(m.uma_high)}`;
  const ul = $("detailParticipants");
  ul.innerHTML = "";
  currentParticipants.forEach((p) => {
    const li = document.createElement("li");
    li.className = "item";
    const seatMap = ['E','S','W','N'];
    const seatChip = document.createElement('span');
    seatChip.className = 'seat-chip';
    seatChip.textContent = seatMap[p.seat_priority] || String(p.seat_priority);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = ` ${p.name}`;
    li.appendChild(seatChip);
    li.appendChild(nameSpan);
    ul.appendChild(li);
  });
  // Set labels for score inputs
  [0,1,2,3].forEach((i) => {
    const name = currentParticipants.find(p => p.seat_priority === i)?.name || `Seat ${i}`;
    $(`seat${i}label`).textContent = `${i}: ${name}`;
    // default value when empty
    if ($(`seat${i}`).value === "") $(`seat${i}`).value = "25000";
  });
  renderTotals(m);
  renderGames(m);
}

function renderGames(m) {
  const container = $("detailGames");
  container.innerHTML = "";
  const games = m.games || [];
  if (!games.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'ゲームはまだ登録されていません。下のフォームから登録しましょう。';
    container.appendChild(empty);
    return;
  }
  games.forEach((g) => {
    const wrap = document.createElement("div");
    wrap.className = "game-card";
    const title = document.createElement("h4");
    title.textContent = `Game ${g.number}`;
    wrap.appendChild(title);
    const resultsBox = document.createElement("div");
    resultsBox.className = "results";
    (g.results || []).sort((a,b)=> a.seat_index - b.seat_index).forEach((r) => {
      const row = document.createElement("div");
      row.className = "result-row";
      const name = currentParticipants.find(p => p.seat_priority === r.seat_index)?.name || `Seat ${r.seat_index}`;
      row.innerHTML = `
        <strong>${name}</strong>
        <span>順位 ${r.rank}</span>
        <span>raw ${r.raw_score}</span>
        <span>soten ${r.pt_soten.toFixed(1)}</span>
        <span>uma ${r.pt_uma.toFixed(1)}</span>
        <span>oka ${r.pt_oka_bonus.toFixed(1)}</span>
        <span>total ${r.pt_total.toFixed(1)}</span>
      `;
      resultsBox.appendChild(row);
    });
    wrap.appendChild(resultsBox);
    container.appendChild(wrap);
  });
}

function renderTotals(m) {
  const tbody = $("totalsTable");
  tbody.innerHTML = "";
  const totals = m.cumulative_scores || [];
  if (!totals.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'まだスコアなし';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  const rows = totals.map((t) => {
    const name = currentParticipants.find(p => p.seat_priority === t.seat_index)?.name || `Seat ${t.seat_index}`;
    return { name, seat_index: t.seat_index, total: t.total };
  });
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.seat_index - b.seat_index;
  });
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const tdRank = document.createElement('td');
    tdRank.innerHTML = `<span class="rank-badge">${i+1}</span>`;
    const tdName = document.createElement('td'); tdName.textContent = r.name;
    const tdTotal = document.createElement('td'); tdTotal.textContent = `${r.total.toFixed(1)}pt`; tdTotal.className = r.total > 0 ? 'pos' : (r.total < 0 ? 'neg' : '');
    tr.appendChild(tdRank); tr.appendChild(tdName); tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });
}

async function submitScores() {
  showScoreError("");
  const id = currentMatchId;
  if (!id) return;
  const vals = [0,1,2,3].map(i => Number($(`seat${i}`).value));
  if (vals.some(v => !Number.isInteger(v))) {
    showScoreError("整数で入力してください");
    return;
  }
  if (vals.some(v => v % 100 !== 0)) {
    showScoreError("raw_score は100点単位");
    return;
  }
  const sum = vals.reduce((a,b)=>a+b,0);
  if (sum !== 100000) {
    showScoreError("合計は100000点にしてください");
    return;
  }
  const scores = vals.map((v, i) => ({ seat_index: i, raw_score: v }));
  try {
    const btn = $("saveGameBtn");
    setBusy(btn, true, '登録中...');
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    });
    const data = await res.json();
    if (!res.ok) {
      showScoreError(friendlyApiError(res.status, data?.error, '登録できませんでした'));
      setBusy(btn, false);
      return;
    }
    renderDetail(data);
    setBusy(btn, false);
    showToast('ゲームを登録しました');
  } catch (e) {
    showScoreError('通信に失敗しました。ネットワークをご確認の上、再度お試しください。');
  }
}

window.addEventListener("DOMContentLoaded", () => {
  $("createBtn").addEventListener("click", createMatch);
  $("backBtn").addEventListener("click", (e) => { e.preventDefault(); go("/"); });
  window.addEventListener("popstate", route);
  $("saveGameBtn").addEventListener("click", submitScores);
  // Theme toggle
  const themeBtn = $("themeToggle");
  if (themeBtn) {
    const applyTheme = (t) => { document.body.classList.toggle('theme-light', t === 'light'); document.body.classList.toggle('theme-dark', t === 'dark'); };
    let saved = localStorage.getItem('theme');
    if (!saved) saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved);
    themeBtn.addEventListener('click', () => {
      const now = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
      const next = now === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('theme', next);
    });
  }
  // Oka/Uma custom visibility toggle
  const okaSel = $("oka_select");
  const okaWrap = $("oka_custom_wrap");
  const umaSel = $("uma_select");
  const umaWrap = $("uma_custom_wrap");
  if (okaSel) {
    okaSel.addEventListener('change', () => {
      okaWrap.style.display = okaSel.value === 'custom' ? 'block' : 'none';
    });
  }
  if (umaSel) {
    umaSel.addEventListener('change', () => {
      umaWrap.style.display = umaSel.value === 'custom' ? 'block' : 'none';
    });
  }
  route();
});
