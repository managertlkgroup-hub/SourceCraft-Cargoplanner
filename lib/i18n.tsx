"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "ru" | "en";

export interface Dict {
  appName: string;
  theme: string;
  light: string;
  dark: string;
  language: string;
  units: string;
  vehicle: string;
  cargo: string;
  metrics: string;
  hints: string;
  modes: string;
  gaps: string;
  exportPdf: string;
  exportPng: string;
  exportExcel: string;
  along: string;
  across: string;
  mixed: string;
  gapWalls: string;
  gapWidth: string;
  gapLength: string;
  enableGaps: string;
  enableStacking: string;
  stackHeight: string;
  maxLayers: string;
  toastMaxStackLayers: string;
  toastWeightOverCapacity: string;
  toastCollision: string;
  toastBounds: string;
  toastCargoExceedsBody: string;
  toastGapClamped: string;
  legend2d: string;
  legend3d: string;
  legendHint: string;
  selectCargoHint: string;
  dragHint: string;
  layerChangeHint: string;
  loadSessionLabel: string;
  sessionsLabel: string;
  toastSessionLimit: string;
  sessionsEmpty: string;
  sessionName: string;
  sessionNamePlaceholder: string;
  sessionDialogTitle: string;
  sessionDialogDesc: string;
  toastSessionNamed: string;
  toastSessionLoaded: string;
  toastSessionDeleted: string;
  confirmDeleteSession: string;
  presetsDialogTitle: string;
  presetsDialogDesc: string;
  presetName: string;
  addPreset: string;
  vehiclePresetsLabel: string;
  vehiclePresetsTitle: string;
  vehiclePresetsDesc: string;
  addVehiclePreset: string;
  oversize: string;
  compatibilityGroup: string;
  toastCsvDropped: string;
  placedLabel: string;
  notPlacedLabel: string;
  placed: string;
  placedRegular: string;
  placedOversize: string;
  oversizeHint: string;
  volumeFill: string;
  weightFill: string;
  totalWeight: string;
  freeVolume: string;
  freeWeight: string;
  stackable: string;
  notPlaced: string;
  tip: string;
  loadDim: string;
  yes: string;
  no: string;
  best: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  count: string;
  customBody: string;
  pickVehicle: string;
  myBodies: string;
  addCargo: string;
  exportCsv: string;
  importCsv: string;
  presets: string;
  emptyCargoList: string;
  toastCargoUpdated: string;
  toastCargoAdded: string;
  toastPresetAdded: string;
  toastPresetSaved: string;
  toastPresetRemoved: string;
  toastPresetReset: string;
  editedSuffix: string;
  editBuiltinPreset: string;
  resetBuiltinPreset: string;
  savePreset: string;
  toastVehicleCreated: string;
  toastVehicleUpdated: string;
  toastVehicleRemoved: string;
  toastNoCargoExport: string;
  toastCsvExported: string;
  toastCsvImported: string;
  toastCsvImportFailed: string;
  toastPdfReady: string;
  toastExcelReady: string;
  toastPngSwitch3d: string;
  toastSceneNotReady: string;
  toastPngSaved: string;
  toastCargoRemoved: string;
  toastSessionSaved: string;
  saveSessionLabel: string;
  saveSessionHint: string;
  toastNegative: string;
  toastMaxValue: string;
  hintLowVolume: string;
  hintNearWeightLimit: string;
  hintSecondLayer: string;
  hintNextLayer: string;
  hintOrReduceGaps: string;
  scene2dLabel: string;
  layerPlane: string;
  layerCylinder: string;
  offFloor: string;
  layersByHeight: string;
  layer: string;
  cameraOn: string;
  dialogAddCargo: string;
  dialogEditCargo: string;
  dialogCargoDesc: string;
  dialogType: string;
  dialogRect: string;
  dialogCylinder: string;
  dialogName: string;
  dialogNamePlaceholder: string;
  dialogDiameter: string;
  dialogMaxLoadAbove: string;
  dialogMaxLoadPlaceholder: string;
  dialogStackable: string;
  dialogStackableLabel: string;
  dialogCancel: string;
  dialogSave: string;
  dialogAdd: string;
  errNameRequired: string;
  errPositive: string;
  errMinOne: string;
  dialogCustomBody: string;
  dialogEditVehicle: string;
  dialogVehicleDesc: string;
  dialogVehicleNamePlaceholder: string;
  dialogMaxWeight: string;
  dialogCreate: string;
  dialogPickTitle: string;
  dialogPickDesc: string;
  dialogNoVehicles: string;
  dialogCurrent: string;
  dialogPlaced: string;
  dialogVolume: string;
  dialogWeight: string;
  dialogLoad: string;
  dialogApply: string;
  dialogSelect: string;
  pickSortLabel: string;
  sortVolumeDesc: string;
  sortVolumeAsc: string;
  sortWeightDesc: string;
  sortWeightAsc: string;
  sortDimsDesc: string;
  sortDimsAsc: string;
  sortPlacedDesc: string;
  pickNotFit: string;
  pickNotFitCount: string;
  pickNotFitList: string;
}

export const STRINGS: Record<Lang, Dict> = {
  ru: {
    appName: "CargoPlanner",
    theme: "Тема",
    light: "Светлая",
    dark: "Тёмная",
    language: "Язык",
    units: "Единицы",
    vehicle: "Автомобиль",
    cargo: "Грузы",
    metrics: "Метрики",
    hints: "Подсказки",
    modes: "Режим раскладки",
    gaps: "Зазоры",
    exportPdf: "PDF",
    exportPng: "PNG",
    exportExcel: "Excel",
    along: "Вдоль",
    across: "Поперёк",
    mixed: "Смешанный",
    gapWalls: "От стен",
    gapWidth: "Между рядами по ширине",
    gapLength: "Между рядами по длине",
    enableGaps: "Включить зазоры",
    enableStacking: "Штабелирование",
    stackHeight: "Ограничение высоты",
    maxLayers: "Макс. слоёв",
    toastMaxStackLayers: "Максимум слоёв для этого кузова: %d",
    toastWeightOverCapacity:
      "Суммарный вес грузов превышает грузоподъёмность автомобиля",
    toastCollision: "Пересечение с грузом «%s»",
    toastBounds: "Груз не может выходить за пределы кузова",
    toastCargoExceedsBody:
      "Груз превышает габариты кузова. Уменьшите размеры или отметьте груз как негабаритный",
    toastGapClamped: "Зазор уменьшен до максимального значения",
    legend2d: "Управление (2D)",
    legend3d: "Управление (3D)",
    legendHint: "Подсказка по управлению",
    selectCargoHint: "Клик — выбор груза",
    dragHint: "Перетащите груз мышью, чтобы переместить его",
    layerChangeHint:
      "Используйте панель слоёв или поле «Слой», чтобы менять высоту",
    loadSessionLabel: "Загрузить сессию",
    sessionsLabel: "Сессии",
    toastSessionLimit: "Достигнут максимум сессий (50). Удалите лишние.",
    sessionsEmpty: "Нет сохранённых сессий.",
    sessionName: "Название сессии",
    sessionNamePlaceholder: "Например, План на пятницу",
    sessionDialogTitle: "Сохранить сессию",
    sessionDialogDesc:
      "Сохранённые автомобиль, грузы, пресеты и активный режим можно загрузить позже. Зазоры сохраняются только в рамках текущей сессии.",
    toastSessionNamed: "Сессия «%s» сохранена",
    toastSessionLoaded: "Сессия «%s» загружена",
    toastSessionDeleted: "Сессия удалена",
    confirmDeleteSession: "Удалить сессию «%s»?",
    presetsDialogTitle: "Пресеты грузов",
    presetsDialogDesc:
      "Управление пресетами грузов: добавление, редактирование и удаление.",
    presetName: "Название пресета",
    addPreset: "Добавить",
    vehiclePresetsLabel: "Пресеты авто",
    vehiclePresetsTitle: "Пресеты автомобилей",
    vehiclePresetsDesc:
      "Встроенные и пользовательские автомобили. Встроенные можно редактировать (сохраняется изменённая копия) и сбрасывать к дефолту.",
    addVehiclePreset: "Свой автомобиль",
    oversize: "Негабаритный груз (превышает кузов)",
    compatibilityGroup: "Группа совместимости",
    toastCsvDropped: "Пропущено некорректных строк: %d",
    placedLabel: "Размещённые",
    notPlacedLabel: "Неразмещённые",
    placed: "Размещено",
    placedRegular: "Размещено обычных",
    placedOversize: "негабарит",
    oversizeHint:
      "Негабаритный груз выходит за габариты кузова — проверьте возможность перевозки",
    volumeFill: "Заполнение объёма",
    weightFill: "Заполнение веса",
    totalWeight: "Общий вес",
    freeVolume: "Свободный объём",
    freeWeight: "Свободный вес",
    stackable: "Штабелируемость",
    notPlaced: "Неразмещённые грузы",
    tip: "Совет",
    loadDim: "Габариты укладки",
    yes: "Да",
    no: "Нет",
    best: "Лучший",
    length: "Длина",
    width: "Ширина",
    height: "Высота",
    weight: "Вес",
    count: "Кол-во",
    customBody: "Свой кузов",
    pickVehicle: "Подбор автомобиля",
    myBodies: "Мои кузова",
    addCargo: "Груз",
    exportCsv: "Экспорт CSV",
    importCsv: "Импорт CSV",
    presets: "Пресеты",
    emptyCargoList:
      "Список грузов пуст. Добавьте груз вручную, из пресета или через CSV.",
    toastCargoUpdated: "Груз обновлён",
    toastCargoAdded: "Груз добавлен",
    toastPresetAdded: "Добавлено",
    toastPresetSaved: "Пресет сохранён",
    toastPresetRemoved: "Пресет удалён",
    toastPresetReset: "Встроенный пресет сброшен к значениям по умолчанию",
    editedSuffix: "изменён",
    editBuiltinPreset: "Редактировать (сохранить как изменённый)",
    resetBuiltinPreset: "Сбросить к дефолту",
    savePreset: "Сохранить пресет",
    toastVehicleCreated: "Кузов создан",
    toastVehicleUpdated: "Кузов обновлён",
    toastVehicleRemoved: "Удалён кузов",
    toastNoCargoExport: "Нет грузов для экспорта",
    toastCsvExported: "Экспортировано грузов",
    toastCsvImported: "Импортировано грузов",
    toastCsvImportFailed: "Не удалось импортировать CSV",
    toastPdfReady: "PDF-отчёт сформирован",
    toastExcelReady: "Excel-файл сформирован",
    toastPngSwitch3d: "Для PNG переключитесь в 3D-вид",
    toastSceneNotReady: "3D-сцена ещё не готова",
    toastPngSaved: "PNG-снимок сохранён",
    toastCargoRemoved: "Груз удалён",
    toastSessionSaved: "Сессия сохранена",
    saveSessionLabel: "Сохранить сессию",
    saveSessionHint:
      "Сохранить автомобиль, грузы и настройки в браузере (зазоры сбрасываются)",
    toastNegative: "Значение не может быть отрицательным",
    toastMaxValue: "Максимальное значение",
    hintLowVolume: "Малое заполнение объёма",
    hintNearWeightLimit: "Вес близок к пределу",
    hintSecondLayer: "Есть свободное место для второго слоя",
    hintNextLayer: "Есть свободное место для слоя %d",
    hintOrReduceGaps: "или уменьшите зазоры",
    scene2dLabel: "2D-вид сверху",
    layerPlane: "Параллелепипед",
    layerCylinder: "Цилиндр",
    offFloor: "От пола",
    layersByHeight: "Слои по высоте",
    layer: "Слой",
    cameraOn: "Выбран груз",
    // диалог груза
    dialogAddCargo: "Добавить груз",
    dialogEditCargo: "Изменить груз",
    dialogCargoDesc:
      "Задайте параметры груза. Габариты и вес должны быть больше нуля.",
    dialogType: "Тип",
    dialogRect: "Прямоугольный",
    dialogCylinder: "Цилиндр",
    dialogName: "Название",
    dialogNamePlaceholder: "Например, ящик с оборудованием",
    dialogDiameter: "Диаметр",
    dialogMaxLoadAbove: "Макс. нагрузка сверху",
    dialogMaxLoadPlaceholder: "Вес, который груз выдержит сверху",
    dialogStackable: "Груз можно штабелировать",
    dialogCancel: "Отмена",
    dialogSave: "Сохранить",
    dialogAdd: "Добавить",
    errNameRequired: "Укажите название",
    errPositive: "Больше 0",
    errMinOne: "≥ 1",
    // диалог кузова
    dialogCustomBody: "Свой кузов",
    dialogEditVehicle: "Изменить кузов",
    dialogVehicleDesc:
      "Задайте произвольные габариты и грузоподъёмность кузова. Все значения должны быть больше нуля.",
    dialogVehicleNamePlaceholder: "Например, Мой кузов",
    dialogMaxWeight: "Грузоподъёмность",
    dialogCreate: "Создать",
    // подбор автомобиля
    dialogPickTitle: "Подбор автомобиля",
    dialogPickDesc:
      "Все доступные автомобили с расчётом по текущему списку грузов. Отсортировано по заполнению объёма по убыванию.",
    dialogNoVehicles: "Нет доступных автомобилей.",
    dialogCurrent: "Текущий",
    dialogPlaced: "Размещено",
    dialogVolume: "Объём",
    dialogWeight: "Вес",
    dialogLoad: "Укладка",
    dialogStackableLabel: "Штабелируемость",
    dialogApply: "Применить",
    dialogSelect: "Выбрать",
    pickSortLabel: "Сортировка",
    sortVolumeDesc: "По объёму (убыв.)",
    sortVolumeAsc: "По объёму (возр.)",
    sortWeightDesc: "По весу (убыв.)",
    sortWeightAsc: "По весу (возр.)",
    sortDimsDesc: "По габаритам (убыв.)",
    sortDimsAsc: "По габаритам (возр.)",
    sortPlacedDesc: "По количеству размещённых (убыв.)",
    pickNotFit: "Не подходит для %d грузов",
    pickNotFitCount: "шт.",
    pickNotFitList: "⚠ Не помещаются",
  },
  en: {
    appName: "CargoPlanner",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    language: "Language",
    units: "Units",
    vehicle: "Vehicle",
    cargo: "Cargo",
    metrics: "Metrics",
    hints: "Hints",
    modes: "Layout mode",
    gaps: "Gaps",
    exportPdf: "PDF",
    exportPng: "PNG",
    exportExcel: "Excel",
    along: "Along",
    across: "Across",
    mixed: "Mixed",
    gapWalls: "From walls",
    gapWidth: "Between rows by width",
    gapLength: "Between rows by length",
    enableGaps: "Enable gaps",
    enableStacking: "Stacking",
    stackHeight: "Height limit",
    maxLayers: "Max layers",
    toastMaxStackLayers: "Maximum layers for this body: %d",
    toastWeightOverCapacity: "Total cargo weight exceeds the vehicle capacity",
    toastCollision: "Intersection with cargo «%s»",
    toastBounds: "Cargo cannot go beyond the body bounds",
    toastCargoExceedsBody:
      "Cargo exceeds the body dimensions. Reduce the size or mark it as oversize",
    toastGapClamped: "Gap reduced to the maximum allowed value",
    legend2d: "Controls (2D)",
    legend3d: "Controls (3D)",
    legendHint: "Controls hint",
    selectCargoHint: "Click selects a cargo",
    dragHint: "Drag a cargo with the mouse to move it",
    layerChangeHint:
      "Use the layer panel or the «Layer» field to change height",
    loadSessionLabel: "Load session",
    sessionsLabel: "Sessions",
    toastSessionLimit: "Maximum number of sessions (50) reached. Delete some.",
    sessionsEmpty: "No saved sessions.",
    sessionName: "Session name",
    sessionNamePlaceholder: "e.g. Friday plan",
    sessionDialogTitle: "Save session",
    sessionDialogDesc:
      "Saved vehicle, cargo, presets and active mode can be loaded later. Gaps persist only within the current session.",
    toastSessionNamed: "Session «%s» saved",
    toastSessionLoaded: "Session «%s» loaded",
    toastSessionDeleted: "Session deleted",
    confirmDeleteSession: "Delete session «%s»?",
    presetsDialogTitle: "Cargo presets",
    presetsDialogDesc: "Manage cargo presets: add, edit and delete them.",
    presetName: "Preset name",
    addPreset: "Add",
    vehiclePresetsLabel: "Vehicle presets",
    vehiclePresetsTitle: "Vehicle presets",
    vehiclePresetsDesc:
      "Built-in and custom vehicles. Built-ins can be edited (saved as an edited copy) and reset to default.",
    addVehiclePreset: "Custom vehicle",
    oversize: "Oversize cargo (exceeds the body)",
    compatibilityGroup: "Compatibility group",
    toastCsvDropped: "Skipped invalid rows: %d",
    placedLabel: "Placed",
    notPlacedLabel: "Not placed",
    placed: "Placed",
    placedRegular: "Placed regular",
    placedOversize: "oversize",
    oversizeHint:
      "Oversize cargo extends beyond the body — verify it can be transported",
    volumeFill: "Volume fill",
    weightFill: "Weight fill",
    totalWeight: "Total weight",
    freeVolume: "Free volume",
    freeWeight: "Free weight",
    stackable: "Stackable",
    notPlaced: "Not placed",
    tip: "Tip",
    loadDim: "Load dimensions",
    yes: "Yes",
    no: "No",
    best: "Best",
    length: "Length",
    width: "Width",
    height: "Height",
    weight: "Weight",
    count: "Count",
    customBody: "Custom body",
    pickVehicle: "Pick a vehicle",
    myBodies: "My bodies",
    addCargo: "Cargo",
    exportCsv: "Export CSV",
    importCsv: "Import CSV",
    presets: "Presets",
    emptyCargoList:
      "The cargo list is empty. Add cargo manually, from a preset, or via CSV.",
    toastCargoUpdated: "Cargo updated",
    toastCargoAdded: "Cargo added",
    toastPresetAdded: "Added",
    toastPresetSaved: "Preset saved",
    toastPresetRemoved: "Preset removed",
    toastPresetReset: "Built-in preset reset to default values",
    editedSuffix: "edited",
    editBuiltinPreset: "Edit (save as edited)",
    resetBuiltinPreset: "Reset to default",
    savePreset: "Save as preset",
    toastVehicleCreated: "Body created",
    toastVehicleUpdated: "Body updated",
    toastVehicleRemoved: "Body removed",
    toastNoCargoExport: "No cargo to export",
    toastCsvExported: "Cargo exported",
    toastCsvImported: "Cargo imported",
    toastCsvImportFailed: "Could not import CSV",
    toastPdfReady: "PDF report generated",
    toastExcelReady: "Excel file generated",
    toastPngSwitch3d: "Switch to 3D view for PNG",
    toastSceneNotReady: "3D scene is not ready yet",
    toastPngSaved: "PNG snapshot saved",
    toastCargoRemoved: "Cargo removed",
    toastSessionSaved: "Session saved",
    saveSessionLabel: "Save session",
    saveSessionHint:
      "Save the vehicle, cargo and settings in the browser (gaps are reset)",
    toastNegative: "The value cannot be negative",
    toastMaxValue: "Maximum value",
    hintLowVolume: "Low volume fill",
    hintNearWeightLimit: "Weight is close to the limit",
    hintSecondLayer: "There is free space for a second layer",
    hintNextLayer: "There is free space for layer %d",
    hintOrReduceGaps: "or reduce the gaps",
    scene2dLabel: "2D top view",
    layerPlane: "Box",
    layerCylinder: "Cylinder",
    offFloor: "Off floor",
    layersByHeight: "Layers by height",
    layer: "Layer",
    cameraOn: "Selected cargo",
    dialogAddCargo: "Add cargo",
    dialogEditCargo: "Edit cargo",
    dialogCargoDesc:
      "Set the cargo parameters. Dimensions and weight must be greater than zero.",
    dialogType: "Type",
    dialogRect: "Rectangular",
    dialogCylinder: "Cylinder",
    dialogName: "Name",
    dialogNamePlaceholder: "e.g. equipment box",
    dialogDiameter: "Diameter",
    dialogMaxLoadAbove: "Max load above",
    dialogMaxLoadPlaceholder: "Weight the cargo can bear on top",
    dialogStackable: "Cargo can be stacked",
    dialogCancel: "Cancel",
    dialogSave: "Save",
    dialogAdd: "Add",
    errNameRequired: "Enter a name",
    errPositive: "Greater than 0",
    errMinOne: "≥ 1",
    dialogCustomBody: "Custom body",
    dialogEditVehicle: "Edit body",
    dialogVehicleDesc:
      "Set the body dimensions and capacity. All values must be greater than zero.",
    dialogVehicleNamePlaceholder: "e.g. My body",
    dialogMaxWeight: "Capacity",
    dialogCreate: "Create",
    dialogPickTitle: "Pick a vehicle",
    dialogPickDesc:
      "All available vehicles computed for the current cargo list. Sorted by volume fill descending.",
    dialogNoVehicles: "No vehicles available.",
    dialogCurrent: "Current",
    dialogPlaced: "Placed",
    dialogVolume: "Volume",
    dialogWeight: "Weight",
    dialogLoad: "Load",
    dialogStackableLabel: "Stackable",
    dialogApply: "Apply",
    dialogSelect: "Select",
    pickSortLabel: "Sort",
    sortVolumeDesc: "By volume (desc)",
    sortVolumeAsc: "By volume (asc)",
    sortWeightDesc: "By weight (desc)",
    sortWeightAsc: "By weight (asc)",
    sortDimsDesc: "By dimensions (desc)",
    sortDimsAsc: "By dimensions (asc)",
    sortPlacedDesc: "By placed count (desc)",
    pickNotFit: "Not suitable for %d cargo units",
    pickNotFitCount: "units",
    pickNotFitList: "⚠ Does not fit",
  },
};

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");
  return (
    <I18nContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
