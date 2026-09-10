import type { Mode, Vehicle } from "./data";
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
  maxWeight: { min: 100, max: 500000 },
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
  return { ok: value >= l.min && value <= l.max, min: l.min, max: l.max };
}

/** Максимально допустимое значение зазора для данного типа и режима. */
export function findMaxGapByType(
  mode: Mode,
  type: keyof GapSet,
  vehicle: Vehicle
): number {
  // Максимум зазора определяется габаритами кузова; режим сохраняется в
  // сигнатуре, чтобы максимумы можно было пересчитывать отдельно для каждого
  // режима при переключении.
  void mode;
  if (type === "walls") {
    return Math.max(0, Math.floor(Math.min(vehicle.width, vehicle.length) / 2));
  }
  if (type === "width") return Math.max(1, Math.floor(vehicle.width));
  return Math.max(1, Math.floor(vehicle.length));
}
