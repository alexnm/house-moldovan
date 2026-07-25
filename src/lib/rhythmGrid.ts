export interface RhythmCell<T> {
  item: T;
  span: 1 | 2;
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
