"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  HelpCircle,
  MousePointer2,
  ArrowUpDown,
  Move,
} from "lucide-react";
import { toast } from "sonner";
import type { SceneBlock, Vehicle, LengthUnit } from "@/lib/data";
import { formatLength, UNIT_SUFFIX } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SCALE = 0.1;
const PAD = 30;

interface DragState {
  id: string;
  dx: number;
  dy: number;
}

function overlaps2D(
  a: { x: number; y: number; w: number; d: number },
  b: { x: number; y: number; w: number; d: number }
): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d
  );
}

export default function Scene2D({
  blocks,
  vehicle,
  gapsEnabled,
  gapWalls,
  lengthUnit,
  onMoveBlock,
  onMoveLayer,
}: {
  blocks: SceneBlock[];
  vehicle: Vehicle;
  gapsEnabled: boolean;
  gapWalls: number;
  lengthUnit: LengthUnit;
  onMoveBlock?: (id: string, x: number, y: number) => void;
  onMoveLayer?: (id: string, z: number) => void;
}) {
  const { t, lang } = useI18n();
  const lenSuffix = (u: LengthUnit): string =>
    lang === "ru" ? UNIT_SUFFIX[u] : { mm: "mm", cm: "cm", m: "m" }[u];
  const toDisplay = (mm: number) =>
    lengthUnit === "mm" ? mm : lengthUnit === "cm" ? mm / 10 : mm / 1000;
  const fromDisplay = (v: number) =>
    lengthUnit === "mm" ? v : lengthUnit === "cm" ? v * 10 : v * 1000;
  const formatDisp = (mm: number) =>
    lengthUnit === "mm"
      ? String(Math.round(toDisplay(mm)))
      : lengthUnit === "cm"
        ? toDisplay(mm).toFixed(1)
        : toDisplay(mm).toFixed(3);

  const w = vehicle.length * SCALE + PAD * 2;
  const h = vehicle.width * SCALE + PAD * 2;
  const minDim = Math.min(vehicle.length, vehicle.width);
  const showClearance = gapsEnabled && gapWalls > 0 && gapWalls * 2 < minDim;

  const layerKeys = useMemo(() => {
    const keys = Array.from(new Set(blocks.map((b) => Math.round(b.z)))).sort(
      (a, b) => a - b
    );
    return keys;
  }, [blocks]);

  const [hiddenLayers, setHiddenLayers] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  const toggleLayer = (key: number) => {
    setHiddenLayers((list) =>
      list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
    );
  };

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const conflictedRef = useRef(false);

  const findCollision = (
    moved: SceneBlock,
    ignoreId: string
  ): SceneBlock | null => {
    for (const o of blocks) {
      if (o.id === ignoreId) continue;
      // Проверка пересечения только в пределах одного слоя (по высоте z):
      // грузы на разных слоях могут лежать друг на друге.
      if (Math.round(o.z) !== Math.round(moved.z)) continue;
      if (overlaps2D(moved, o)) return o;
    }
    return null;
  };

  const handlePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    b: SceneBlock
  ) => {
    if (!onMoveBlock) return;
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    const left = PAD + b.y * SCALE;
    const top = PAD + b.x * SCALE;
    dragRef.current = { id: b.id, dx: p.x - left, dy: p.y - top };
    conflictedRef.current = false;
    svg.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || !onMoveBlock) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    const block = blocks.find((b) => b.id === drag.id);
    if (!block) return;
    const yMm = (p.x - PAD - drag.dx) / SCALE;
    const xMm = (p.y - PAD - drag.dy) / SCALE;
    const wall = gapsEnabled ? gapWalls : 0;
    const clampedY = block.isOversize
      ? yMm
      : Math.max(wall, Math.min(vehicle.length - block.d - wall, yMm));
    const clampedX = block.isOversize
      ? xMm
      : Math.max(wall, Math.min(vehicle.width - block.w - wall, xMm));
    // Проверка выхода за границы кузова (только для обычного груза).
    if (!block.isOversize && (clampedY !== yMm || clampedX !== xMm)) {
      if (!conflictedRef.current) {
        conflictedRef.current = true;
        toast.error(t.toastBounds);
      }
      setConflictId(drag.id);
      return;
    }
    // Проверка коллизий на том же слое.
    const proposed: SceneBlock = {
      ...block,
      x: clampedX,
      y: clampedY,
    };
    const clash = findCollision(proposed, block.id);
    if (clash) {
      if (!conflictedRef.current) {
        conflictedRef.current = true;
        toast.error(t.toastCollision.replace("%s", clash.name));
      }
      setConflictId(drag.id);
      return;
    }
    setConflictId(null);
    onMoveBlock(drag.id, clampedX, clampedY);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const visibleBlocks = blocks.filter(
    (b) => !hiddenLayers.includes(Math.round(b.z))
  );

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  const commitLayer = (value: string) => {
    if (!selected || !onMoveLayer) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const zMm = Math.round(fromDisplay(parsed));
    const maxZ = Math.max(0, vehicle.height - selected.h);
    const clamped = Math.max(0, Math.min(maxZ, zMm));
    if (clamped !== zMm) {
      toast.error(t.toastBounds);
      return;
    }
    const proposed: SceneBlock = { ...selected, z: clamped };
    const clash = findCollision(proposed, selected.id);
    if (clash) {
      toast.error(t.toastCollision.replace("%s", clash.name));
      return;
    }
    onMoveLayer(selected.id, clamped);
  };

  // Клавиатурные шорткаты в 2D: стрелки — перемещение выбранного груза,
  // PageUp/PageDown или +/− — смена слоя.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const block = blocks.find((b) => b.id === selectedId);
      if (!block) return;
      const step = e.shiftKey ? 50 : 10;
      let nx = block.x;
      let ny = block.y;
      if (e.key === "ArrowUp") ny -= step;
      else if (e.key === "ArrowDown") ny += step;
      else if (e.key === "ArrowLeft") nx -= step;
      else if (e.key === "ArrowRight") nx += step;
      else if (e.key === "PageUp" || e.key === "+") {
        if (!onMoveLayer) return;
        e.preventDefault();
        const target = { ...block, z: block.z + block.h };
        const clash = findCollision(target, block.id);
        if (clash) {
          toast.error(t.toastCollision.replace("%s", clash.name));
          return;
        }
        const maxZ = Math.max(0, vehicle.height - block.h);
        const clamped = Math.min(maxZ, target.z);
        if (clamped < target.z) toast.error(t.toastBounds);
        onMoveLayer(block.id, clamped);
        return;
      } else if (e.key === "PageDown" || e.key === "-") {
        if (!onMoveLayer) return;
        e.preventDefault();
        const target = { ...block, z: Math.max(0, block.z - block.h) };
        const clash = findCollision(target, block.id);
        if (clash) {
          toast.error(t.toastCollision.replace("%s", clash.name));
          return;
        }
        onMoveLayer(block.id, target.z);
        return;
      } else if (onMoveBlock) {
        // стрелки — ниже
      } else {
        return;
      }
      if (!onMoveBlock) return;
      e.preventDefault();
      const wall = gapsEnabled ? gapWalls : 0;
      const clampedX = block.isOversize
        ? nx
        : Math.max(wall, Math.min(vehicle.width - block.w - wall, nx));
      const clampedY = block.isOversize
        ? ny
        : Math.max(wall, Math.min(vehicle.length - block.d - wall, ny));
      const proposed: SceneBlock = { ...block, x: clampedX, y: clampedY };
      const clash = findCollision(proposed, block.id);
      if (clash) {
        toast.error(t.toastCollision.replace("%s", clash.name));
        return;
      }
      onMoveBlock(block.id, clampedX, clampedY);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, blocks, onMoveBlock, onMoveLayer, vehicle, findCollision, gapsEnabled, gapWalls]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full"
        role="img"
        aria-label={t.scene2dLabel}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ touchAction: "none" }}
      >
        <rect
          x={PAD}
          y={PAD}
          width={vehicle.length * SCALE}
          height={vehicle.width * SCALE}
          fill="var(--card)"
          stroke="var(--border)"
        />
        {showClearance && (
          <rect
            x={PAD + gapWalls * SCALE}
            y={PAD + gapWalls * SCALE}
            width={(vehicle.length - gapWalls * 2) * SCALE}
            height={(vehicle.width - gapWalls * 2) * SCALE}
            fill="none"
            stroke="var(--primary)"
            strokeDasharray="6 4"
          />
        )}
        {visibleBlocks.map((b) => {
          const cx = PAD + (b.y + b.d / 2) * SCALE;
          const cy = PAD + (b.x + b.w / 2) * SCALE;
          const isSelected = selectedId === b.id;
          const isConflict = conflictId === b.id;
          return (
            <g
              key={b.id}
              onPointerDown={(e) => handlePointerDown(e, b)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(b.id);
              }}
              style={{
                cursor: onMoveBlock ? "grab" : "default",
              }}
            >
              <title>{`${b.name}\n${formatLength(b.d, lengthUnit)}×${formatLength(b.w, lengthUnit)} ${lenSuffix(lengthUnit)} · z=${formatDisp(b.z)}`}</title>
              <rect
                x={PAD + b.y * SCALE}
                y={PAD + b.x * SCALE}
                width={b.d * SCALE}
                height={b.w * SCALE}
                fill={b.color}
                opacity={isConflict ? 0.4 : 0.85}
                stroke={
                  isConflict
                    ? "var(--destructive)"
                    : b.isOversize
                      ? "var(--destructive)"
                      : isSelected
                        ? "#fff"
                        : "rgba(0,0,0,0.25)"
                }
                strokeWidth={
                  isSelected || isConflict ? 2 : b.isOversize ? 1.5 : 1
                }
                strokeDasharray={b.isOversize ? "5 3" : undefined}
                rx={2}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={7}
                fontWeight={600}
                fill="#fff"
                pointerEvents="none"
              >
                {b.isOversize
                  ? `⚠ ${b.name.split(" ")[0]}`
                  : b.name.split(" ")[0]}
              </text>
            </g>
          );
        })}
        {/* Длина кузова — сверху/снизу по центру */}
        <text
          x={w / 2}
          y={h - 4}
          fontSize={9}
          textAnchor="middle"
          fill="var(--muted-foreground)"
        >
          {formatLength(vehicle.length, lengthUnit)} {lenSuffix(lengthUnit)}
        </text>
        <text
          x={w / 2}
          y={10}
          fontSize={9}
          textAnchor="middle"
          fill="var(--muted-foreground)"
        >
          {formatLength(vehicle.length, lengthUnit)} {lenSuffix(lengthUnit)}
        </text>
        {/* Ширина кузова — слева/справа по центру */}
        <text
          x={8}
          y={PAD + (vehicle.width * SCALE) / 2}
          fontSize={9}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          transform={`rotate(-90 8 ${PAD + (vehicle.width * SCALE) / 2})`}
        >
          {formatLength(vehicle.width, lengthUnit)} {lenSuffix(lengthUnit)}
        </text>
        <text
          x={w - 8}
          y={PAD + (vehicle.width * SCALE) / 2}
          fontSize={9}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          transform={`rotate(-90 ${w - 8} ${PAD + (vehicle.width * SCALE) / 2})`}
        >
          {formatLength(vehicle.width, lengthUnit)} {lenSuffix(lengthUnit)}
        </text>
      </svg>

      {/* Кнопка справки */}
      <button
        type="button"
        className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md border bg-background/85 px-2 py-1 text-xs text-muted-foreground shadow backdrop-blur hover:text-foreground"
        onClick={() => setShowLegend((v) => !v)}
      >
        <HelpCircle className="h-4 w-4" />
        {t.legendHint}
      </button>

      {showLegend && (
        <div className="absolute left-3 top-11 z-10 flex max-w-[240px] flex-col gap-2 rounded-lg border bg-background/95 p-3 text-xs text-muted-foreground shadow-lg backdrop-blur">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Move className="h-3.5 w-3.5" /> {t.legend2d}
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-1.5">
              <Move className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.dragHint}
            </li>
            <li className="flex items-start gap-1.5">
              <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.selectCargoHint}
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowUpDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.layerChangeHint}
            </li>
          </ul>
        </div>
      )}

      {/* Панель слоёв */}
      {layerKeys.length > 0 && (
        <div className="absolute right-3 top-3 z-10 flex max-w-[220px] flex-col gap-1 rounded-lg border bg-background/85 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {t.layersByHeight}
          </div>
          {layerKeys.map((key, i) => {
            const hidden = hiddenLayers.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleLayer(key)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors",
                  hidden
                    ? "text-muted-foreground hover:bg-muted/60"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                )}
                aria-pressed={!hidden}
              >
                {hidden ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {t.layer} {i + 1}
                <span className="ml-auto font-normal text-muted-foreground">
                  {blocks.filter((b) => Math.round(b.z) === key).length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Панель смены слоя выбранного груза */}
      {selected && onMoveLayer && (
        <div className="absolute bottom-3 left-1/2 z-10 flex max-w-[320px] -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 shadow-lg backdrop-blur">
          <span className="truncate text-xs font-medium">{selected.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {t.offFloor}
          </span>
          <input
            type="number"
            defaultValue={formatDisp(selected.z)}
            min={0}
            max={formatDisp(Math.max(0, vehicle.height - selected.h))}
            step={lengthUnit === "mm" ? 10 : lengthUnit === "cm" ? 1 : 0.001}
            className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onBlur={(e) => commitLayer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                commitLayer((e.target as HTMLInputElement).value);
            }}
          />
        </div>
      )}
    </div>
  );
}
