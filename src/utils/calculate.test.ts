import { describe, expect, it } from "vitest";
import { CGM_MASTERS, DAILY_DRUG_MASTERS, SUPPLY_MASTERS } from "@/lib/master";
import {
  calculateCgmQuantity,
  calculateDailyDrugQuantity,
  calculateGlucoseStripQuantity,
  calculateNeedleQuantityFromInjectionPlan,
  validateNonNegative,
} from "./calculate";

describe("calculateDailyDrugQuantity", () => {
  it("超速効型は朝昼晩3回分の空打ちを加えて計算する", () => {
    const master = DAILY_DRUG_MASTERS.find((drug) => drug.id === "rapidInsulin");

    expect(master).toBeDefined();
    expect(calculateDailyDrugQuantity(master!, 30, 30, 3).quantity).toBe(4);
  });

  it("ランタスXRは空打ち3単位/回を加えて計算する", () => {
    const master = DAILY_DRUG_MASTERS.find((drug) => drug.id === "lantusXr");

    expect(master).toBeDefined();
    expect(calculateDailyDrugQuantity(master!, 12, 30, 1).quantity).toBe(1);
    expect(calculateDailyDrugQuantity(master!, 13, 30, 1).quantity).toBe(2);
  });
});

describe("calculateCgmQuantity", () => {
  it("リブレ30日なら3個になる", () => {
    const master = CGM_MASTERS.find((cgm) => cgm.id === "libre");

    expect(master).toBeDefined();
    expect(calculateCgmQuantity(master!, 30)?.quantity).toBe(3);
  });

  it("G7 30日なら3個になる", () => {
    const master = CGM_MASTERS.find((cgm) => cgm.id === "dexcomG7");

    expect(master).toBeDefined();
    expect(calculateCgmQuantity(master!, 30)?.quantity).toBe(3);
  });
});

describe("calculateNeedleQuantityFromInjectionPlan", () => {
  it("毎日注射と週1回注射を合算して注射針を計算する", () => {
    expect(
      calculateNeedleQuantityFromInjectionPlan(
        SUPPLY_MASTERS.needles,
        3,
        30,
        1,
        5,
      ).quantity,
    ).toBe(2);
  });
});

describe("calculateGlucoseStripQuantity", () => {
  it("血糖測定チップを30枚/箱で箱数計算する", () => {
    expect(
      calculateGlucoseStripQuantity(SUPPLY_MASTERS.glucoseStrips, 2, 30)
        .quantity,
    ).toBe(2);
  });
});

describe("validateNonNegative", () => {
  it("0未満の入力をエラーとして返す", () => {
    expect(validateNonNegative({ dose: -1, days: 30 })).toEqual([
      { field: "dose", message: "0以上の値を入力してください。" },
    ]);
  });
});
