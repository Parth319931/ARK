/**
 * frontend/src/routes/accessibility.tsx
 * Accessibility settings page. Every control here updates global
 * AccessibilityContext, which applies the change site-wide instantly.
 */
import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useAccessibility, type TextSize } from "@/context/AccessibilityContext";

export const Route = createFileRoute("/accessibility")({
  component: () => (
    <RequireAuth>
      <AccessibilityPage />
    </RequireAuth>
  ),
});

function AccessibilityPage() {
  const {
    seniorMode,
    textSize,
    highContrast,
    dyslexiaMode,
    toggleSeniorMode,
    setTextSize,
    setHighContrast,
    setDyslexiaMode,
  } = useAccessibility();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Accessibility</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Make ArthaRakshak easier to read and use. These settings apply across the whole app.
        </p>
      </div>

      {/* Senior Citizen Mode */}
      <div className="flex items-center justify-between gap-4 rounded-lg border p-5">
        <div>
          <p className="font-medium">Senior Citizen Mode</p>
          <p className="text-sm text-muted-foreground">
            Simplifies the Guardian for pensioners and first-time smartphone users.
          </p>
          <p className="text-sm text-muted-foreground">
            Enable a simpler, larger, voice-first Guardian.
          </p>
        </div>
        <Toggle checked={seniorMode} onChange={toggleSeniorMode} />
      </div>

      {/* Large Text Mode */}
      <div className="flex flex-col gap-3 rounded-lg border p-5">
        <div>
          <p className="font-medium">Large Text Mode</p>
          <p className="text-sm text-muted-foreground">Increase text size across the Guardian.</p>
        </div>
        <div className="flex gap-2">
          {(["normal", "large", "extra-large"] as TextSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setTextSize(size)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                textSize === size
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {size === "extra-large" ? "Extra Large" : size}
            </button>
          ))}
        </div>
      </div>

      {/* High Contrast */}
      <div className="flex flex-col gap-3 rounded-lg border p-5">
        <div>
          <p className="font-medium">High Contrast</p>
          <p className="text-sm text-muted-foreground">Boost contrast for low-vision readability.</p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={highContrast}
          onChange={(e) => setHighContrast(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Dyslexia Friendly */}
      <div className="flex flex-col gap-3 rounded-lg border p-5">
        <div>
          <p className="font-medium">Dyslexia Friendly</p>
          <p className="text-sm text-muted-foreground">Wider spacing and softer line height.</p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={dyslexiaMode}
          onChange={(e) => setDyslexiaMode(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}