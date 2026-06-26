import { describe, expect, it } from "vitest";
import {
  CGM_MASTERS,
  DAILY_DRUG_MASTERS,
  SUPPLY_MASTERS,
  WEEKLY_DRUG_MASTERS,
} from "@/lib/master";
import {
  calculateCgmQuantity,
  calculateDailyDrugQuantity,
  calculateGlucoseStripQuantity,
  calculateNeedleQuantityFromInjectionPlan,
  calculateWeeklyDrugQuantity,
  validateNonNegative,
} from "./calculate";
import { V2_DRUG_MASTERS } from "@/lib/v2Master";
import {
  calculateV2DrugRowQuantity,
  getV2NeedleCountPerInterval,
  shouldUseSmallNeedlePackage,
} from "./calculateV2";
import { calculateV3DrugRowQuantity, calculateV3DrugRows } from "./calculateV3";
import { calculateDaysUntilDate } from "./date";
import {
  calculatePackagedQuantityWithRemaining,
  calculateUnitQuantityWithRemaining,
} from "./calculateRemaining";

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

describe("calculateDaysUntilDate", () => {
  it("次回日付までの日数を計算する", () => {
    expect(calculateDaysUntilDate("2026-06-20", "2026-07-20")).toBe("30");
  });

  it("過去日付は0日として扱う", () => {
    expect(calculateDaysUntilDate("2026-06-20", "2026-06-19")).toBe("0");
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

describe("calculateWeeklyDrugQuantity", () => {
  it("オゼンピックは小数の週投与量で計算する", () => {
    const master = WEEKLY_DRUG_MASTERS.find((drug) => drug.id === "ozempic");

    expect(master).toBeDefined();
    expect(calculateWeeklyDrugQuantity(master!, 0.25, 4).quantity).toBe(1);
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

describe("calculate remaining supplies", () => {
  it("残数を差し引いて箱数を計算する", () => {
    expect(
      calculatePackagedQuantityWithRemaining({
        id: "needles",
        label: "注射針",
        totalItems: 100,
        remainingItems: 40,
        packageSize: 70,
        itemUnitLabel: "本",
        packageUnitLabel: "箱",
        baseDetail: "100本必要",
      }).quantity,
    ).toBe(1);
  });

  it("箱で入力された残数を本数換算して箱数計算する", () => {
    const remainingBoxes = 1;
    const packageSize = 70;

    expect(
      calculatePackagedQuantityWithRemaining({
        id: "needles",
        label: "注射針",
        totalItems: 100,
        remainingItems: remainingBoxes * packageSize,
        packageSize,
        itemUnitLabel: "本",
        packageUnitLabel: "箱",
        remainingDetail: `${remainingBoxes}箱（${remainingBoxes * packageSize}本）`,
        baseDetail: "100本必要",
      }).quantity,
    ).toBe(1);
  });

  it("残数が十分なら0箱を返す", () => {
    const result = calculatePackagedQuantityWithRemaining({
      id: "measurementSensors",
      label: "測定センサー",
      totalItems: 30,
      remainingItems: 30,
      packageSize: 30,
      itemUnitLabel: "枚",
      packageUnitLabel: "箱",
      baseDetail: "30枚必要",
    });

    expect(result.quantity).toBe(0);
    expect(result.requiredQuantity).toBe(1);
  });

  it("リブレやG7の個数から残数を差し引く", () => {
    expect(
      calculateUnitQuantityWithRemaining({
        id: "libre",
        label: "リブレ",
        requiredItems: 3,
        remainingItems: 1,
        itemUnitLabel: "個",
        baseDetail: "30日 / 14日ごと",
      }).quantity,
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

describe("calculateV2DrugRowQuantity", () => {
  it("ver.2のインスリン行は3枠の投与量と空打ちを合算する", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "novorapid");

    expect(master).toBeDefined();
    expect(
      calculateV2DrugRowQuantity(
        master!,
        { id: "row-1", drugId: "novorapid", doses: [10, 10, 10] },
        30,
      ).quantity,
    ).toBe(4);
  });

  it("ver.2の使い切りGLP-1RAは投与回数で本数計算する", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "trulicity");

    expect(master).toBeDefined();
    expect(
      calculateV2DrugRowQuantity(
        master!,
        { id: "row-1", drugId: "trulicity", doses: [0.75, 0, 0] },
        28,
      ).quantity,
    ).toBe(4);
  });

  it("アウィクリは空打ち10単位で計算する", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "awiqli-700");
    const result = calculateV2DrugRowQuantity(
      master!,
      { id: "row-1", drugId: "awiqli-700", doses: [140, 0, 0] },
      28,
    );

    expect(master).toBeDefined();
    expect(result.detail).toContain("空打ち10単位");
    expect(result.quantity).toBe(1);
  });

  it("アウィクリ300単位規格を選択できる", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "awiqli-300");

    expect(master).toBeDefined();
    expect(
      calculateV2DrugRowQuantity(
        master!,
        { id: "row-1", drugId: "awiqli-300", doses: [140, 0, 0] },
        28,
      ).quantity,
    ).toBe(2);
  });

  it("ビクトーザは空打ち0.12mgで計算する", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "victoza");
    const result = calculateV2DrugRowQuantity(
      master!,
      { id: "row-1", drugId: "victoza", doses: [0.6, 0, 0] },
      30,
    );

    expect(master).toBeDefined();
    expect(result.detail).toContain("空打ち0.12mg");
    expect(result.quantity).toBe(2);
  });

  it("マンジャロは投与量なしで処方日数/7を切り上げる", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "mounjaro");

    expect(master).toBeDefined();
    expect(
      calculateV2DrugRowQuantity(
        master!,
        { id: "row-1", drugId: "mounjaro", doses: [0, 0, 0] },
        30,
      ).quantity,
    ).toBe(5);
  });
});

describe("getV2NeedleCountPerInterval", () => {
  it("トルリシティとマンジャロは注射針にカウントしない", () => {
    const trulicity = V2_DRUG_MASTERS.find((drug) => drug.id === "trulicity");
    const mounjaro = V2_DRUG_MASTERS.find((drug) => drug.id === "mounjaro");

    expect(trulicity).toBeDefined();
    expect(mounjaro).toBeDefined();
    expect(
      getV2NeedleCountPerInterval(trulicity!, {
        id: "row-1",
        drugId: "trulicity",
        doses: [0, 0, 0],
      }),
    ).toBe(0);
    expect(
      getV2NeedleCountPerInterval(mounjaro!, {
        id: "row-2",
        drugId: "mounjaro",
        doses: [0, 0, 0],
      }),
    ).toBe(0);
  });
});

describe("shouldUseSmallNeedlePackage", () => {
  it("オゼンピックだけなら14本/袋に切り替える", () => {
    expect(
      shouldUseSmallNeedlePackage([
        { id: "row-1", drugId: "ozempic", doses: [0.25, 0, 0] },
      ]),
    ).toBe(true);
  });

  it("アウィクリだけなら14本/袋に切り替える", () => {
    expect(
      shouldUseSmallNeedlePackage([
        { id: "row-1", drugId: "awiqli-300", doses: [140, 0, 0] },
      ]),
    ).toBe(true);
  });

  it("オゼンピックとアウィクリだけなら14本/袋に切り替える", () => {
    expect(
      shouldUseSmallNeedlePackage([
        { id: "row-1", drugId: "ozempic", doses: [0.25, 0, 0] },
        { id: "row-2", drugId: "awiqli-700", doses: [140, 0, 0] },
      ]),
    ).toBe(true);
  });

  it("他の薬剤が含まれる場合は70本/箱のままにする", () => {
    expect(
      shouldUseSmallNeedlePackage([
        { id: "row-1", drugId: "ozempic", doses: [0.25, 0, 0] },
        { id: "row-2", drugId: "novorapid", doses: [10, 0, 0] },
      ]),
    ).toBe(false);
  });

  it("薬剤未選択では70本/箱のままにする", () => {
    expect(
      shouldUseSmallNeedlePackage([
        { id: "row-1", drugId: "", doses: [0, 0, 0] },
      ]),
    ).toBe(false);
  });
});

describe("calculateV3DrugRowQuantity", () => {
  it("必要本数から残薬本数を差し引く", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "novorapid");

    expect(master).toBeDefined();
    expect(
      calculateV3DrugRowQuantity(
        master!,
        {
          id: "row-1",
          drugId: "novorapid",
          doses: [10, 10, 10],
          remainingItems: 1,
        },
        30,
      ).quantity,
    ).toBe(3);
  });

  it("残薬が必要本数以上なら処方本数を0にする", () => {
    const master = V2_DRUG_MASTERS.find((drug) => drug.id === "novorapid");

    expect(master).toBeDefined();
    expect(
      calculateV3DrugRowQuantity(
        master!,
        {
          id: "row-1",
          drugId: "novorapid",
          doses: [10, 0, 0],
          remainingItems: 5,
        },
        30,
      ).quantity,
    ).toBe(0);
  });

  it("残薬で処方不要になった薬剤も結果に残す", () => {
    const results = calculateV3DrugRows(
      V2_DRUG_MASTERS,
      [
        {
          id: "row-1",
          drugId: "novorapid",
          doses: [10, 0, 0],
          remainingItems: 5,
        },
      ],
      30,
    );

    expect(results).toHaveLength(1);
    expect(results[0].quantity).toBe(0);
    expect(results[0].requiredQuantity).toBeGreaterThan(0);
  });
});
