"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
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
import {
  makeId,
  type Vehicle,
  type LengthUnit,
  type WeightUnit,
} from "@/lib/data";
import {
  fromLengthToMm,
  fromWeightToKg,
  lengthToDisplay,
  weightToDisplay,
  UNIT_SUFFIX,
  WEIGHT_SUFFIX,
} from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { validateField, VEHICLE_LIMITS } from "@/lib/validation";

type FormState = {
  name: string;
  length: string;
  width: string;
  height: string;
  maxWeight: string;
};

interface CustomVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Vehicle | null;
  onSubmit: (vehicle: Vehicle) => void;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
}

export function CustomVehicleDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  lengthUnit,
  weightUnit,
}: CustomVehicleDialogProps) {
  const { t } = useI18n();
  const lenDisp = (mm: number) => lengthToDisplay(mm, lengthUnit);
  const wgtDisp = (kg: number) => weightToDisplay(kg, weightUnit);
  const schema = z.object({
    name: z.string().min(1, t.errNameRequired),
    length: z.coerce.number(),
    width: z.coerce.number(),
    height: z.coerce.number(),
    maxWeight: z.coerce.number(),
  });
  const [form, setForm] = useState<FormState>({
    name: "",
    length: "",
    width: "",
    height: "",
    maxWeight: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const fillFromInitial = (v: Vehicle | null) => {
    if (!v) {
      setForm({
        name: "",
        length: "",
        width: "",
        height: "",
        maxWeight: "",
      });
    } else {
      setForm({
        name: v.name,
        length: String(lengthToDisplay(v.length, lengthUnit)),
        width: String(lengthToDisplay(v.width, lengthUnit)),
        height: String(lengthToDisplay(v.height, lengthUnit)),
        maxWeight: String(weightToDisplay(v.maxWeight, weightUnit)),
      });
    }
    setErrors({});
  };

  useEffect(() => {
    if (open) fillFromInitial(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (next) fillFromInitial(initial);
    onOpenChange(next);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
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

    const lenMm = fromLengthToMm(data.length, lengthUnit);
    const widMm = fromLengthToMm(data.width, lengthUnit);
    const hgtMm = fromLengthToMm(data.height, lengthUnit);
    const wgtKg = fromWeightToKg(data.maxWeight, weightUnit);

    const checks: Partial<Record<keyof FormState, string>> = {};
    const check = (field: keyof FormState, fieldName: string, v: number) => {
      const r = validateField(fieldName, v);
      if (!r.ok) {
        checks[field] = `${t.toastMaxValue} [${r.min}–${r.max}]`;
      }
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

    onSubmit({
      id: initial?.id ?? makeId("veh"),
      name: data.name.trim(),
      length: lenMm,
      width: widMm,
      height: hgtMm,
      maxWeight: wgtKg,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? t.dialogEditVehicle : t.dialogCustomBody}
          </DialogTitle>
          <DialogDescription>{t.dialogVehicleDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
                step={
                  lengthUnit === "mm" ? 1 : lengthUnit === "cm" ? 0.1 : 0.001
                }
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
                step={
                  lengthUnit === "mm" ? 1 : lengthUnit === "cm" ? 0.1 : 0.001
                }
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
                step={
                  lengthUnit === "mm" ? 1 : lengthUnit === "cm" ? 0.1 : 0.001
                }
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
              step={weightUnit === "kg" ? 1 : 0.001}
              value={form.maxWeight}
              onChange={(e) => set("maxWeight", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.dialogCancel}
          </Button>
          <Button onClick={submit}>
            {initial ? t.dialogSave : t.dialogCreate}
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
