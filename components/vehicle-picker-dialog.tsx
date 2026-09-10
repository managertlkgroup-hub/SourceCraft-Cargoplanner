"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Layers,
  Package,
  Scale,
  Truck,
  Boxes,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  type CargoItem,
  type Mode,
  type Vehicle,
  type LengthUnit,
  type WeightUnit,
  formatLength,
  formatWeight,
  UNIT_SUFFIX,
  WEIGHT_SUFFIX,
} from "@/lib/data";
import { computeLayout, type GapSet, type LayoutResult } from "@/lib/packing";

const MODES: Mode[] = ["along", "across", "mixed"];

type SortKey =
  | "volume-desc"
  | "volume-asc"
  | "weight-desc"
  | "weight-asc"
  | "dims-desc"
  | "dims-asc"
  | "placed-desc";

interface VehiclePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  currentVehicleId: string;
  cargoItems: CargoItem[];
  gapsByMode: Record<Mode, GapSet>;
  gapsEnabled: boolean;
  stackingEnabled: boolean;
  maxLayers: number;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  onSelect: (vehicle: Vehicle) => void;
}

interface FitInfo {
  vehicle: Vehicle;
  layout: LayoutResult;
  /** Грузы, которые не помещаются ни в одном из режимов. */
  neverFits: CargoItem[];
  /** Суммарное количество неразмещаемых грузов. */
  neverFitCount: number;
}

function computeFit(
  vehicle: Vehicle,
  cargoItems: CargoItem[],
  gapsByMode: Record<Mode, GapSet>,
  gapsEnabled: boolean,
  stackingEnabled: boolean,
  maxLayers: number
): FitInfo {
  const layouts = MODES.map((m) =>
    computeLayout(cargoItems, vehicle, m, gapsByMode[m], gapsEnabled, {
      enabled: stackingEnabled,
      maxLayers,
    })
  );
  const best = layouts.reduce((a, b) => (b.volumeFill > a.volumeFill ? b : a));
  const modeSets = layouts.map(
    (l) => new Set(l.notPlaced.map((np) => np.name))
  );
  const neverFits = cargoItems.filter((c) =>
    modeSets.every((s) => s.has(c.name))
  );
  const neverFitCount = neverFits.reduce((s, c) => s + c.count, 0);
  return { vehicle, layout: best, neverFits, neverFitCount };
}

export function VehiclePickerDialog({
  open,
  onOpenChange,
  vehicles,
  currentVehicleId,
  cargoItems,
  gapsByMode,
  gapsEnabled,
  stackingEnabled,
  maxLayers,
  lengthUnit,
  weightUnit,
  onSelect,
}: VehiclePickerDialogProps) {
  const { t, lang } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("volume-desc");
  const lenSuffix = (u: LengthUnit): string =>
    lang === "ru" ? UNIT_SUFFIX[u] : { mm: "mm", cm: "cm", m: "m" }[u];
  const wgtSuffix = (u: WeightUnit): string =>
    lang === "ru" ? WEIGHT_SUFFIX[u] : { kg: "kg", t: "t" }[u];

  const options = useMemo(() => {
    const computed = vehicles.map((v) =>
      computeFit(
        v,
        cargoItems,
        gapsByMode,
        gapsEnabled,
        stackingEnabled,
        maxLayers
      )
    );
    const sortValue = (f: FitInfo): number => {
      switch (sortKey) {
        case "volume-asc":
        case "volume-desc":
          return f.layout.volumeFill;
        case "weight-asc":
        case "weight-desc":
          return f.layout.weight;
        case "dims-asc":
        case "dims-desc":
          return (
            f.layout.loadDim.length *
            f.layout.loadDim.width *
            f.layout.loadDim.height
          );
        case "placed-desc":
          return f.layout.placedCount;
      }
    };
    const desc = sortKey.includes("desc");
    return computed.sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      return desc ? bv - av : av - bv;
    });
  }, [
    vehicles,
    cargoItems,
    gapsByMode,
    gapsEnabled,
    stackingEnabled,
    maxLayers,
    sortKey,
  ]);

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "volume-desc", label: t.sortVolumeDesc },
    { value: "volume-asc", label: t.sortVolumeAsc },
    { value: "weight-desc", label: t.sortWeightDesc },
    { value: "weight-asc", label: t.sortWeightAsc },
    { value: "dims-desc", label: t.sortDimsDesc },
    { value: "dims-asc", label: t.sortDimsAsc },
    { value: "placed-desc", label: t.sortPlacedDesc },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.dialogPickTitle}</DialogTitle>
          <DialogDescription>{t.dialogPickDesc}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-2 pb-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t.pickSortLabel}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="-mx-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
          {options.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t.dialogNoVehicles}
            </div>
          )}
          {options.map(({ vehicle, layout, neverFits, neverFitCount }) => {
            const isCurrent = vehicle.id === currentVehicleId;
            const notSuitable = neverFitCount > 0;
            return (
              <div
                key={vehicle.id}
                className={cn(
                  "rounded-lg border bg-card p-3 ring-1 ring-foreground/10 transition-colors",
                  isCurrent && "ring-2 ring-primary",
                  notSuitable &&
                    "border-amber-300/60 ring-amber-300/40 dark:border-amber-500/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{vehicle.name}</span>
                  {isCurrent && (
                    <Badge variant="secondary" className="ml-1">
                      {t.dialogCurrent}
                    </Badge>
                  )}
                  {notSuitable && (
                    <Badge className="ml-1 bg-amber-500/15 text-amber-700 ring-1 ring-amber-400/50 dark:text-amber-300">
                      {t.pickNotFit.replace("%d", String(neverFitCount))}
                    </Badge>
                  )}
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    {formatLength(vehicle.length, lengthUnit)}×
                    {formatLength(vehicle.width, lengthUnit)}×
                    {formatLength(vehicle.height, lengthUnit)}{" "}
                    {lenSuffix(lengthUnit)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="h-3.5 w-3.5 shrink-0" />
                    {t.dialogPlaced}:{" "}
                    <b className="text-foreground">
                      {layout.placedCount}/{layout.totalCount}
                    </b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 shrink-0" />
                    {t.dialogVolume}:{" "}
                    <b className="text-foreground">
                      {layout.volumeFill.toFixed(0)}%
                    </b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 shrink-0" />
                    {t.dialogWeight}:{" "}
                    <b className="text-foreground">
                      {layout.weightFill.toFixed(0)}%
                    </b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    {t.dialogLoad}:{" "}
                    <b className="text-foreground">
                      {formatLength(layout.loadDim.length, lengthUnit)}×
                      {formatLength(layout.loadDim.width, lengthUnit)}×
                      {formatLength(layout.loadDim.height, lengthUnit)}{" "}
                      {lenSuffix(lengthUnit)}
                    </b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    {t.dialogStackableLabel}:{" "}
                    <b className="text-foreground">
                      {layout.stackable ? t.yes : t.no}
                    </b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {t.dialogWeight}:{" "}
                    <b className="text-foreground">
                      {formatWeight(vehicle.maxWeight, weightUnit)}{" "}
                      {wgtSuffix(weightUnit)}
                    </b>
                  </span>
                </div>

                {notSuitable && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t.pickNotFitList}:{" "}
                      {neverFits
                        .map((c) => `${c.name} × ${c.count}`)
                        .join(", ")}
                    </span>
                  </div>
                )}

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${layout.volumeFill}%` }}
                  />
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant={isCurrent ? "outline" : "default"}
                    onClick={() => {
                      onSelect(vehicle);
                      onOpenChange(false);
                    }}
                  >
                    <Check className="h-4 w-4" />
                    {isCurrent ? t.dialogApply : t.dialogSelect}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
