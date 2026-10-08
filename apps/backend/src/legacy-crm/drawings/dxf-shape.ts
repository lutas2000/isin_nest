/**
 * DXF 轉成單據列印用的外形（移植自 isin_vb6 server/drawingShapes.mjs）。
 * 舊版只畫 LINE、ARC、CIRCLE 與 POLYLINE/VERTEX；LWPOLYLINE 不畫也不計入尺寸（Win7 2026-10-06 核對）。
 */

export interface DrawingShape {
  width: number;
  height: number;
  /** SVG path，單位同圖面，原點在外框左上角 */
  path: string;
}

interface DxfEntity {
  type: string;
  codes: [number, string][];
}

type Segment =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number }
  | {
      kind: 'bulge';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      cx: number;
      cy: number;
      r: number;
      ccw: boolean;
      large: boolean;
    };

/** DXF 文字的 group code／值成對讀出。 */
function* pairs(text: string): Generator<[number, string]> {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index + 1 < lines.length; index += 2) {
    yield [Number(lines[index].trim()), lines[index + 1].trim()];
  }
}

/** ENTITIES 區段的圖元。 */
function entities(text: string): DxfEntity[] {
  const result: DxfEntity[] = [];
  let inEntities = false;
  let sectionName = false;
  let current: DxfEntity | null = null;
  for (const [code, value] of pairs(text)) {
    if (code === 0) {
      if (current) result.push(current);
      current = null;
      if (value === 'SECTION') sectionName = true;
      else if (value === 'ENDSEC') inEntities = false;
      else if (inEntities) current = { type: value, codes: [] };
      continue;
    }
    if (sectionName && code === 2) {
      inEntities = value === 'ENTITIES';
      sectionName = false;
      continue;
    }
    if (current) current.codes.push([code, value]);
  }
  if (current) result.push(current);
  return result;
}

const first = (entity: DxfEntity, code: number) => {
  const found = entity.codes.find(([key]) => key === code);
  return found ? Number(found[1]) : 0;
};

const TAU = Math.PI * 2;
const normalise = (angle: number) => ((angle % TAU) + TAU) % TAU;

/** 逆時針圓弧 a0 → a1（弧度）的外框點。 */
function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): [number, number][] {
  const span = normalise(a1 - a0) || TAU;
  const points: [number, number][] = [
    [cx + r * Math.cos(a0), cy + r * Math.sin(a0)],
    [cx + r * Math.cos(a0 + span), cy + r * Math.sin(a0 + span)],
  ];
  for (let quarter = 0; quarter < 4; quarter += 1) {
    const angle = (quarter * Math.PI) / 2;
    if (normalise(angle - a0) <= span)
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return points;
}

/** 多段線的線段：[{x, y, bulge}]，可封閉。 */
function polylineSegments(
  vertices: { x: number; y: number; bulge: number }[],
  closed: boolean,
): Segment[] {
  const segments: Segment[] = [];
  const count = closed ? vertices.length : vertices.length - 1;
  for (let index = 0; index < count; index += 1) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    if (!a.bulge) {
      segments.push({ kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      continue;
    }
    const bulge = a.bulge;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const factor = (1 - bulge * bulge) / (4 * bulge);
    const cx = (a.x + b.x) / 2 - dy * factor;
    const cy = (a.y + b.y) / 2 + dx * factor;
    const r =
      (Math.hypot(dx, dy) * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
    segments.push({
      kind: 'bulge',
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      cx,
      cy,
      r,
      ccw: bulge > 0,
      large: Math.abs(bulge) > 1,
    });
  }
  return segments;
}

const numbersOf = (segment: Segment): number[] => {
  switch (segment.kind) {
    case 'line':
      return [segment.x1, segment.y1, segment.x2, segment.y2];
    case 'circle':
    case 'arc':
      return [segment.cx, segment.cy, segment.r];
    default:
      return [
        segment.x1,
        segment.y1,
        segment.x2,
        segment.y2,
        segment.cx,
        segment.cy,
        segment.r,
      ];
  }
};

/** DXF 圖面轉成 {width, height, path}；沒有可畫的圖元時回傳 null。 */
export function dxfToShape(text: string): DrawingShape | null {
  const segments: Segment[] = [];
  const list = entities(text);
  for (let index = 0; index < list.length; index += 1) {
    const entity = list[index];
    if (entity.type === 'LINE') {
      segments.push({
        kind: 'line',
        x1: first(entity, 10),
        y1: first(entity, 20),
        x2: first(entity, 11),
        y2: first(entity, 21),
      });
    } else if (entity.type === 'CIRCLE') {
      segments.push({
        kind: 'circle',
        cx: first(entity, 10),
        cy: first(entity, 20),
        r: first(entity, 40),
      });
    } else if (entity.type === 'ARC') {
      segments.push({
        kind: 'arc',
        cx: first(entity, 10),
        cy: first(entity, 20),
        r: first(entity, 40),
        a0: (first(entity, 50) * Math.PI) / 180,
        a1: (first(entity, 51) * Math.PI) / 180,
      });
    } else if (entity.type === 'POLYLINE') {
      const vertices: { x: number; y: number; bulge: number }[] = [];
      for (
        index += 1;
        index < list.length && list[index].type === 'VERTEX';
        index += 1
      ) {
        vertices.push({
          x: first(list[index], 10),
          y: first(list[index], 20),
          bulge: first(list[index], 42),
        });
      }
      segments.push(
        ...polylineSegments(vertices, (first(entity, 70) & 1) === 1),
      );
    }
  }
  const drawable = segments.filter(
    (segment) =>
      numbersOf(segment).every((value) => Number.isFinite(value)) &&
      !('r' in segment && segment.r <= 0),
  );
  if (!drawable.length) return null;

  const points: [number, number][] = [];
  for (const segment of drawable) {
    if (segment.kind === 'line')
      points.push([segment.x1, segment.y1], [segment.x2, segment.y2]);
    else if (segment.kind === 'circle')
      points.push(
        [segment.cx - segment.r, segment.cy - segment.r],
        [segment.cx + segment.r, segment.cy + segment.r],
      );
    else if (segment.kind === 'arc')
      points.push(
        ...arcPoints(segment.cx, segment.cy, segment.r, segment.a0, segment.a1),
      );
    else {
      const a0 = Math.atan2(segment.y1 - segment.cy, segment.x1 - segment.cx);
      const a1 = Math.atan2(segment.y2 - segment.cy, segment.x2 - segment.cx);
      points.push(
        ...(segment.ccw
          ? arcPoints(segment.cx, segment.cy, segment.r, a0, a1)
          : arcPoints(segment.cx, segment.cy, segment.r, a1, a0)),
      );
    }
  }
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));

  // SVG 的 y 向下，因此 DXF 的逆時針圓弧 sweep flag 為 0。
  const n = (value: number) => String(Math.round(value * 1000) / 1000);
  const px = (x: number) => n(x - minX);
  const py = (y: number) => n(maxY - y);
  const fullCircle = (cx: number, cy: number, r: number) =>
    `M${px(cx + r)} ${py(cy)}A${n(r)} ${n(r)} 0 1 0 ${px(cx - r)} ${py(cy)}A${n(r)} ${n(r)} 0 1 0 ${px(cx + r)} ${py(cy)}`;
  const parts = drawable.map((segment) => {
    if (segment.kind === 'line')
      return `M${px(segment.x1)} ${py(segment.y1)}L${px(segment.x2)} ${py(segment.y2)}`;
    if (segment.kind === 'circle')
      return fullCircle(segment.cx, segment.cy, segment.r);
    if (segment.kind === 'arc') {
      const { cx, cy, r, a0 } = segment;
      const span = normalise(segment.a1 - a0) || TAU;
      const end = a0 + span;
      if (span >= TAU - 1e-9) return fullCircle(cx, cy, r);
      return `M${px(cx + r * Math.cos(a0))} ${py(cy + r * Math.sin(a0))}A${n(r)} ${n(r)} 0 ${span > Math.PI ? 1 : 0} 0 ${px(cx + r * Math.cos(end))} ${py(cy + r * Math.sin(end))}`;
    }
    return `M${px(segment.x1)} ${py(segment.y1)}A${n(segment.r)} ${n(segment.r)} 0 ${segment.large ? 1 : 0} ${segment.ccw ? 0 : 1} ${px(segment.x2)} ${py(segment.y2)}`;
  });
  const size = (value: number) => Math.round(value * 1e6) / 1e6;
  return {
    width: size(maxX - minX),
    height: size(maxY - minY),
    path: parts.join(''),
  };
}
