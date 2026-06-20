import type { V2DrugMaster } from "@/lib/v2Master";
import type { V2PrescriptionRowInput } from "./calculateV2";
import { calculateV2DrugRowQuantity } from "./calculateV2";

export type V3PrescriptionRowInput = V2PrescriptionRowInput & {
  remainingItems: number;
};

export function calculateV3DrugRowQuantity(
  master: V2DrugMaster,
  row: V3PrescriptionRowInput,
  prescriptionDays: number,
) {
  const baseResult = calculateV2DrugRowQuantity(
    master,
    row,
    prescriptionDays,
  );
  const remainingItems = Math.max(0, row.remainingItems);
  const prescriptionQuantity = Math.max(0, baseResult.quantity - remainingItems);

  return {
    ...baseResult,
    quantity: prescriptionQuantity,
    detail: `${baseResult.detail}、必要${baseResult.quantity}${baseResult.unit} - 残薬${remainingItems}${baseResult.unit} = 処方${prescriptionQuantity}${baseResult.unit}`,
  };
}

export function calculateV3DrugRows(
  masters: V2DrugMaster[],
  rows: V3PrescriptionRowInput[],
  prescriptionDays: number,
) {
  return rows
    .map((row) => {
      const master = masters.find((drug) => drug.id === row.drugId);

      if (!master) {
        return null;
      }

      return calculateV3DrugRowQuantity(master, row, prescriptionDays);
    })
    .filter((result): result is ReturnType<typeof calculateV3DrugRowQuantity> =>
      Boolean(result && result.quantity > 0),
    );
}
