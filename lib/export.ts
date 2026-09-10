import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { CargoItem, LengthUnit, Mode, Vehicle, WeightUnit } from "./data";
import { formatLength, formatWeight, UNIT_SUFFIX, WEIGHT_SUFFIX } from "./data";
import type { GapSet, LayoutResult, PackedBlock } from "./packing";

export type Lang = "ru" | "en";

export interface ExportContext {
  vehicle: Vehicle;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  lang: Lang;
  mode: Mode;
  layout: LayoutResult;
  layouts: Record<Mode, LayoutResult>;
  gapsEnabled: boolean;
  gaps: GapSet;
  cargoItems: CargoItem[];
}

interface Labels {
  appName: string;
  reportTitle: string;
  vehicleParams: string;
  metrics: string;
  gaps: string;
  cargoList: string;
  loaderGuide: string;
  layerSchemes: string;
  layer: string;
  placedCargo: string;
  notPlacedCargo: string;
  name: string;
  kind: string;
  dims: string;
  weight: string;
  count: string;
  stackable: string;
  placed: string;
  total: string;
  volumeFill: string;
  weightFill: string;
  totalWeight: string;
  freeVolume: string;
  freeWeight: string;
  loadDim: string;
  length: string;
  width: string;
  height: string;
  yes: string;
  no: string;
  enabled: string;
  disabled: string;
  gapWalls: string;
  gapWidth: string;
  gapLength: string;
  step: string;
  fromRearWall: string;
  fromLeftWall: string;
  offFloor: string;
  modeLabel: string;
  along: string;
  across: string;
  mixed: string;
  blocks: string;
  position: string;
  paramsSheet: string;
  cargoSheet: string;
  gapsSheet: string;
  variantsSheet: string;
  variantFor: string;
  loadingOrder: string;
}

function buildLabels(lang: Lang): Labels {
  const l: Labels = {
    appName: "CargoPlanner",
    reportTitle:
      lang === "ru" ? "Отчёт о планировании загрузки" : "Loading plan report",
    vehicleParams:
      lang === "ru" ? "Параметры автомобиля" : "Vehicle parameters",
    metrics: lang === "ru" ? "Метрики" : "Metrics",
    gaps: lang === "ru" ? "Зазоры" : "Gaps",
    cargoList: lang === "ru" ? "Список грузов" : "Cargo list",
    loaderGuide:
      lang === "ru" ? "Инструкция для грузчиков" : "Loader instructions",
    layerSchemes: lang === "ru" ? "2D-схемы по слоям" : "2D schemes by layers",
    layer: lang === "ru" ? "Слой" : "Layer",
    placedCargo: lang === "ru" ? "Размещённые" : "Placed",
    notPlacedCargo: lang === "ru" ? "Неразмещённые" : "Not placed",
    name: lang === "ru" ? "Название" : "Name",
    kind: lang === "ru" ? "Тип" : "Type",
    dims: lang === "ru" ? "Габариты" : "Dimensions",
    weight: lang === "ru" ? "Вес" : "Weight",
    count: lang === "ru" ? "Кол-во" : "Count",
    stackable: lang === "ru" ? "Штабелируемый" : "Stackable",
    placed: lang === "ru" ? "Размещено" : "Placed",
    total: lang === "ru" ? "Всего" : "Total",
    volumeFill: lang === "ru" ? "Заполнение объёма" : "Volume fill",
    weightFill: lang === "ru" ? "Заполнение веса" : "Weight fill",
    totalWeight: lang === "ru" ? "Общий вес" : "Total weight",
    freeVolume: lang === "ru" ? "Свободный объём" : "Free volume",
    freeWeight: lang === "ru" ? "Свободный вес" : "Free weight",
    loadDim: lang === "ru" ? "Габариты укладки" : "Load dimensions",
    length: lang === "ru" ? "Длина" : "Length",
    width: lang === "ru" ? "Ширина" : "Width",
    height: lang === "ru" ? "Высота" : "Height",
    yes: lang === "ru" ? "Да" : "Yes",
    no: lang === "ru" ? "Нет" : "No",
    enabled: lang === "ru" ? "Включены" : "Enabled",
    disabled: lang === "ru" ? "Выключены" : "Disabled",
    gapWalls: lang === "ru" ? "От стен" : "From walls",
    gapWidth:
      lang === "ru" ? "Между рядами по ширине" : "Between rows by width",
    gapLength:
      lang === "ru" ? "Между рядами по длине" : "Between rows by length",
    step: lang === "ru" ? "Шаг" : "Step",
    fromRearWall: lang === "ru" ? "от задней стенки" : "from rear wall",
    fromLeftWall: lang === "ru" ? "от левой стенки" : "from left wall",
    offFloor: lang === "ru" ? "от пола" : "off floor",
    modeLabel: lang === "ru" ? "Режим раскладки" : "Layout mode",
    along: lang === "ru" ? "Вдоль" : "Along",
    across: lang === "ru" ? "Поперёк" : "Across",
    mixed: lang === "ru" ? "Смешанный" : "Mixed",
    blocks: lang === "ru" ? "Размещено позиций" : "Placed units",
    position: lang === "ru" ? "Позиция" : "Position",
    paramsSheet: lang === "ru" ? "Параметры" : "Parameters",
    cargoSheet: lang === "ru" ? "Грузы" : "Cargo",
    gapsSheet: lang === "ru" ? "Зазоры" : "Gaps",
    variantsSheet: lang === "ru" ? "Варианты" : "Variants",
    variantFor: lang === "ru" ? "Вариант раскладки" : "Layout variant",
    loadingOrder: lang === "ru" ? "Порядок загрузки" : "Loading order",
  };
  return l;
}

function modeName(mode: Mode, l: Labels): string {
  return mode === "along" ? l.along : mode === "across" ? l.across : l.mixed;
}

function fmtLen(mm: number, ctx: ExportContext): string {
  return `${formatLength(mm, ctx.lengthUnit)} ${UNIT_SUFFIX[ctx.lengthUnit]}`;
}

function fmtWgt(kg: number, ctx: ExportContext): string {
  return `${formatWeight(kg, ctx.weightUnit)} ${WEIGHT_SUFFIX[ctx.weightUnit]}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function layerKeys(blocks: PackedBlock[]): number[] {
  return Array.from(new Set(blocks.map((b) => Math.round(b.z)))).sort(
    (a, b) => a - b
  );
}

function renderLayerCanvas(
  blocks: PackedBlock[],
  ctx: ExportContext,
  label: string
): HTMLCanvasElement {
  const scale = 0.6;
  const pad = 26;
  const { vehicle } = ctx;
  const cw = Math.round(vehicle.length * scale + pad * 2);
  const ch = Math.round(vehicle.width * scale + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = "#334155";
  g.lineWidth = 2;
  g.strokeRect(pad, pad, vehicle.length * scale, vehicle.width * scale);

  const showClearance =
    ctx.gapsEnabled &&
    ctx.gaps.walls > 0 &&
    ctx.gaps.walls * 2 < vehicle.length;
  if (showClearance) {
    g.strokeStyle = "#6366f1";
    g.lineWidth = 1.5;
    g.setLineDash([6, 4]);
    g.strokeRect(
      pad + ctx.gaps.walls * scale,
      pad + ctx.gaps.walls * scale,
      (vehicle.length - ctx.gaps.walls * 2) * scale,
      (vehicle.width - ctx.gaps.walls * 2) * scale
    );
    g.setLineDash([]);
  }

  for (const b of blocks) {
    g.fillStyle = b.color;
    g.globalAlpha = 0.85;
    g.fillRect(pad + b.y * scale, pad + b.x * scale, b.d * scale, b.w * scale);
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 1;
    g.strokeRect(
      pad + b.y * scale,
      pad + b.x * scale,
      b.d * scale,
      b.w * scale
    );
    g.fillStyle = "#ffffff";
    g.font = "600 11px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const cx = pad + (b.y + b.d / 2) * scale;
    const cy = pad + (b.x + b.w / 2) * scale;
    g.fillText(b.name.split(" ")[0], cx, cy);
  }

  g.fillStyle = "#64748b";
  g.font = "12px sans-serif";
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillText(label, pad, pad - 8);
  g.textAlign = "right";
  g.fillText(
    `${fmtLen(vehicle.length, ctx)} ${UNIT_SUFFIX[ctx.lengthUnit]}`,
    cw - pad,
    ch - 6
  );
  return canvas;
}

function loadingSequence(layout: LayoutResult): PackedBlock[] {
  return [...layout.blocks].sort((a, b) => {
    if (b.y !== a.y) return b.y - a.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.z - b.z;
  });
}

export function exportPdfReport(ctx: ExportContext): void {
  const l = buildLabels(ctx.lang);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  const section = (title: string) => {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 30, 60);
    doc.text(title, margin, y);
    y += 6;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 30, 60);
  doc.text(`${l.appName} — ${l.reportTitle}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${l.modeLabel}: ${modeName(ctx.mode, l)} — ${ctx.vehicle.name}`,
    margin,
    y
  );
  y += 6;

  section(l.vehicleParams);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 30, 60);
  doc.text(
    `${ctx.vehicle.name}: ${fmtLen(ctx.vehicle.length, ctx)}×${fmtLen(ctx.vehicle.width, ctx)}×${fmtLen(ctx.vehicle.height, ctx)}, ${l.totalWeight}: ${fmtWgt(ctx.vehicle.maxWeight, ctx)}`,
    margin,
    y
  );
  y += 6;

  section(l.metrics);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[l.metrics]],
    body: [
      [
        `${l.placed}/${l.total}: ${ctx.layout.placedCount}/${ctx.layout.totalCount}`,
      ],
      [`${l.volumeFill}: ${ctx.layout.volumeFill.toFixed(0)}%`],
      [`${l.weightFill}: ${ctx.layout.weightFill.toFixed(0)}%`],
      [`${l.totalWeight}: ${fmtWgt(ctx.layout.weight, ctx)}`],
      [`${l.freeVolume}: ${(ctx.layout.freeVolume / 1e9).toFixed(2)} м³`],
      [`${l.freeWeight}: ${fmtWgt(ctx.layout.freeWeight, ctx)}`],
      [
        `${l.loadDim}: ${fmtLen(ctx.layout.loadDim.length, ctx)}×${fmtLen(ctx.layout.loadDim.width, ctx)}×${fmtLen(ctx.layout.loadDim.height, ctx)}`,
      ],
      [`${l.stackable}: ${ctx.layout.stackable ? l.yes : l.no}`],
    ],
    styles: { fontSize: 9, cellPadding: 1.5 },
  });
  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 6;

  section(l.gaps);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[`${l.gaps}: ${ctx.gapsEnabled ? l.enabled : l.disabled}`]],
    body: [
      [`${l.gapWalls}: ${fmtLen(ctx.gaps.walls, ctx)}`],
      [`${l.gapWidth}: ${fmtLen(ctx.gaps.width, ctx)}`],
      [`${l.gapLength}: ${fmtLen(ctx.gaps.length, ctx)}`],
    ],
    styles: { fontSize: 9, cellPadding: 1.5 },
  });
  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 6;

  section(l.cargoList);
  const rows = ctx.cargoItems.flatMap((c) => {
    const placedCount = ctx.layout.blocks.filter((b) =>
      b.id.startsWith(c.id)
    ).length;
    return [
      [
        c.name,
        c.kind === "rect"
          ? ctx.lang === "ru"
            ? "Параллелепипед"
            : "Box"
          : ctx.lang === "ru"
            ? "Цилиндр"
            : "Cylinder",
        `${fmtLen(c.length, ctx)}×${fmtLen(c.width, ctx)}×${fmtLen(c.height, ctx)}`,
        `${c.count} (${l.placed}: ${placedCount})`,
        fmtWgt(c.weight, ctx),
        c.stackable ? l.yes : l.no,
      ],
    ];
  });
  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [[l.name, l.kind, l.dims, l.count, l.weight, l.stackable]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 1.5 },
  });
  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 4;

  if (ctx.layout.notPlaced.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(190, 30, 30);
    doc.text(
      `${l.notPlacedCargo}: ${ctx.layout.notPlaced
        .map((n) => `${n.name} — ${n.count}`)
        .join(", ")}`,
      margin,
      y
    );
    y += 6;
  }

  section(l.layerSchemes);
  const layers = layerKeys(ctx.layout.blocks);
  for (let i = 0; i < layers.length; i += 1) {
    const z = layers[i];
    if (i > 0) {
      doc.addPage();
      y = margin;
    }
    const layerBlocks = ctx.layout.blocks.filter((b) => Math.round(b.z) === z);
    const canvas = renderLayerCanvas(
      layerBlocks,
      ctx,
      `${l.layer} ${i + 1} (z=${fmtLen(z, ctx)})`
    );
    const imgH = canvas.height;
    const imgW = canvas.width;
    const availW = pageWidth - margin * 2;
    const ratio = imgH / imgW;
    let drawW = availW;
    let drawH = drawW * ratio;
    if (drawH > 200) {
      drawH = 200;
      drawW = drawH / ratio;
    }
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      margin + (availW - drawW) / 2,
      y,
      drawW,
      drawH
    );
    y += drawH + 6;
  }

  section(l.loaderGuide);
  const seq = loadingSequence(ctx.layout);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 30, 60);
  seq.forEach((b, i) => {
    const line = `${l.step} ${i + 1}: ${b.name} — ${fmtLen(b.d, ctx)}×${fmtLen(b.w, ctx)}×${fmtLen(b.h, ctx)}, ${l.position}: ${fmtLen(b.y, ctx)} ${l.fromRearWall}, ${fmtLen(b.x, ctx)} ${l.fromLeftWall}, ${fmtLen(b.z, ctx)} ${l.offFloor}`;
    const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
    for (const ln of lines) {
      if (y > 282) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln as string, margin, y);
      y += 4.5;
    }
  });

  doc.save(`cargo-report-${ctx.vehicle.name}.pdf`);
}

function render2dSnapshot(ctx: ExportContext): HTMLCanvasElement {
  const scale = 0.25;
  const pad = 34;
  const { vehicle } = ctx;
  const cw = Math.round(vehicle.length * scale + pad * 2);
  const ch = Math.round(vehicle.width * scale + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = "#94a3b8";
  g.lineWidth = 3;
  g.strokeRect(pad, pad, vehicle.length * scale, vehicle.width * scale);

  const showClearance =
    ctx.gapsEnabled &&
    ctx.gaps.walls > 0 &&
    ctx.gaps.walls * 2 < Math.min(vehicle.length, vehicle.width);
  if (showClearance) {
    g.strokeStyle = "#6366f1";
    g.lineWidth = 2;
    g.setLineDash([10, 6]);
    g.strokeRect(
      pad + ctx.gaps.walls * scale,
      pad + ctx.gaps.walls * scale,
      (vehicle.length - ctx.gaps.walls * 2) * scale,
      (vehicle.width - ctx.gaps.walls * 2) * scale
    );
    g.setLineDash([]);
  }

  for (const b of ctx.layout.blocks) {
    g.fillStyle = b.color;
    g.globalAlpha = 0.85;
    g.fillRect(pad + b.y * scale, pad + b.x * scale, b.d * scale, b.w * scale);
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(255,255,255,0.4)";
    g.lineWidth = 1;
    g.strokeRect(
      pad + b.y * scale,
      pad + b.x * scale,
      b.d * scale,
      b.w * scale
    );
    if (b.d * scale > 40 && b.w * scale > 22) {
      g.fillStyle = "#ffffff";
      g.font = "600 13px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(
        b.name.split(" ")[0],
        pad + (b.y + b.d / 2) * scale,
        pad + (b.x + b.w / 2) * scale
      );
    }
  }

  g.fillStyle = "#cbd5e1";
  g.font = "700 18px sans-serif";
  g.textAlign = "right";
  g.textBaseline = "alphabetic";
  g.fillText(`${fmtLen(vehicle.length, ctx)}`, cw - pad, ch - pad / 2);
  g.save();
  g.translate(pad / 2, ch - pad);
  g.rotate(-Math.PI / 2);
  g.textAlign = "right";
  g.fillText(`${fmtLen(vehicle.width, ctx)}`, 0, 0);
  g.restore();
  return canvas;
}

export function exportPngSnapshot(
  canvas: HTMLCanvasElement | null,
  ctx: ExportContext,
  view: "3d" | "2d" = "3d"
): void {
  const l = buildLabels(ctx.lang);
  const scene = view === "2d" || !canvas ? render2dSnapshot(ctx) : canvas;
  const targetW = 1600;
  const srcW = scene.width || 1;
  const srcH = scene.height || 1;
  const sceneH = Math.round((srcH / srcW) * targetW);
  const panelH = 320;
  const outW = targetW;
  const outH = sceneH + panelH;

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const g = out.getContext("2d");
  if (!g) return;
  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, outW, outH);
  g.drawImage(scene, 0, 0, outW, sceneH);

  g.fillStyle = "#111a2e";
  g.fillRect(0, sceneH, outW, panelH);
  g.strokeStyle = "#334155";
  g.lineWidth = 2;
  g.strokeRect(0, sceneH, outW, panelH);

  g.font = "700 34px sans-serif";
  g.fillStyle = "#ffffff";
  g.fillText(
    `${l.appName} — ${l.reportTitle} (${modeName(ctx.mode, l)})`,
    40,
    sceneH + 56
  );
  g.font = "500 26px sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText(
    `${ctx.vehicle.name}: ${fmtLen(ctx.vehicle.length, ctx)}×${fmtLen(ctx.vehicle.width, ctx)}×${fmtLen(ctx.vehicle.height, ctx)}`,
    40,
    sceneH + 96
  );

  const cells: [string, string][] = [
    [
      `${l.placed}/${l.total}`,
      `${ctx.layout.placedCount}/${ctx.layout.totalCount}`,
    ],
    [l.volumeFill, `${ctx.layout.volumeFill.toFixed(0)}%`],
    [l.weightFill, `${ctx.layout.weightFill.toFixed(0)}%`],
    [l.totalWeight, fmtWgt(ctx.layout.weight, ctx)],
    [l.freeVolume, `${(ctx.layout.freeVolume / 1e9).toFixed(2)} м³`],
    [l.freeWeight, fmtWgt(ctx.layout.freeWeight, ctx)],
    [
      l.loadDim,
      `${fmtLen(ctx.layout.loadDim.length, ctx)}×${fmtLen(ctx.layout.loadDim.width, ctx)}×${fmtLen(ctx.layout.loadDim.height, ctx)}`,
    ],
    [
      `${l.gaps}: ${ctx.gapsEnabled ? l.enabled : l.disabled}`,
      `${l.gapWalls} ${fmtLen(ctx.gaps.walls, ctx)} / ${l.gapWidth} ${fmtLen(ctx.gaps.width, ctx)} / ${l.gapLength} ${fmtLen(ctx.gaps.length, ctx)}`,
    ],
  ];

  const cols = 2;
  const cellH = 66;
  const startX = 40;
  const startY = sceneH + 140;
  const gapX = 40;
  const cellW = (outW - startX * 2 - gapX) / cols;

  cells.forEach((cell, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = startX + c * (cellW + gapX);
    const yy = startY + r * cellH;
    g.fillStyle = "#1e293b";
    g.fillRect(x, yy, cellW, cellH - 14);
    g.font = "600 22px sans-serif";
    g.fillStyle = "#94a3b8";
    g.fillText(cell[0], x + 18, yy + 26);
    g.font = "700 26px sans-serif";
    g.fillStyle = "#ffffff";
    g.fillText(cell[1], x + 18, yy + 50);
  });

  const dataUrl = out.toDataURL("image/png");
  const bin = atob(dataUrl.split(",")[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  downloadBlob(
    new Blob([arr], { type: "image/png" }),
    `cargo-snapshot-${ctx.vehicle.name}.png`
  );
}

export function exportExcelReport(ctx: ExportContext): void {
  const l = buildLabels(ctx.lang);
  const wb = XLSX.utils.book_new();

  const params = [
    [l.vehicleParams],
    [],
    [l.name, ctx.vehicle.name],
    [l.length, ctx.vehicle.length, UNIT_SUFFIX[ctx.lengthUnit]],
    [l.width, ctx.vehicle.width, UNIT_SUFFIX[ctx.lengthUnit]],
    [l.height, ctx.vehicle.height, UNIT_SUFFIX[ctx.lengthUnit]],
    [l.totalWeight, ctx.vehicle.maxWeight, WEIGHT_SUFFIX[ctx.weightUnit]],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(params),
    l.paramsSheet.slice(0, 31)
  );

  const cargoRows: (string | number)[][] = [
    [l.name, l.kind, l.dims, l.weight, l.count, l.stackable],
  ];
  for (const c of ctx.cargoItems) {
    const placedCount = ctx.layout.blocks.filter((b) =>
      b.id.startsWith(c.id)
    ).length;
    cargoRows.push([
      c.name,
      c.kind,
      `${c.length}×${c.width}×${c.height}`,
      c.weight,
      `${c.count} (${l.placed}: ${placedCount})`,
      c.stackable ? l.yes : l.no,
    ]);
  }
  const cargoWs = XLSX.utils.aoa_to_sheet(cargoRows);
  cargoWs["!cols"] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, cargoWs, l.cargoSheet.slice(0, 31));

  const gapRows: (string | number)[][] = [
    [`${l.gaps}: ${ctx.gapsEnabled ? l.enabled : l.disabled}`],
    [],
    [l.gapWalls, ctx.gaps.walls, UNIT_SUFFIX[ctx.lengthUnit]],
    [l.gapWidth, ctx.gaps.width, UNIT_SUFFIX[ctx.lengthUnit]],
    [l.gapLength, ctx.gaps.length, UNIT_SUFFIX[ctx.lengthUnit]],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(gapRows),
    l.gapsSheet.slice(0, 31)
  );

  const modes: Mode[] = ["along", "across", "mixed"];
  for (const m of modes) {
    const res = ctx.layouts[m];
    const head: (string | number)[][] = [
      [`${l.variantFor}: ${modeName(m, l)}`],
      [
        l.placed,
        l.total,
        l.volumeFill,
        l.weightFill,
        l.totalWeight,
        l.freeVolume,
        l.freeWeight,
      ],
      [
        res.placedCount,
        res.totalCount,
        `${res.volumeFill.toFixed(1)}%`,
        `${res.weightFill.toFixed(1)}%`,
        res.weight,
        Math.round(res.freeVolume),
        res.freeWeight,
      ],
      [],
      [l.name, "x", "y", "z", l.dims, l.loadDim],
    ];
    for (const b of res.blocks) {
      head.push([
        b.name,
        Math.round(b.x),
        Math.round(b.y),
        Math.round(b.z),
        `${Math.round(b.w)}×${Math.round(b.d)}×${Math.round(b.h)}`,
        "",
      ]);
    }
    if (res.notPlaced.length > 0) {
      head.push([]);
      head.push([l.notPlacedCargo]);
      for (const n of res.notPlaced) {
        head.push([n.name, n.count]);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(head);
    ws["!cols"] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `${m}-layout`.slice(0, 31));
  }

  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  downloadBlob(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `cargo-excel-${ctx.vehicle.name}.xlsx`
  );
}
