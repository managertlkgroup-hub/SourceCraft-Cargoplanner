"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Edges } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  Layers,
  Eye,
  EyeOff,
  HelpCircle,
  Move,
  MousePointer2,
  RotateCw,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SceneBlock, Vehicle, LengthUnit } from "@/lib/data";
import { formatLength, UNIT_SUFFIX } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

const SCALE = 0.001;

function CanvasExposer({
  canvasRef,
}: {
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!canvasRef) return;
    canvasRef.current = gl.domElement;
    return () => {
      canvasRef.current = null;
    };
  }, [gl, canvasRef]);
  return null;
}

function CargoMesh({
  block,
  hovered,
  selected,
  onHover,
  onSelect,
  lengthUnit,
}: {
  block: SceneBlock;
  hovered: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (block: SceneBlock) => void;
  lengthUnit: LengthUnit;
}) {
  const { t } = useI18n();
  const sx = block.w * SCALE;
  const sy = block.h * SCALE;
  const sz = block.d * SCALE;

  return (
    <mesh
      position={[
        (block.x + block.w / 2) * SCALE,
        (block.z + block.h / 2) * SCALE,
        (block.y + block.d / 2) * SCALE,
      ]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(block.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block);
      }}
    >
      {block.cylinder ? (
        <cylinderGeometry
          args={[Math.max(sx, sz) / 2, Math.max(sx, sz) / 2, sy, 32]}
        />
      ) : (
        <boxGeometry args={[sx, sy, sz]} />
      )}
      <meshStandardMaterial
        color={block.color}
        roughness={0.45}
        metalness={0.15}
        emissive={hovered || selected ? "#ffffff" : "#000000"}
        emissiveIntensity={hovered || selected ? 0.35 : 0}
        transparent
        opacity={0.92}
      />
      {(hovered || selected) && (
        <Html
          center
          distanceFactor={12}
          zIndexRange={[20, 0]}
          pointerEvents="none"
        >
          <div className="pointer-events-none max-w-[180px] rounded-md border bg-background/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur">
            <div className="font-semibold">
              {block.isOversize ? `⚠ ${block.name}` : block.name}
            </div>
            <div className="mt-0.5 text-muted-foreground">
              {block.cylinder ? t.layerCylinder : t.layerPlane}
            </div>
            <div className="mt-0.5 text-muted-foreground">
              {formatLength(block.w, lengthUnit)}×
              {formatLength(block.d, lengthUnit)}×
              {formatLength(block.h, lengthUnit)} {UNIT_SUFFIX[lengthUnit]}
            </div>
            <div className="text-muted-foreground">
              {t.offFloor}: {formatLength(block.z, lengthUnit)}{" "}
              {UNIT_SUFFIX[lengthUnit]}
            </div>
          </div>
        </Html>
      )}
    </mesh>
  );
}

function VehicleBody({ vehicle }: { vehicle: Vehicle }) {
  const w = vehicle.width * SCALE;
  const h = vehicle.height * SCALE;
  const l = vehicle.length * SCALE;

  return (
    <group>
      <mesh position={[w / 2, h / 2, l / 2]}>
        <boxGeometry args={[w, h, l]} />
        <meshBasicMaterial
          color="#64748b"
          transparent
          opacity={0.07}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <Edges scale={1.001} color="#94a3b8" threshold={15} />
      </mesh>
    </group>
  );
}

function FloorGrid() {
  return (
    <gridHelper
      args={[18, 24, "#334155", "#1e293b"]}
      position={[0, -0.002, 0]}
    />
  );
}

function SceneContent({
  blocks,
  vehicle,
  hoveredId,
  setHoveredId,
  selectedId,
  onSelect,
  controlsRef,
  lengthUnit,
}: {
  blocks: SceneBlock[];
  vehicle: Vehicle;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  lengthUnit: LengthUnit;
}) {
  const maxDim =
    Math.max(vehicle.length, vehicle.width, vehicle.height) * SCALE;

  const handleSelect = (block: SceneBlock) => {
    // Клик только выделяет груз — камера не наводится (требование ТЗ).
    onSelect(block.id);
  };

  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 8]} intensity={1.3} castShadow />
      <VehicleBody vehicle={vehicle} />
      {blocks.map((b) => (
        <CargoMesh
          key={b.id}
          block={b}
          hovered={hoveredId === b.id}
          selected={selectedId === b.id}
          onHover={setHoveredId}
          onSelect={handleSelect}
          lengthUnit={lengthUnit}
        />
      ))}
      <FloorGrid />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        target={[
          (vehicle.width / 2) * SCALE,
          maxDim * 0.5,
          (vehicle.length / 2) * SCALE,
        ]}
        minDistance={maxDim * 0.25}
        maxDistance={maxDim * 8}
      />
    </>
  );
}

export default function Scene3D({
  blocks,
  vehicle,
  lengthUnit,
  canvasRef,
}: {
  blocks: SceneBlock[];
  vehicle: Vehicle;
  lengthUnit: LengthUnit;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const { t, lang } = useI18n();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const layerKeys = useMemo(() => {
    const keys = Array.from(new Set(blocks.map((b) => Math.round(b.z)))).sort(
      (a, b) => a - b
    );
    return keys;
  }, [blocks]);

  const [hiddenLayers, setHiddenLayers] = useState<number[]>([]);

  const toggleLayer = (key: number) => {
    setHiddenLayers((list) =>
      list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
    );
  };

  const visibleBlocks = blocks.filter(
    (b) => !hiddenLayers.includes(Math.round(b.z))
  );

  const maxDim =
    Math.max(vehicle.length, vehicle.width, vehicle.height) * SCALE;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas
        camera={{
          position: [
            maxDim * 1.4 + (vehicle.width / 2) * SCALE,
            maxDim * 1.1,
            maxDim * 1.6 + (vehicle.length / 2) * SCALE,
          ],
          fov: 45,
          near: 0.01,
          far: maxDim * 20,
        }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <SceneContent
          blocks={visibleBlocks}
          vehicle={vehicle}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          controlsRef={controlsRef}
          lengthUnit={lengthUnit}
        />
        <CanvasExposer canvasRef={canvasRef} />
      </Canvas>

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
            <Move className="h-3.5 w-3.5" /> {t.legend3d}
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-1.5">
              <RotateCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {lang === "ru"
                ? "Вращение — левая кнопка мыши"
                : "Rotate — left mouse button"}
            </li>
            <li className="flex items-start gap-1.5">
              <ZoomIn className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {lang === "ru"
                ? "Зум — колесо мыши, панорама — правая кнопка"
                : "Zoom — mouse wheel, pan — right button"}
            </li>
            <li className="flex items-start gap-1.5">
              <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.selectCargoHint}
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

      {/* Подсказка выбора */}
      {selectedId && (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-background/85 px-2.5 py-1 text-xs text-muted-foreground shadow-lg backdrop-blur">
          {t.cameraOn} «{blocks.find((b) => b.id === selectedId)?.name}»
        </div>
      )}
    </div>
  );
}
