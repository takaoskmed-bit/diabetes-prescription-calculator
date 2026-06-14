import type {
  CgmMaster,
  DailyDrugMaster,
  QuantityResult,
  SupplyMaster,
  ValidationError,
  WeeklyDrugMaster,
} from "@/lib/types";

export const roundUp = (value: number) => Math.ceil(value);

export const validateNonNegative = (
  values: Record<string, number>,
): ValidationError[] =>
  Object.entries(values)
    .filter(([, value]) => value < 0)
    .map(([field]) => ({
      field,
      message: "0以上の値を入力してください。",
    }));

export function calculateDailyDrugQuantity(
  master: DailyDrugMaster,
  dailyAmount: number,
  prescriptionDays: number,
  injectionsPerDayForDrug = dailyAmount > 0 ? 1 : 0,
): QuantityResult {
  const primingUnitsPerDay = master.primingUnitsPerInjection * injectionsPerDayForDrug;
  const dailyAmountWithPriming = dailyAmount + primingUnitsPerDay;
  const totalAmount = dailyAmountWithPriming * prescriptionDays;
  const quantity = totalAmount <= 0 ? 0 : roundUp(totalAmount / master.amountPerItem);

  return {
    id: master.id,
    label: master.name,
    detail: `(${dailyAmount}${master.unitLabel} + 空打ち${master.primingUnitsPerInjection}単位 x ${injectionsPerDayForDrug}回/日) x ${prescriptionDays}日 = ${totalAmount}単位 / ${master.amountPerItem}単位`,
    quantity,
    unit: master.itemUnitLabel,
  };
}

export function calculateWeeklyDrugQuantity(
  master: WeeklyDrugMaster,
  weeklyAmount: number,
  prescriptionWeeks: number,
): QuantityResult {
  const totalAmount = weeklyAmount * prescriptionWeeks;
  const quantity = totalAmount <= 0 ? 0 : roundUp(totalAmount / master.amountPerItem);

  return {
    id: master.id,
    label: master.name,
    detail: `${weeklyAmount}${master.weeklyInputLabel} x ${prescriptionWeeks}週 = ${totalAmount}${master.unitKind === "mg" ? "mg" : "単位"} / ${master.amountPerItem}${master.unitKind === "mg" ? "mg" : "単位"}`,
    quantity,
    unit: master.itemUnitLabel,
  };
}

export function calculateNeedleQuantityFromInjectionPlan(
  master: SupplyMaster,
  dailyInjectionsPerDay: number,
  prescriptionDays: number,
  weeklyInjectionsPerWeek: number,
  prescriptionWeeks: number,
): QuantityResult {
  const dailyNeedles = dailyInjectionsPerDay * prescriptionDays;
  const weeklyNeedles = weeklyInjectionsPerWeek * prescriptionWeeks;
  const total = dailyNeedles + weeklyNeedles;

  return {
    id: master.id,
    label: master.name,
    detail: `${dailyInjectionsPerDay}回/日 x ${prescriptionDays}日 + ${weeklyInjectionsPerWeek}回/週 x ${prescriptionWeeks}週 = ${total}${master.itemUnitLabel} / ${master.packageSize}${master.itemUnitLabel}`,
    quantity: total <= 0 ? 0 : roundUp(total / master.packageSize),
    unit: master.packageUnitLabel,
  };
}

export function calculateGlucoseStripQuantity(
  master: SupplyMaster,
  measurementsPerDay: number,
  prescriptionDays: number,
): QuantityResult {
  const total = measurementsPerDay * prescriptionDays;

  return {
    id: master.id,
    label: master.name,
    detail: `${measurementsPerDay}回/日 x ${prescriptionDays}日 = ${total}${master.itemUnitLabel} / ${master.packageSize}${master.itemUnitLabel}`,
    quantity: total <= 0 ? 0 : roundUp(total / master.packageSize),
    unit: master.packageUnitLabel,
  };
}

export function calculateCgmQuantity(
  master: CgmMaster,
  prescriptionDays: number,
): QuantityResult | null {
  if (master.daysPerSensor === null) {
    return null;
  }

  return {
    id: master.id,
    label: master.name,
    detail: `${prescriptionDays}日 / ${master.daysPerSensor}日ごと`,
    quantity: prescriptionDays <= 0 ? 0 : roundUp(prescriptionDays / master.daysPerSensor),
    unit: "個",
  };
}
