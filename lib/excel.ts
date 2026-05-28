import * as XLSX from 'xlsx';
import type { ExcelRow, Heat, Lane } from '@/types';

/**
 * 실제 대진표 포맷 파서
 *
 * 엑셀 구조 (두 가지 패턴 모두 지원):
 *
 * [패턴 A] 조마다 이벤트 헤더 + 컬럼 헤더
 *   101   계영 100M S14/비장애 중등,고등 통합   ← 이벤트 헤더
 *   레인 | 성명 | 소속 | 등급 | 기록 | 순위 | 비고  ← 컬럼 헤더
 *   1    |      |      |      |      |      |
 *   2    | 배민준, 배연지 | 니모 | S14, 비장애 | | | 중등
 *   ...
 *   101   계영 100M S14/비장애 중등,고등 통합   ← 같은 종목 2조 이벤트 헤더
 *   레인 | 성명 | 소속 | 등급 | 기록 | 순위 | 비고  ← 컬럼 헤더
 *   ...
 *
 * [패턴 B] 이벤트 헤더 없이 컬럼 헤더만 반복 (연속 조)
 *   101   계영 100M S14/비장애 중등,고등 통합   ← 이벤트 헤더 (1조)
 *   레인 | 성명 | 소속 | ...                  ← 컬럼 헤더
 *   ...
 *   레인 | 성명 | 소속 | ...                  ← 컬럼 헤더만 등장 (2조 시작)
 *   ...
 */

/** mm:ss.hh 또는 '-' 형식 검증 */
const RECORD_RE = /^(\d{1,2}:\d{2}\.\d{2}|-)$/;

/** 셀 값 → 문자열 (null/undefined 안전) */
function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * 이벤트 헤더 행 파싱
 * 지원 패턴:
 *   A) 첫 셀 = number (101) + 나머지 셀에 종목명
 *   B) 첫 셀 = "103-1   종목명" — 번호-조번호 + 공백 + 이름 (heatNo 명시)
 *   C) 첫 셀 = "101   계영 100M..." — 번호 + 공백 + 이름
 *   D) 첫 셀 = "103-1" 만, 나머지 셀에 종목명 (heatNo 명시)
 *   E) 첫 셀 = "101" 만, 나머지 셀에 종목명
 */
function parseEventHeader(
  row: unknown[],
): { eventNo: number; eventName: string; heatNo?: number } | null {
  const first = row[0];

  // A) 첫 셀이 정수 number (SheetJS가 숫자 셀을 number로 읽을 때)
  if (
    typeof first === 'number' &&
    Number.isInteger(first) &&
    first >= 10 &&
    first <= 9999
  ) {
    const name = row.slice(1).map(str).filter(Boolean).join(' ').trim();
    if (name) return { eventNo: first, eventName: name };
  }

  const firstStr = str(first);

  // B) "103-1   남자 킥판잡고..." — 번호-조번호+공백+이름 (조 번호 명시)
  const mWithHeat = firstStr.match(/^(\d{2,4})-(\d+)\s+(.+)$/);
  if (mWithHeat) {
    return {
      eventNo:   Number(mWithHeat[1]),
      heatNo:    Number(mWithHeat[2]),
      eventName: mWithHeat[3].trim(),
    };
  }

  // C) "101   계영 100M..." — 번호+공백+이름
  const mCombined = firstStr.match(/^(\d{2,4})\s+(.+)$/);
  if (mCombined) {
    return { eventNo: Number(mCombined[1]), eventName: mCombined[2].trim() };
  }

  // D) 첫 셀 = "103-1" 만, 나머지 셀에 종목명 (조 번호 명시)
  const mNumWithHeat = firstStr.match(/^(\d{2,4})-(\d+)$/);
  if (mNumWithHeat) {
    const name = row.slice(1).map(str).filter(Boolean).join(' ').trim();
    if (name) {
      return {
        eventNo:   Number(mNumWithHeat[1]),
        heatNo:    Number(mNumWithHeat[2]),
        eventName: name,
      };
    }
  }

  // E) 첫 셀 = "101" 만, 나머지 셀에 종목명
  const mNum = firstStr.match(/^(\d{2,4})$/);
  if (mNum) {
    const name = row.slice(1).map(str).filter(Boolean).join(' ').trim();
    if (name) return { eventNo: Number(mNum[1]), eventName: name };
  }

  return null;
}

/** 컬럼 헤더 행 감지: 레인·성명·소속이 모두 포함되어야 함 */
function isColumnHeaderRow(row: unknown[]): boolean {
  const cells = row.map(str);
  return (
    cells.some((c) => c.includes('레인')) &&
    cells.some((c) => c.includes('성명')) &&
    cells.some((c) => c.includes('소속'))
  );
}

/** 컬럼명 → 인덱스 매핑 (내부 공백 정규화: "비 고" → "비고") */
function buildColMap(row: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  row.forEach((cell, idx) => {
    const key = str(cell).replace(/\s+/g, '');
    if (key) map[key] = idx;
  });
  return map;
}

/** colMap에서 여러 후보 키 중 첫 번째 일치 인덱스 반환 */
function colIdx(
  map: Record<string, number>,
  ...keys: string[]
): number | undefined {
  for (const k of keys) {
    if (k in map) return map[k];
  }
  return undefined;
}

export function parseExcel(buffer: ArrayBuffer): { rows: ExcelRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // 2D 배열로 읽기 (빈 행 포함, 빈 셀은 빈 문자열)
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    blankrows: true,
  }) as unknown[][];

  const errors: string[] = [];
  const rows: ExcelRow[] = [];

  if (raw.length === 0) {
    return { rows: [], errors: ['엑셀 파일이 비어 있습니다.'] };
  }

  let curEventNo: number | null = null;
  let curEventName = '';
  let curHeatNo = 0;
  let colMap: Record<string, number> = {};
  let inTable = false; // 컬럼 헤더를 만난 이후 데이터 파싱 중 여부

  /**
   * 같은 event_no가 나올 때마다 heat_no를 1씩 증가시키는 카운터.
   * 이벤트 헤더와 컬럼 헤더 중 어느 쪽이 새 조를 알려도 동일하게 처리.
   */
  const heatCounter = new Map<number, number>();
  const laneSet = new Map<string, Set<number>>();

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const lineNo = i + 1;

    // 완전히 빈 행 → 스킵 (빈 레인은 레인 번호로 판별)
    if (row.every((c) => !str(c))) continue;

    // ── 1) 이벤트 헤더 행 감지 ──────────────────────────────────────────────
    const evHeader = parseEventHeader(row);
    if (evHeader) {
      curEventNo = evHeader.eventNo;
      curEventName = evHeader.eventName;

      if (evHeader.heatNo !== undefined) {
        // "103-1  종목명" 처럼 헤더에 조 번호가 명시된 경우 → 그대로 사용
        curHeatNo = evHeader.heatNo;
        heatCounter.set(curEventNo, curHeatNo);
      } else {
        // 조 번호 미명시 → 자동 증가 (같은 종목 재등장마다 +1)
        const prev = heatCounter.get(curEventNo) ?? 0;
        curHeatNo = prev + 1;
        heatCounter.set(curEventNo, curHeatNo);
      }

      inTable = false;
      colMap = {};
      continue;
    }

    // ── 2) 컬럼 헤더 행 감지 (inTable 여부 무관하게 항상 감지) ────────────────
    //
    // ★ 핵심 수정: 이벤트 헤더 없이 컬럼 헤더만 다시 등장하는 경우
    //   → 같은 종목의 새로운 조(heat)가 시작된 것으로 간주
    //
    if (isColumnHeaderRow(row)) {
      if (inTable && curEventNo !== null) {
        // 이벤트 헤더 없이 컬럼 헤더가 다시 등장 → 새 조
        const prev = heatCounter.get(curEventNo) ?? curHeatNo;
        curHeatNo = prev + 1;
        heatCounter.set(curEventNo, curHeatNo);
      }
      colMap = buildColMap(row);
      inTable = true;
      continue;
    }

    // ── 3) 데이터 행 파싱 ────────────────────────────────────────────────────
    if (!inTable || curEventNo === null) continue;

    const laneColIdx = colIdx(colMap, '레인') ?? 0;
    const laneRaw = row[laneColIdx];
    const lane = Number(laneRaw);

    // 유효한 정수 레인이 아니면 스킵 (소계·합계·기타 행)
    if (!Number.isInteger(lane) || lane < 1 || lane > 10) continue;

    const nameIdx   = colIdx(colMap, '성명') ?? 1;
    const teamIdx   = colIdx(colMap, '소속') ?? 2;
    const regionIdx = colIdx(colMap, '등급') ?? 3;
    const recordIdx = colIdx(colMap, '기록') ?? 4;
    const notesIdx  = colIdx(colMap, '비고') ?? 6;

    const name   = str(row[nameIdx]);
    const team   = str(row[teamIdx]);
    const region = str(row[regionIdx]);
    const record = str(row[recordIdx]);
    const notes  = str(row[notesIdx]);

    // 빈 레인 스킵 (성명·소속 모두 없음)
    if (!name && !team) continue;

    // 기록 형식 검사 — 숫자가 포함된 경우만 검사 (백틱·대시 등 비숫자 무시)
    if (record && /\d/.test(record) && !RECORD_RE.test(record)) {
      errors.push(
        `${lineNo}행: record 형식 오류 — mm:ss.hh 또는 '-' (값: ${record})`,
      );
    }

    // 같은 heat 내 레인 중복 검사
    const key = `${curEventNo}-${curHeatNo}`;
    if (!laneSet.has(key)) laneSet.set(key, new Set());
    const set = laneSet.get(key)!;
    if (set.has(lane)) {
      errors.push(`${lineNo}행: 종목${curEventNo} ${curHeatNo}조 ${lane}번 레인 중복`);
    }
    set.add(lane);

    rows.push({
      event_no:   curEventNo,
      event_name: curEventName,
      heat_no:    curHeatNo,
      category:   '',
      lane,
      name,
      team,
      region: region || undefined,
      notes:  notes  || undefined,
    });
  }

  if (rows.length === 0) {
    errors.push(
      '파싱된 데이터가 없습니다. 엑셀 형식을 확인해 주세요.\n' +
      '(레인·성명·소속 컬럼이 있는지, 종목 번호 행이 있는지 확인)',
    );
  }

  return { rows, errors };
}

/** ExcelRow[] → Heat[] 변환 */
export function rowsToHeats(rows: ExcelRow[]): Omit<Heat, 'id' | 'status'>[] {
  const map = new Map<string, Omit<Heat, 'id' | 'status'>>();

  for (const r of rows) {
    const key = `${r.event_no}-${r.heat_no}`;
    if (!map.has(key)) {
      map.set(key, {
        eventNo:   r.event_no,
        eventName: r.event_name,
        heatNo:    r.heat_no,
        category:  r.category,
        lanes: [],
      });
    }
    const heat = map.get(key)!;
    const lane: Lane = {
      lane:   r.lane,
      name:   r.name,
      team:   r.team,
      region: r.region ?? '',
      notes:  r.notes  ?? '',
    };
    heat.lanes.push(lane);
  }

  return Array.from(map.values()).sort(
    (a, b) => a.eventNo - b.eventNo || a.heatNo - b.heatNo,
  );
}
