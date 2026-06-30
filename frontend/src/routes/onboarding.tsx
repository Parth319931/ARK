/**
 * frontend/src/routes/onboarding.tsx
 * 3-step onboarding wizard, shown right after signup, before the user
 * ever sees the Dashboard. Builds the FinancialProfile snapshot that
 * Guardian Memory, Future Self, and Government Schemes will read from.
 *
 * All three "pages" are steps inside one route component (no separate
 * URLs per step) — simplest way to satisfy "3 pages popped up one after
 * other on Next" without fighting the router for back/forward state.
 *
 * Protected by RequireAuth. On submit, posts to /memory/onboarding and
 * navigates to /dashboard.
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";

export const Route = createFileRoute("/onboarding")({
    component: () => (
        <RequireAuth>
            <OnboardingPage />
        </RequireAuth>
    ),
});

// ---------- Types & static option data ----------

type IncomeSource = "salaried" | "gig" | "farmer" | "pwd" | "retired";
type IncomeRegularity = "fixed_monthly" | "weekly" | "irregular_gig" | "seasonal";
type WorryTag =
    | "scams"
    | "loans"
    | "savings"
    | "investments"
    | "govt_schemes"
    | "income_uncertainty";

const INCOME_SOURCES: { value: IncomeSource; label: string; blurb: string }[] = [
    { value: "salaried", label: "Salaried Employee", blurb: "Fixed paycheck, usually monthly" },
    { value: "gig", label: "Gig Worker", blurb: "Delivery, rideshare, freelance, platform work" },
    { value: "farmer", label: "Farmer", blurb: "Income tied to crop cycles and seasons" },
    { value: "pwd", label: "PWD", blurb: "Person with disability, pension or scheme-based income" },
    { value: "retired", label: "Retired", blurb: "Pension, savings, or family support" },
];

// Default regularity inferred from Page 1's answer — user can override on Page 2.
const DEFAULT_REGULARITY: Record<IncomeSource, IncomeRegularity> = {
    salaried: "fixed_monthly",
    gig: "irregular_gig",
    farmer: "seasonal",
    pwd: "fixed_monthly",
    retired: "fixed_monthly",
};

const REGULARITY_OPTIONS: { value: IncomeRegularity; label: string }[] = [
    { value: "fixed_monthly", label: "Fixed monthly" },
    { value: "weekly", label: "Weekly" },
    { value: "irregular_gig", label: "Irregular / gig-based" },
    { value: "seasonal", label: "Seasonal (e.g. farming)" },
];

const WORRY_OPTIONS: { value: WorryTag; label: string; blurb: string }[] = [
    { value: "scams", label: "Scams", blurb: "Fraud calls, fake links, phishing messages" },
    { value: "loans", label: "Loans", blurb: "EMIs, debt, interest rates, repayment stress" },
    { value: "savings", label: "Savings", blurb: "Not enough left over, no safety net" },
    { value: "investments", label: "Investments", blurb: "Where to put money, what's safe, what's not" },
    { value: "govt_schemes", label: "Govt Schemes", blurb: "Not sure what you qualify for" },
    { value: "income_uncertainty", label: "Income Uncertainty", blurb: "Earnings change month to month" },
];

const MAX_WORRIES = 3;
const TOTAL_STEPS = 3;

// ---------- Main component ----------

function OnboardingPage() {
    const navigate = useNavigate();
    const { refreshUser } = useAppContext();

    const [step, setStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1
    const [incomeSource, setIncomeSource] = useState<IncomeSource | null>(null);

    // Step 2
    const [regularity, setRegularity] = useState<IncomeRegularity | null>(null);
    const [monthlyIncome, setMonthlyIncome] = useState("");
    const [monthlyExpenses, setMonthlyExpenses] = useState("");
    const [existingEmi, setExistingEmi] = useState("");
    const [hasEmergencyFund, setHasEmergencyFund] = useState(false);
    const [dependents, setDependents] = useState("");

    // Step 3
    const [worries, setWorries] = useState<WorryTag[]>([]);

    function selectIncomeSource(value: IncomeSource) {
        setIncomeSource(value);
        // Only set a default if the user hasn't already chosen one themselves.
        setRegularity((prev) => prev ?? DEFAULT_REGULARITY[value]);
    }

    function toggleWorry(value: WorryTag) {
        setWorries((prev) => {
            if (prev.includes(value)) return prev.filter((w) => w !== value);
            if (prev.length >= MAX_WORRIES) return prev;
            return [...prev, value];
        });
    }

    function canGoNext(): boolean {
        if (step === 1) return incomeSource !== null;
        if (step === 2) {
            return (
                regularity !== null &&
                monthlyIncome.trim() !== "" &&
                Number(monthlyIncome) >= 0 &&
                monthlyExpenses.trim() !== "" &&
                Number(monthlyExpenses) >= 0 &&
                dependents.trim() !== "" &&
                Number.isInteger(Number(dependents)) &&
                Number(dependents) >= 0
            );
        }
        return worries.length >= 1;
    }

    function handleNext() {
        if (!canGoNext()) return;
        if (step < TOTAL_STEPS) {
            setStep((s) => s + 1);
            return;
        }
        void handleSubmit();
    }

    function handleBack() {
        setError(null);
        setStep((s) => Math.max(1, s - 1));
    }

    async function handleSubmit() {
        if (!incomeSource || !regularity) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await api.post("/memory/onboarding", {
                income_source: incomeSource,
                monthly_income: Number(monthlyIncome),
                income_regularity: regularity,
                monthly_expenses: Number(monthlyExpenses),
                existing_emi: existingEmi.trim() === "" ? 0 : Number(existingEmi),
                has_emergency_fund: hasEmergencyFund,
                dependents_count: Number(dependents),
                top_worries: worries,
            });
            await refreshUser(); // picks up onboarding_complete = true
            navigate({ to: "/dashboard" });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col px-4 py-10">
            <ProgressHeader step={step} totalSteps={TOTAL_STEPS} />

            <div className="mt-8 flex-1">
                {step === 1 && (
                    <StepOne selected={incomeSource} onSelect={selectIncomeSource} />
                )}
                {step === 2 && (
                    <StepTwo
                        regularity={regularity}
                        onRegularityChange={setRegularity}
                        monthlyIncome={monthlyIncome}
                        onMonthlyIncomeChange={setMonthlyIncome}
                        monthlyExpenses={monthlyExpenses}
                        onMonthlyExpensesChange={setMonthlyExpenses}
                        existingEmi={existingEmi}
                        onExistingEmiChange={setExistingEmi}
                        hasEmergencyFund={hasEmergencyFund}
                        onToggleEmergencyFund={() => setHasEmergencyFund((v) => !v)}
                        dependents={dependents}
                        onDependentsChange={setDependents}
                    />
                )}
                {step === 3 && <StepThree selected={worries} onToggle={toggleWorry} />}
            </div>

            {error && (
                <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={handleBack}
                    disabled={step === 1 || isSubmitting}
                    className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canGoNext() || isSubmitting}
                    className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {step < TOTAL_STEPS
                        ? "Next"
                        : isSubmitting
                            ? "Setting up…"
                            : "Finish"}
                </button>
            </div>
        </div>
    );
}

// ---------- Shared progress header ----------

function ProgressHeader({ step, totalSteps }: { step: number; totalSteps: number }) {
    return (
        <div>
            <div className="flex items-center gap-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                    <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"
                            }`}
                    />
                ))}
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
                Step {step} of {totalSteps}
            </p>
        </div>
    );
}

// ---------- Step 1: How do you earn? ----------

function StepOne({
    selected,
    onSelect,
}: {
    selected: IncomeSource | null;
    onSelect: (v: IncomeSource) => void;
}) {
    return (
        <div>
            <h1 className="text-2xl font-semibold">How do you earn?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                This helps your guardian understand your financial rhythm from day one.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INCOME_SOURCES.map((opt) => {
                    const isActive = selected === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onSelect(opt.value)}
                            className={`flex flex-col items-start gap-1 rounded-xl border-2 px-5 py-5 text-left transition-colors ${isActive
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                                }`}
                        >
                            <span className="text-base font-semibold">{opt.label}</span>
                            <span className="text-sm text-muted-foreground">{opt.blurb}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ---------- Step 2: Tell us about your money ----------

interface StepTwoProps {
    regularity: IncomeRegularity | null;
    onRegularityChange: (v: IncomeRegularity) => void;
    monthlyIncome: string;
    onMonthlyIncomeChange: (v: string) => void;
    monthlyExpenses: string;
    onMonthlyExpensesChange: (v: string) => void;
    existingEmi: string;
    onExistingEmiChange: (v: string) => void;
    hasEmergencyFund: boolean;
    onToggleEmergencyFund: () => void;
    dependents: string;
    onDependentsChange: (v: string) => void;
}

function StepTwo(props: StepTwoProps) {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold">Tell us about your money</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Rough numbers are fine — you can update these anytime.
                </p>
            </div>

            <NumberField
                label="Monthly income (approximate)"
                prefix="₹"
                value={props.monthlyIncome}
                onChange={props.onMonthlyIncomeChange}
                placeholder="e.g. 25000"
            />

            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">How regular is it?</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {REGULARITY_OPTIONS.map((opt) => {
                        const isActive = props.regularity === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => props.onRegularityChange(opt.value)}
                                className={`rounded-md border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${isActive
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <NumberField
                label="Estimated monthly expenses"
                prefix="₹"
                value={props.monthlyExpenses}
                onChange={props.onMonthlyExpensesChange}
                placeholder="e.g. 15000"
            />

            <NumberField
                label="Existing EMI / loan payments per month"
                prefix="₹"
                value={props.existingEmi}
                onChange={props.onExistingEmiChange}
                placeholder="0 if none"
            />

            <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                    <p className="text-sm font-medium">Do you have an emergency fund?</p>
                    <p className="text-xs text-muted-foreground">
                        Money set aside for unexpected expenses.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={props.hasEmergencyFund}
                    onClick={props.onToggleEmergencyFund}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${props.hasEmergencyFund ? "bg-primary" : "bg-muted"
                        }`}
                >
                    <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${props.hasEmergencyFund ? "translate-x-5" : "translate-x-0.5"
                            }`}
                    />
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="dependents" className="text-sm font-medium">
                    Number of people dependent on you
                </label>
                <input
                    id="dependents"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={props.dependents}
                    onChange={(e) => props.onDependentsChange(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 2"
                />
            </div>
        </div>
    );
}

function NumberField({
    label,
    prefix,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    prefix: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex items-center rounded-md border px-3 focus-within:ring-2 focus-within:ring-primary">
                <span className="text-sm text-muted-foreground">{prefix}</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

// ---------- Step 3: What worries you most? ----------

function StepThree({
    selected,
    onToggle,
}: {
    selected: WorryTag[];
    onToggle: (v: WorryTag) => void;
}) {
    return (
        <div>
            <h1 className="text-2xl font-semibold">What worries you most?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Pick up to {MAX_WORRIES} — your guardian will pay closer attention to these.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {WORRY_OPTIONS.map((opt) => {
                    const isActive = selected.includes(opt.value);
                    const isDisabled = !isActive && selected.length >= MAX_WORRIES;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onToggle(opt.value)}
                            disabled={isDisabled}
                            className={`flex flex-col items-start gap-1 rounded-xl border-2 px-5 py-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isActive
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                                }`}
                        >
                            <span className="flex w-full items-center justify-between text-base font-semibold">
                                {opt.label}
                                {isActive && <span className="text-primary">✓</span>}
                            </span>
                            <span className="text-sm text-muted-foreground">{opt.blurb}</span>
                        </button>
                    );
                })}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
                {selected.length} / {MAX_WORRIES} selected
            </p>
        </div>
    );
}