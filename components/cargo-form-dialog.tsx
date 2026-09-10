"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Square, Circle } from "lucide-react";
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
  type CargoItem,
  type CargoKind,
  type Vehicle,
  type LengthUnit,
  type WeightUnit,
  lengthToDisplay,
  fromLengthToMm,
  weightToDisplay,
  fromWeightToKg,
  UNIT_SUFFIX,
  WEIGHT_SUFFIX,
} from "@/lib/data";
import { validateField, CARGO_LIMITS } from "@/lib/validation";

interface FormState {
  name: string;
  kind: CargoKind;
  length: string;
  width: string;
  height: string;
  weight: string;
  count: string;
  stackable: boolean;
  maxLoad: string;
  isOversize: boolean;
  compatibilityGroup: string;
}

interface CargoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CargoItem | null;
  onSubmit: (cargo: CargoItem) => void;
  vehicle: Vehicle;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
}

function defaultForm(): FormState {
  return {
    name: "",
    kind: "rect",
    length: "",
    width: "",
    height: "",
    weight: "",
    count: "1",
    stackable: true,
    maxLoad: "0",
    isOversize: false,
    compatibilityGroup: "",
  };
}

function toForm(
  cargo: CargoItem,
  lengthUnit: LengthUnit,
  weightUnit: WeightUnit
): FormState {
  return {
    name: cargo.name,
    kind: cargo.kind,
    length: String(lengthToDisplay(cargo.length, lengthUnit)),
    width: String(lengthToDisplay(cargo.width, lengthUnit)),
    height: String(lengthToDisplay(cargo.height, lengthUnit)),
    weight: String(weightToDisplay(cargo.weight, weightUnit)),
    count: String(cargo.count),
    stackable: cargo.stackable,
    maxLoad: String(weightToDisplay(cargo.maxLoad, weightUnit)),
    isOversize: !!cargo.isOversize,
    compatibilityGroup: cargo.compatibilityGroup ?? "",
  };
}

export function CargoFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  vehicle,
  lengthUnit,
  weightUnit,
}: CargoFormDialogProps) {
  const { t } = useI18n();
  const schema = z.object({
    name: z.string().min(1, t.errNameRequired),
    kind: z.enum(["rect", "cylinder"]),
    length: z.coerce.number(),
    width: z.coerce.number(),
    height: z.coerce.number(),
    weight: z.coerce.number(),
    count: z.coerce.number().int(),
    stackable: z.boolean(),
    maxLoad: z.coerce.number(),
    isOversize: z.boolean(),
    compatibilityGroup: z.string().optional(),
  });
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(
        initial ? toForm(initial, lengthUnit, weightUnit) : defaultForm()
      );
      setErrors({});
    }
    onOpenChange(next);
  };

  useEffect(() => {
    if (open) {
      setForm(
        initial ? toForm(initial, lengthUnit, weightUnit) : defaultForm()
      );
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (next.kind === "cylinder") {
        if (key === "kind" || key === "width") {
          next.height = next.width;
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const rangeError = (
    field: string,
    value: number,
    extra?: { ok: boolean; min: number; max: number }
  ): string | undefined => {
    const r = extra ?? validateField(field, value);
    if (r.ok) return undefined;
    const min = Number.isFinite(r.min) ? r.min : value;
    const max = Number.isFinite(r.max) ? r.max : value;
    return `${t.toastMaxValue} [${min}–${max}]`;
  };

  const submit = () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten();
      const next: Partial<Record<keyof FormState, string>> = {};
      (Object.keys(flattened.fieldErrors) as (keyof FormState)[]).forEach(
        (k) => {
          next[k] = flattened.fieldErrors[k]?.[0];
        }
      );
      setErrors(next);
      return;
    }
    const data = result.data;

    const rangeChecks: Partial<Record<keyof FormState, string>> = {};
    rangeChecks.length = rangeError("length", data.length);
    rangeChecks.width = rangeError(
      data.kind === "cylinder" ? "diameter" : "width",
      data.width
    );
    rangeChecks.height = rangeError("height", data.height);
    rangeChecks.weight = rangeError("weight", data.weight);
    rangeChecks.count = rangeError("count", data.count);
    rangeChecks.maxLoad = rangeError("maxLoad", data.maxLoad);

    // Габариты груза не могут превышать габариты кузова (кроме isOversize).
    if (!data.isOversize) {
      const lenMm = fromLengthToMm(data.length, lengthUnit);
      const widMm = fromLengthToMm(data.width, lengthUnit);
      const hgtMm = fromLengthToMm(data.height, lengthUnit);
      if (
        lenMm > vehicle.length ||
        widMm > vehicle.width ||
        hgtMm > vehicle.height
      ) {
        toast.error(t.toastCargoExceedsBody);
        setErrors({ length: t.toastCargoExceedsBody });
        return;
      }
    }

    const hasError = Object.values(rangeChecks).some(Boolean);
    if (hasError) {
      setErrors(rangeChecks);
      const firstError = Object.values(rangeChecks).find(Boolean);
      if (firstError) toast.error(firstError);
      return;
    }

    // Вес груза не может превышать грузоподъёмность — предупреждение.
    const wgtKg = fromWeightToKg(data.weight, weightUnit);
    if (vehicle.maxWeight > 0 && wgtKg > vehicle.maxWeight) {
      toast.warning(t.toastWeightOverCapacity);
    }

    onSubmit({
      id: initial?.id ?? makeId("cargo"),
      name: data.name.trim(),
      kind: data.kind,
      length: fromLengthToMm(data.length, lengthUnit),
      width: fromLengthToMm(data.width, lengthUnit),
      height: fromLengthToMm(data.height, lengthUnit),
      weight: fromWeightToKg(data.weight, weightUnit),
      count: data.count,
      stackable: data.stackable,
      maxLoad: fromWeightToKg(data.maxLoad, weightUnit),
      isOversize: data.isOversize,
      compatibilityGroup: data.compatibilityGroup?.trim() || undefined,
    });
  };

  const isCylinder = form.kind === "cylinder";
  const stepLen = lengthUnit === "mm" ? 1 : lengthUnit === "cm" ? 0.1 : 0.001;
  const stepWgt = weightUnit === "kg" ? 1 : 0.001;
  const vh = lengthToDisplay(vehicle.height, lengthUnit);
  const vw = lengthToDisplay(vehicle.width, lengthUnit);
  const vl = lengthToDisplay(vehicle.length, lengthUnit);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? t.dialogEditCargo : t.dialogAddCargo}
          </DialogTitle>
          <DialogDescription>{t.dialogCargoDesc}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>{t.dialogType}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("kind", "rect")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  !isCylinder
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Square className="h-4 w-4" />
                {t.dialogRect}
              </button>
              <button
                type="button"
                onClick={() => set("kind", "cylinder")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  isCylinder
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Circle className="h-4 w-4" />
                {t.dialogCylinder}
              </button>
            </div>
          </div>

          <Field label={t.dialogName} error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t.dialogNamePlaceholder}
            />
          </Field>

          <div
            className={cn(
              "grid gap-2",
              isCylinder ? "grid-cols-2" : "grid-cols-3"
            )}
          >
            <Field
              label={`${t.length}, ${UNIT_SUFFIX[lengthUnit]}`}
              error={errors.length}
            >
              <Input
                type="number"
                min={CARGO_LIMITS.length.min}
                max={CARGO_LIMITS.length.max}
                step={stepLen}
                value={form.length}
                onChange={(e) => set("length", e.target.value)}
              />
            </Field>
            <Field
              label={`${isCylinder ? t.dialogDiameter : t.width}, ${UNIT_SUFFIX[lengthUnit]}`}
              error={errors.width}
            >
              <Input
                type="number"
                min={CARGO_LIMITS.diameter.min}
                max={CARGO_LIMITS.diameter.max}
                step={stepLen}
                value={form.width}
                onChange={(e) => set("width", e.target.value)}
              />
            </Field>
            {!isCylinder && (
              <Field
                label={`${t.height}, ${UNIT_SUFFIX[lengthUnit]}`}
                error={errors.height}
              >
                <Input
                  type="number"
                  min={CARGO_LIMITS.height.min}
                  max={CARGO_LIMITS.height.max}
                  step={stepLen}
                  value={form.height}
                  onChange={(e) => set("height", e.target.value)}
                />
              </Field>
            )}
          </div>

          {!form.isOversize && (
            <p className="text-[11px] text-muted-foreground">
              {t.length}: ≤ {vl}, {t.width}: ≤ {vw}, {t.height}: ≤ {vh}{" "}
              {UNIT_SUFFIX[lengthUnit]}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field
              label={`${t.weight}, ${WEIGHT_SUFFIX[weightUnit]}`}
              error={errors.weight}
            >
              <Input
                type="number"
                min={CARGO_LIMITS.weight.min}
                max={CARGO_LIMITS.weight.max}
                step={stepWgt}
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
              />
            </Field>
            <Field label={t.count} error={errors.count}>
              <Input
                type="number"
                min={CARGO_LIMITS.count.min}
                max={CARGO_LIMITS.count.max}
                step={1}
                value={form.count}
                onChange={(e) => set("count", e.target.value)}
              />
            </Field>
          </div>

          <Field
            label={`${t.dialogMaxLoadAbove}, ${WEIGHT_SUFFIX[weightUnit]}`}
            error={errors.maxLoad}
          >
            <Input
              type="number"
              min={CARGO_LIMITS.maxLoad.min}
              max={CARGO_LIMITS.maxLoad.max}
              step={stepWgt}
              value={form.maxLoad}
              onChange={(e) => set("maxLoad", e.target.value)}
              placeholder={t.dialogMaxLoadPlaceholder}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.stackable}
              onChange={(e) => set("stackable", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t.dialogStackable}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isOversize}
              onChange={(e) => set("isOversize", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t.oversize}
          </label>

          <Field label={t.compatibilityGroup} error={errors.compatibilityGroup}>
            <Input
              value={form.compatibilityGroup}
              onChange={(e) => set("compatibilityGroup", e.target.value)}
              placeholder="—"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.dialogCancel}
          </Button>
          <Button onClick={submit}>
            {initial ? t.dialogSave : t.dialogAdd}
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
