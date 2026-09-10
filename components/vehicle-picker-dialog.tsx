"use client";

import { useMemo } from "react";
import { Check, Layers, Package, Scale, Truck, Boxes } from "lucide-react";

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

function bestLayout(
  vehicle: Vehicle,
  cargoItems: CargoItem[],
  gapsByMode: Record<Mode, GapSet>,
  gapsEnabled: boolean,
  stackingEnabled: boolean,
  maxLayers: number
): LayoutResult {
  let best: LayoutResult | null = null;
  for (const m of MODES) {
    const res = computeLayout(
      cargoItems,
      vehicle,
      m,
      gapsByMode[m],
      gapsEnabled,
      { enabled: stackingEnabled, maxLayers }
    );
    if (!best || res.volumeFill > best.volumeFill) {
      best = res;
    }
  }
  return (
    best ?? computeLayout(cargoItems, vehicle, "mixed", gapsByMode.mixed, false)
  );
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
  const lenSuffix = (u: LengthUnit): string =>
    lang === "ru" ? UNIT_SUFFIX[u] : { mm: "mm", cm: "cm", m: "m" }[u];
  const wgtSuffix = (u: WeightUnit): string =>
    lang === "ru" ? WEIGHT_SUFFIX[u] : { kg: "kg", t: "t" }[u];
  const options = useMemo(() => {
    const computed = vehicles.map((v) => {
      const layout = bestLayout(
        v,
        cargoItems,
        gapsByMode,
        gapsEnabled,
        stackingEnabled,
        maxLayers
      );
      return { vehicle: v, layout };
    });
    return computed.sort((a, b) => b.layout.volumeFill - a.layout.volumeFill);
  }, [
    vehicles,
    cargoItems,
    gapsByMode,
    gapsEnabled,
    stackingEnabled,
    maxLayers,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.dialogPickTitle}</DialogTitle>
          <DialogDescription>{t.dialogPickDesc}</DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
          {options.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t.dialogNoVehicles}
            </div>
          )}
          {options.map(({ vehicle, layout }) => {
            const isCurrent = vehicle.id === currentVehicleId;
            return (
              <div
                key={vehicle.id}
                className={cn(
                  "rounded-lg border bg-card p-3 ring-1 ring-foreground/10 transition-colors",
                  isCurrent && "ring-2 ring-primary"
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
