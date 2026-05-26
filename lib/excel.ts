import * as XLSX from 'xlsx';
import type { ExcelRow, Heat, Lane } from '@/types';

const REQUIRED_COLS = [
  'event_no', 'event_name', 'heat_no', 'lane', 'name', 'team', 'category',
] as const;

/** mm:ss.hh 형식 또는 '-' 검증 */
const RECORD_RE = /^(\d{1,2}:\d{2}\.\d{2}|-)$/;

export function parseExcel(buffer: ArrayBuffer): { rows: ExcelRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const errors: string[] = [];

  // 컬럼 존재 확인
  if (raw.length === 0) return { rows: [], errors: ['엑셀 파일이 비어 있습니다.'] };
  const firstRow = raw[0];
  for (const col of REQUIRED_COLS) {
    if (!(col in firstRow)) errors.push(`필수 컬럼 누락: ${col}`);
  }
  if (errors.length) return { rows: [], errors };

  // 각 행 유효성 검사
  const rows: ExcelRow[] = [];
  const laneSet = new Map<string, Set<number>>(); // `eventNo-heatNo` → Set<lane>

  raw.forEach((r, i) => {
    const lineNo = i + 2;
    const eventNo = Number(r['event_no']);
    const heatNo = Number(r['heat_no']);
    const lane = Number(r['lane']);
    const name = String(r['name']).trim();
    const team = String(r['team']).trim();
    const record = r['record'] ? String(r['record']).trim() : undefined;

    if (!Number.isInteger(lane) || lane < 1 || lane > 8) {
      errors.push(`${lineNo}행: lane 값이 1~8 정수여야 합니다 (값: ${r['lane']})`);
    }
    if (!name) errors.push(`${lineNo}행: name이 비어 있습니다`);
    if (!team) errors.push(`${lineNo}행: team이 비어 있습니다`);
    if (record && !RECORD_RE.test(record)) {
      errors.push(`${lineNo}행: record 형식 오류 — mm:ss.hh 또는 '-' (값: ${record})`);
    }

    // 같은 heat 내 레인 중복 확인
    const key = `${eventNo}-${heatNo}`;
    if (!laneSet.has(key)) laneSet.set(key, new Set());
    const set = laneSet.get(key)!;
    if (set.has(lane)) {
      errors.push(`${lineNo}행: 종목${eventNo} ${heatNo}조 ${lane}번 레인 중복`);
    }
    set.add(lane);

    rows.push({
      event_no: eventNo,
      event_name: String(r['event_name']).trim(),
      heat_no: heatNo,
      category: String(r['category']).trim(),
      lane,
      name,
      team,
      region: r['region'] ? String(r['region']).trim() : '',
    });
  });

  return { rows, errors };
}

/** ExcelRow[] → Heat[] 변환 */
export function rowsToHeats(rows: ExcelRow[]): Omit<Heat, 'id' | 'status'>[] {
  const map = new Map<string, Omit<Heat, 'id' | 'status'>>();

  for (const r of rows) {
    const key = `${r.event_no}-${r.heat_no}`;
    if (!map.has(key)) {
      map.set(key, {
        eventNo: r.event_no,
        eventName: r.event_name,
        heatNo: r.heat_no,
        category: r.category,
        lanes: [],
      });
    }
    const heat = map.get(key)!;
    const lane: Lane = {
      lane: r.lane,
      name: r.name,
      team: r.team,
      region: r.region ?? '',
    };
    heat.lanes.push(lane);
  }

  return Array.from(map.values()).sort(
    (a, b) => a.eventNo - b.eventNo || a.heatNo - b.heatNo,
  );
}
