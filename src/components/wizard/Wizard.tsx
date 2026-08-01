"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Image as ImageIcon,
  Lightning,
  SpinnerGap,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ScopeMeter } from "@/components/wizard/ScopeMeter";
import { DEMO_IDEA } from "@/lib/demos/preset";
import type { InterviewQuestion, OriginalityMode, ProjectBlueprint } from "@/lib/schema";
import { saveProject } from "@/lib/store/projects";
import { compressImageFile, dataUrlToBase64 } from "@/lib/visual/compress";

type Step = "idea" | "interview" | "review";

export function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idea");
  const [idea, setIdea] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [customAnswer, setCustomAnswer] = useState("");
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"demo" | "gemini">("demo");
  const [originalityMode, setOriginalityMode] = useState<OriginalityMode>("Inspired");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | undefined>();
  const [screenshotMimeType, setScreenshotMimeType] = useState<string | undefined>();

  const currentQuestion = questions[questionIndex];
  const progressLabel = useMemo(() => {
    if (step === "idea") return "1 / 3 Describe";
    if (step === "interview") return `2 / 3 Decide (${questionIndex + 1}/${questions.length || 5})`;
    return "3 / 3 Lock MVP";
  }, [step, questionIndex, questions.length]);

  async function startInterview(nextIdea = idea) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: nextIdea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Interview failed.");
      setQuestions(data.questions);
      setProvider(data.provider);
      setAnswers({});
      setQuestionIndex(0);
      setStep("interview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interview failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateBlueprint(finalAnswers = answers) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          answers: finalAnswers,
          originalityMode,
          referenceUrl,
          screenshotBase64,
          screenshotMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Blueprint failed.");
      setBlueprint(data);
      setProvider(data.provider);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blueprint failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onSelectOption(value: string) {
    if (!currentQuestion) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    setCustomAnswer("");
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    await generateBlueprint(nextAnswers);
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setScreenshotPreview(compressed.dataUrl);
      setScreenshotBase64(dataUrlToBase64(compressed.dataUrl));
      setScreenshotMimeType(compressed.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    }
  }

  async function openWorkspace() {
    if (!blueprint) return;
    setLoading(true);
    try {
      await saveProject(blueprint);
      router.push(`/workspace/${blueprint.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge tone="accent">{progressLabel}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Turn messy ideas into Cursor-ready MVP specs
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
            SpekDulu interviews you, cuts scope, and generates a reusable Cursor Skill before you
            start coding.
          </p>
        </div>
        <Badge tone={provider === "gemini" ? "success" : "neutral"}>
          {provider === "gemini" ? "Gemini live" : "Demo provider"}
        </Badge>
      </div>

      {error && (
        <Card className="mb-4 border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[var(--danger)]">
          {error}
        </Card>
      )}

      <AnimatePresence mode="wait">
        {step === "idea" && (
          <motion.div
            key="idea"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
          >
            <Card className="p-5 sm:p-6">
              <label className="text-sm font-semibold" htmlFor="idea">
                What are you trying to build?
              </label>
              <Textarea
                id="idea"
                className="mt-2 min-h-40"
                placeholder="Example: Aplikasi pencatat utang untuk warung kecil..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => startInterview()}
                  disabled={loading || idea.trim().length < 8}
                >
                  {loading ? <SpinnerGap className="animate-spin" /> : <Lightning weight="fill" />}
                  Start adaptive interview
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIdea(DEMO_IDEA);
                    void startInterview(DEMO_IDEA);
                  }}
                  disabled={loading}
                >
                  Use demo idea
                </Button>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon size={18} /> Optional screenshot reference
                </div>
                <Input
                  className="mt-3"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                />
                {screenshotPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="mt-3 max-h-40 w-full rounded-[14px] border border-[var(--border)] object-cover"
                  />
                )}
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LinkIcon size={18} /> Optional public URL
                </div>
                <Input
                  className="mt-3"
                  placeholder="https://example.com"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["Inspired", "Distinct", "Reference"] as OriginalityMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setOriginalityMode(mode)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        originalityMode === mode
                          ? "bg-[var(--surface-soft)] text-[#1565C0]"
                          : "bg-[#F3F4F6] text-[var(--text-secondary)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {step === "interview" && currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl"
          >
            <Card className="p-5 sm:p-8">
              <p className="text-sm font-medium text-[var(--text-muted)]">Critical question</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{currentQuestion.prompt}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{currentQuestion.helper}</p>
              <div className="mt-6 grid gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    onClick={() => void onSelectOption(option.value)}
                    className="rounded-[16px] border border-[var(--border)] bg-white px-4 py-3 text-left transition hover:border-[var(--accent-soft)] hover:bg-[var(--surface-soft)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{option.label}</span>
                      {option.recommended && <Badge tone="accent">Recommended</Badge>}
                    </div>
                  </button>
                ))}
              </div>
              {currentQuestion.allowCustom && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Input
                    placeholder="Or type your own answer"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={loading || customAnswer.trim().length < 2}
                    onClick={() => void onSelectOption(customAnswer.trim())}
                  >
                    Use custom
                  </Button>
                </div>
              )}
              {loading && (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <SpinnerGap className="animate-spin" /> Working...
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {step === "review" && blueprint && (
          <motion.div
            key="review"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone="accent">Decision board</Badge>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    {blueprint.decisions.productName}
                  </h2>
                  <p className="mt-1 text-[var(--text-secondary)]">
                    {blueprint.decisions.oneLiner}
                  </p>
                </div>
                <Button onClick={() => void openWorkspace()} disabled={loading}>
                  Open workspace <ArrowRight />
                </Button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Info label="Target user" value={blueprint.decisions.targetUser} />
                <Info label="Core problem" value={blueprint.decisions.coreProblem} />
                <Info label="Primary journey" value={blueprint.decisions.primaryJourney} />
              </div>
            </Card>

            <ScopeMeter scope={blueprint.scope} />

            <div className="grid gap-4 lg:grid-cols-3">
              <FeatureColumn
                title="Build now"
                tone="success"
                items={blueprint.features.filter((f) => f.bucket === "build_now")}
              />
              <FeatureColumn
                title="Build later"
                tone="warning"
                items={blueprint.features.filter((f) => f.bucket === "build_later")}
              />
              <FeatureColumn
                title="Do not build"
                tone="danger"
                items={blueprint.features.filter((f) => f.bucket === "do_not_build")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[#FAFAFA] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--text)]">{value}</p>
    </div>
  );
}

function FeatureColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "success" | "warning" | "danger";
  items: ProjectBlueprint["features"];
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-[14px] border border-[var(--border)] p-3">
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.description}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{item.reason}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
