import type { V2DrugMaster } from "@/lib/v2Master";
import type { QuantityResult, ValidationError } from "@/lib/types";

export type V2PrescriptionRowInput = {
  id: string;
  drugId: string;
  doses: [number, number, number];
};

export type V2PrescriptionRowResult = QuantityResult & {
  rowId: string;
};

export function getV2InjectionsPerInterval(
  master: V2DrugMaster,
  row: V2PrescriptionRowInput,
) {
  if (master.doseInputMode === "none") {
    return row.drugId ? 1 : 0;
  }

  return row.doses.filter((dose) => dose > 0).length;
}

export const validateV2NonNegative = (
  rows: V2PrescriptionRowInput[],
  prescriptionDays: number,
  extraValues: Record<string, number> = {},
): ValidationError[] => {
  const values = {
    prescriptionDays,
    ...extraValues,
    ...Object.fromEntries(
      rows.flatMap((row) =>
        row.doses.map((dose, index) => [`${row.id}.dose${index + 1}`, dose]),
      ),
    ),
  };

  return Object.entries(values)
    .filter(([, value]) => value < 0)
    .map(([field]) => ({
      field,
      message: "0以上の値を入力してください。",
    }));
};

export function calculateV2DrugRowQuantity(
  master: V2DrugMaster,
  row: V2PrescriptionRowInput,
  prescriptionDays: number,
): V2PrescriptionRowResult {
  const activeDoses = row.doses.filter((dose) => dose > 0);
  const doseTotal = activeDoses.reduce((sum, dose) => sum + dose, 0);
  const injectionsPerInterval = getV2InjectionsPerInterval(master, row);
  const prescriptionWeeks = Math.ceil(prescriptionDays / 7);
  const intervalCount =
    master.dosingInterval === "weekly" ? prescriptionWeeks : prescriptionDays;
  const intervalLabel = master.dosingInterval === "weekly" ? "週" : "日";
  const doseLabel = `${doseTotal}${master.doseUnit}`;
  const primingPerInterval =
    master.primingUnitsPerInjection * injectionsPerInterval;
  const totalAmount =
    master.quantityBasis === "doseCount"
      ? injectionsPerInterval * intervalCount
      : (doseTotal + primingPerInterval) * intervalCount;
  const amountPerItem =
    master.quantityBasis === "doseCount" ? 1 : master.amountPerItem;
  const quantity =
    totalAmount <= 0 ? 0 : Math.ceil(totalAmount / amountPerItem);

  const primingDetail =
    primingPerInterval > 0
      ? ` + 空打ち${master.primingUnitsPerInjection}${master.doseUnit} x ${injectionsPerInterval}回/${intervalLabel}`
      : "";
  const detail =
    master.quantityBasis === "doseCount"
      ? `${prescriptionDays}日 / 7日 = ${intervalCount}回分`
      : `(${doseLabel}/${intervalLabel}${primingDetail}) x ${intervalCount}${intervalLabel} = ${totalAmount}${master.amountUnitLabel} / ${master.amountPerItem}${master.amountUnitLabel}`;

  return {
    id: `${row.id}-${master.id}`,
    rowId: row.id,
    label: master.name,
    detail,
    quantity,
    unit: master.itemUnitLabel,
  };
}

export function calculateV2DrugRows(
  masters: V2DrugMaster[],
  rows: V2PrescriptionRowInput[],
  prescriptionDays: number,
): V2PrescriptionRowResult[] {
  return rows
    .map((row) => {
      const master = masters.find((drug) => drug.id === row.drugId);

      if (!master) {
        return null;
      }

      return calculateV2DrugRowQuantity(master, row, prescriptionDays);
    })
    .filter((result): result is V2PrescriptionRowResult =>
      Boolean(result && result.quantity > 0),
    );
}
