"use client";

import { useState } from "react";
import { z } from "zod";
import { Circle, Pencil, Plus, RotateCcw, Square, Trash2 } from "lucide-react";

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
  type CargoKind,
  type CargoPreset,
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

interface PresetFormState {
  name: string;
  kind: CargoKind;
  length: string;
  width: string;
  height: string;
  weight: string;
  count: string;
  stackable: boolean;
  maxLoad: string;
}

const DEFAULT_COUNT = 1;

function emptyForm(): PresetFormState {
  return {
    name: "",
    kind: "rect",
    length: "100",
    width: "100",
    height: "100",
    weight: "10",
    count: String(DEFAULT_COUNT),
    stackable: true,
    maxLoad: "0",
  };
}

function toForm(
  p: CargoPreset,
  lu: LengthUnit,
  wu: WeightUnit
): PresetFormState {
  return {
    name: p.name,
    kind: p.kind,
    length: String(lengthToDisplay(p.length, lu)),
    width: String(lengthToDisplay(p.width, lu)),
    height: String(lengthToDisplay(p.height, lu)),
    weight: String(weightToDisplay(p.weight, wu)),
    count: String(p.count),
    stackable: p.stackable,
    maxLoad: String(weightToDisplay(p.maxLoad, wu)),
  };
}

interface CargoPresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: CargoPreset[];
  customPresetIds: string[];
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  onSave: (preset: CargoPreset) => void;
  onDelete: (id: string) => void;
  onResetBuiltin?: (name: string) => void;
}

export function CargoPresetsDialog({
  open,
  onOpenChange,
  presets,
  customPresetIds,
  lengthUnit,
  weightUnit,
  onSave,
  onDelete,
  onResetBuiltin,
}: CargoPresetsDialogProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<CargoPreset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PresetFormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const isCustom = (id: string) => customPresetIds.includes(id);

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setFormOpen(true);
  };

  const startEdit = (p: CargoPreset) => {
    setEditing(p);
    setForm(toForm(p, lengthUnit, weightUnit));
    setErrors({});
    setFormOpen(true);
  };

  const set = <K extends keyof PresetFormState>(
    key: K,
    value: PresetFormState[K]
  ) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (next.kind === "cylinder" && (key === "kind" || key === "width")) {
        next.height = next.width;
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

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
  });

  const submit = () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten();
      const next: Partial<Record<string, string>> = {};
      (Object.keys(flattened.fieldErrors) as (keyof PresetFormState)[]).forEach(
        (k) => {
          next[k] = flattened.fieldErrors[k]?.[0];
        }
      );
      setErrors(next);
      return;
    }
    const d = result.data;
    const checks: Partial<Record<string, string>> = {};
    const rangeCheck = (field: string, v: number) => {
      const r = validateField(field, v);
      if (!r.ok) checks[field] = `${t.toastMaxValue} [${r.min}–${r.max}]`;
    };
    rangeCheck("length", d.length);
    rangeCheck(d.kind === "cylinder" ? "diameter" : "width", d.width);
    rangeCheck("height", d.height);
    rangeCheck("weight", d.weight);
    rangeCheck("count", d.count);
    rangeCheck("maxLoad", d.maxLoad);
    if (Object.values(checks).some(Boolean)) {
      setErrors(checks);
      return;
    }
    const preset: CargoPreset = {
      // Редактирование встроенного пресета сохраняется как пользовательский
      // пресет с новой меткой «изменён» (встроенный пресет при этом не меняется).
      id:
        editing && !customPresetIds.includes(editing.id)
          ? makeId("preset")
          : (editing?.id ?? makeId("preset")),
      name:
        editing && !customPresetIds.includes(editing.id)
          ? `${d.name.trim()} (${t.editedSuffix})`
          : d.name.trim(),
      kind: d.kind,
      length: fromLengthToMm(d.length, lengthUnit),
      width: fromLengthToMm(d.width, lengthUnit),
      height: fromLengthToMm(d.height, lengthUnit),
      weight: fromWeightToKg(d.weight, weightUnit),
      count: d.count,
      stackable: d.stackable,
      maxLoad: fromWeightToKg(d.maxLoad, weightUnit),
    };
    onSave(preset);
    setEditing(null);
    setFormOpen(false);
  };

  const isCylinder = form.kind === "cylinder";
  const stepLen = lengthUnit === "mm" ? 1 : lengthUnit === "cm" ? 0.1 : 0.001;
  const stepWgt = weightUnit === "kg" ? 1 : 0.001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.presetsDialogTitle}</DialogTitle>
          <DialogDescription>{t.presetsDialogDesc}</DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={startAdd}
          >
            <Plus className="h-4 w-4" />
            {t.addPreset}
          </Button>

          {presets.map((p) => {
            const custom = isCustom(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 ring-1 ring-foreground/10"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                    p.kind === "cylinder" && "text-primary"
                  )}
                >
                  {p.kind === "cylinder" ? (
                    <Circle className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {lengthToDisplay(p.length, lengthUnit)}×
                    {lengthToDisplay(p.width, lengthUnit)}×
                    {lengthToDisplay(p.height, lengthUnit)}{" "}
                    {UNIT_SUFFIX[lengthUnit]} ·{" "}
                    {weightToDisplay(p.weight, weightUnit)}{" "}
                    {WEIGHT_SUFFIX[weightUnit]}
                  </div>
                </div>
                {custom && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.dialogEditCargo}
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.toastPresetRemoved}
                      onClick={() => onDelete(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {!custom && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.editBuiltinPreset}
                      title={t.editBuiltinPreset}
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {onResetBuiltin && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.resetBuiltinPreset}
                        title={t.resetBuiltinPreset}
                        onClick={() => onResetBuiltin(p.name)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {formOpen && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("kind", "rect")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
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
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  isCylinder
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Circle className="h-4 w-4" />
                {t.dialogCylinder}
              </button>
            </div>

            <Field label={t.dialogName} error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
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
