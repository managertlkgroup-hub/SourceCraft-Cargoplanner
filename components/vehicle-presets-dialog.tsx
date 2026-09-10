"use client";

import { useState } from "react";
import { z } from "zod";
import { Pencil, Plus, RotateCcw, Trash2, Truck, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  makeId,
  type Vehicle,
  type LengthUnit,
  type WeightUnit,
  fromLengthToMm,
  fromWeightToKg,
  lengthToDisplay,
  weightToDisplay,
  formatLength,
  formatWeight,
  UNIT_SUFFIX,
  WEIGHT_SUFFIX,
} from "@/lib/data";
import { validateField, VEHICLE_LIMITS } from "@/lib/validation";

interface VehicleFormState {
  name: string;
  length: string;
  width: string;
  height: string;
  maxWeight: string;
}

interface VehiclePresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builtinVehicles: Vehicle[];
  customVehicles: Vehicle[];
  currentVehicleId: string;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  onSelect: (id: string) => void;
  onSave: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  onResetBuiltin?: (name: string) => void;
}

function emptyForm(): VehicleFormState {
  return { name: "", length: "", width: "", height: "", maxWeight: "" };
}

function toForm(v: Vehicle, lu: LengthUnit, wu: WeightUnit): VehicleFormState {
  return {
    name: v.name,
    length: String(lengthToDisplay(v.length, lu)),
    width: String(lengthToDisplay(v.width, lu)),
    height: String(lengthToDisplay(v.height, lu)),
    maxWeight: String(weightToDisplay(v.maxWeight, wu)),
  };
}

export function VehiclePresetsDialog({
  open,
  onOpenChange,
  builtinVehicles,
  customVehicles,
  currentVehicleId,
  lengthUnit,
  weightUnit,
  onSelect,
  onSave,
  onDelete,
  onResetBuiltin,
}: VehiclePresetsDialogProps) {
  const { t, lang } = useI18n();
  const lenSuffix = (u: LengthUnit): string =>
    lang === "ru" ? UNIT_SUFFIX[u] : { mm: "mm", cm: "cm", m: "m" }[u];
  const wgtSuffix = (u: WeightUnit): string =>
    lang === "ru" ? WEIGHT_SUFFIX[u] : { kg: "kg", t: "t" }[u];

  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<VehicleFormState>(emptyForm());
  const [errors, setErrors] = useState<
    Partial<Record<keyof VehicleFormState, string>>
  >({});

  const isCustom = (id: string) => customVehicles.some((v) => v.id === id);

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setFormOpen(true);
  };

  const startEdit = (v: Vehicle) => {
    setEditing(v);
    setForm(toForm(v, lengthUnit, weightUnit));
    setErrors({});
    setFormOpen(true);
  };

  const schema = z.object({
    name: z.string().min(1, t.errNameRequired),
    length: z.coerce.number(),
    width: z.coerce.number(),
    height: z.coerce.number(),
    maxWeight: z.coerce.number(),
  });

  const set = <K extends keyof VehicleFormState>(
    key: K,
    value: VehicleFormState[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten();
      const next: Partial<Record<keyof VehicleFormState, string>> = {};
      (
        Object.keys(flattened.fieldErrors) as (keyof VehicleFormState)[]
      ).forEach((k) => {
        next[k] = flattened.fieldErrors[k]?.[0];
      });
      setErrors(next);
      return;
    }
    const d = result.data;
    const lenMm = fromLengthToMm(d.length, lengthUnit);
    const widMm = fromLengthToMm(d.width, lengthUnit);
    const hgtMm = fromLengthToMm(d.height, lengthUnit);
    const wgtKg = fromWeightToKg(d.maxWeight, weightUnit);
    const checks: Partial<Record<keyof VehicleFormState, string>> = {};
    const check = (key: keyof VehicleFormState, field: string, v: number) => {
      const r = validateField(field, v);
      if (!r.ok) checks[key] = `${t.toastMaxValue} [${r.min}–${r.max}]`;
    };
    check("length", "length", lenMm);
    check("width", "width", widMm);
    check("height", "height", hgtMm);
    check("maxWeight", "maxWeight", wgtKg);
    if (Object.values(checks).some(Boolean)) {
      setErrors(checks);
      const firstError = Object.values(checks).find(Boolean);
      if (firstError) toast.error(firstError);
      return;
    }
    const isEditingBuiltin = !!editing && !isCustom(editing.id);
    onSave({
      id: isEditingBuiltin ? makeId("veh") : (editing?.id ?? makeId("veh")),
      name: isEditingBuiltin
        ? `${d.name.trim()} (${t.editedSuffix})`
        : d.name.trim(),
      length: lenMm,
      width: widMm,
      height: hgtMm,
      maxWeight: wgtKg,
    });
    setEditing(null);
    setFormOpen(false);
  };

  const stepLen = lengthUnit === "mm" ? 1 : lengthUnit === "cm" ? 0.1 : 0.001;
  const stepWgt = weightUnit === "kg" ? 1 : 0.001;
  const lenDisp = (mm: number) => lengthToDisplay(mm, lengthUnit);
  const wgtDisp = (kg: number) => weightToDisplay(kg, weightUnit);

  const renderRow = (v: Vehicle) => {
    const custom = isCustom(v.id);
    const isCurrent = v.id === currentVehicleId;
    return (
      <div
        key={v.id}
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-card px-3 py-2 ring-1 ring-foreground/10",
          isCurrent && "ring-2 ring-primary"
        )}
      >
        <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{v.name}</div>
          <div className="text-xs text-muted-foreground">
            {formatLength(v.length, lengthUnit)}×
            {formatLength(v.width, lengthUnit)}×
            {formatLength(v.height, lengthUnit)} {lenSuffix(lengthUnit)} ·{" "}
            {formatWeight(v.maxWeight, weightUnit)} {wgtSuffix(weightUnit)}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelect(v.id);
          }}
        >
          <Check className="h-3.5 w-3.5" />
          {isCurrent ? t.dialogApply : t.dialogSelect}
        </Button>
        {custom ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.dialogEditVehicle}
              onClick={() => startEdit(v)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.toastVehicleRemoved}
              onClick={() => onDelete(v.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.editBuiltinPreset}
              title={t.editBuiltinPreset}
              onClick={() => startEdit(v)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {onResetBuiltin && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.resetBuiltinPreset}
                title={t.resetBuiltinPreset}
                onClick={() => onResetBuiltin(v.name)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.vehiclePresetsTitle}</DialogTitle>
          <DialogDescription>{t.vehiclePresetsDesc}</DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={startAdd}
          >
            <Plus className="h-4 w-4" />
            {t.addVehiclePreset}
          </Button>
          {builtinVehicles.map(renderRow)}
          {customVehicles.map(renderRow)}
        </div>

        {formOpen && (
          <div className="space-y-3 border-t pt-3">
            <Field label={t.dialogName} error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t.dialogVehicleNamePlaceholder}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field
                label={`${t.length}, ${UNIT_SUFFIX[lengthUnit]}`}
                error={errors.length}
              >
                <Input
                  type="number"
                  min={lenDisp(VEHICLE_LIMITS.length.min)}
                  max={lenDisp(VEHICLE_LIMITS.length.max)}
                  step={stepLen}
                  value={form.length}
                  onChange={(e) => set("length", e.target.value)}
                />
              </Field>
              <Field
                label={`${t.width}, ${UNIT_SUFFIX[lengthUnit]}`}
                error={errors.width}
              >
                <Input
                  type="number"
                  min={lenDisp(VEHICLE_LIMITS.width.min)}
                  max={lenDisp(VEHICLE_LIMITS.width.max)}
                  step={stepLen}
                  value={form.width}
                  onChange={(e) => set("width", e.target.value)}
                />
              </Field>
              <Field
                label={`${t.height}, ${UNIT_SUFFIX[lengthUnit]}`}
                error={errors.height}
              >
                <Input
                  type="number"
                  min={lenDisp(VEHICLE_LIMITS.height.min)}
                  max={lenDisp(VEHICLE_LIMITS.height.max)}
                  step={stepLen}
                  value={form.height}
                  onChange={(e) => set("height", e.target.value)}
                />
              </Field>
            </div>
            <Field
              label={`${t.dialogMaxWeight}, ${WEIGHT_SUFFIX[weightUnit]}`}
              error={errors.maxWeight}
            >
              <Input
                type="number"
                min={wgtDisp(VEHICLE_LIMITS.maxWeight.min)}
                max={wgtDisp(VEHICLE_LIMITS.maxWeight.max)}
                step={stepWgt}
                value={form.maxWeight}
                onChange={(e) => set("maxWeight", e.target.value)}
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setFormOpen(false);
              onOpenChange(false);
            }}
          >
            {t.dialogCancel}
          </Button>
          <Button onClick={submit} disabled={!formOpen}>
            {t.dialogSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
