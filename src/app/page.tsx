"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CGM_MASTERS,
  DAILY_DRUG_MASTERS,
  SUPPLY_MASTERS,
  WEEKLY_DRUG_MASTERS,
} from "@/lib/master";
import type {
  CgmId,
  DailyDrugId,
  DailyDrugInput,
  QuantityResult,
  RapidInsulinInput,
  WeeklyDrugId,
  WeeklyDrugInput,
} from "@/lib/types";
import {
  calculateCgmQuantity,
  calculateDailyDrugQuantity,
  calculateGlucoseStripQuantity,
  calculateNeedleQuantityFromInjectionPlan,
  calculateWeeklyDrugQuantity,
  validateNonNegative,
} from "@/utils/calculate";

const initialDailyDrugInputs = DAILY_DRUG_MASTERS.reduce(
  (acc, drug) => ({
    ...acc,
    [drug.id]: { dailyAmount: 0 },
  }),
  {} as Record<DailyDrugId, DailyDrugInput>,
);

const initialRapidInsulinInput: RapidInsulinInput = {
  breakfastAmount: 0,
  lunchAmount: 0,
  dinnerAmount: 0,
};

const initialWeeklyDrugInputs = WEEKLY_DRUG_MASTERS.reduce(
  (acc, drug) => ({
    ...acc,
    [drug.id]: { weeklyAmount: 0 },
  }),
  {} as Record<WeeklyDrugId, WeeklyDrugInput>,
);

const numberValue = (value: string, allowDecimal = false) => {
  const normalizedValue = sanitizeNumericText(value, allowDecimal);

  if (
    normalizedValue === "" ||
    normalizedValue === "-" ||
    normalizedValue === "." ||
    normalizedValue === "-."
  ) {
    return 0;
  }

  return Number(normalizedValue);
};

const normalizeNumericText = (value: string) => {
  return value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/．/g, ".")
    .replace(/－/g, "-");
};

const sanitizeNumericText = (value: string, allowDecimal = false) => {
  const normalizedValue = normalizeNumericText(value);
  let nextValue = "";
  let hasDecimal = false;

  for (const char of normalizedValue) {
    if (/[0-9]/.test(char)) {
      nextValue += char;
      continue;
    }

    if (char === "-" && nextValue === "") {
      nextValue += char;
      continue;
    }

    if (allowDecimal && char === "." && !hasDecimal) {
      nextValue += char;
      hasDecimal = true;
    }
  }

  return nextValue;
};

let lastFocusedNumberInput: HTMLInputElement | null = null;

export default function Home() {
  const [prescriptionDays, setPrescriptionDays] = useState(0);
  const [measurementsPerDay, setMeasurementsPerDay] = useState(0);
  const [cgmId, setCgmId] = useState<CgmId>("none");
  const [dailyDrugInputs, setDailyDrugInputs] = useState(initialDailyDrugInputs);
  const [rapidInsulinInput, setRapidInsulinInput] = useState(
    initialRapidInsulinInput,
  );
  const [weeklyDrugInputs, setWeeklyDrugInputs] = useState(initialWeeklyDrugInputs);
  const [copied, setCopied] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  const selectedCgm = CGM_MASTERS.find((cgm) => cgm.id === cgmId) ?? CGM_MASTERS[0];
  const prescriptionWeeks = Math.ceil(prescriptionDays / 7);
  const rapidDailyAmount =
    rapidInsulinInput.breakfastAmount +
    rapidInsulinInput.lunchAmount +
    rapidInsulinInput.dinnerAmount;
  const rapidInjectionsPerDay = [
    rapidInsulinInput.breakfastAmount,
    rapidInsulinInput.lunchAmount,
    rapidInsulinInput.dinnerAmount,
  ].filter((amount) => amount > 0).length;
  const dailyInjectionsPerDay =
    rapidInjectionsPerDay +
    DAILY_DRUG_MASTERS.filter(
      (drug) =>
        drug.id !== "rapidInsulin" &&
        dailyDrugInputs[drug.id].dailyAmount > 0,
    ).length;
  const weeklyInjectionsPerWeek = WEEKLY_DRUG_MASTERS.filter(
    (drug) =>
      weeklyDrugInputs[drug.id].weeklyAmount > 0,
  ).length;

  const validationErrors = useMemo(() => {
    const doseValues = {
      prescriptionDays,
      measurementsPerDay,
      "rapidInsulin.breakfastAmount": rapidInsulinInput.breakfastAmount,
      "rapidInsulin.lunchAmount": rapidInsulinInput.lunchAmount,
      "rapidInsulin.dinnerAmount": rapidInsulinInput.dinnerAmount,
      ...Object.fromEntries(
        Object.entries(dailyDrugInputs).map(([id, input]) => [
          `${id}.dailyAmount`,
          input.dailyAmount,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(weeklyDrugInputs).map(([id, input]) => [
          `${id}.weeklyAmount`,
          input.weeklyAmount,
        ]),
      ),
    };

    return validateNonNegative(doseValues);
  }, [
    dailyDrugInputs,
    measurementsPerDay,
    prescriptionDays,
    rapidInsulinInput,
    weeklyDrugInputs,
  ]);

  const results = useMemo<QuantityResult[]>(() => {
    if (validationErrors.length > 0) {
      return [];
    }

    const rapidInsulinMaster = DAILY_DRUG_MASTERS.find(
      (drug) => drug.id === "rapidInsulin",
    );
    const rapidResult =
      rapidDailyAmount > 0 && rapidInsulinMaster
        ? [
            calculateDailyDrugQuantity(
              rapidInsulinMaster,
              rapidDailyAmount,
              prescriptionDays,
              rapidInjectionsPerDay,
            ),
          ]
        : [];

    const dailyResults = DAILY_DRUG_MASTERS.filter(
      (drug) =>
        drug.id !== "rapidInsulin" && dailyDrugInputs[drug.id].dailyAmount > 0,
    ).map((drug) =>
      calculateDailyDrugQuantity(
        drug,
        dailyDrugInputs[drug.id].dailyAmount,
        prescriptionDays,
        dailyDrugInputs[drug.id].dailyAmount > 0 ? 1 : 0,
      ),
    );

    const weeklyResults = WEEKLY_DRUG_MASTERS.filter(
      (drug) => weeklyDrugInputs[drug.id].weeklyAmount > 0,
    ).map((drug) =>
      calculateWeeklyDrugQuantity(
        drug,
        weeklyDrugInputs[drug.id].weeklyAmount,
        prescriptionWeeks,
      ),
    );

    const cgmResult = calculateCgmQuantity(selectedCgm, prescriptionDays);

    return [
      ...rapidResult,
      ...dailyResults,
      ...weeklyResults,
      calculateNeedleQuantityFromInjectionPlan(
        SUPPLY_MASTERS.needles,
        dailyInjectionsPerDay,
        prescriptionDays,
        weeklyInjectionsPerWeek,
        prescriptionWeeks,
      ),
      calculateGlucoseStripQuantity(
        SUPPLY_MASTERS.glucoseStrips,
        measurementsPerDay,
        prescriptionDays,
      ),
      ...(cgmResult ? [cgmResult] : []),
    ].filter((result) => result.quantity > 0);
  }, [
    dailyDrugInputs,
    dailyInjectionsPerDay,
    measurementsPerDay,
    prescriptionDays,
    prescriptionWeeks,
    rapidDailyAmount,
    rapidInjectionsPerDay,
    selectedCgm,
    validationErrors.length,
    weeklyInjectionsPerWeek,
    weeklyDrugInputs,
  ]);

  const copyText = [
    "処方量計算結果",
    ...results.map(
      (result) =>
        `${result.label}: ${result.quantity}${result.unit}（${result.detail}）`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const copyResults = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const resetInputs = () => {
    setPrescriptionDays(0);
    setMeasurementsPerDay(0);
    setCgmId("none");
    setDailyDrugInputs(initialDailyDrugInputs);
    setRapidInsulinInput(initialRapidInsulinInput);
    setWeeklyDrugInputs(initialWeeklyDrugInputs);
    setCopied(false);
    setResetVersion((current) => current + 1);
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">糖尿病診療向け</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
              インスリン・注射薬・血糖測定用品・CGM処方量計算
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            印刷
          </button>
          <button
            type="button"
            onClick={resetInputs}
            className="no-print rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            リセット
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="flex flex-col gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-card">
              <h2 className="text-lg font-bold text-slate-950">基本条件</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="処方日数"
                  value={prescriptionDays}
                  unit="日"
                  onChange={setPrescriptionDays}
                  resetVersion={resetVersion}
                />
                <NumberField
                  label="血糖測定回数"
                  value={measurementsPerDay}
                  unit="回/日"
                  onChange={setMeasurementsPerDay}
                  resetVersion={resetVersion}
                />
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">注射回数</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {dailyInjectionsPerDay}回/日 + {weeklyInjectionsPerWeek}回/週
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-card">
              <h2 className="text-lg font-bold text-slate-950">薬剤</h2>
              <div className="mt-4 grid gap-3">
                {DAILY_DRUG_MASTERS.filter((drug) => drug.id === "rapidInsulin").map((drug) => (
                  <RapidInsulinRow
                    key={drug.id}
                    label={drug.name}
                    subLabel={`1${drug.itemUnitLabel}あたり ${drug.amountPerItem}単位 / 空打ち ${drug.primingUnitsPerInjection}単位/回`}
                    values={rapidInsulinInput}
                    onValueChange={(field, value) =>
                      setRapidInsulinInput((current) => ({
                        ...current,
                        [field]: value,
                      }))
                    }
                    resetVersion={resetVersion}
                  />
                ))}
                {DAILY_DRUG_MASTERS.filter((drug) => drug.id !== "rapidInsulin").map((drug) => (
                  <DrugRow
                    key={drug.id}
                    label={drug.name}
                    subLabel={`1${drug.itemUnitLabel}あたり ${drug.amountPerItem}単位 / 空打ち ${drug.primingUnitsPerInjection}単位/回`}
                    inputLabel="1日単位数"
                    unit={drug.unitLabel}
                    value={dailyDrugInputs[drug.id].dailyAmount}
                    onValueChange={(dailyAmount) =>
                      setDailyDrugInputs((current) => ({
                        ...current,
                        [drug.id]: { ...current[drug.id], dailyAmount },
                      }))
                    }
                    resetVersion={resetVersion}
                  />
                ))}
                {WEEKLY_DRUG_MASTERS.map((drug) => (
                  <DrugRow
                    key={drug.id}
                    label={drug.name}
                    subLabel={`1${drug.itemUnitLabel}あたり ${drug.amountPerItem}${drug.unitKind === "mg" ? "mg" : "単位"}`}
                    inputLabel="週投与量"
                    unit={drug.weeklyInputLabel}
                    value={weeklyDrugInputs[drug.id].weeklyAmount}
                    onValueChange={(weeklyAmount) =>
                      setWeeklyDrugInputs((current) => ({
                        ...current,
                        [drug.id]: { ...current[drug.id], weeklyAmount },
                      }))
                    }
                    allowDecimal={drug.id === "ozempic"}
                    resetVersion={resetVersion}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-card">
              <h2 className="text-lg font-bold text-slate-950">CGM</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {CGM_MASTERS.map((cgm) => (
                  <label
                    key={cgm.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 ${
                      cgmId === cgm.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span>
                      <span className="block font-semibold">{cgm.name}</span>
                      <span className="text-sm text-slate-500">
                        {cgm.daysPerSensor ? `${cgm.daysPerSensor}日ごと` : "使用なし"}
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="cgm"
                      value={cgm.id}
                      checked={cgmId === cgm.id}
                      onChange={() => setCgmId(cgm.id)}
                      className="h-4 w-4 accent-teal-700"
                    />
                  </label>
                ))}
              </div>
            </section>

          </div>

          <aside className="flex flex-col gap-5">
            {validationErrors.length > 0 && (
              <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 print-card">
                <h2 className="font-bold">入力エラー</h2>
                <ul className="mt-2 list-inside list-disc text-sm">
                  {validationErrors.map((error) => (
                    <li key={error.field}>{error.message}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-950">計算結果</h2>
                <button
                  type="button"
                  onClick={copyResults}
                  disabled={results.length === 0}
                  className="no-print rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {copied ? "コピー済み" : "結果をコピー"}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {results.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    使用する薬剤や測定条件を入力すると結果が表示されます。
                  </div>
                ) : (
                  results.map((result) => (
                    <ResultCard key={result.id} result={result} />
                  ))
                )}
              </div>
            </section>
          </aside>
        </section>

        <footer className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 print-card">
          本アプリは処方量の確認を補助するツールです。実際の処方、製剤規格、施設基準については、最新の添付文書・院内運用を確認してください。
        </footer>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
  allowDecimal = false,
  resetVersion,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  allowDecimal?: boolean;
  resetVersion: number;
}) {
  const [displayValue, setDisplayValue] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    setDisplayValue(value === 0 ? "" : String(value));
  }, [resetVersion, value]);

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="mt-1 flex items-center overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
        <input
          type="text"
          data-numeric-input="true"
          inputMode="decimal"
          value={displayValue}
          onFocus={(event) => {
            lastFocusedNumberInput = event.currentTarget;
            event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            const inputs = Array.from(
              document.querySelectorAll<HTMLInputElement>(
                'input[data-numeric-input="true"]:not([disabled])',
              ),
            );
            const currentIndex = inputs.indexOf(
              lastFocusedNumberInput ?? event.currentTarget,
            );
            const nextInput = inputs[currentIndex + 1];
            window.requestAnimationFrame(() => {
              nextInput?.focus();
              nextInput?.select();
            });
          }}
          onChange={(event) => {
            const normalizedValue = sanitizeNumericText(
              event.target.value,
              allowDecimal,
            );
            setDisplayValue(normalizedValue);
            onChange(numberValue(normalizedValue, allowDecimal));
          }}
          className="min-w-0 flex-1 px-3 py-2 font-mono outline-none"
        />
        <span className="border-l border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {unit}
        </span>
      </span>
    </label>
  );
}

function DrugRow({
  label,
  subLabel,
  inputLabel,
  unit,
  value,
  onValueChange,
  allowDecimal = false,
  resetVersion,
}: {
  label: string;
  subLabel: string;
  inputLabel: string;
  unit: string;
  value: number;
  onValueChange: (value: number) => void;
  allowDecimal?: boolean;
  resetVersion: number;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
      <div>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-slate-500">{subLabel}</span>
      </div>
      <NumberField
        label={inputLabel}
        value={value}
        unit={unit}
        onChange={onValueChange}
        allowDecimal={allowDecimal}
        resetVersion={resetVersion}
      />
    </div>
  );
}

function RapidInsulinRow({
  label,
  subLabel,
  values,
  onValueChange,
  resetVersion,
}: {
  label: string;
  subLabel: string;
  values: RapidInsulinInput;
  resetVersion: number;
  onValueChange: (
    field: "breakfastAmount" | "lunchAmount" | "dinnerAmount",
    value: number,
  ) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3">
      <div>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-slate-500">{subLabel}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="朝"
          value={values.breakfastAmount}
          unit="単位"
          onChange={(value) => onValueChange("breakfastAmount", value)}
          resetVersion={resetVersion}
        />
        <NumberField
          label="昼"
          value={values.lunchAmount}
          unit="単位"
          onChange={(value) => onValueChange("lunchAmount", value)}
          resetVersion={resetVersion}
        />
        <NumberField
          label="晩"
          value={values.dinnerAmount}
          unit="単位"
          onChange={(value) => onValueChange("dinnerAmount", value)}
          resetVersion={resetVersion}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: QuantityResult }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-950">{result.label}</h3>
          <p className="mt-1 text-sm text-slate-600">{result.detail}</p>
        </div>
        <p className="whitespace-nowrap text-2xl font-bold text-teal-800">
          {result.quantity}
          <span className="ml-1 text-base text-slate-700">{result.unit}</span>
        </p>
      </div>
    </article>
  );
}
