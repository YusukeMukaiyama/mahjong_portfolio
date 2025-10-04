// deno run -A supabase/functions/matches/test_cases.ts
import { computeGameResults, type ScoreInput } from './domain.ts';

type Case = {
  case_id: number;
  start_points: number;
  oka_points: number;
  uma_low: number;
  uma_high: number;
  E_raw: number; S_raw: number; W_raw: number; N_raw: number;
  rank_order: string; // e.g. 'ESWN'
  oka_bonus_to_1st: number;
  E_total: number; S_total: number; W_total: number; N_total: number;
};

let cases: Case[] = [
  {case_id:1,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:40000,S_raw:25000,W_raw:20000,N_raw:15000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:50.0,S_total:5.0,W_total:-20.0,N_total:-35.0},
  {case_id:2,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:30000,S_raw:30000,W_raw:20000,N_raw:20000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:40.0,S_total:10.0,W_total:-20.0,N_total:-30.0},
  {case_id:3,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:-5000,S_raw:35000,W_raw:40000,N_raw:30000,rank_order:'WSEN',oka_bonus_to_1st:20.0,E_total:-55.0,S_total:15.0,W_total:50.0,N_total:-10.0},
  {case_id:4,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:25000,S_raw:25000,W_raw:25000,N_raw:25000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:35.0,S_total:5.0,W_total:-15.0,N_total:-25.0},
  {case_id:5,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:70000,S_raw:20000,W_raw:8000,N_raw:2000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:80.0,S_total:0.0,W_total:-32.0,N_total:-48.0},
  {case_id:6,start_points:25000,oka_points:25000,uma_low:5,uma_high:10,E_raw:40000,S_raw:25000,W_raw:20000,N_raw:15000,rank_order:'ESWN',oka_bonus_to_1st:0.0,E_total:25.0,S_total:5.0,W_total:-10.0,N_total:-20.0},
  {case_id:7,start_points:25000,oka_points:40000,uma_low:20,uma_high:40,E_raw:40000,S_raw:30000,W_raw:20000,N_raw:10000,rank_order:'ESWN',oka_bonus_to_1st:60.0,E_total:100.0,S_total:10.0,W_total:-40.0,N_total:-70.0},
  {case_id:8,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:30000,S_raw:30000,W_raw:30000,N_raw:10000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:40.0,S_total:10.0,W_total:-10.0,N_total:-40.0},
  {case_id:9,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:40000,S_raw:30000,W_raw:15000,N_raw:15000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:50.0,S_total:5.0,W_total:-20.0,N_total:-35.0},
  {case_id:10,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:0,S_raw:40000,W_raw:30000,N_raw:30000,rank_order:'SENW',oka_bonus_to_1st:20.0,E_total:-50.0,S_total:50.0,W_total:5.0,N_total:-5.0},
  {case_id:11,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:-20000,S_raw:50000,W_raw:50000,N_raw:20000,rank_order:'SWEN',oka_bonus_to_1st:20.0,E_total:-75.0,S_total:50.0,W_total:70.0,N_total:-45.0},
  {case_id:12,start_points:25000,oka_points:33000,uma_low:15,uma_high:25,E_raw:42000,S_raw:25000,W_raw:20000,N_raw:13000,rank_order:'ESWN',oka_bonus_to_1st:12.0,E_total:44.0,S_total:-3.0,W_total:-31.0,N_total:-58.0},
  {case_id:13,start_points:25000,oka_points:27000,uma_low:0,uma_high:0,E_raw:35000,S_raw:25000,W_raw:25000,N_raw:15000,rank_order:'ESWN',oka_bonus_to_1st:8.0,E_total:16.0,S_total:-2.0,W_total:-2.0,N_total:-12.0},
  {case_id:14,start_points:20000,oka_points:30000,uma_low:10,uma_high:20,E_raw:50000,S_raw:30000,W_raw:15000,N_raw:5000,rank_order:'ESWN',oka_bonus_to_1st:40.0,E_total:90.0,S_total:0.0,W_total:-25.0,N_total:-65.0},
  {case_id:15,start_points:25000,oka_points:20000,uma_low:10,uma_high:20,E_raw:55000,S_raw:15000,W_raw:15000,N_raw:15000,rank_order:'ESWN',oka_bonus_to_1st:-20.0,E_total:15.0,S_total:-5.0,W_total:-15.0,N_total:5.0},
  {case_id:16,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:110000,S_raw:-5000,W_raw:-3000,N_raw:-2000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:120.0,S_total:-60.0,W_total:-30.0,N_total:-30.0},
  {case_id:17,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:34000,S_raw:33000,W_raw:33000,N_raw:0,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:40.0,S_total:5.0,W_total:-15.0,N_total:-30.0},
  {case_id:18,start_points:25000,oka_points:50000,uma_low:30,uma_high:60,E_raw:50000,S_raw:25000,W_raw:15000,N_raw:10000,rank_order:'ESWN',oka_bonus_to_1st:100.0,E_total:160.0,S_total:5.0,W_total:-65.0,N_total:-100.0},
  {case_id:19,start_points:25000,oka_points:30000,uma_low:7,uma_high:13,E_raw:36000,S_raw:26000,W_raw:21000,N_raw:17000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:49.0,S_total:2.0,W_total:-15.0,N_total:-36.0},
  {case_id:20,start_points:25000,oka_points:30000,uma_low:10,uma_high:20,E_raw:34100,S_raw:25900,W_raw:21000,N_raw:19000,rank_order:'ESWN',oka_bonus_to_1st:20.0,E_total:40.1,S_total:5.9,W_total:-15.0,N_total:-31.0},
];

// Optional: override by CSV file if present
try {
  const csvPath = new URL('./test_cases.csv', import.meta.url).pathname;
  const csv = await Deno.readTextFile(csvPath);
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift()!;
  const cols = header.split(',');
  const idx = (name: string) => cols.indexOf(name);
  if (idx('case_id') >= 0) {
    const parsed: Case[] = [];
    for (const line of lines) {
      const parts = line.split(',');
      const getNum = (name: string) => Number(parts[idx(name)]);
      const getStr = (name: string) => parts[idx(name)];
      parsed.push({
        case_id: getNum('case_id'),
        start_points: getNum('start_points'),
        oka_points: getNum('oka_points'),
        uma_low: getNum('uma_low'),
        uma_high: getNum('uma_high'),
        E_raw: getNum('E_raw'),
        S_raw: getNum('S_raw'),
        W_raw: getNum('W_raw'),
        N_raw: getNum('N_raw'),
        rank_order: getStr('rank_order'),
        oka_bonus_to_1st: getNum('oka_bonus_to_1st'),
        E_total: getNum('E_total'),
        S_total: getNum('S_total'),
        W_total: getNum('W_total'),
        N_total: getNum('N_total'),
      });
    }
    if (parsed.length) cases = parsed;
  }
} catch (_) {
  // ignore; default inline cases will be used
}

const SEAT = ['E','S','W','N'] as const;

function toOrder(results: ReturnType<typeof computeGameResults>): string {
  const sorted = [...results].sort((a,b)=> a.rank - b.rank);
  return sorted.map(r => SEAT[r.seat_index]).join('');
}

function nearlyEqual(a: number, b: number, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

function run() {
  let passed = 0, failed = 0;
  const failures: any[] = [];
  for (const c of cases) {
    const scores: ScoreInput[] = [
      { seat_index: 0, raw_score: c.E_raw },
      { seat_index: 1, raw_score: c.S_raw },
      { seat_index: 2, raw_score: c.W_raw },
      { seat_index: 3, raw_score: c.N_raw },
    ];
    const results = computeGameResults(scores, c.start_points, c.oka_points, c.uma_low, c.uma_high);
    const order = toOrder(results);
    const first = results.find(r => r.rank === 1)!;
    const okaBonusExpected = ((c.oka_points - c.start_points) / 1000) * 4;
    const perSeat = [0,1,2,3].map(i => results.find(r=>r.seat_index===i)!.pt_total);

    const ok = order === c.rank_order
      && nearlyEqual(first.pt_oka_bonus, c.oka_bonus_to_1st)
      && nearlyEqual(perSeat[0], c.E_total)
      && nearlyEqual(perSeat[1], c.S_total)
      && nearlyEqual(perSeat[2], c.W_total)
      && nearlyEqual(perSeat[3], c.N_total)
      && nearlyEqual(okaBonusExpected, c.oka_bonus_to_1st);

    if (ok) {
      passed++;
    } else {
      failed++;
      failures.push({ case_id: c.case_id, order, expected: c.rank_order, first_oka_bonus: first.pt_oka_bonus, expected_oka_bonus: c.oka_bonus_to_1st, totals: perSeat, expectedTotals: [c.E_total, c.S_total, c.W_total, c.N_total] });
    }
  }
  console.log(JSON.stringify({ passed, failed }, null, 2));
  if (failures.length) {
    console.log('Failures detail:');
    for (const f of failures) console.log(JSON.stringify(f));
  }
}

run();
