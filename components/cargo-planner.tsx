"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@teispace/next-themes";
import {
  Truck,
  Sun,
  Moon,
  Download,
  FileText,
  FileSpreadsheet,
  Camera,
  Languages,
  Ruler,
  Boxes,
  Info,
  AlertTriangle,
  Package,
  Scale,
  Layers,
  Gauge,
  MoveHorizontal,
  MoveVertical,
  Shuffle,
  Plus,
  Pencil,
  Trash2,
  Upload,
  BookmarkPlus,
  FolderOpen,
  SlidersHorizontal,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n, STRINGS, type Lang } from "@/lib/i18n";
import {
  VEHICLES,
  CARGO,
  CARGO_PRESETS,
  cargoToCsv,
  parseCargoCsvDetailed,
  type CargoItem,
  type CargoPreset,
  type Vehicle,
  type Mode,
  type LengthUnit,
  type WeightUnit,
  formatLength,
  formatWeight,
  UNIT_SUFFIX,
  WEIGHT_SUFFIX,
} from "@/lib/data";
import { computeLayout, type LayoutResult, type GapSet } from "@/lib/packing";
import {
  saveUIPrefs,
  loadUIPrefs,
  createSession,
  DEFAULT_GAPS,
  type SessionData,
} from "@/lib/persistence";
import { findMaxGapByType } from "@/lib/validation";
import {
  exportPdfReport,
  exportPngSnapshot,
  exportExcelReport,
  type ExportContext,
} from "@/lib/export";
import { CargoFormDialog } from "@/components/cargo-form-dialog";
import { CustomVehicleDialog } from "@/components/custom-vehicle-dialog";
import { VehiclePickerDialog } from "@/components/vehicle-picker-dialog";
import { SessionsDialog } from "@/components/sessions-dialog";
import { CargoPresetsDialog } from "@/components/cargo-presets-dialog";
import { VehiclePresetsDialog } from "@/components/vehicle-presets-dialog";

const Scene3D = dynamic(() => import("@/components/scene-3d"), { ssr: false });
const Scene2D = dynamic(() => import("@/components/scene-2d"), { ssr: false });

const MODE_META: { id: Mode; icon: typeof MoveHorizontal }[] = [
  { id: "along", icon: MoveHorizontal },
  { id: "across", icon: MoveVertical },
  { id: "mixed", icon: Shuffle },
];

function lenSuffix(lang: Lang, unit: LengthUnit): string {
  if (lang === "en") return { mm: "mm", cm: "cm", m: "m" }[unit];
  return UNIT_SUFFIX[unit];
}

function wgtSuffix(lang: Lang, unit: WeightUnit): string {
  if (lang === "en") return { kg: "kg", t: "t" }[unit];
  return WEIGHT_SUFFIX[unit];
}

export type View = "3d" | "2d";

interface MoveOverride {
  x: number;
  y: number;
  z: number;
}

export default function CargoPlanner() {
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("mm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [vehicleId, setVehicleId] = useState<string>(VEHICLES[3].id);
  const [customVehicles, setCustomVehicles] = useState<Vehicle[]>([]);
  const [cargoItems, setCargoItems] = useState<CargoItem[]>(CARGO);
  const [customCargoPresets, setCustomCargoPresets] = useState<CargoItem[]>([]);
  const [view, setView] = useState<View>("2d");
  const [mode, setMode] = useState<Mode | null>(null);
  const [gapsEnabled, setGapsEnabled] = useState(true);
  const [gapsByMode, setGapsByMode] = useState<Record<Mode, GapSet>>({
    along: { ...DEFAULT_GAPS },
    across: { ...DEFAULT_GAPS },
    mixed: { ...DEFAULT_GAPS },
  });
  const [stackingEnabled, setStackingEnabled] = useState(true);
  const [maxLayers, setMaxLayers] = useState(1);
  const [moved, setMoved] = useState<Record<string, MoveOverride>>({});
  const [cargoDialog, setCargoDialog] = useState<{
    open: boolean;
    initial: CargoItem | null;
  }>({ open: false, initial: null });
  const [vehicleDialog, setVehicleDialog] = useState<{
    open: boolean;
    initial: Vehicle | null;
  }>({ open: false, initial: null });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [vehiclePresetsOpen, setVehiclePresetsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Восстанавливаются только настройки интерфейса (язык, единицы).
  // Автомобиль, грузы и режим сохраняются вручную по кнопке «Сохранить сессию».
  useEffect(() => {
    const ui = loadUIPrefs();
    if (ui.lang) setLang(ui.lang);
    if (ui.lengthUnit) setLengthUnit(ui.lengthUnit);
    if (ui.weightUnit) setWeightUnit(ui.weightUnit);
    // Зазоры всегда сбрасываются к дефолтным при новом сеансе.
    setGapsEnabled(true);
    setGapsByMode({
      along: { ...DEFAULT_GAPS },
      across: { ...DEFAULT_GAPS },
      mixed: { ...DEFAULT_GAPS },
    });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveUIPrefs({ lang, lengthUnit, weightUnit });
  }, [hydrated, lang, lengthUnit, weightUnit]);

  const vehicles = useMemo(
    () => [...VEHICLES, ...customVehicles],
    [customVehicles]
  );
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];

  const MODES: Mode[] = ["along", "across", "mixed"];
  const layouts = useMemo(() => {
    const res = {} as Record<Mode, LayoutResult>;
    for (const m of MODES) {
      res[m] = computeLayout(
        cargoItems,
        vehicle,
        m,
        gapsByMode[m],
        gapsEnabled,
        { enabled: stackingEnabled, maxLayers }
      );
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cargoItems,
    vehicle,
    gapsEnabled,
    gapsByMode,
    stackingEnabled,
    maxLayers,
  ]);

  const bestMode = useMemo(() => {
    let best: Mode = "mixed";
    let bestFill = -1;
    let bestPlaced = -1;
    let bestFootprint = Infinity;
    for (const m of MODES) {
      const l = layouts[m];
      // 1) заполнение объёма; 2) количество размещённых; 3) меньшие габариты укладки.
      const footprint = l.loadDim.length * l.loadDim.width;
      const better =
        l.volumeFill > bestFill ||
        (l.volumeFill === bestFill && l.placedCount > bestPlaced) ||
        (l.volumeFill === bestFill &&
          l.placedCount === bestPlaced &&
          footprint < bestFootprint);
      if (better) {
        bestFill = l.volumeFill;
        bestPlaced = l.placedCount;
        bestFootprint = footprint;
        best = m;
      }
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts]);

  // Активный режим меняется только по клику на вкладку. Выбираем лучший режим
  // один раз при загрузке, затем он остаётся фиксированным (зазоры его не меняют).
  useEffect(() => {
    if (mode === null) setMode(bestMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestMode]);

  const activeMode = mode ?? bestMode;
  const layout = layouts[activeMode];

  // Применяем ручные перемещения/изменение слоя грузов (2D).
  const effectiveBlocks = useMemo(() => {
    if (Object.keys(moved).length === 0) return layout.blocks;
    return layout.blocks.map((b) => {
      const m = moved[b.id];
      if (!m) return b;
      return { ...b, x: m.x, y: m.y, z: m.z };
    });
  }, [layout.blocks, moved]);

  const handleMoveBlock = (id: string, x: number, y: number) => {
    setMoved((prev) => {
      const cur = prev[id];
      return {
        ...prev,
        [id]: {
          x,
          y,
          z: cur ? cur.z : (layout.blocks.find((b) => b.id === id)?.z ?? 0),
        },
      };
    });
  };

  const handleMoveLayer = (id: string, z: number) => {
    setMoved((prev) => {
      const cur = prev[id];
      const base = layout.blocks.find((b) => b.id === id);
      return {
        ...prev,
        [id]: {
          x: cur ? cur.x : (base?.x ?? 0),
          y: cur ? cur.y : (base?.y ?? 0),
          z,
        },
      };
    });
  };

  // При смене раскладки ручные перемещения сбрасываются.
  useEffect(() => {
    setMoved({});
  }, [
    cargoItems,
    vehicle,
    gapsEnabled,
    gapsByMode,
    stackingEnabled,
    maxLayers,
  ]);

  const activeGaps = gapsByMode[activeMode];
  const anyGap =
    gapsEnabled && activeGaps.walls + activeGaps.width + activeGaps.length > 0;
  const setGap = (key: keyof GapSet, value: number) => {
    setGapsByMode((g) => ({
      ...g,
      [activeMode]: { ...g[activeMode], [key]: value },
    }));
  };

  // Проверка/обрезка зазоров по максимуму при смене авто или режима.
  useEffect(() => {
    let changed = false;
    const g: GapSet = { ...activeGaps };
    const clamp = (key: keyof GapSet) => {
      const max = findMaxGapByType(activeMode, key, vehicle, cargoItems);
      if (g[key] > max) {
        g[key] = max;
        changed = true;
      }
    };
    clamp("walls");
    clamp("width");
    clamp("length");
    if (changed) {
      setGapsByMode((prev) => ({ ...prev, [activeMode]: g }));
      toast.info(t.toastGapClamped);
    }
  }, [
    vehicle.id,
    vehicle,
    activeMode,
    cargoItems,
    activeGaps,
    setGapsByMode,
    t.toastGapClamped,
  ]);

  // Предупреждение о превышении грузоподъёмности (продолжить разрешено).
  useEffect(() => {
    if (!hydrated || vehicle.maxWeight <= 0) return;
    const total = cargoItems.reduce((s, c) => s + c.weight * c.count, 0);
    if (total > vehicle.maxWeight) {
      toast.warning(t.toastWeightOverCapacity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargoItems, vehicle.maxWeight, hydrated]);

  const metrics = useMemo(() => {
    let loadL = layout.loadDim.length;
    let loadW = layout.loadDim.width;
    let loadH = layout.loadDim.height;
    if (Object.keys(moved).length > 0) {
      let ml = 0;
      let mw = 0;
      let mh = 0;
      for (const b of effectiveBlocks) {
        ml = Math.max(ml, b.y + b.d);
        mw = Math.max(mw, b.x + b.w);
        mh = Math.max(mh, b.z + b.h);
      }
      loadL = ml;
      loadW = mw;
      loadH = mh;
    }
    return {
      placed: layout.placedCount,
      total: layout.totalCount,
      placedRegular: layout.placedRegular,
      placedOversize: layout.placedOversize,
      volumeFill: layout.volumeFill,
      weightFill: layout.weightFill,
      totalWeight: layout.weight,
      freeVolume: layout.freeVolume,
      freeWeight: layout.freeWeight,
      loadDim: {
        ...layout.loadDim,
        length: loadL,
        width: loadW,
        height: loadH,
      },
      stackable: layout.stackable,
      notPlaced: layout.notPlaced,
    };
  }, [layout, moved, effectiveBlocks]);

  // Подсказка «Есть свободное место для слоя N» появляется только если:
  // - штабелирование включено (maxStackHeight > 0);
  // - пользователь ещё не указал достаточно слоёв (maxLayers < N);
  // - в раскладке остались грузы, которые можно поставить на новый слой;
  // - высоты кузова хватает на N-й слой.
  const nextLayerHint = useMemo(() => {
    if (!stackingEnabled || layout.blocks.length === 0) return null;
    const minH = Math.min(
      ...cargoItems.filter((c) => c.height > 0).map((c) => c.height)
    );
    if (!Number.isFinite(minH) || minH <= 0) return null;
    const maxLayersForBody = Math.max(1, Math.floor(vehicle.height / minH));
    const usedLayers = new Set(layout.blocks.map((b) => Math.round(b.z))).size;
    if (usedLayers < 1) return null;
    const N = usedLayers + 1;
    if (maxLayers >= N) return null;
    if (maxLayersForBody < N) return null;
    const notPlacedNames = new Set(layout.notPlaced.map((np) => np.name));
    const hasRemainingStackable = cargoItems.some(
      (c) =>
        c.stackable &&
        !c.isOversize &&
        c.count > 0 &&
        notPlacedNames.has(c.name)
    );
    if (!hasRemainingStackable) return null;
    return N;
  }, [stackingEnabled, layout, cargoItems, maxLayers, vehicle.height]);

  const addCargo = (item: CargoItem) => {
    setCargoItems((list) => [...list, item]);
  };

  const updateCargo = (item: CargoItem) => {
    setCargoItems((list) => list.map((c) => (c.id === item.id ? item : c)));
  };

  const removeCargo = (id: string) => {
    setCargoItems((list) => list.filter((c) => c.id !== id));
  };

  const handleCargoSubmit = (item: CargoItem) => {
    const exists = cargoItems.some((c) => c.id === item.id);
    if (exists) {
      updateCargo(item);
      toast.success(t.toastCargoUpdated);
    } else {
      addCargo(item);
      toast.success(t.toastCargoAdded);
    }
    setCargoDialog({ open: false, initial: null });
  };

  const saveAsCargoPreset = (item: CargoItem) => {
    setCustomCargoPresets((list) => {
      const exists = list.some((p) => p.id === item.id);
      return exists
        ? list.map((p) => (p.id === item.id ? { ...item } : p))
        : [...list, { ...item }];
    });
    toast.success(t.toastPresetSaved);
  };

  const handlePresetSave = (preset: CargoPreset) => {
    setCustomCargoPresets((list) => {
      const exists = list.some((p) => p.id === preset.id);
      const updated = exists
        ? list.map((p) => (p.id === preset.id ? { ...preset } : p))
        : [...list, { ...preset }];
      return updated;
    });
    toast.success(t.toastPresetSaved);
  };

  const deleteCargoPreset = (id: string) => {
    setCustomCargoPresets((list) => list.filter((p) => p.id !== id));
    toast.success(t.toastPresetRemoved);
  };

  const resetBuiltinCargoPreset = (name: string) => {
    const suffix = ` (${t.editedSuffix})`;
    setCustomCargoPresets((list) =>
      list.filter((p) => p.name !== `${name}${suffix}`)
    );
    toast.success(t.toastPresetReset);
  };

  const handleVehicleSubmit = (v: Vehicle) => {
    const exists = customVehicles.some((c) => c.id === v.id);
    setCustomVehicles((list) =>
      exists ? list.map((c) => (c.id === v.id ? v : c)) : [...list, v]
    );
    setVehicleId(v.id);
    setVehicleDialog({ open: false, initial: null });
    toast.success(
      `${exists ? t.toastVehicleUpdated : t.toastVehicleCreated}: ${v.name}`
    );
  };

  const removeCustomVehicle = (id: string) => {
    const target = customVehicles.find((v) => v.id === id);
    setCustomVehicles((list) => list.filter((v) => v.id !== id));
    if (vehicleId === id) {
      setVehicleId(VEHICLES[3].id);
    }
    if (target) toast.success(`${t.toastVehicleRemoved}: ${target.name}`);
  };

  const resetBuiltinVehicle = (name: string) => {
    const suffix = ` (${t.editedSuffix})`;
    setCustomVehicles((list) =>
      list.filter((v) => v.name !== `${name}${suffix}`)
    );
    toast.success(t.toastPresetReset);
  };

  // --- Сессии ---
  const buildSessionData = (): SessionData => ({
    vehicleId,
    customVehicles,
    cargoItems,
    customCargoPresets,
    stackingEnabled,
    maxLayers,
    activeMode: mode,
  });

  const handleSaveSession = (name: string) => {
    const meta = createSession(
      name || t.sessionNamePlaceholder,
      buildSessionData()
    );
    if (!meta) {
      toast.error(t.toastSessionLimit);
      return;
    }
    const displayName = name.trim() || meta.name;
    toast.success(t.toastSessionNamed.replace("%s", displayName));
  };

  const handleLoadSession = (data: SessionData) => {
    if (data.vehicleId) setVehicleId(data.vehicleId);
    if (data.customVehicles) setCustomVehicles(data.customVehicles);
    if (data.cargoItems) setCargoItems(data.cargoItems);
    if (data.customCargoPresets) setCustomCargoPresets(data.customCargoPresets);
    if (data.stackingEnabled !== undefined)
      setStackingEnabled(data.stackingEnabled);
    if (data.maxLayers !== undefined) setMaxLayers(data.maxLayers);
    if (data.activeMode !== undefined) setMode(data.activeMode);
    // Зазоры между сессиями не сохраняются — сбрасываются к нулю.
    setGapsEnabled(true);
    setGapsByMode({
      along: { ...DEFAULT_GAPS },
      across: { ...DEFAULT_GAPS },
      mixed: { ...DEFAULT_GAPS },
    });
    toast.success(t.toastSessionLoaded);
  };

  // Максимум слоёв: floor(высота кузова / высота самого низкого груза).
  const maxLayersAllowed = useMemo(() => {
    const minH = Math.min(
      ...cargoItems.filter((c) => c.height > 0).map((c) => c.height)
    );
    if (!Number.isFinite(minH) || minH <= 0) return 1;
    return Math.max(1, Math.floor(vehicle.height / minH));
  }, [cargoItems, vehicle.height]);

  const handleMaxLayersChange = (value: number) => {
    if (!Number.isInteger(value) || value < 1) return;
    if (value > maxLayersAllowed) {
      toast.error(
        t.toastMaxStackLayers.replace("%d", String(maxLayersAllowed))
      );
      setMaxLayers(maxLayersAllowed);
      return;
    }
    setMaxLayers(value);
  };

  // --- Экспорт ---
  const exportCsv = () => {
    if (cargoItems.length === 0) {
      toast.info(t.toastNoCargoExport);
      return;
    }
    const csv = cargoToCsv(cargoItems);
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cargo.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${t.toastCsvExported}: ${cargoItems.length}`);
  };

  const importCsv = async (file: File) => {
    try {
      const text = await file.text();
      const { items, dropped } = parseCargoCsvDetailed(text);
      setCargoItems(items);
      toast.success(`${t.toastCsvImported}: ${items.length}`);
      if (dropped > 0) {
        toast.warning(t.toastCsvDropped.replace("%d", String(dropped)));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toastCsvImportFailed);
    }
  };

  const isDark = resolvedTheme === "dark";

  const exportContext = (): ExportContext => ({
    vehicle,
    lengthUnit,
    weightUnit,
    lang,
    mode: activeMode,
    layout,
    layouts,
    gapsEnabled,
    gaps: activeGaps,
    cargoItems,
  });

  const handleExportPdf = () => {
    exportPdfReport(exportContext());
    toast.success(t.toastPdfReady);
  };

  const handleExportExcel = () => {
    exportExcelReport(exportContext());
    toast.success(t.toastExcelReady);
  };

  const handleExportPng = () => {
    exportPngSnapshot(
      view === "3d" ? sceneCanvasRef.current : null,
      exportContext(),
      view
    );
    toast.success(t.toastPngSaved);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Верхняя панель */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {t.appName}
          </span>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          aria-label={t.theme}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {hydrated &&
            (isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            ))}
          {hydrated && (
            <span className="hidden sm:inline">
              {isDark ? t.light : t.dark}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t.language}
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
        >
          <Languages className="h-4 w-4" />
          <span className="uppercase">{lang}</span>
        </Button>
        <div className="hidden items-center gap-1 lg:flex">
          <UnitSelect<LengthUnit>
            value={lengthUnit}
            onChange={setLengthUnit}
            icon={<Ruler className="h-4 w-4" />}
            lang={lang}
            options={["mm", "cm", "m"]}
          />
          <UnitSelect<WeightUnit>
            value={weightUnit}
            onChange={setWeightUnit}
            icon={<Scale className="h-4 w-4" />}
            lang={lang}
            options={["kg", "t"]}
          />
        </div>
        <Separator
          orientation="vertical"
          className="mx-1 hidden h-6 sm:block"
        />
        <div className="hidden items-center gap-1 md:flex">
          <Button
            variant="outline"
            size="sm"
            aria-label="PDF"
            onClick={handleExportPdf}
          >
            <FileText className="h-4 w-4" />
            {t.exportPdf}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="PNG"
            onClick={handleExportPng}
          >
            <Camera className="h-4 w-4" />
            {t.exportPng}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Excel"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t.exportExcel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t.sessionsLabel}
            onClick={() => setSessionsDialogOpen(true)}
          >
            <FolderOpen className="h-4 w-4" />
            {t.sessionsLabel}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Левая панель */}
        <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-x-hidden overflow-y-auto border-r p-3">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-muted-foreground" />
              {t.vehicle}
            </h2>
            <select
              value={vehicle.id}
              onChange={(e) => setVehicleId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t.vehicle}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setVehicleDialog({ open: true, initial: null })}
            >
              <Plus className="h-4 w-4" />
              {t.customBody}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setPickerOpen(true)}
            >
              <Shuffle className="h-4 w-4" />
              {t.pickVehicle}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setVehiclePresetsOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.vehiclePresetsLabel}
            </Button>
            {customVehicles.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {t.myBodies}
                </div>
                {customVehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5 text-xs"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left hover:text-foreground"
                      onClick={() => setVehicleId(v.id)}
                      title={`${v.name}: ${formatLength(v.length, lengthUnit)}×${formatLength(v.width, lengthUnit)}×${formatLength(v.height, lengthUnit)} ${lenSuffix(lang, lengthUnit)}`}
                    >
                      <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{v.name}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t.dialogEditCargo} ${v.name}`}
                        onClick={() =>
                          setVehicleDialog({ open: true, initial: v })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t.toastVehicleRemoved} ${v.name}`}
                        onClick={() => removeCustomVehicle(v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <dl className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <dt>{t.length}</dt>
                <dd className="font-medium text-foreground">
                  {formatLength(vehicle.length, lengthUnit)}{" "}
                  {lenSuffix(lang, lengthUnit)}
                </dd>
              </div>
              <div>
                <dt>{t.width}</dt>
                <dd className="font-medium text-foreground">
                  {formatLength(vehicle.width, lengthUnit)}{" "}
                  {lenSuffix(lang, lengthUnit)}
                </dd>
              </div>
              <div>
                <dt>{t.height}</dt>
                <dd className="font-medium text-foreground">
                  {formatLength(vehicle.height, lengthUnit)}{" "}
                  {lenSuffix(lang, lengthUnit)}
                </dd>
              </div>
            </dl>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />
              {t.totalWeight}: {formatWeight(vehicle.maxWeight, weightUnit)}{" "}
              {wgtSuffix(lang, weightUnit)}
            </div>
          </section>

          <Separator />

          <section className="min-h-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                {t.cargo}
              </h2>
              <Badge variant="secondary" className="ml-auto">
                {cargoItems.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCargoDialog({ open: true, initial: null })}
              >
                <Plus className="h-4 w-4" />
                {t.addCargo}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                aria-label={t.exportCsv}
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 w-full"
                onClick={() => setPresetsDialogOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t.presets}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {t.importCsv}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importCsv(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="space-y-2">
              {cargoItems.length === 0 && (
                <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  {t.emptyCargoList}
                </div>
              )}
              {cargoItems.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border bg-card p-3 text-sm ring-1 ring-foreground/10"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {c.kind === "rect" ? "▣" : "◉"}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {formatLength(c.length, lengthUnit)}×
                      {formatLength(c.width, lengthUnit)}×
                      {formatLength(c.height, lengthUnit)}{" "}
                      {lenSuffix(lang, lengthUnit)}
                    </span>
                    <span className="text-right">
                      {c.count} {t.count}
                    </span>
                    <span>
                      {formatWeight(c.weight, weightUnit)}{" "}
                      {wgtSuffix(lang, weightUnit)}
                    </span>
                    <span className="text-right">
                      {c.stackable ? t.stackable : "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t.savePreset} ${c.name}`}
                      title={t.savePreset}
                      onClick={() => saveAsCargoPreset(c)}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t.dialogEditCargo} ${c.name}`}
                      onClick={() => setCargoDialog({ open: true, initial: c })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t.toastCargoRemoved} ${c.name}`}
                      onClick={() => {
                        removeCargo(c.id);
                        toast.success(`${t.toastCargoRemoved}: ${c.name}`);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Центральная область */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              {(["2d", "3d"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded px-4 py-1.5 text-sm font-medium transition-colors",
                    view === v
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={view === v}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {t.best}: {t[bestMode]}
            </span>
            <div className="flex-1" />
            <Badge variant="secondary">{vehicle.name}</Badge>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
            {view === "3d" ? (
              <Scene3D
                blocks={effectiveBlocks}
                vehicle={vehicle}
                lengthUnit={lengthUnit}
                canvasRef={sceneCanvasRef}
              />
            ) : (
              <Scene2D
                blocks={effectiveBlocks}
                vehicle={vehicle}
                gapsEnabled={gapsEnabled}
                gapWalls={activeGaps.walls}
                lengthUnit={lengthUnit}
                onMoveBlock={handleMoveBlock}
                onMoveLayer={handleMoveLayer}
              />
            )}
          </div>
        </main>

        {/* Правая панель */}
        <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l p-3">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              {t.metrics}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label={`${t.placed}`}
                value={`${metrics.placed}/${metrics.total}`}
              />
              {(metrics.placedOversize > 0 || metrics.placedRegular > 0) && (
                <Metric
                  label={t.placedRegular}
                  value={`${metrics.placedRegular}, ${t.placedOversize}: ${metrics.placedOversize}`}
                />
              )}
              <Metric
                label={t.volumeFill}
                value={`${metrics.volumeFill.toFixed(0)}%`}
                bar={metrics.volumeFill}
              />
              <Metric
                label={t.weightFill}
                value={`${metrics.weightFill.toFixed(0)}%`}
                bar={metrics.weightFill}
              />
              <Metric
                label={t.totalWeight}
                value={`${formatWeight(metrics.totalWeight, weightUnit)} ${wgtSuffix(lang, weightUnit)}`}
              />
              <Metric
                label={t.freeVolume}
                value={`${(metrics.freeVolume / 1e9).toFixed(2)} ${lang === "ru" ? "м³" : "m³"}`}
              />
              <Metric
                label={t.freeWeight}
                value={`${formatWeight(metrics.freeWeight, weightUnit)} ${wgtSuffix(lang, weightUnit)}`}
              />
            </div>
            <Metric
              label={t.loadDim}
              value={`${formatLength(metrics.loadDim.length, lengthUnit)}×${formatLength(metrics.loadDim.width, lengthUnit)}×${formatLength(metrics.loadDim.height, lengthUnit)} ${lenSuffix(lang, lengthUnit)}`}
            />
            <div className="flex items-center gap-2 rounded-lg border bg-card p-2.5 text-xs text-muted-foreground ring-1 ring-foreground/10">
              <Layers className="h-4 w-4 shrink-0 text-primary" />
              {t.stackable}: {metrics.stackable ? t.yes : t.no}
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t.hints}
            </h2>
            <div className="space-y-2">
              {metrics.volumeFill < 50 && (
                <Hint tone="info">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    {t.hintLowVolume} ({metrics.volumeFill.toFixed(0)}%)
                  </span>
                </Hint>
              )}
              {metrics.placedOversize > 0 && (
                <Hint tone="warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t.oversizeHint}</span>
                </Hint>
              )}
              {metrics.notPlaced.length > 0 && (
                <Hint tone="warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {t.notPlaced}:
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {metrics.notPlaced.map((np) => (
                        <li key={np.name}>
                          {np.name} — {np.count}
                        </li>
                      ))}
                    </ul>
                    {anyGap && (
                      <span className="mt-1 block">— {t.hintOrReduceGaps}</span>
                    )}
                  </span>
                </Hint>
              )}
              {metrics.weightFill > 85 && (
                <Hint tone="warning">
                  <Scale className="h-4 w-4 shrink-0" />
                  <span>
                    {t.hintNearWeightLimit} ({metrics.weightFill.toFixed(0)}%)
                  </span>
                </Hint>
              )}
              {nextLayerHint !== null && (
                <Hint tone="info">
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>
                    {t.hintNextLayer.replace("%d", String(nextLayerHint))}
                  </span>
                </Hint>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Нижняя панель */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t bg-background/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1">
          {MODE_META.map((m) => {
            const Icon = m.icon;
            return (
              <Button
                key={m.id}
                variant={activeMode === m.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(m.id)}
              >
                <Icon className="h-4 w-4" />
                {t[m.id]}
                {m.id === bestMode && (
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1 text-[10px] font-semibold"
                  >
                    {t.best}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={gapsEnabled}
              onChange={(e) => setGapsEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t.enableGaps}
          </label>
          <GapInput
            label={t.gapWalls}
            value={activeGaps.walls}
            max={findMaxGapByType(activeMode, "walls", vehicle, cargoItems)}
            unit={lengthUnit}
            onChange={(v) => setGap("walls", v)}
            disabled={!gapsEnabled}
          />
          <GapInput
            label={t.gapWidth}
            value={activeGaps.width}
            max={findMaxGapByType(activeMode, "width", vehicle, cargoItems)}
            unit={lengthUnit}
            onChange={(v) => setGap("width", v)}
            disabled={!gapsEnabled}
          />
          <GapInput
            label={t.gapLength}
            value={activeGaps.length}
            max={findMaxGapByType(activeMode, "length", vehicle, cargoItems)}
            unit={lengthUnit}
            onChange={(v) => setGap("length", v)}
            disabled={!gapsEnabled}
          />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stackingEnabled}
              onChange={(e) => setStackingEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t.enableStacking}
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden xl:inline">{t.maxLayers}</span>
            <Input
              type="number"
              value={maxLayers}
              min={1}
              max={maxLayersAllowed}
              step={1}
              disabled={!stackingEnabled}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                handleMaxLayersChange(Math.round(parsed));
              }}
              className="h-8 w-16"
            />
          </label>
        </div>
      </footer>

      <CargoFormDialog
        open={cargoDialog.open}
        onOpenChange={(open) => setCargoDialog((d) => ({ ...d, open }))}
        initial={cargoDialog.initial}
        onSubmit={handleCargoSubmit}
        vehicle={vehicle}
        lengthUnit={lengthUnit}
        weightUnit={weightUnit}
      />
      <CustomVehicleDialog
        open={vehicleDialog.open}
        onOpenChange={(open) => setVehicleDialog((d) => ({ ...d, open }))}
        initial={vehicleDialog.initial}
        onSubmit={handleVehicleSubmit}
        lengthUnit={lengthUnit}
        weightUnit={weightUnit}
      />
      <VehiclePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        vehicles={vehicles}
        currentVehicleId={vehicle.id}
        cargoItems={cargoItems}
        gapsByMode={gapsByMode}
        gapsEnabled={gapsEnabled}
        stackingEnabled={stackingEnabled}
        maxLayers={maxLayers}
        lengthUnit={lengthUnit}
        weightUnit={weightUnit}
        onSelect={(v) => setVehicleId(v.id)}
      />
      <SessionsDialog
        open={sessionsDialogOpen}
        onOpenChange={setSessionsDialogOpen}
        onSave={handleSaveSession}
        onLoad={handleLoadSession}
      />
      <CargoPresetsDialog
        open={presetsDialogOpen}
        onOpenChange={setPresetsDialogOpen}
        presets={[...CARGO_PRESETS, ...customCargoPresets]}
        customPresetIds={customCargoPresets.map((p) => p.id)}
        lengthUnit={lengthUnit}
        weightUnit={weightUnit}
        onSave={handlePresetSave}
        onDelete={deleteCargoPreset}
        onResetBuiltin={resetBuiltinCargoPreset}
      />
      <VehiclePresetsDialog
        open={vehiclePresetsOpen}
        onOpenChange={setVehiclePresetsOpen}
        builtinVehicles={VEHICLES}
        customVehicles={customVehicles}
        currentVehicleId={vehicle.id}
        lengthUnit={lengthUnit}
        weightUnit={weightUnit}
        onSelect={(id) => setVehicleId(id)}
        onSave={handleVehicleSubmit}
        onDelete={removeCustomVehicle}
        onResetBuiltin={resetBuiltinVehicle}
      />
    </div>
  );
}

function UnitSelect<T extends string>({
  value,
  onChange,
  icon,
  lang,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  icon: React.ReactNode;
  lang: Lang;
  options: T[];
}) {
  const unitLabel = (u: T): string => {
    const map: Record<string, string> =
      lang === "ru"
        ? { mm: "мм", cm: "см", m: "м", kg: "кг", t: "т" }
        : { mm: "mm", cm: "cm", m: "m", kg: "kg", t: "t" };
    return map[u] ?? u;
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={STRINGS[lang].units}
      onClick={() => {
        const idx = options.indexOf(value);
        onChange(options[(idx + 1) % options.length]);
      }}
    >
      {icon}
      <span>{unitLabel(value)}</span>
    </Button>
  );
}

function Metric({
  label,
  value,
  bar,
}: {
  label: string;
  value: string;
  bar?: number;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5 ring-1 ring-foreground/10">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
      {bar !== undefined && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, bar)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Hint({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5 text-xs ring-1 ring-foreground/10",
        tone === "warning"
          ? "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          : "bg-card text-muted-foreground"
      )}
    >
      {children}
    </div>
  );
}

function GapInput({
  label,
  value,
  max,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  unit: LengthUnit;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const { lang, t } = useI18n();
  const toDisplay = (mm: number) =>
    unit === "mm" ? mm : unit === "cm" ? mm / 10 : mm / 1000;
  const toMm = (v: number) =>
    unit === "mm" ? v : unit === "cm" ? v * 10 : v * 1000;
  const formatDisp = (mm: number) => {
    const d = toDisplay(mm);
    return unit === "mm"
      ? String(Math.round(d))
      : unit === "cm"
        ? d.toFixed(1)
        : d.toFixed(3);
  };
  const step = unit === "mm" ? 10 : unit === "cm" ? 1 : 0.001;
  const [draft, setDraft] = useState<string>(formatDisp(value));

  useEffect(() => {
    setDraft(formatDisp(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unit]);

  const commit = (mm: number) => {
    if (mm < 0) {
      toast.error(t.toastNegative);
      setDraft(formatDisp(value));
      return;
    }
    if (mm > max) {
      toast.error(
        `${t.toastMaxValue}: ${formatDisp(max)} ${lenSuffix(lang, unit)}`
      );
      setDraft(formatDisp(value));
      return;
    }
    onChange(mm);
  };

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="hidden xl:inline">{label}</span>
      <Input
        type="number"
        value={draft}
        min={0}
        max={toDisplay(max)}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          commit(toMm(parsed));
        }}
        className="h-8 w-20"
      />
      <span className="text-xs">{lenSuffix(lang, unit)}</span>
    </label>
  );
}
