import type { CargoItem, CargoKind, Mode, Vehicle } from "./data";

const PALETTE = ["#6366f1", "#22d3ee", "#f59e0b", "#ec4899", "#10b981"];

export interface GapSet {
  walls: number;
  width: number;
  length: number;
}

export interface StackOptions {
  enabled: boolean;
  /** Максимальное количество слоёв (сколько грузов можно поставить друг на друга). */
  maxLayers: number;
}

export interface PackedBlock {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  cylinder?: boolean;
  /** Груз помечен как негабаритный (может выходить за габариты кузова). */
  isOversize?: boolean;
}

export interface NotPlacedInfo {
  name: string;
  count: number;
}

export interface LayoutResult {
  mode: Mode;
  blocks: PackedBlock[];
  placedCount: number;
  totalCount: number;
  /** Сколько размещено обычных грузов. */
  placedRegular: number;
  /** Сколько размещено негабаритных грузов. */
  placedOversize: number;
  placedVolume: number;
  totalVolume: number;
  volumeFill: number;
  weight: number;
  maxWeight: number;
  weightFill: number;
  freeVolume: number;
  freeWeight: number;
  loadDim: { length: number; width: number; height: number };
  stackable: boolean;
  notPlaced: NotPlacedInfo[];
}

interface Unit {
  id: string;
  name: string;
  kind: CargoKind;
  L: number;
  W: number;
  H: number;
  weight: number;
  stackable: boolean;
  maxLoad: number;
  color: string;
  isOversize?: boolean;
  compatGroup?: string;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  d: number;
}

interface Placed {
  id: string;
  name: string;
  kind: CargoKind;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  L: number;
  W: number;
  H: number;
  weight: number;
  stackable: boolean;
  maxLoad: number;
  color: string;
  isOversize?: boolean;
  support: Placed | null;
  loadAbove: number;
  level: number;
  compatGroup?: string;
}

function expandUnits(items: CargoItem[]): {
  units: Unit[];
  totalCount: number;
  totalVolume: number;
} {
  const units: Unit[] = [];
  let totalCount = 0;
  let totalVolume = 0;
  let colorIndex = 0;
  for (const c of items) {
    const color = PALETTE[colorIndex % PALETTE.length];
    colorIndex += 1;
    for (let i = 0; i < c.count; i += 1) {
      units.push({
        id: `${c.id}-${i}`,
        name: c.name,
        kind: c.kind,
        L: c.length,
        W: c.width,
        H: c.height,
        weight: c.weight,
        stackable: c.stackable,
        maxLoad: c.maxLoad,
        color,
        isOversize: !!c.isOversize,
        compatGroup: c.compatibilityGroup,
      });
      totalCount += 1;
      totalVolume += c.length * c.width * c.height;
    }
  }
  return { units, totalCount, totalVolume };
}

function orientations(u: Unit, mode: Mode): { d: number; w: number }[] {
  if (mode === "along") {
    return [{ d: u.L, w: u.W }];
  }
  if (mode === "across") {
    return [{ d: u.W, w: u.L }];
  }
  return [
    { d: u.L, w: u.W },
    { d: u.W, w: u.L },
  ];
}

function cleanupFree(rects: FreeRect[]): void {
  const filtered = rects.filter((r) => r.w > 0 && r.d > 0);
  const keep: FreeRect[] = [];
  for (const a of filtered) {
    let contained = false;
    for (const b of filtered) {
      if (a === b) continue;
      if (
        b.x <= a.x &&
        b.y <= a.y &&
        b.x + b.w >= a.x + a.w &&
        b.y + b.d >= a.y + a.d
      ) {
        contained = true;
        break;
      }
    }
    if (!contained) keep.push(a);
  }
  rects.length = 0;
  rects.push(...keep);
}

function boxesOverlap(
  a: { x: number; y: number; z: number; w: number; d: number; h: number },
  b: { x: number; y: number; z: number; w: number; d: number; h: number }
): boolean {
  return (
    a.x < b.x + b.w &&
    b.x < a.x + a.w &&
    a.y < b.y + b.d &&
    b.y < a.y + a.d &&
    a.z < b.z + b.h &&
    b.z < a.z + a.h
  );
}

export function computeLayout(
  items: CargoItem[],
  vehicle: Vehicle,
  mode: Mode,
  gaps: GapSet,
  gapsEnabled: boolean,
  stacking: StackOptions = { enabled: false, maxLayers: 1 }
): LayoutResult {
  const { units, totalCount, totalVolume } = expandUnits(items);

  const wall = gapsEnabled ? Math.max(0, gaps.walls) : 0;
  const wDim = Math.max(1, vehicle.width - wall * 2);
  const dDim = Math.max(1, vehicle.length - wall * 2);
  const gapW = gapsEnabled ? Math.max(0, gaps.width) : 0;
  const gapL = gapsEnabled ? Math.max(0, gaps.length) : 0;

  const sorted = [...units].sort((a, b) => {
    if (b.H !== a.H) return b.H - a.H;
    const aa = a.L * a.W;
    const bb = b.L * b.W;
    if (bb !== aa) return bb - aa;
    return b.weight - a.weight;
  });

  const placed: Placed[] = [];
  const floorFree: FreeRect[] = [{ x: 0, y: 0, w: wDim, d: dDim }];
  const notPlacedMap = new Map<string, number>();
  let weight = 0;
  let placedVolume = 0;
  let placedAllStackable = true;
  let hasPlaced = false;
  let placedRegularCount = 0;
  let placedOversizeCount = 0;

  const addToNotPlaced = (name: string) => {
    notPlacedMap.set(name, (notPlacedMap.get(name) ?? 0) + 1);
  };

  const commitFreeSplit = (fr: FreeRect, cand: { d: number; w: number }) => {
    const idx = floorFree.indexOf(fr);
    if (idx >= 0) floorFree.splice(idx, 1);
    const rightW = fr.w - cand.w - gapW;
    const topD = fr.d - cand.d - gapL;
    const added: FreeRect[] = [];
    if (rightW > 0)
      added.push({
        x: fr.x + cand.w + gapW,
        y: fr.y,
        w: rightW,
        d: cand.d,
      });
    if (topD > 0)
      added.push({ x: fr.x, y: fr.y + cand.d + gapL, w: fr.w, d: topD });
    floorFree.push(...added);
    cleanupFree(floorFree);
  };

  const buildBlock = (
    u: Unit,
    fr: FreeRect,
    cand: { d: number; w: number }
  ): Placed => ({
    id: u.id,
    name: u.name,
    kind: u.kind,
    x: fr.x,
    y: fr.y,
    z: 0,
    w: cand.w,
    d: cand.d,
    h: u.H,
    L: u.L,
    W: u.W,
    H: u.H,
    weight: u.weight,
    stackable: u.stackable,
    maxLoad: u.maxLoad,
    color: u.color,
    isOversize: u.isOversize,
    support: null,
    loadAbove: 0,
    level: 1,
    compatGroup: u.compatGroup,
  });

  const placeOnFloor = (u: Unit): Placed | null => {
    // Обычный груз не может выходить за пределы кузова по высоте.
    if (!u.isOversize && u.H > vehicle.height) return null;
    if (u.isOversize) {
      // Негабаритный груз: ставится на пол (нижняя грань на уровне пола),
      // может выходить за габариты кузова. Пытаемся разместить в свободной
      // области кузова, иначе кладём у передней стенки (0,0).
      for (const cand of orientations(u, mode)) {
        for (const fr of floorFree) {
          if (fr.w < cand.w || fr.d < cand.d) continue;
          const block = buildBlock(u, fr, cand);
          floorFree.splice(floorFree.indexOf(fr), 1);
          commitFreeSplit(fr, cand);
          return block;
        }
      }
      // Свободной области не нашлось — кладём на пол у начала координат.
      const cand = orientations(u, mode)[0];
      const free = { x: 0, y: 0, w: Math.max(cand.w, wDim), d: Math.max(cand.d, dDim) };
      const block = buildBlock(u, free, cand);
      commitFreeSplit(free, cand);
      return block;
    }
    if (mode === "mixed") {
      // Смешанный режим: перебираем обе ориентации и все свободные области,
      // выбираем вариант с наименьшими потерями площади (лучшее заполнение).
      let best: {
        block: Placed;
        fr: FreeRect;
        cand: { d: number; w: number };
        score: number;
      } | null = null;
      for (const cand of orientations(u, mode)) {
        if (cand.w > wDim || cand.d > dDim) continue;
        for (const fr of floorFree) {
          if (fr.w < cand.w || fr.d < cand.d) continue;
          const waste = fr.w * fr.d - cand.w * cand.d;
          const score = waste * 1_000_000 + fr.x * 10_000 + fr.y;
          if (!best || score < best.score) {
            best = { block: buildBlock(u, fr, cand), fr, cand, score };
          }
        }
      }
      if (!best) return null;
      commitFreeSplit(best.fr, best.cand);
      return best.block;
    }
    for (const cand of orientations(u, mode)) {
      if (cand.w > wDim || cand.d > dDim) continue;
      for (let fi = 0; fi < floorFree.length; fi += 1) {
        const fr = floorFree[fi];
        if (fr.w < cand.w || fr.d < cand.d) continue;
        const block = buildBlock(u, fr, cand);
        floorFree.splice(fi, 1);
        commitFreeSplit(fr, cand);
        return block;
      }
    }
    return null;
  };

  const loadOk = (support: Placed, addWeight: number): boolean => {
    let node: Placed | null = support;
    while (node) {
      if (node.loadAbove + addWeight > node.maxLoad) return false;
      node = node.support;
    }
    return true;
  };

  const findStackPlace = (
    u: Unit
  ): {
    support: Placed;
    cand: { d: number; w: number };
    top: number;
  } | null => {
    if (u.isOversize) return null;
    let best: {
      support: Placed;
      cand: { d: number; w: number };
      top: number;
    } | null = null;
    for (const cand of orientations(u, mode)) {
      for (const s of placed) {
        if (!s.stackable) continue;
        if (s.isOversize) continue;
        if (s.kind !== u.kind) continue;
        if (u.compatGroup && s.compatGroup && u.compatGroup !== s.compatGroup) {
          continue;
        }
        if (u.kind === "cylinder") {
          if (cand.w !== s.w || cand.d !== s.d) continue;
        } else if (cand.w > s.w || cand.d > s.d) {
          continue;
        }
        const top = s.z + s.h;
        if (top + u.H > vehicle.height) continue;
        if (s.level >= stacking.maxLayers) continue;
        if (!loadOk(s, u.weight)) continue;
        const box = { x: s.x, y: s.y, z: top, w: cand.w, d: cand.d, h: u.H };
        let clash = false;
        for (const p of placed) {
          if (p === s) continue;
          if (boxesOverlap(p, box)) {
            clash = true;
            break;
          }
        }
        if (clash) continue;
        if (!best || top < best.top) {
          best = { support: s, cand, top };
        }
      }
    }
    return best;
  };

  const placeOnTop = (
    u: Unit,
    stack: { support: Placed; cand: { d: number; w: number }; top: number }
  ): Placed => {
    const block: Placed = {
      id: u.id,
      name: u.name,
      kind: u.kind,
      x: stack.support.x,
      y: stack.support.y,
      z: stack.top,
      w: stack.cand.w,
      d: stack.cand.d,
      h: u.H,
      L: u.L,
      W: u.W,
      H: u.H,
      weight: u.weight,
      stackable: u.stackable,
      maxLoad: u.maxLoad,
      color: u.color,
      isOversize: u.isOversize,
      support: stack.support,
      loadAbove: 0,
      level: stack.support.level + 1,
      compatGroup: u.compatGroup,
    };
    let node: Placed | null = stack.support;
    while (node) {
      node.loadAbove += u.weight;
      node = node.support;
    }
    return block;
  };

  const commit = (block: Placed) => {
    placed.push(block);
    weight += block.weight;
    placedVolume += block.L * block.W * block.H;
    if (block.isOversize) {
      placedOversizeCount += 1;
    } else {
      placedRegularCount += 1;
    }
    if (!block.stackable) placedAllStackable = false;
    hasPlaced = true;
  };

  // Вес НЕ ограничивает размещение жёстко: при превышении грузоподъёмности
  // раскладка продолжается, а предупреждение показывает интерфейс (тост).
  // Если грузоподъёмность = 0 — она считается «не ограниченной».
  for (const u of sorted) {
    let block = placeOnFloor(u);
    if (!block && stacking.enabled) {
      const stack = findStackPlace(u);
      if (stack) block = placeOnTop(u, stack);
    }
    if (block) {
      commit(block);
    } else {
      addToNotPlaced(u.name);
    }
  }

  let loadL = 0;
  let loadW = 0;
  let loadH = 0;
  for (const b of placed) {
    loadL = Math.max(loadL, b.y + b.d);
    loadW = Math.max(loadW, b.x + b.w);
    loadH = Math.max(loadH, b.z + b.h);
  }

  const vehicleVolume = vehicle.length * vehicle.width * vehicle.height;
  const volumeFill =
    vehicleVolume > 0 ? (placedVolume / vehicleVolume) * 100 : 0;
  const weightFill =
    vehicle.maxWeight > 0 ? (weight / vehicle.maxWeight) * 100 : 0;

  return {
    mode,
    blocks: placed.map((b) => ({
      id: b.id,
      name: b.name,
      x: b.x,
      y: b.y,
      z: b.z,
      w: b.w,
      d: b.d,
      h: b.h,
      color: b.color,
      cylinder: b.kind === "cylinder",
      isOversize: b.isOversize,
    })),
    placedCount: placed.length,
    totalCount,
    placedRegular: placedRegularCount,
    placedOversize: placedOversizeCount,
    placedVolume,
    totalVolume,
    volumeFill,
    weight,
    maxWeight: vehicle.maxWeight,
    weightFill,
    freeVolume: Math.max(0, vehicleVolume - placedVolume),
    freeWeight: Math.max(0, vehicle.maxWeight - weight),
    loadDim: { length: loadL, width: loadW, height: loadH },
    stackable: hasPlaced ? placedAllStackable : false,
    notPlaced: Array.from(notPlacedMap, ([name, count]) => ({ name, count })),
  };
}
