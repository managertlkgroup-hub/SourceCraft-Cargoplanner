import type { CargoItem, Mode, Vehicle } from "./data";
import type { GapSet } from "./packing";

export interface FieldLimit {
  min: number;
  max: number;
}

/** Реальные глобальные ограничения автомобиля (грузовой отсек), мм/кг. */
export const VEHICLE_LIMITS: Record<string, FieldLimit> = {
  length: { min: 1500, max: 53500 },
  width: { min: 1200, max: 10000 },
  height: { min: 300, max: 8000 },
  // 0 = грузоподъёмность не ограничена (разрешено по ТЗ).
  maxWeight: { min: 0, max: 500000 },
};

/** Реальные глобальные ограничения груза, мм/кг/шт. */
export const CARGO_LIMITS: Record<string, FieldLimit> = {
  length: { min: 100, max: 53500 },
  width: { min: 100, max: 10000 },
  height: { min: 100, max: 8000 },
  diameter: { min: 100, max: 9500 },
  weight: { min: 10, max: 500000 },
  count: { min: 1, max: 10000 },
  maxLoad: { min: 0, max: 500000 },
};

function fieldLimit(name: string): FieldLimit | null {
  if (VEHICLE_LIMITS[name]) return VEHICLE_LIMITS[name];
  if (CARGO_LIMITS[name]) return CARGO_LIMITS[name];
  return null;
}

/**
 * Единая функция валидации числового поля по имени.
 * Возвращает результат проверки и допустимый диапазон [min, max].
 */
export function validateField(
  name: string,
  value: number
): { ok: boolean; min: number; max: number } {
  const l = fieldLimit(name);
  if (!l) return { ok: true, min: -Infinity, max: Infinity };
  // Грузоподъёмность = 0 означает «не ограничена» — допустимое значение.
  if (name === "maxWeight" && value === 0) {
    return { ok: true, min: l.min, max: l.max };
  }
  return { ok: value >= l.min && value <= l.max, min: l.min, max: l.max };
}

/** Ориентированные габариты груза для заданного режима. */
function orientedDim(c: CargoItem, mode: Mode): { d: number; w: number } {
  if (mode === "along") return { d: c.length, w: c.width };
  if (mode === "across") return { d: c.width, w: c.length };
  return { d: Math.max(c.length, c.width), w: Math.min(c.length, c.width) };
}

/** Максимально допустимое значение зазора для данного типа, режима и грузов.
 *  Учитывает размеры грузов (а не только габариты кузова), чтобы после
 *  применения зазора в кузове оставалось место хотя бы для одного груза. */
export function findMaxGapByType(
  mode: Mode,
  type: keyof GapSet,
  vehicle: Vehicle,
  cargo: CargoItem[] = []
): number {
  let minD = Infinity;
  let minW = Infinity;
  for (const c of cargo) {
    const o = orientedDim(c, mode);
    if (o.d < minD) minD = o.d;
    if (o.w < minW) minW = o.w;
  }
  const hasCargo = Number.isFinite(minD) && Number.isFinite(minW);

  if (type === "walls") {
    const capBody = Math.floor(Math.min(vehicle.width, vehicle.length) / 2);
    if (!hasCargo) return Math.max(0, capBody);
    const byD = Math.floor((vehicle.length - minD) / 2);
    const byW = Math.floor((vehicle.width - minW) / 2);
    return Math.max(0, Math.min(capBody, byD, byW));
  }
  if (type === "width") {
    if (!hasCargo) return Math.max(1, Math.floor(vehicle.width));
    return Math.max(0, Math.floor(vehicle.width - minW));
  }
  if (!hasCargo) return Math.max(1, Math.floor(vehicle.length));
  return Math.max(0, Math.floor(vehicle.length - minD));
}
