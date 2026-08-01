import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ScopeAssessment } from "@/lib/schema";

export function ScopeMeter({ scope }: { scope: ScopeAssessment }) {
  const tone =
    scope.label === "Lean MVP" ? "success" : scope.label === "Balanced MVP" ? "warning" : "danger";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Scope Meter</p>
          <h3 className="mt-1 text-xl font-bold tracking-tight">{scope.label}</h3>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{scope.summary}</p>
        </div>
        <Badge tone={tone}>{scope.score}/100</Badge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${scope.score}%` }}
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Why this score
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
            {scope.reasons.map((reason) => (
              <li key={reason}>- {reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Recommended cuts
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
            {scope.recommendedCuts.map((cut) => (
              <li key={cut}>- {cut}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        AI-assisted scope assessment. Use it as a decision aid, not an objective grade.
      </p>
    </Card>
  );
}
