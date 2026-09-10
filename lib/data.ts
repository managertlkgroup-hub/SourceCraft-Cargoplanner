import { validateField } from "./validation";

export type CargoKind = "rect" | "cylinder";

export interface CargoItem {
  id: string;
  name: string;
  kind: CargoKind;
  length: number;
  width: number;
  height: number;
  weight: number;
  count: number;
  stackable: boolean;
  maxLoad: number;
  /** Габариты могут превышать кузов (нестандартный/негабаритный груз). */
  isOversize?: boolean;
  /** Группа совместимости при штабелировании (опционально). */
  compatibilityGroup?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
}

export type Mode = "along" | "across" | "mixed";
export type LengthUnit = "mm" | "cm" | "m";
export type WeightUnit = "kg" | "t";

export interface CargoPreset extends Omit<CargoItem, "id"> {
  id: string;
}

export const CARGO_PRESETS: CargoPreset[] = [
  {
    id: "euro",
    name: "Европаллет",
    kind: "rect",
    length: 1200,
    width: 800,
    height: 144,
    weight: 25,
    count: 12,
    stackable: true,
    maxLoad: 1500,
  },
  {
    id: "fin",
    name: "Финпаллет",
    kind: "rect",
    length: 1200,
    width: 1000,
    height: 145,
    weight: 21,
    count: 12,
    stackable: true,
    maxLoad: 1500,
  },
  {
    id: "barrel-metal",
    name: "Бочка 200 л металл",
    kind: "cylinder",
    length: 620,
    width: 620,
    height: 875,
    weight: 9,
    count: 4,
    stackable: true,
    maxLoad: 400,
  },
  {
    id: "barrel-plastic",
    name: "Бочка 200 л пластик",
    kind: "cylinder",
    length: 675,
    width: 675,
    height: 705,
    weight: 9,
    count: 4,
    stackable: true,
    maxLoad: 400,
  },
  {
    id: "box",
    name: "Ящик стандартный",
    kind: "rect",
    length: 600,
    width: 400,
    height: 400,
    weight: 20,
    count: 6,
    stackable: true,
    maxLoad: 400,
  },
  {
    id: "sack",
    name: "Мешок 50 кг",
    kind: "rect",
    length: 800,
    width: 500,
    height: 300,
    weight: 50,
    count: 10,
    stackable: true,
    maxLoad: 300,
  },
  {
    id: "roll",
    name: "Рулон",
    kind: "cylinder",
    length: 1500,
    width: 400,
    height: 400,
    weight: 80,
    count: 4,
    stackable: false,
    maxLoad: 0,
  },
];

export function makeId(prefix = "item"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Валидирует число по имени поля через единую функцию validateField. */
function csvNumber(
  value: string | number | undefined,
  field: string,
  lineIdx: number
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Недопустимое значение ${field} в строке #${lineIdx + 2}`);
  }
  const r = validateField(field, n);
  if (!r.ok) {
    throw new Error(
      `Значение ${field} вне диапазона [${r.min}–${r.max}] в строке #${lineIdx + 2}`
    );
  }
  return n;
}

export function cargoToCsv(items: CargoItem[]): string {
  const header = [
    "name",
    "kind",
    "length",
    "width",
    "height",
    "weight",
    "count",
    "stackable",
    "maxLoad",
    "isOversize",
    "compatibilityGroup",
  ];
  const rows = items.map((c) =>
    [
      c.name,
      c.kind,
      c.length,
      c.width,
      c.height,
      c.weight,
      c.count,
      c.stackable ? "true" : "false",
      c.maxLoad,
      c.isOversize ? "true" : "false",
      c.compatibilityGroup ?? "",
    ].map(csvEscape)
  );
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function parseCargoCsv(text: string): CargoItem[] {
  const res = parseCargoCsvDetailed(text);
  return res.items;
}

/**
 * Парсит CSV с построчной валидацией: некорректные строки пропускаются,
 * возвращается количество пропущенных для уведомления.
 */
export function parseCargoCsvDetailed(text: string): {
  items: CargoItem[];
  dropped: number;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV пуст или содержит только заголовок");
  }
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out;
  };

  const result: CargoItem[] = [];
  let dropped = 0;
  const dataLines = lines.slice(1);
  dataLines.forEach((line, idx) => {
    try {
      const parts = parseLine(line);
      const [
        name,
        kind,
        length,
        width,
        height,
        weight,
        count,
        stackable,
        maxLoad,
      ] = parts;
      if (!name || (kind !== "rect" && kind !== "cylinder")) {
        throw new Error(`Неверная строка CSV #${idx + 2}`);
      }
      const isCylinder = kind === "cylinder";
      const cnt = Number(count);
      if (!Number.isInteger(cnt) || cnt < 1) {
        throw new Error(`Недопустимое значение count в строке #${idx + 2}`);
      }
      const load =
        maxLoad !== undefined && maxLoad !== "" ? Number(maxLoad) : 0;
      if (!Number.isFinite(load) || load < 0) {
        throw new Error(`Недопустимое значение maxLoad в строке #${idx + 2}`);
      }
      const isOver = parts[9]?.toLowerCase() === "true";
      const compatGroup = parts[10]?.trim() || undefined;
      const lenMm = csvNumber(length, "length", idx);
      const widMm = csvNumber(isCylinder ? "diameter" : "width", width, idx);
      const hgtMm = csvNumber("height", height, idx);
      const wgtKg = csvNumber("weight", weight, idx);
      csvNumber("count", String(cnt), idx);
      if (load > 0) csvNumber("maxLoad", String(load), idx);
      result.push({
        id: makeId(),
        name: String(name).trim(),
        kind: kind as CargoKind,
        length: lenMm,
        width: widMm,
        height: hgtMm,
        weight: wgtKg,
        count: cnt,
        stackable: stackable?.toLowerCase() === "true",
        maxLoad: load,
        isOversize: isOver,
        compatibilityGroup: compatGroup,
      });
    } catch {
      dropped += 1;
    }
  });
  return { items: result, dropped };
}

export const VEHICLES: Vehicle[] = [
  {
    id: "gazel-biz",
    name: "ГАЗель Бизнес",
    length: 3089,
    width: 1978,
    height: 400,
    maxWeight: 1500,
  },
  {
    id: "gazel-next",
    name: "ГАЗель NEXT",
    length: 3700,
    width: 2000,
    height: 2000,
    maxWeight: 1700,
  },
  {
    id: "bychok",
    name: "Бычок/ГАЗ-3309",
    length: 3500,
    width: 2000,
    height: 500,
    maxWeight: 3000,
  },
  {
    id: "zil",
    name: "ЗИЛ-5301",
    length: 3750,
    width: 2100,
    height: 600,
    maxWeight: 3000,
  },
  {
    id: "kamaz-4308",
    name: "КамАЗ-4308",
    length: 6000,
    width: 2400,
    height: 2400,
    maxWeight: 7500,
  },
  {
    id: "kamaz-65117",
    name: "КамАЗ-65117",
    length: 7700,
    width: 2470,
    height: 2800,
    maxWeight: 15000,
  },
  {
    id: "eurofura",
    name: "Еврофура 20 т",
    length: 13600,
    width: 2450,
    height: 2700,
    maxWeight: 20000,
  },
  {
    id: "jumbo",
    name: "Jumbo",
    length: 13600,
    width: 2450,
    height: 3000,
    maxWeight: 25000,
  },
];

export const CARGO: CargoItem[] = [
  {
    id: "euro",
    name: "Европаллет",
    kind: "rect",
    length: 1200,
    width: 800,
    height: 144,
    weight: 25,
    count: 12,
    stackable: true,
    maxLoad: 1500,
  },
  {
    id: "fin",
    name: "Финпаллет",
    kind: "rect",
    length: 1200,
    width: 1000,
    height: 145,
    weight: 21,
    count: 12,
    stackable: true,
    maxLoad: 1500,
  },
  {
    id: "barrel",
    name: "Бочка 200 л металл",
    kind: "cylinder",
    length: 620,
    width: 620,
    height: 875,
    weight: 9,
    count: 4,
    stackable: true,
    maxLoad: 400,
  },
];

export interface SceneBlock {
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
  isOversize?: boolean;
}

const PALETTE = ["#6366f1", "#22d3ee", "#f59e0b", "#ec4899", "#10b981"];

export function buildScene(cargo: CargoItem[] = CARGO): SceneBlock[] {
  const blocks: SceneBlock[] = [];
  let colorIndex = 0;
  const margin = 40;
  let cursorX = margin;
  let cursorY = margin;

  for (const item of cargo) {
    const color = PALETTE[colorIndex % PALETTE.length];
    colorIndex += 1;
    const w = item.width;
    const d = item.length;
    const placed = Math.min(item.count, 12);
    const perLayerX = Math.max(
      1,
      Math.floor((2350 - margin * 2) / (w + margin))
    );

    let layer = 0;
    let idx = 0;
    while (idx < placed) {
      for (let row = 0; row < 2 && idx < placed; row++) {
        for (let col = 0; col < perLayerX && idx < placed; col++) {
          const x = cursorX + col * (w + margin);
          const y = cursorY + row * (d + margin);
          blocks.push({
            id: `${item.id}-${idx}`,
            name: item.name,
            x,
            y,
            z: layer * (item.height + 8),
            w,
            d,
            h: item.height,
            color,
            cylinder: item.kind === "cylinder",
          });
          idx += 1;
        }
      }
      layer += 1;
    }
    cursorX = margin;
    cursorY += d * 2 + margin * 3;
  }
  return blocks;
}

export function formatLength(value: number, unit: LengthUnit): string {
  switch (unit) {
    case "cm":
      return (value / 10).toFixed(0);
    case "m":
      return (value / 1000).toFixed(2);
    default:
      return String(Math.round(value));
  }
}

export function formatWeight(value: number, unit: WeightUnit): string {
  if (unit === "t") {
    return (value / 1000).toFixed(1);
  }
  return String(value);
}

export const UNIT_SUFFIX: Record<LengthUnit, string> = {
  mm: "мм",
  cm: "см",
  m: "м",
};

export const WEIGHT_SUFFIX: Record<WeightUnit, string> = {
  kg: "кг",
  t: "т",
};

export function lengthToDisplay(mm: number, unit: LengthUnit): number {
  switch (unit) {
    case "cm":
      return mm / 10;
    case "m":
      return mm / 1000;
    default:
      return mm;
  }
}

export function fromLengthToMm(value: number, unit: LengthUnit): number {
  switch (unit) {
    case "cm":
      return value * 10;
    case "m":
      return value * 1000;
    default:
      return value;
  }
}

export function weightToDisplay(kg: number, unit: WeightUnit): number {
  return unit === "t" ? kg / 1000 : kg;
}

export function fromWeightToKg(value: number, unit: WeightUnit): number {
  return unit === "t" ? value * 1000 : value;
}
