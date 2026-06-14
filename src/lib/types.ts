export type DailyDrugId = "rapidInsulin" | "basalInsulin" | "lantusXr";

export type WeeklyDrugId = "awiqli" | "ozempic";

export type CgmId = "none" | "libre" | "dexcomG7";

export type UnitKind = "unit" | "mg";

export type DailyDrugMaster = {
  id: DailyDrugId;
  name: string;
  unitLabel: string;
  amountPerItem: number;
  primingUnitsPerInjection: number;
  itemUnitLabel: string;
};

export type WeeklyDrugMaster = {
  id: WeeklyDrugId;
  name: string;
  weeklyInputLabel: string;
  amountPerItem: number;
  itemUnitLabel: string;
  unitKind: UnitKind;
};

export type CgmMaster = {
  id: CgmId;
  name: string;
  daysPerSensor: number | null;
};

export type SupplyMaster = {
  id: "needles" | "glucoseStrips";
  name: string;
  packageSize: number;
  packageUnitLabel: string;
  itemUnitLabel: string;
};

export type QuantityResult = {
  id: string;
  label: string;
  detail: string;
  quantity: number;
  unit: string;
};

export type ValidationError = {
  field: string;
  message: string;
};

export type DailyDrugInput = {
  dailyAmount: number;
};

export type RapidInsulinInput = {
  breakfastAmount: number;
  lunchAmount: number;
  dinnerAmount: number;
};

export type WeeklyDrugInput = {
  weeklyAmount: number;
};
