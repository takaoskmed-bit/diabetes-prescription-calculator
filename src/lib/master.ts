import type {
  CgmMaster,
  DailyDrugMaster,
  SupplyMaster,
  WeeklyDrugMaster,
} from "./types";

export const DAILY_DRUG_MASTERS: DailyDrugMaster[] = [
  {
    id: "rapidInsulin",
    name: "超速効型インスリン",
    unitLabel: "単位/日",
    amountPerItem: 300,
    primingUnitsPerInjection: 2,
    itemUnitLabel: "本",
  },
  {
    id: "basalInsulin",
    name: "持効型インスリン",
    unitLabel: "単位/日",
    amountPerItem: 300,
    primingUnitsPerInjection: 2,
    itemUnitLabel: "本",
  },
  {
    id: "lantusXr",
    name: "ランタスXR",
    unitLabel: "単位/日",
    amountPerItem: 450,
    primingUnitsPerInjection: 3,
    itemUnitLabel: "本",
  },
];

export const WEEKLY_DRUG_MASTERS: WeeklyDrugMaster[] = [
  {
    id: "awiqli",
    name: "アウィクリ",
    weeklyInputLabel: "単位/週",
    amountPerItem: 700,
    itemUnitLabel: "本",
    unitKind: "unit",
  },
  {
    id: "ozempic",
    name: "オゼンピック",
    weeklyInputLabel: "mg/週",
    amountPerItem: 2,
    itemUnitLabel: "本",
    unitKind: "mg",
  },
];

export const CGM_MASTERS: CgmMaster[] = [
  {
    id: "none",
    name: "なし",
    daysPerSensor: null,
  },
  {
    id: "libre",
    name: "リブレ",
    daysPerSensor: 14,
  },
  {
    id: "dexcomG7",
    name: "Dexcom G7",
    daysPerSensor: 10,
  },
];

export const SUPPLY_MASTERS: Record<SupplyMaster["id"], SupplyMaster> = {
  needles: {
    id: "needles",
    name: "注射針",
    packageSize: 70,
    packageUnitLabel: "箱",
    itemUnitLabel: "本",
  },
  glucoseStrips: {
    id: "glucoseStrips",
    name: "血糖測定チップ",
    packageSize: 30,
    packageUnitLabel: "箱",
    itemUnitLabel: "枚",
  },
};
