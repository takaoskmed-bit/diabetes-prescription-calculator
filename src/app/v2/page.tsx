"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { V2_DRUG_MASTERS, type V2DrugMaster } from "@/lib/v2Master";
import {
  calculateV2DrugRows,
  validateV2NonNegative,
  type V2PrescriptionRowInput,
} from "@/utils/calculateV2";

type V2RowState = {
  id: string;
  drugId: string;
  doses: [string, string, string];
};

const emptyRow = (id = crypto.randomUUID()): V2RowState => ({
  id,
  drugId: "",
  doses: ["", "", ""],
});

const normalizeNumericText = (value: string) =>
  value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/．/g, ".")
    .replace(/－/g, "-");

const sanitizeNumericText = (value: string) => {
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

    if (char === "." && !hasDecimal) {
      nextValue += char;
      hasDecimal = true;
    }
  }

  return nextValue;
};

const toNumber = (value: string) => {
  const normalizedValue = sanitizeNumericText(value);

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

const rowToInput = (row: V2RowState): V2PrescriptionRowInput => ({
  id: row.id,
  drugId: row.drugId,
  doses: row.doses.map(toNumber) as [number, number, number],
});

const groupedMasters = V2_DRUG_MASTERS.reduce(
  (groups, drug) => {
    const key = `${drug.kind === "insulin" ? "インスリン" : "GLP-1RA"} / ${drug.category}`;
    groups[key] = [...(groups[key] ?? []), drug];
    return groups;
  },
  {} as Record<string, V2DrugMaster[]>,
);

let lastFocusedNumberInput: HTMLInputElement | null = null;

export default function V2Page() {
  const [prescriptionDays, setPrescriptionDays] = useState("");
  const [rows, setRows] = useState<V2RowState[]>([emptyRow("initial-row")]);
  const [copied, setCopied] = useState(false);
  const prescriptionDaysNumber = toNumber(prescriptionDays);

  const inputRows = useMemo(() => rows.map(rowToInput), [rows]);
  const validationErrors = useMemo(
    () => validateV2NonNegative(inputRows, prescriptionDaysNumber),
    [inputRows, prescriptionDaysNumber],
  );
  const results = useMemo(() => {
    if (validationErrors.length > 0) {
      return [];
    }

    return calculateV2DrugRows(
      V2_DRUG_MASTERS,
      inputRows,
      prescriptionDaysNumber,
    );
  }, [inputRows, prescriptionDaysNumber, validationErrors.length]);

  const selectedDrugCount = rows.filter((row) => row.drugId).length;
  const dailyInjectionCount = inputRows.reduce((count, row) => {
    const drug = V2_DRUG_MASTERS.find((master) => master.id === row.drugId);

    if (!drug || drug.dosingInterval !== "daily") {
      return count;
    }

    return count + row.doses.filter((dose) => dose > 0).length;
  }, 0);
  const weeklyInjectionCount = inputRows.reduce((count, row) => {
    const drug = V2_DRUG_MASTERS.find((master) => master.id === row.drugId);

    if (!drug || drug.dosingInterval !== "weekly") {
      return count;
    }

    return count + row.doses.filter((dose) => dose > 0).length;
  }, 0);

  const updateRow = (rowId: string, nextRow: Partial<V2RowState>) => {
    setRows((currentRows) => {
      const nextRows = currentRows.map((row) =>
        row.id === rowId ? { ...row, ...nextRow } : row,
      );
      const lastRow = nextRows[nextRows.length - 1];

      if (lastRow?.drugId) {
        return [...nextRows, emptyRow()];
      }

      return nextRows;
    });
  };

  const reset = () => {
    setPrescriptionDays("");
    setRows([emptyRow()]);
    setCopied(false);
  };

  const copyText = [
    "処方量計算結果 ver.2",
    `処方日数: ${prescriptionDaysNumber}日`,
    ...results.map(
      (result) =>
        `${result.label}: ${result.quantity}${result.unit}（${result.detail}）`,
    ),
  ].join("\n");

  const copyResults = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-700">ver.2</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
              インスリン・GLP-1RA 選択式処方量計算
            </h1>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              ver.1へ
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              リセット
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              印刷
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="flex flex-col gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-card">
              <h2 className="text-lg font-bold text-slate-950">基本条件</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="処方日数"
                  value={prescriptionDays}
                  unit="日"
                  onChange={setPrescriptionDays}
                />
                <InfoBox label="選択薬剤" value={`${selectedDrugCount}件`} />
                <InfoBox
                  label="注射回数"
                  value={`${dailyInjectionCount}回/日 + ${weeklyInjectionCount}回/週`}
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-card">
              <h2 className="text-lg font-bold text-slate-950">薬剤選択</h2>
              <div className="mt-4 grid gap-3">
                {rows.map((row, index) => {
                  const selectedDrug = V2_DRUG_MASTERS.find(
                    (drug) => drug.id === row.drugId,
                  );

                  return (
                    <DrugSelectionRow
                      key={row.id}
                      row={row}
                      index={index}
                      selectedDrug={selectedDrug}
                      onDrugChange={(drugId) =>
                        updateRow(row.id, {
                          drugId,
                          doses: ["", "", ""],
                        })
                      }
                      onDoseChange={(doseIndex, value) => {
                        const nextDoses = [...row.doses] as [
                          string,
                          string,
                          string,
                        ];
                        nextDoses[doseIndex] = value;
                        updateRow(row.id, { doses: nextDoses });
                      }}
                    />
                  );
                })}
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
                  className="no-print rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {copied ? "コピー済み" : "結果をコピー"}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {results.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    薬剤、投与量、処方日数を入力すると結果が表示されます。
                  </div>
                ) : (
                  results.map((result) => (
                    <article
                      key={result.id}
                      className="rounded-md border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-950">
                            {result.label}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {result.detail}
                          </p>
                        </div>
                        <p className="whitespace-nowrap text-2xl font-bold text-cyan-800">
                          {result.quantity}
                          <span className="ml-1 text-base text-slate-700">
                            {result.unit}
                          </span>
                        </p>
                      </div>
                    </article>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{value}</p>
    </div>
  );
}

function DrugSelectionRow({
  row,
  index,
  selectedDrug,
  onDrugChange,
  onDoseChange,
}: {
  row: V2RowState;
  index: number;
  selectedDrug?: V2DrugMaster;
  onDrugChange: (drugId: string) => void;
  onDoseChange: (doseIndex: number, value: string) => void;
}) {
  const doseLabels =
    selectedDrug?.dosingInterval === "daily"
      ? ["投与量1", "投与量2", "投与量3"]
      : ["投与量1", "投与量2", "投与量3"];
  const unit = selectedDrug
    ? `${selectedDrug.doseUnit}/${selectedDrug.dosingInterval === "weekly" ? "週" : "日"}`
    : "";

  return (
    <div className="grid gap-3 rounded-md border border-slate-200 p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)] lg:items-end">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            薬剤 {index + 1}
          </span>
          <select
            value={row.drugId}
            onChange={(event) => onDrugChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="">選択してください</option>
            {Object.entries(groupedMasters).map(([groupLabel, drugs]) => (
              <optgroup key={groupLabel} label={groupLabel}>
                {drugs.map((drug) => (
                  <option key={drug.id} value={drug.id}>
                    {drug.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="text-sm text-slate-600">
          {selectedDrug ? (
            <>
              <span className="font-semibold text-slate-800">
                {selectedDrug.category}
              </span>
              <span className="ml-2">
                1{selectedDrug.itemUnitLabel}あたり{" "}
                {selectedDrug.quantityBasis === "doseCount"
                  ? "1回分"
                  : `${selectedDrug.amountPerItem}${selectedDrug.amountUnitLabel}`}
              </span>
            </>
          ) : (
            "薬剤を選ぶと投与量を入力できます。"
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {row.doses.map((dose, doseIndex) => (
          <NumberField
            key={`${row.id}-${doseIndex}`}
            label={doseLabels[doseIndex]}
            value={dose}
            unit={unit}
            disabled={!selectedDrug}
            onChange={(value) => onDoseChange(doseIndex, value)}
          />
        ))}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  unit,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="mt-1 flex items-center overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-100">
        <input
          type="text"
          data-numeric-input="true"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onFocus={(event) => {
            lastFocusedNumberInput = event.currentTarget;
            event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();
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
          onChange={(event) => onChange(sanitizeNumericText(event.target.value))}
          className="min-w-0 flex-1 px-3 py-2 font-mono outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
        <span className="min-w-[64px] border-l border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {unit}
        </span>
      </span>
    </label>
  );
}
