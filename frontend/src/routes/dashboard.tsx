/**
 * frontend/src/routes/dashboard.tsx
 * Main dashboard: financial health donut, score breakdown bars, monthly
 * figures from onboarding data, on-demand LLM "twin" insights, a static
 * AI summary card, static recent activity, quick actions, and the
 * Guardian Score widget. Floating AI Assistant (left) and Voice Mode
 * (right) buttons route to those pages.
 *
 * Data flow: GET /memory/onboarding determines whether the user has a
 * FinancialProfile yet (redirects to /onboarding if not). GET
 * /insights/dashboard loads scores + figures on mount. POST
 * /insights/twin is triggered on demand by "View insights".
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
    component: () => (
        <RequireAuth>
            <DashboardPage />
        </RequireAuth>
    ),
});

// ---------- Types ----------

interface ScoreBreakdown {
    cash_flow: number;
    savings: number;
    scam_safety: number;
}

interface DashboardSummary {
    financial_health_score: number;
    score_breakdown: ScoreBreakdown;
    monthly_income: number;
    monthly_expenses: number;
    monthly_savings: number;
    guardian_score: number;
    guardian_archetype: string;
}

interface TwinInsights {
    twin_name: string;
    risk_style: string;
    spending: string;
    saving: string;
    advice: string;
    regret_probability: number;
    future_confidence: number;
}

// ---------- Static content ----------

const RECENT_ACTIVITY = [
    {
        text: "Matched 3 schemes — top: PM Jeevan Jyoti Bima Yojana",
        meta: "3 days ago · schemes",
    },
    {
        text: "Compared personal loan — ₹162,762 interest vs ₹191,713 SIP growth",
        meta: "3 days ago · future",
    },
    {
        text: "Matched 3 schemes — top: PM Jeevan Jyoti Bima Yojana",
        meta: "5 days ago · schemes",
    },
];

const AI_SUMMARY_ITEMS = [
    {
        title: "PM Jeevan Jyoti Bima Yojana",
        detail: "Life cover scheme — you may qualify based on your income band.",
    },
    {
        title: "Atal Pension Yojana",
        detail: "Pension scheme worth checking against your dependents and age.",
    },
    {
        title: "Spending pattern",
        detail: "Your expenses look routine and predictable month to month.",
    },
    {
        title: "Safety net",
        detail: "Building a small emergency buffer would strengthen your score.",
    },
];

const QUICK_ACTIONS = [
    { label: "Check a suspicious message", to: "/scam-shield" },
    { label: "Simulate two futures", to: "/future-self" },
    { label: "Find a scheme you qualify for", to: "/government-schemes" },
    { label: "Build your Trusted Circle", to: "/trusted-circle" },
    { label: "Talk to your Voice Guardian", to: "/voice-mode" },
];

function formatInr(value: number): string {
    return `₹${value.toLocaleString("en-IN")}`;
}

// ---------- Main component ----------

function DashboardPage() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [twin, setTwin] = useState<TwinInsights | null>(null);
    const [isTwinLoading, setIsTwinLoading] = useState(false);
    const [twinError, setTwinError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            setLoadError(null);
            try {
                const data = await api.get<DashboardSummary>("/insights/dashboard");
                if (!cancelled) setSummary(data);
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    navigate({ to: "/onboarding" });
                    return;
                }
                if (!cancelled) {
                    setLoadError(
                        err instanceof ApiError ? err.message : "Couldn't load your dashboard."
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleViewInsights() {
        setIsTwinLoading(true);
        setTwinError(null);
        try {
            const data = await api.post<TwinInsights>("/insights/twin");
            setTwin(data);
        } catch (err) {
            setTwinError(
                err instanceof ApiError ? err.message : "Couldn't generate insights right now."
            );
        } finally {
            setIsTwinLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
            </div>
        );
    }

    if (loadError || !summary) {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <p className="text-sm text-destructive">{loadError ?? "Something went wrong."}</p>
            </div>
        );
    }

    return (
        <div className="relative mx-auto max-w-5xl px-4 py-10 lg:px-20">
            <FloatingActionButton
                side="left"
                to="/ai-assistant"
                label="AI Assistant"
                icon="💬"
            />
            <FloatingActionButton
                side="right"
                to="/voice-mode"
                label="Voice Mode"
                icon="🎙️"
            />

            <h1 className="text-2xl font-semibold">Your financial dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                A live snapshot built from what you told us during onboarding.
            </p>

            {/* Financial health score */}
            <section className="mt-8 grid grid-cols-1 gap-8 rounded-xl border p-6 md:grid-cols-2">
                <div className="flex flex-col items-center justify-center">
                    <DonutChart score={summary.financial_health_score} />
                    <p className="mt-3 text-sm font-medium">Financial health score</p>
                </div>

                <div className="flex flex-col justify-center gap-4">
                    <ScoreBar label="Savings" value={summary.score_breakdown.savings} />
                    <ScoreBar label="Scam safety" value={summary.score_breakdown.scam_safety} />
                    <ScoreBar label="Cash flow" value={summary.score_breakdown.cash_flow} />
                </div>
            </section>

            {/* Monthly figures */}
            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FigureCard label="Monthly income" value={formatInr(summary.monthly_income)} />
                <FigureCard label="Monthly expenses" value={formatInr(summary.monthly_expenses)} />
                <FigureCard
                    label="Monthly savings"
                    value={formatInr(summary.monthly_savings)}
                    tone={summary.monthly_savings >= 0 ? "positive" : "negative"}
                />
            </section>

            {/* View insights */}
            <section className="mt-8 rounded-xl border p-6">
                {!twin ? (
                    <div className="flex flex-col items-start gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">View insights</h2>
                            <p className="text-sm text-muted-foreground">
                                Generate a behavioral snapshot of your money habits.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleViewInsights}
                            disabled={isTwinLoading}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {isTwinLoading ? "Generating…" : "View insights"}
                        </button>
                        {twinError && (
                            <p className="text-sm text-destructive">{twinError}</p>
                        )}
                    </div>
                ) : (
                    <div>
                        <h2 className="text-lg font-semibold">{twin.twin_name} — full insights</h2>
                        <p className="text-sm text-muted-foreground">
                            How your twin spends, saves and plans.
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InsightField label="Risk style" value={twin.risk_style} />
                            <InsightField label="Spending" value={twin.spending} />
                            <InsightField label="Saving" value={twin.saving} />
                            <InsightField label="Advice" value={twin.advice} />
                            <InsightField
                                label="Regret probability"
                                value={`${twin.regret_probability}%`}
                            />
                            <InsightField
                                label="Future confidence"
                                value={`${twin.future_confidence}%`}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* AI summary */}
            <section className="mt-8">
                <h2 className="text-lg font-semibold">AI summary</h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {AI_SUMMARY_ITEMS.map((item) => (
                        <div key={item.title} className="rounded-xl border p-4">
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                    ))}
                </div>
                <Link
                    to="/government-schemes"
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                    See all matched schemes →
                </Link>
            </section>

            {/* Guardian score */}
            <section className="mt-8 rounded-xl border p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">{summary.guardian_archetype}</h2>
                        <p className="text-sm text-muted-foreground">
                            Calculated from scam safety, cash flow, savings, schemes and your
                            trusted circle.
                        </p>
                    </div>
                    <div className="text-3xl font-semibold text-primary">
                        {summary.guardian_score}
                    </div>
                </div>
            </section>

            {/* AI alerts + Recent activity */}
            <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border p-5">
                    <h2 className="text-base font-semibold">AI alerts</h2>
                    <ul className="mt-3 flex flex-col gap-3">
                        <li className="text-sm">
                            <p>No active scam alerts in the last 7 days.</p>
                            <p className="text-xs text-muted-foreground">Just now</p>
                        </li>
                        <li className="text-sm">
                            <p>Your expenses stayed within your usual range this month.</p>
                            <p className="text-xs text-muted-foreground">2 days ago</p>
                        </li>
                    </ul>
                </div>

                <div className="rounded-xl border p-5">
                    <h2 className="text-base font-semibold">Recent guardian activity</h2>
                    <ul className="mt-3 flex flex-col gap-3">
                        {RECENT_ACTIVITY.map((item, i) => (
                            <li key={i} className="text-sm">
                                <p>{item.text}</p>
                                <p className="text-xs text-muted-foreground">{item.meta}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Quick actions */}
            <section className="mb-12 mt-8">
                <h2 className="text-lg font-semibold">Quick actions</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {QUICK_ACTIONS.map((action) => (
                        <Link
                            key={action.to}
                            to={action.to}
                            className="rounded-md border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            {action.label}
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

// ---------- Subcomponents ----------

function DonutChart({ score }: { score: number }) {
    const radius = 70;
    const stroke = 14;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const filled = (score / 100) * circumference;

    return (
        <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
            <circle
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                fill="none"
                stroke="currentColor"
                className="text-muted"
                strokeWidth={stroke}
            />
            <circle
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                fill="none"
                stroke="#16a34a"
                strokeWidth={stroke}
                strokeDasharray={`${filled} ${circumference}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${radius} ${radius})`}
            />
            <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                className="fill-foreground"
                fontSize="22"
                fontWeight="600"
            >
                {score}%
            </text>
        </svg>
    );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{value}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-[#16a34a] transition-all"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

function FigureCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: "positive" | "negative";
}) {
    return (
        <div className="rounded-xl border p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p
                className={`mt-1 text-xl font-semibold ${tone === "negative" ? "text-destructive" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}

function InsightField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm">{value}</p>
        </div>
    );
}

function FloatingActionButton({
    side,
    to,
    label,
    icon,
}: {
    side: "left" | "right";
    to: string;
    label: string;
    icon: string;
}) {
    return (
        <Link
            to={to}
            title={label}
            className={`fixed top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border bg-background p-3 text-lg shadow-md transition-transform hover:scale-105 ${side === "left" ? "left-3" : "right-3"
                }`}
        >
            <span>{icon}</span>
        </Link>
    );
}