import type { CargoItem, LengthUnit, Mode, Vehicle, WeightUnit } from "./data";
import type { Lang } from "./i18n";
import type { GapSet } from "./packing";

export type View = "3d" | "2d";

/**
 * Настройки интерфейса — сохраняются мгновенно (без кнопки):
 * язык, единицы измерения. Тема хранится отдельно через next-themes.
 */
export interface UIPrefs {
  lang: Lang;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
}

/**
 * Данные раскладки/сессии — сохраняются вручную по кнопке «Сохранить сессию».
 * Зазоры сюда НЕ входят: при загрузке сессии они всегда сбрасываются к нулю,
 * а в рамках одной сессии хранятся per-mode (см. gapsByMode в компоненте).
 */
export interface SessionData {
  vehicleId: string;
  customVehicles: Vehicle[];
  cargoItems: CargoItem[];
  customCargoPresets: CargoItem[];
  stackingEnabled: boolean;
  maxLayers: number;
  activeMode: Mode | null;
}

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: number;
}

const UI_KEY = "cargoplanner:ui";
/** Ключ списка сессий в localStorage (требование ТЗ). */
const SESSIONS_KEY = "mlp:sessions";
const OLD_KEY = "cargoplanner:state";

export const DEFAULT_GAPS: GapSet = { walls: 0, width: 0, length: 0 };

function isLang(value: unknown): value is Lang {
  return value === "ru" || value === "en";
}
function isLengthUnit(value: unknown): value is LengthUnit {
  return value === "mm" || value === "cm" || value === "m";
}
function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "kg" || value === "t";
}
function isMode(value: unknown): value is Mode {
  return value === "along" || value === "across" || value === "mixed";
}

function normalizeVehicles(raw: unknown): Vehicle[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is Vehicle =>
      !!v &&
      typeof v === "object" &&
      typeof (v as Vehicle).id === "string" &&
      typeof (v as Vehicle).name === "string"
  );
}

function normalizeCargo(raw: unknown): CargoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is CargoItem =>
      !!c &&
      typeof c === "object" &&
      typeof (c as CargoItem).id === "string" &&
      typeof (c as CargoItem).name === "string"
  );
}

function readJson(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseSession(raw: unknown): Partial<SessionData> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<SessionData> = {};
  if (typeof r.vehicleId === "string") out.vehicleId = r.vehicleId;
  const customVehicles = normalizeVehicles(r.customVehicles);
  if (customVehicles.length > 0) out.customVehicles = customVehicles;
  const cargoItems = normalizeCargo(r.cargoItems);
  if (cargoItems.length > 0) out.cargoItems = cargoItems;
  const customCargoPresets = normalizeCargo(r.customCargoPresets);
  if (customCargoPresets.length > 0)
    out.customCargoPresets = customCargoPresets;
  if (typeof r.stackingEnabled === "boolean")
    out.stackingEnabled = r.stackingEnabled;
  if (typeof r.maxLayers === "number") out.maxLayers = r.maxLayers;
  if (isMode(r.activeMode)) out.activeMode = r.activeMode;
  return out;
}

/** Загружает настройки интерфейса (с фолбэком к старому ключу). */
export function loadUIPrefs(): Partial<UIPrefs> {
  if (typeof window === "undefined") return {};
  const out: Partial<UIPrefs> = {};
  const r = readJson(UI_KEY) ?? readJson(OLD_KEY);
  if (!r) return out;
  if (isLang(r.lang)) out.lang = r.lang;
  if (isLengthUnit(r.lengthUnit)) out.lengthUnit = r.lengthUnit;
  if (isWeightUnit(r.weightUnit)) out.weightUnit = r.weightUnit;
  return out;
}

export function saveUIPrefs(prefs: UIPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(prefs));
  } catch {
    /* приватный режим и т.п. */
  }
}

/** Возвращает список сохранённых сессий (метаданные). */
export function getSessions(): SessionMeta[] {
  if (typeof window === "undefined") return [];
  const raw = readJson(SESSIONS_KEY);
  if (!raw || !Array.isArray(raw.sessions)) return [];
  return raw.sessions.filter(
    (s): s is SessionMeta =>
      !!s &&
      typeof (s as SessionMeta).id === "string" &&
      typeof (s as SessionMeta).name === "string" &&
      typeof (s as SessionMeta).createdAt === "number"
  );
}

/** Читает данные сессии по id. */
export function getSession(id: string): Partial<SessionData> | null {
  if (typeof window === "undefined") return null;
  const raw = readJson(SESSIONS_KEY);
  if (!raw || typeof raw.data !== "object" || raw.data === null) return null;
  const map = raw.data as Record<string, unknown>;
  const entry = map[id];
  if (entry === undefined || entry === null) return null;
  const parsed = parseSession(entry);
  return parsed && Object.keys(parsed).length > 0 ? parsed : null;
}

function persistStore(list: SessionMeta[], data: Record<string, SessionData>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify({ sessions: list, data })
    );
  } catch {
    /* приватный режим и т.п. */
  }
}

function readStore(): {
  list: SessionMeta[];
  data: Record<string, SessionData>;
} {
  if (typeof window === "undefined") return { list: [], data: {} };
  const list = getSessions();
  const raw = readJson(SESSIONS_KEY);
  const data: Record<string, SessionData> = {};
  if (raw && typeof raw.data === "object" && raw.data !== null) {
    for (const [k, v] of Object.entries(raw.data as Record<string, unknown>)) {
      const parsed = parseSession(v);
      if (parsed) data[k] = parsed as SessionData;
    }
  }
  return { list, data };
}

/** Максимальное количество сохраняемых сессий. */
export const MAX_SESSIONS = 50;

/** Сохраняет новую сессию с именем. Возвращает созданную сессию или null,
 *  если достигнут лимит сессий (MAX_SESSIONS). */
export function createSession(
  name: string,
  data: SessionData
): SessionMeta | null {
  const st = readStore();
  const { list, store } = { list: st.list, store: st.data };
  if (list.length >= MAX_SESSIONS) return null;
  const meta: SessionMeta = {
    id: `session-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    name: name.trim() || "Сессия",
    createdAt: Date.now(),
  };
  list.push(meta);
  store[meta.id] = data;
  persistStore(list, store);
  return meta;
}

/** Обновляет данные существующей сессии по id (перезаписывает). */
export function updateSession(id: string, data: SessionData): void {
  const st = readStore();
  const { list, store } = { list: st.list, store: st.data };
  if (!list.some((s) => s.id === id)) return;
  store[id] = data;
  persistStore(list, store);
}

/** Удаляет сессию по id. */
export function deleteSession(id: string): void {
  const st = readStore();
  const { list, store } = { list: st.list, store: st.data };
  const next = list.filter((s) => s.id !== id);
  delete store[id];
  persistStore(next, store);
}
