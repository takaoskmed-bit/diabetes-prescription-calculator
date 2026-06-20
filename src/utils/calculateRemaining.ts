import type { QuantityResult } from "@/lib/types";

export type QuantityResultWithRequired = QuantityResult & {
  requiredQuantity: number;
  remainingItems: number;
};

export function calculatePackagedQuantityWithRemaining({
  id,
  label,
  totalItems,
  remainingItems,
  packageSize,
  itemUnitLabel,
  packageUnitLabel,
  baseDetail,
}: {
  id: string;
  label: string;
  totalItems: number;
  remainingItems: number;
  packageSize: number;
  itemUnitLabel: string;
  packageUnitLabel: string;
  baseDetail: string;
}): QuantityResultWithRequired {
  const safeRemainingItems = Math.max(0, remainingItems);
  const requiredQuantity = totalItems <= 0 ? 0 : Math.ceil(totalItems / packageSize);
  const shortageItems = Math.max(0, totalItems - safeRemainingItems);
  const quantity = shortageItems <= 0 ? 0 : Math.ceil(shortageItems / packageSize);

  return {
    id,
    label,
    detail: `${baseDetail}、必要${totalItems}${itemUnitLabel} - 残数${safeRemainingItems}${itemUnitLabel} = 不足${shortageItems}${itemUnitLabel} / ${packageSize}${itemUnitLabel}`,
    quantity,
    requiredQuantity,
    remainingItems: safeRemainingItems,
    unit: packageUnitLabel,
  };
}

export function calculateUnitQuantityWithRemaining({
  id,
  label,
  requiredItems,
  remainingItems,
  itemUnitLabel,
  baseDetail,
}: {
  id: string;
  label: string;
  requiredItems: number;
  remainingItems: number;
  itemUnitLabel: string;
  baseDetail: string;
}): QuantityResultWithRequired {
  const safeRemainingItems = Math.max(0, remainingItems);
  const quantity = Math.max(0, requiredItems - safeRemainingItems);

  return {
    id,
    label,
    detail: `${baseDetail}、必要${requiredItems}${itemUnitLabel} - 残数${safeRemainingItems}${itemUnitLabel} = 処方${quantity}${itemUnitLabel}`,
    quantity,
    requiredQuantity: requiredItems,
    remainingItems: safeRemainingItems,
    unit: itemUnitLabel,
  };
}
