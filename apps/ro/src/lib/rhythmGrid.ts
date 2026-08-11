export interface RhythmCell<T> {
  item: T;
  span: 1 | 2;
}

const LG_COLUMNS = 3;

type SpanCell = Pick<RhythmCell<unknown>, "span">;

function rhythmRows(cells: SpanCell[]): SpanCell[][] {
  const rows: SpanCell[][] = [];
  let row: SpanCell[] = [];
  let col = 0;

  for (const cell of cells) {
    if (col + cell.span > LG_COLUMNS) {
      if (row.length) rows.push(row);
      row = [];
      col = 0;
    }
    row.push(cell);
    col += cell.span;
    if (col >= LG_COLUMNS) {
      rows.push(row);
      row = [];
      col = 0;
    }
  }

  if (row.length) rows.push(row);
  return rows;
}

/** Whether a wide cell (span 2) sits on a 3-col row with a single (span 1). */
export function wideSharesRowWithSingle(
  cells: SpanCell[],
  index: number,
): boolean {
  if (cells[index]?.span !== 2) return false;

  let cursor = 0;
  for (const row of rhythmRows(cells)) {
    const rowStart = cursor;
    const rowEnd = cursor + row.length - 1;
    cursor += row.length;

    if (index < rowStart || index > rowEnd) continue;

    return row.some((c) => c.span === 1) && row.some((c) => c.span === 2);
  }

  return false;
}

/** First item double-width, then cycle 5 singles / double / 3 singles / double … */
export function buildRhythmCells<T>(list: T[]): RhythmCell<T>[] {
  const out: RhythmCell<T>[] = [];
  if (list.length <= 1) {
    const only = list[0];
    if (only) out.push({ item: only, span: 1 });
    return out;
  }
  let i = 0;
  const first = list[i];
  if (first) {
    out.push({ item: first, span: 2 });
    i += 1;
  }
  const runs = [5, 3];
  let runIdx = 0;
  while (i < list.length) {
    const runLen = runs[runIdx % runs.length] ?? 0;
    for (let k = 0; k < runLen && i < list.length; k += 1) {
      const single = list[i];
      if (single) out.push({ item: single, span: 1 });
      i += 1;
    }
    const dbl = list[i];
    if (dbl) {
      out.push({ item: dbl, span: 2 });
      i += 1;
    }
    runIdx += 1;
  }
  return out;
}
