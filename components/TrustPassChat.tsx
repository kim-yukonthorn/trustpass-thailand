"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { translations, type Translations } from "@/lib/translations";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  LocateFixed,
  Loader2,
  MapPin,
  Maximize2,
  Paperclip,
  PhoneCall,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import type {
  EvidenceExtractResult,
  GroundingSignal,
  Language,
  RiskCheckResult,
  RiskLevel,
  SituationAnalyzeRequest,
  SituationAnalyzeResponse,
  UserLocation
} from "@/lib/types";

const cities = ["Bangkok", "Phuket", "Pattaya", "Chiang Mai"];
const demoLocations: Array<{ id: string; label: string; location: UserLocation | null }> = [
  { id: "none", label: "No mock location", location: null },
  {
    id: "jay-fai",
    label: "Jay Fai",
    location: { latitude: 13.7526, longitude: 100.5048, accuracy: 25, source: "manual" }
  },
  {
    id: "siam-paragon",
    label: "Siam Paragon mall",
    location: { latitude: 13.7466, longitude: 100.5347, accuracy: 35, source: "manual" }
  },
  {
    id: "chatuchak",
    label: "Chatuchak Market",
    location: { latitude: 13.7999, longitude: 100.5502, accuracy: 45, source: "manual" }
  }
];

const riskCheckTourStorageKey = "trustpass-risk-check-tour-seen";

type PendingClarification = Extract<SituationAnalyzeResponse, { status: "needs_clarification" }>;
type PendingMismatch = Extract<SituationAnalyzeResponse, { status: "evidence_mismatch" }>;
type OutOfScopeSituation = Extract<SituationAnalyzeResponse, { status: "out_of_scope" }>;
type CompletedSituation = Extract<SituationAnalyzeResponse, { status: "completed" }>;
type ReportEvidenceItem = {
  id: string;
  label: string;
  saved: boolean;
  note: string;
  files: Array<{
    name: string;
    type: string;
    size: number;
    previewDataUrl?: string;
  }>;
};

type RiskTheme = {
  hex: string;
  label: string;
  softBg: string;
  text: string;
  ring: string;
  Icon: typeof AlertOctagon;
  pulse: boolean;
};

const riskTheme: Record<RiskLevel, RiskTheme> = {
  Emergency: {
    hex: "#A4262C",
    label: "EMERGENCY",
    softBg: "rgba(164, 38, 44, 0.08)",
    text: "#A4262C",
    ring: "rgba(164, 38, 44, 0.18)",
    Icon: AlertOctagon,
    pulse: true
  },
  High: {
    hex: "#D83B01",
    label: "HIGH",
    softBg: "rgba(216, 59, 1, 0.08)",
    text: "#B5340A",
    ring: "rgba(216, 59, 1, 0.18)",
    Icon: AlertTriangle,
    pulse: false
  },
  Caution: {
    hex: "#FFB900",
    label: "CAUTION",
    softBg: "rgba(255, 185, 0, 0.14)",
    text: "#7A5A00",
    ring: "rgba(255, 185, 0, 0.30)",
    Icon: AlertCircle,
    pulse: false
  },
  Low: {
    hex: "#107C10",
    label: "LOW",
    softBg: "rgba(16, 124, 16, 0.08)",
    text: "#107C10",
    ring: "rgba(16, 124, 16, 0.18)",
    Icon: CheckCircle2,
    pulse: false
  }
};

function riskScoreFor(result: RiskCheckResult): number {
  if (result.risk_level === "Emergency") return 94;

  const base = result.risk_level === "High" ? 74 : result.risk_level === "Caution" ? 42 : 18;
  const maxAllowed = result.risk_level === "High" ? 89 : result.risk_level === "Caution" ? 69 : 34;
  const ratioScore = scoreFromGroundingRatios(result, base);
  return Math.min(maxAllowed, Math.max(base, ratioScore));
}

function scoreFromGroundingRatios(result: RiskCheckResult, base: number) {
  const fareSignal = result.grounding?.find((signal) => signal.tool === "fare_reference");
  const foodSignal = result.grounding?.find((signal) => signal.tool === "food_price_reference");
  const damageSignal = result.grounding?.find((signal) => signal.tool === "damage_claim_reference");
  const fareRatio = asNumber(fareSignal?.metadata?.fare_ratio_to_baseline);
  const foodRatio = asNumber(foodSignal?.metadata?.max_price_ratio_to_reference);
  const damageRatio = asNumber(damageSignal?.metadata?.amount_ratio_to_minor_damage_reference);

  const candidates = [base];
  if (fareRatio !== null) candidates.push(Math.round(30 + Math.min(58, fareRatio * 6)));
  if (foodRatio !== null) candidates.push(Math.round(30 + Math.min(55, foodRatio * 4)));
  if (damageRatio !== null) candidates.push(Math.round(35 + Math.min(50, damageRatio * 8)));
  return Math.max(...candidates);
}

type ActionPriority = "immediate" | "soon" | "preventive";

function actionPriority(action: string): ActionPriority {
  const a = action.toLowerCase();
  if (
    /^(stop|don’t|don't|do not|never|leave|call|contact|stay)/i.test(a) ||
    /1155|embassy|police|public place|right away|immediately|do not follow|do not pay|do not proceed/i.test(a)
  ) {
    return "immediate";
  }
  if (/^(ask|request|verify|check|confirm|move|use)/i.test(a) || /before paying|verify|first|cancellation/i.test(a)) {
    return "soon";
  }
  return "preventive";
}

const priorityStyles: Record<ActionPriority, { bg: string; text: string }> = {
  immediate: { bg: "#FBE9EA", text: "#A4262C" },
  soon: { bg: "#FBEAE0", text: "#B5340A" },
  preventive: { bg: "#E5F1FB", text: "#0B5394" }
};

export function TrustPassChat() {
  const { lang } = useLanguage();
  const t = translations[lang];
  const language: Language = lang === "zh" ? "Chinese" : "English";
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("Bangkok");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [demoLocationId, setDemoLocationId] = useState("none");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [evidenceResult, setEvidenceResult] = useState<EvidenceExtractResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<RiskCheckResult | null>(null);
  const [pendingClarification, setPendingClarification] = useState<PendingClarification | null>(null);
  const [pendingMismatch, setPendingMismatch] = useState<PendingMismatch | null>(null);
  const [outOfScope, setOutOfScope] = useState<OutOfScopeSituation | null>(null);
  const [pendingRequest, setPendingRequest] = useState<SituationAnalyzeRequest | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [resultKey, setResultKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(riskCheckTourStorageKey) === "true") return;
    const id = window.setTimeout(() => {
      setTourStepIndex(0);
      setIsTourOpen(true);
    }, 450);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isChecking) return;
    setStageIndex(0);
    const id = setInterval(() => {
      setStageIndex((s) => (s + 1) % t.loadingStages.length);
    }, 1100);
    return () => clearInterval(id);
  }, [isChecking]);

  function chooseFile(next: File | null) {
    setFile(next);
    setExtractedText("");
    setEvidenceResult(null);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setClarificationAnswer("");
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) chooseFile(dropped);
  }

  function handleDemoLocationChange(id: string) {
    setDemoLocationId(id);
    setLocationError("");
    const match = demoLocations.find((location) => location.id === id);
    setUserLocation(match?.location ?? null);
    if (match?.location) setCity("Bangkok");
  }

  function handlePickSample(text: string) {
    setMessage(text);
    setErrorMessage(null);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setClarificationAnswer("");
    if (result) {
      setResult(null);
      setExtractedText("");
      setEvidenceResult(null);
      setFile(null);
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleNewCheck() {
    setMessage("");
    setFile(null);
    setExtractedText("");
    setEvidenceResult(null);
    setResult(null);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setPendingRequest(null);
    setClarificationAnswer("");
    setErrorMessage(null);
    setResultKey((k) => k + 1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function runSituationAnalysis(body: SituationAnalyzeRequest) {
    const response = await fetch("/api/situation/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = (await response.json()) as SituationAnalyzeResponse | { error: string };
    if ("error" in payload) throw new Error(payload.error);

    if (payload.status === "needs_clarification") {
      setPendingRequest(body);
      setPendingClarification(payload);
      setPendingMismatch(null);
      setOutOfScope(null);
      setClarificationAnswer("");
      setResult(null);
      return;
    }

    if (payload.status === "evidence_mismatch") {
      setPendingRequest(body);
      setPendingMismatch(payload);
      setPendingClarification(null);
      setOutOfScope(null);
      setClarificationAnswer("");
      setResult(null);
      return;
    }

    if (payload.status === "out_of_scope") {
      setOutOfScope(payload);
      setPendingRequest(null);
      setPendingClarification(null);
      setPendingMismatch(null);
      setClarificationAnswer("");
      setResult(null);
      return;
    }

    const nextResult = situationToRiskResult(payload);
    persistCase(nextResult, body.city);
    setPendingClarification(null);
    setPendingMismatch(null);
    setOutOfScope(null);
    setPendingRequest(null);
    setClarificationAnswer("");
    setResult(nextResult);
    setResultKey((k) => k + 1);
  }

  async function answerClarification(answer: string) {
    if (!pendingRequest || !pendingClarification || isChecking) return;
    const trimmed = answer.trim();
    if (!trimmed) return;

    setIsChecking(true);
    setErrorMessage(null);

    try {
      await runSituationAnalysis({
        ...pendingRequest,
        clarificationAnswers: {
          ...(pendingRequest.clarificationAnswers || {}),
          [pendingClarification.clarification_key || "general_context"]: trimmed
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not continue this check. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function answerEvidenceMismatch(answer: string) {
    if (!pendingRequest || !pendingMismatch || isChecking) return;
    if (answer === "I will upload the correct evidence") {
      setFile(null);
      setExtractedText("");
      setEvidenceResult(null);
      setPendingMismatch(null);
      setPendingRequest(null);
      setErrorMessage(null);
      setTimeout(() => fileInputRef.current?.click(), 0);
      return;
    }

    setIsChecking(true);
    setErrorMessage(null);

    try {
      await runSituationAnalysis({
        ...pendingRequest,
        clarificationAnswers: {
          ...(pendingRequest.clarificationAnswers || {}),
          evidence_choice: answer
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not continue this check. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ((!message.trim() && !file) || isChecking) return;

    setIsChecking(true);
    setErrorMessage(null);

    try {
      let extracted = "";
      let extractData: EvidenceExtractResult | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const extractResponse = await fetch("/api/extract", { method: "POST", body: formData });
        extractData = (await extractResponse.json()) as EvidenceExtractResult;
        extracted = extractData.extractedText || "";
        setEvidenceResult(extractData);
        setExtractedText(extracted);
      }

      const body: SituationAnalyzeRequest = {
        message,
        city,
        language,
        incidentDateIso: new Date(`${incidentDate}T12:00:00+07:00`).toISOString(),
        evidenceText: extracted,
        evidenceRelevance: extractData?.detectedFields
          ? {
              topic: extractData.detectedFields.evidence_topic,
              relevance: extractData.detectedFields.relevance,
              reason: extractData.detectedFields.relevance_reason,
              usable_as_case_evidence: extractData.detectedFields.usable_as_case_evidence
            }
          : undefined,
        userLocation: userLocation ?? undefined,
        attachmentsMetadata: file ? [{ name: file.name, type: file.type, size: file.size }] : []
      };

      await runSituationAnalysis(body);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not check this situation. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  function handleUseLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError(t.locationNotSupported);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "browser"
        });
        setDemoLocationId("none");
        setIsLocating(false);
      },
      (error) => {
        setLocationError(error.message || t.locationReadError);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  function openTour() {
    setTourStepIndex(0);
    setIsTourOpen(true);
  }

  function closeTour(markSeen = true) {
    setIsTourOpen(false);
    if (markSeen && typeof window !== "undefined") {
      window.localStorage.setItem(riskCheckTourStorageKey, "true");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">{t.riskCheckKicker}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#242424]">{t.mainTitle}</h1>
        </div>
        <button
          type="button"
          onClick={openTour}
          className="inline-flex items-center gap-2 rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm font-semibold text-[#242424] shadow-card transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
        >
          <Sparkles className="h-4 w-4" />
          {t.guideButton}
        </button>
      </div>

      <ContextBar
        city={city}
        setCity={setCity}
        incidentDate={incidentDate}
        setIncidentDate={setIncidentDate}
        demoLocationId={demoLocationId}
        setDemoLocationId={handleDemoLocationChange}
        userLocation={userLocation}
        isLocating={isLocating}
        locationError={locationError}
        onUseLocation={handleUseLocation}
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <FormPanel
          message={message}
          setMessage={setMessage}
          textareaRef={textareaRef}
          file={file}
          previewUrl={previewUrl}
          extractedText={extractedText}
          evidenceResult={evidenceResult}
          chooseFile={chooseFile}
          fileInputRef={fileInputRef}
          dropZoneRef={dropZoneRef}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onDrop={onDrop}
          onSubmit={handleSubmit}
          isChecking={isChecking}
        />

        <div className="min-w-0" data-tour-id="result-area">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#A4262C]/30 bg-[#FBE9EA] px-4 py-3 text-sm text-[#A4262C]">
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">{t.checkFailed}</p>
                <p className="mt-1 text-[#7A1F25]">{errorMessage}</p>
              </div>
            </div>
          )}

          {isChecking ? (
            <ResultSkeleton stage={t.loadingStages[stageIndex]} />
          ) : pendingClarification ? (
            <ClarificationPanel
              clarification={pendingClarification}
              answer={clarificationAnswer}
              setAnswer={setClarificationAnswer}
              onAnswer={answerClarification}
            />
          ) : pendingMismatch ? (
            <EvidenceMismatchPanel mismatch={pendingMismatch} onAnswer={answerEvidenceMismatch} />
          ) : outOfScope ? (
            <OutOfScopePanel response={outOfScope} onPickSample={handlePickSample} />
          ) : result ? (
            <ResultPanel key={resultKey} result={result} city={city} onNewCheck={handleNewCheck} />
          ) : (
            <EmptyState onPickSample={handlePickSample} />
          )}
        </div>
      </div>

      <QuickTourModal
        open={isTourOpen}
        stepIndex={tourStepIndex}
        setStepIndex={setTourStepIndex}
        onClose={() => closeTour(true)}
      />
    </div>
  );
}

type ContextBarProps = {
  city: string;
  setCity: (v: string) => void;
  incidentDate: string;
  setIncidentDate: (v: string) => void;
  demoLocationId: string;
  setDemoLocationId: (v: string) => void;
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationError: string;
  onUseLocation: () => void;
};

function ContextBar({
  city,
  setCity,
  incidentDate,
  setIncidentDate,
  demoLocationId,
  setDemoLocationId,
  userLocation,
  isLocating,
  locationError,
  onUseLocation
}: ContextBarProps) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <section data-tour-id="context-bar" className="mb-5 rounded-lg border border-[#E1E1E1] bg-white p-3 shadow-card">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.city} icon={<MapPin className="h-3.5 w-3.5" />}>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-[#E1E1E1] bg-white px-2 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
            >
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label={t.date} icon={<FileText className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full rounded-md border border-[#E1E1E1] bg-white px-2 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
            />
          </Field>
        </div>

        <Field label={t.locationContext} icon={<MapPin className="h-3.5 w-3.5" />}>
          <select
            value={demoLocationId}
            onChange={(e) => setDemoLocationId(e.target.value)}
            className="w-full rounded-md border border-[#E1E1E1] bg-white px-2 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          >
            {demoLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="button"
          onClick={onUseLocation}
          disabled={isLocating}
          className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4] disabled:cursor-not-allowed disabled:text-[#9A9A9A]"
        >
          {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          {t.useGps}
        </button>
      </div>

      {(userLocation || locationError) && (
        <div className="mt-2">
          {userLocation && (
            <p className="rounded-md bg-[#EFF6FC] px-2.5 py-1.5 text-[11px] font-medium text-[#0B5394]">
              {t.locationSet} {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </p>
          )}
          {locationError && (
            <p className="rounded-md bg-[#FBE9EA] px-2.5 py-1.5 text-[11px] font-medium text-[#A4262C]">{locationError}</p>
          )}
        </div>
      )}
    </section>
  );
}

type FormPanelProps = {
  message: string;
  setMessage: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  file: File | null;
  previewUrl: string | null;
  extractedText: string;
  evidenceResult: EvidenceExtractResult | null;
  chooseFile: (f: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onSubmit: (e: FormEvent) => void;
  isChecking: boolean;
};

function FormPanel(props: FormPanelProps) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const {
    message, setMessage, textareaRef,
    file, previewUrl, extractedText, evidenceResult, chooseFile, fileInputRef, dropZoneRef,
    isDragging, setIsDragging, onDrop, onSubmit, isChecking
  } = props;

  return (
    <form onSubmit={onSubmit} className="lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:self-start">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0078D4] text-white shadow-card">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold leading-tight text-[#242424]">{t.appTitle}</p>
          <p className="text-xs font-medium text-[#616161]">{t.appSubtitle}</p>
        </div>
      </div>

      <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <Card title={t.describeSituationTitle} dataTourId="describe-situation">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.situationPlaceholder}
            rows={5}
            className="min-h-[170px] w-full resize-y rounded-md border border-[#E1E1E1] bg-white px-3 py-3 text-sm leading-relaxed text-[#242424] placeholder:text-[#9A9A9A] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          />
        </Card>

        <Card title={t.addEvidenceTitle} optional dataTourId="add-evidence">
          <div
            ref={dropZoneRef}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-5 text-center transition ${
              isDragging
                ? "border-[#0078D4] bg-[#EFF6FC]"
                : file
                ? "border-[#E1E1E1] bg-[#FAFAFA]"
                : "border-[#E1E1E1] bg-white hover:border-[#0078D4] hover:bg-[#F5FAFD]"
            }`}
          >
            {!file ? (
              <>
                <Upload className="h-5 w-5 text-[#0078D4]" />
                <p className="text-sm font-medium text-[#242424]">{t.dropEvidence}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
                >
                  {t.browseFiles}
                </button>
                <p className="mt-1 text-[11px] text-[#9A9A9A]">{t.fileFormats}</p>
              </>
            ) : (
              <div className="flex w-full flex-col items-stretch gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E1E1E1] bg-[#F3F2F1]">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="h-6 w-6 text-[#616161]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-[#242424]">{file.name}</p>
                    <p className="text-xs text-[#616161]">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => chooseFile(null)}
                    className="rounded-md p-1.5 text-[#616161] transition hover:bg-[#F3F2F1] hover:text-[#A4262C]"
                    aria-label="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {extractedText && (
                  <div className="rounded-md bg-[#F3F2F1] px-3 py-2 text-left text-xs leading-5 text-[#616161]">
                    <span className="font-semibold text-[#242424]">{t.extractedLabel} </span>
                    {extractedText.slice(0, 80)}
                    {extractedText.length > 80 && "…"}
                  </div>
                )}
                {evidenceResult && <EvidenceReadout evidence={evidenceResult} />}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-[#E1E1E1] bg-[#FAF9F8]/95 pt-3 backdrop-blur lg:shrink-0">
        <button
          type="submit"
          disabled={isChecking || (!message.trim() && !file)}
          className="group flex w-full items-center justify-center gap-2 rounded-md bg-[#0078D4] px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-[#106EBE] hover:shadow-elevated active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#BDBDBD] disabled:shadow-none"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.analyzing}
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              {t.checkRisk}
            </>
          )}
        </button>

        <p className="mt-2 pb-1 text-center text-[11px] font-medium text-[#9A9A9A]">
          {t.poweredBy}
        </p>
      </div>
    </form>
  );
}

function Card({ title, optional, children, dataTourId }: { title: string; optional?: boolean; children: ReactNode; dataTourId?: string }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <section data-tour-id={dataTourId} className="mb-4 rounded-lg border border-[#E1E1E1] bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#242424]">{title}</h2>
        {optional && (
          <span className="rounded-xl bg-[#F3F2F1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#616161]">
            {t.optionalLabel}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#616161]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState({ onPickSample }: { onPickSample: (text: string) => void }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-[#E1E1E1] bg-white px-6 py-14 text-center shadow-card">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FC]">
        <Shield className="h-8 w-8 text-[#0078D4]" />
      </div>
      <h2 className="text-lg font-semibold text-[#242424]">{t.readyToCheck}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#616161]">
        {t.emptyStateDesc}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {t.sampleChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onPickSample(chip.text)}
            className="rounded-xl border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
          >
            <Sparkles className="mr-1.5 inline-block h-3 w-3 -translate-y-px text-[#0078D4]" />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClarificationPanel({
  clarification,
  answer,
  setAnswer,
  onAnswer
}: {
  clarification: PendingClarification;
  answer: string;
  setAnswer: (value: string) => void;
  onAnswer: (answer: string) => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const visibleSuggestions = clarification.suggested_answers.filter((suggested) => {
    if (clarification.clarification_key !== "venue_location") return true;
    return !/share.*restaurant name|type.*restaurant name|can share.*location|can type/i.test(suggested);
  });
  const isVenueLocation = clarification.clarification_key === "venue_location";

  return (
    <article className="animate-fadein rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FC] text-[#0078D4]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">{t.oneDetailNeeded}</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{clarification.question}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#616161]">{clarification.reason}</p>
        </div>
      </div>

      {visibleSuggestions.length > 0 && (
        <div className="mt-6 grid gap-2">
          {visibleSuggestions.map((suggested) => (
            <button
              key={suggested}
              type="button"
              onClick={() => onAnswer(suggested)}
              className="rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
            >
              {suggested}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-md border border-[#E1E1E1] bg-[#FAFAFA] p-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#616161]">
          {isVenueLocation ? t.typeVenueName : t.orTypeAnswer}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAnswer(answer);
            }}
            placeholder={isVenueLocation ? t.venuePlaceholder : t.answerPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/30"
          />
          <button
            type="button"
            onClick={() => onAnswer(answer)}
            disabled={!answer.trim()}
            className="rounded-md bg-[#0078D4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#106EBE] disabled:cursor-not-allowed disabled:bg-[#BDBDBD]"
          >
            {t.continueBtn}
          </button>
        </div>
      </div>
    </article>
  );
}

function EvidenceMismatchPanel({ mismatch, onAnswer }: { mismatch: PendingMismatch; onAnswer: (answer: string) => void }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <article className="animate-fadein rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF4CE] text-[#7A5A00]">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A5A00]">{t.evidenceMismatchLabel}</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{mismatch.question}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#616161]">{mismatch.reason}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-xl bg-[#EFF6FC] px-2.5 py-1 font-semibold text-[#0B5394]">
              {t.messageTopic} {formatEvidenceTopic(mismatch.message_topic, t.categoryLabels)}
            </span>
            <span className="rounded-xl bg-[#FBEAE0] px-2.5 py-1 font-semibold text-[#B5340A]">
              {t.evidenceTopic} {formatEvidenceTopic(mismatch.evidence_topic, t.categoryLabels)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-2">
        {mismatch.suggested_answers.map((suggested) => (
          <button
            key={suggested}
            type="button"
            onClick={() => onAnswer(suggested)}
            className="rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
          >
            {suggested}
          </button>
        ))}
      </div>
    </article>
  );
}

function OutOfScopePanel({ response, onPickSample }: { response: OutOfScopeSituation; onPickSample: (text: string) => void }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <article className="animate-fadein rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FC] text-[#0078D4]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">{t.outsideScope}</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{t.outOfScopeTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#616161]">{response.message}</p>
          {response.evidence_relevance && (
            <p className="mt-3 rounded-md bg-[#FAFAFA] px-3 py-2 text-xs leading-relaxed text-[#616161]">
              Evidence: {response.evidence_relevance.reason}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 grid gap-2">
        {response.suggested_next_inputs.map((suggested) => (
          <button
            key={suggested}
            type="button"
            onClick={() => onPickSample(suggested)}
            className="rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4] hover:bg-[#F5FAFD] hover:text-[#0078D4]"
          >
            {suggested}
          </button>
        ))}
      </div>
    </article>
  );
}

function EvidenceReadout({ evidence }: { evidence: EvidenceExtractResult }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const { detectedFields } = evidence;
  const sourceLabel = detectedFields.source === "azure-document-intelligence" ? t.evidenceSourceAzure : t.evidenceSourceDemo;
  const relevanceLabel =
    detectedFields.relevance === "relevant"
      ? t.evidenceQualityRelevant
      : detectedFields.relevance === "weak"
        ? t.evidenceQualityWeak
        : t.evidenceQualityIgnored;
  const relevanceClass =
    detectedFields.relevance === "relevant"
      ? "border-[#CFE8D1] bg-[#F1FAF1] text-[#107C10]"
      : detectedFields.relevance === "weak"
        ? "border-[#F7E5A1] bg-[#FFF8D6] text-[#7A5A00]"
        : "border-[#E1E1E1] bg-[#FAFAFA] text-[#616161]";
  const hintRows = [
    [t.evidenceHintPrices, detectedFields.hints.prices],
    [t.evidenceHintAccounts, detectedFields.hints.account_names],
    [t.evidenceHintBusinesses, detectedFields.hints.business_names],
    [t.evidenceHintPlaces, detectedFields.hints.place_names],
    [t.evidenceHintRiskPhrases, detectedFields.hints.risky_phrases],
    [t.evidenceHintDates, detectedFields.hints.visible_dates]
  ] as const;

  return (
    <div className="rounded-md border border-[#E1E1E1] bg-white p-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#242424]">{t.evidenceReadoutTitle}</p>
        <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
          {sourceLabel}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`rounded-xl border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${relevanceClass}`}>
          {relevanceLabel}
        </span>
        <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
          {formatEvidenceTopic(detectedFields.evidence_topic, t.categoryLabels)}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#616161]">{detectedFields.relevance_reason}</p>
      {detectedFields.note && (
        <p className="mt-2 rounded-md bg-[#FFF4CE] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#7A5A00]">
          {detectedFields.note}
        </p>
      )}
      <div className="mt-3 max-h-24 overflow-y-auto rounded-md bg-[#FAFAFA] px-3 py-2 text-[11px] leading-5 text-[#616161]">
        {evidence.extractedText || t.evidenceNoText}
      </div>
      <div className="mt-3 grid gap-2">
        {hintRows.map(([label, values]) => (
          values.length > 0 && (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">{label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {values.slice(0, 6).map((value) => (
                  <span key={value} className="rounded-xl bg-[#EFF6FC] px-2 py-0.5 text-[10px] font-medium text-[#0B5394]">
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function ResultSkeleton({ stage }: { stage: string }) {
  return (
    <div className="rounded-lg border border-[#E1E1E1] bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#0078D4]" />
        <p className="text-sm font-medium text-[#242424] transition-opacity duration-300">{stage}</p>
      </div>
      <div className="animate-skeleton space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 rounded-md bg-[#F3F2F1]" />
          <div className="h-9 w-20 rounded-md bg-[#F3F2F1]" />
        </div>
        <div className="h-7 w-2/3 rounded-md bg-[#F3F2F1]" />
        <div className="h-4 w-24 rounded-xl bg-[#F3F2F1]" />
        <div className="space-y-2 pt-4">
          <div className="h-4 w-full rounded bg-[#F3F2F1]" />
          <div className="h-4 w-11/12 rounded bg-[#F3F2F1]" />
          <div className="h-4 w-3/4 rounded bg-[#F3F2F1]" />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4">
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
          <div className="h-16 rounded-md bg-[#F3F2F1]" />
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result, city, onNewCheck }: { result: RiskCheckResult; city: string; onNewCheck: () => void }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const theme = riskTheme[result.risk_level];
  const score = riskScoreFor(result);
  const [showLargePhrase, setShowLargePhrase] = useState(false);
  const [reportEvidence, setReportEvidence] = useState<ReportEvidenceItem[]>(() => createReportEvidence(result.evidence_to_save));

  return (
    <article className="animate-fadein overflow-hidden rounded-lg border border-[#E1E1E1] bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E1E1] bg-white px-5 py-3 sm:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">{t.assessmentComplete}</p>
          <p className="mt-0.5 text-sm font-semibold text-[#242424]">{result.category}</p>
        </div>
        <button
          type="button"
          onClick={onNewCheck}
          className="inline-flex items-center gap-2 rounded-md border border-[#0078D4] bg-white px-3 py-2 text-xs font-semibold text-[#0078D4] transition hover:bg-[#EFF6FC]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.newCheck}
        </button>
      </div>
      <HeroSection result={result} theme={theme} score={score} city={city} />

      <div className="space-y-7 px-6 py-6 sm:px-7">
        <Section title={t.whyRisky}>
          <p className="text-sm leading-relaxed text-[#424242]">{result.why_it_matters}</p>
        </Section>

        <SignalsSection signals={result.suspicious_signals} theme={theme} />

        <GroundingDetailsSection result={result} />

        <CaseSpecificCardsSection result={result} />

        <ActionsSection actions={result.safe_next_steps} />

        <ThaiPhraseCard phrase={result.thai_phrase} onShowLarge={() => setShowLargePhrase(true)} />

        <EvidenceChecklist items={reportEvidence} onChange={setReportEvidence} />

        <ContactSection contactRecommendation={result.contact_recommendation} riskLevel={result.risk_level} />

        <div data-tour-id="incident-report">
          <IncidentReportSection result={result} category={result.category} city={city} evidence={reportEvidence} />
        </div>
      </div>

      <FooterDisclaimer source={result.source} />

      {showLargePhrase && (
        <LargePhraseModal phrase={result.thai_phrase} onClose={() => setShowLargePhrase(false)} />
      )}
    </article>
  );
}

type PriceComparison = {
  item_name: string;
  listed_price_baht: number;
  normal_range_baht: [number, number];
  tier_label: string;
  result: "within" | "above" | "far_above";
  price_ratio_to_reference?: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

function GroundingDetailsSection({ result }: { result: RiskCheckResult }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const foodSignal = result.grounding?.find((signal) => signal.tool === "food_price_reference");
  const fareSignal = result.grounding?.find((signal) => signal.tool === "fare_reference");
  const routeSignal = result.grounding?.find((signal) => signal.tool === "route_distance");
  const priceComparisons = getPriceComparisons(foodSignal?.metadata);
  const taxiGrounding = getTaxiGrounding(fareSignal?.metadata, routeSignal?.metadata);

  if (priceComparisons.length === 0 && !taxiGrounding) return null;

  return (
    <Section title={t.groundingDetails}>
      <div className="grid gap-3">
        {priceComparisons.length > 0 && (
          <div className="overflow-hidden rounded-md border border-[#E1E1E1] bg-white">
            <div className="border-b border-[#E1E1E1] bg-[#FAFAFA] px-4 py-3">
              <p className="text-sm font-semibold text-[#242424]">{t.menuPriceComparison}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#616161]">
                {t.menuPriceComparisonSubtitle(foodSignal?.metadata?.likely_tier_label as string || "the likely venue tier")}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E1E1E1] text-left text-xs">
                <thead className="bg-white text-[#616161]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">{t.tableItem}</th>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">{t.tableListed}</th>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">{t.tableNormalRange}</th>
                    <th className="whitespace-nowrap px-4 py-2 font-semibold">{t.tableStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F2F1]">
                  {priceComparisons.map((comparison) => (
                    <tr key={`${comparison.item_name}-${comparison.listed_price_baht}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#242424]">{comparison.item_name}</p>
                        <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-[#616161]">{comparison.explanation}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#242424]">
                        {comparison.listed_price_baht} THB
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#616161]">
                        {comparison.normal_range_baht[0]}-{comparison.normal_range_baht[1]} THB
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <GroundingBadge status={comparison.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {taxiGrounding && (
          <div className="rounded-md border border-[#E1E1E1] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#242424]">{t.taxiRouteFare}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#616161]">
                  {taxiGrounding.origin && taxiGrounding.destination
                    ? `${taxiGrounding.origin} to ${taxiGrounding.destination}`
                    : t.taxiMeterRule}
                </p>
              </div>
              <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                {taxiGrounding.source === "azure_maps" ? t.taxiSourceAzureMaps : taxiGrounding.source === "curated" ? t.taxiSourceCurated : t.taxiSourceFallback}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label={t.distanceLabel} value={taxiGrounding.distance ? `${taxiGrounding.distance.toFixed(1)} km` : t.distanceUnknown} />
              <Metric label={t.expectedMeter} value={taxiGrounding.estimate ? `${taxiGrounding.estimate[0]}-${taxiGrounding.estimate[1]} THB` : t.meterRuleOnly} />
              <Metric label={t.quotedFare} value={taxiGrounding.quoted ? `${taxiGrounding.quoted} THB` : t.fareNotProvided} />
              <Metric label={t.overBaseline} value={taxiGrounding.ratio ? `${taxiGrounding.ratio}x` : t.ratioUnknown} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function CaseSpecificCardsSection({ result }: { result: RiskCheckResult }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const signals = result.grounding || [];
  const cards = [
    buildOperatorCard(signals.find((signal) => signal.tool === "operator_payment_reference"), t),
    buildQrCard(signals.find((signal) => signal.tool === "qr_payment_reference"), t),
    buildRentalDocumentCard(signals.find((signal) => signal.tool === "rental_document_reference"), t),
    buildDamageClaimCard(signals.find((signal) => signal.tool === "damage_claim_reference"), t),
    buildJobLureCard(signals.find((signal) => signal.tool === "job_lure_reference"), t)
  ].filter((card): card is CaseGuidanceCard => Boolean(card));

  if (cards.length === 0) return null;

  return (
    <Section title={t.caseSpecificGuidance}>
      <div className="grid gap-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-md border border-[#E1E1E1] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#242424]">{card.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#616161]">{card.summary}</p>
              </div>
              <span className="rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                {card.badge}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {card.checks.map((check) => (
                <GuidanceCheck key={check.label} {...check} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

type CaseGuidanceCheck = {
  label: string;
  value: string;
  active: boolean;
};

type CaseGuidanceCard = {
  title: string;
  summary: string;
  badge: string;
  checks: CaseGuidanceCheck[];
};

function GuidanceCheck({ label, value, active }: CaseGuidanceCheck) {
  return (
    <div className={`rounded-md border px-3 py-2.5 ${active ? "border-[#D83B01]/30 bg-[#FBEAE0]" : "border-[#E1E1E1] bg-[#FAFAFA]"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-[#B5340A]" : "text-[#616161]"}`}>{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#242424]">{value}</p>
    </div>
  );
}

function buildOperatorCard(signal: GroundingSignal | undefined, t: typeof translations.en): CaseGuidanceCard | null {
  if (!signal) return null;
  const c = t.operatorCard;
  return {
    title: c.title, summary: c.summary, badge: c.badge,
    checks: [
      { label: c.advancePayment.label, value: asBoolean(signal.metadata?.has_full_advance_payment) ? c.advancePayment.yes : c.advancePayment.no, active: asBoolean(signal.metadata?.has_full_advance_payment) },
      { label: c.accountIdentity.label, value: asBoolean(signal.metadata?.has_personal_account) ? c.accountIdentity.yes : c.accountIdentity.no, active: asBoolean(signal.metadata?.has_personal_account) },
      { label: c.licenseProof.label, value: asBoolean(signal.metadata?.has_missing_license) ? c.licenseProof.yes : c.licenseProof.no, active: asBoolean(signal.metadata?.has_missing_license) },
      { label: c.saferPath.label, value: c.saferPath.value, active: false }
    ]
  };
}

function buildQrCard(signal: GroundingSignal | undefined, t: typeof translations.en): CaseGuidanceCard | null {
  if (!signal) return null;
  const c = t.qrCard;
  return {
    title: c.title, summary: c.summary, badge: c.badge,
    checks: [
      { label: c.accountMatch.label, value: asBoolean(signal.metadata?.has_account_mismatch) ? c.accountMatch.yes : c.accountMatch.no, active: asBoolean(signal.metadata?.has_account_mismatch) },
      { label: c.receipt.label, value: c.receipt.value, active: false },
      { label: c.disputeRisk.label, value: c.disputeRisk.value, active: true },
      { label: c.saferPath.label, value: c.saferPath.value, active: false }
    ]
  };
}

function buildRentalDocumentCard(signal: GroundingSignal | undefined, t: typeof translations.en): CaseGuidanceCard | null {
  if (!signal) return null;
  const c = t.rentalCard;
  return {
    title: c.title, summary: c.summary, badge: c.badge,
    checks: [
      { label: c.passport.label, value: asBoolean(signal.metadata?.has_original_passport_request) ? c.passport.yes : c.passport.no, active: asBoolean(signal.metadata?.has_original_passport_request) },
      { label: c.alternative.label, value: c.alternative.value, active: false },
      { label: c.beforeUse.label, value: c.beforeUse.value, active: false },
      { label: c.paperTrail.label, value: c.paperTrail.value, active: false }
    ]
  };
}

function buildDamageClaimCard(signal: GroundingSignal | undefined, t: typeof translations.en): CaseGuidanceCard | null {
  if (!signal) return null;
  const amount = asNumber(signal.metadata?.damage_amount_baht);
  const severity = asString(signal.metadata?.damage_amount_severity);
  const ratio = asNumber(signal.metadata?.amount_ratio_to_minor_damage_reference);
  const c = t.damageCard;
  return {
    title: c.title, summary: c.summary, badge: c.badge,
    checks: [
      { label: c.demandAmount.label, value: amount ? c.demandAmountValue(amount, ratio) : c.demandAmount.noAmount, active: Boolean(amount && severity && ["large", "extreme"].includes(severity)) },
      { label: c.cashDemand.label, value: (asBoolean(signal.metadata?.has_large_cash_demand) || asBoolean(signal.metadata?.has_immediate_cash_payment)) ? c.cashDemand.yes : c.cashDemand.no, active: asBoolean(signal.metadata?.has_large_cash_demand) || asBoolean(signal.metadata?.has_immediate_cash_payment) },
      { label: c.receipt.label, value: asBoolean(signal.metadata?.has_no_receipt) ? c.receipt.yes : c.receipt.no, active: asBoolean(signal.metadata?.has_no_receipt) },
      { label: c.neutralProcess.label, value: c.neutralProcess.value, active: false },
      { label: c.ifPressured.label, value: c.ifPressured.value, active: true }
    ]
  };
}

function buildJobLureCard(signal: GroundingSignal | undefined, t: typeof translations.en): CaseGuidanceCard | null {
  if (!signal) return null;
  const c = t.jobLureCard;
  return {
    title: c.title, summary: c.summary, badge: c.badge,
    checks: [
      { label: c.controlledPickup.label, value: asBoolean(signal.metadata?.has_controlled_pickup) ? c.controlledPickup.yes : c.controlledPickup.no, active: asBoolean(signal.metadata?.has_controlled_pickup) },
      { label: c.borderTravel.label, value: asBoolean(signal.metadata?.has_border_travel) ? c.borderTravel.yes : c.borderTravel.no, active: asBoolean(signal.metadata?.has_border_travel) },
      { label: c.secrecy.label, value: asBoolean(signal.metadata?.has_secrecy_instruction) ? c.secrecy.yes : c.secrecy.no, active: asBoolean(signal.metadata?.has_secrecy_instruction) },
      { label: c.stopAction.label, value: c.stopAction.value, active: true }
    ]
  };
}

function GroundingBadge({ status }: { status: PriceComparison["result"] }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const style =
    status === "within"
      ? { label: t.priceNormal, bg: "#E8F5E9", text: "#107C10" }
      : status === "above"
      ? { label: t.priceSlightlyHigh, bg: "#FFF4CE", text: "#7A5A00" }
      : { label: t.priceUnusuallyHigh, bg: "#FBE9EA", text: "#A4262C" };

  return (
    <span className="rounded-xl px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: style.bg, color: style.text }}>
      {style.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#FAFAFA] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#616161]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#242424]">{value}</p>
    </div>
  );
}

function getPriceComparisons(metadata: Record<string, unknown> | undefined): PriceComparison[] {
  const raw = metadata?.price_comparisons;
  if (!Array.isArray(raw)) return [];

  return raw.filter((item): item is PriceComparison => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<PriceComparison>;
    return (
      typeof candidate.item_name === "string" &&
      typeof candidate.listed_price_baht === "number" &&
      Array.isArray(candidate.normal_range_baht) &&
      candidate.normal_range_baht.length === 2 &&
      typeof candidate.normal_range_baht[0] === "number" &&
      typeof candidate.normal_range_baht[1] === "number" &&
      typeof candidate.tier_label === "string" &&
      (candidate.result === "within" || candidate.result === "above" || candidate.result === "far_above") &&
      typeof candidate.explanation === "string"
    );
  });
}

function getTaxiGrounding(fareMetadata?: Record<string, unknown>, routeMetadata?: Record<string, unknown>) {
  if (!fareMetadata && !routeMetadata) return null;

  const estimate = asNumberPair(fareMetadata?.taxi_meter_estimate_baht ?? fareMetadata?.baseline_range_baht);
  const distance = asNumber(routeMetadata?.route_distance_km ?? fareMetadata?.route_distance_km);
  const quoted = asNumber(fareMetadata?.quoted_fare_baht);
  const ratio = asNumber(fareMetadata?.fare_ratio_to_baseline);
  const source = asString(routeMetadata?.grounding_source ?? fareMetadata?.grounding_source) || "fallback";

  if (!estimate && !distance && !quoted) return null;

  return {
    estimate,
    distance,
    quoted,
    ratio,
    source,
    origin: asString(routeMetadata?.route_origin ?? fareMetadata?.route_origin),
    destination: asString(routeMetadata?.route_destination ?? fareMetadata?.route_destination)
  };
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function asNumberPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  return typeof value[0] === "number" && typeof value[1] === "number" ? [value[0], value[1]] : null;
}

function HeroSection({
  result,
  theme,
  score,
  city
}: {
  result: RiskCheckResult;
  theme: RiskTheme;
  score: number;
  city: string;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const Icon = theme.Icon;
  return (
    <header
      className="relative px-6 pb-6 pt-7 sm:px-7"
      style={{ backgroundColor: theme.softBg }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold tracking-wider text-white ${
            theme.pulse ? "animate-pulse-emergency" : ""
          }`}
          style={{ backgroundColor: theme.hex }}
        >
          <Icon className="h-4 w-4" />
          {t.riskLevels[result.risk_level] ?? theme.label}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#616161]">{t.riskScore}</p>
          <p className="leading-none">
            <span className="text-3xl font-semibold" style={{ color: theme.text }}>{score}</span>
            <span className="ml-1 text-sm font-medium text-[#616161]">/100</span>
          </p>
        </div>
      </div>
      <h2 className="mt-4 text-xl font-semibold leading-snug text-[#242424] sm:text-2xl">
        {humanHeadline(result, city, t)}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: theme.ring, color: theme.text }}
        >
          {result.category}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E1E1] bg-white px-2.5 py-1 text-xs font-medium text-[#616161]">
          <MapPin className="h-3 w-3" />
          {city}
        </span>
      </div>
    </header>
  );
}

function humanHeadline(result: RiskCheckResult, city: string, t: typeof translations.en): string {
  if (result.risk_level === "Emergency") return t.headlines.emergency(result.category, city);
  if (result.risk_level === "High") return t.headlines.high(result.category);
  if (result.risk_level === "Caution") return t.headlines.caution(result.category);
  return t.headlines.low;
}

function Section({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-[#242424]">{title}</h3>
        {typeof count === "number" && (
          <span className="text-xs font-medium text-[#616161]">
            {t.signalsDetected(count)}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function SignalsSection({ signals, theme }: { signals: string[]; theme: RiskTheme }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  if (signals.length === 0) {
    return (
      <Section title={t.detectedSignals} count={0}>
        <p className="rounded-md border border-[#E1E1E1] bg-[#FAFAFA] px-3 py-3 text-sm text-[#616161]">
          {t.noSignals}
        </p>
      </Section>
    );
  }
  return (
    <Section title={t.detectedSignals} count={signals.length}>
      <ul className="grid gap-2">
        {signals.map((signal) => (
          <li
            key={signal}
            className="flex items-start gap-3 rounded-md border border-[#E1E1E1] bg-white px-3 py-2.5 text-sm text-[#242424] transition hover:border-[#0078D4]/40 hover:bg-[#F5FAFD]"
          >
            <span
              className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: theme.hex }}
            />
            <span className="leading-relaxed capitalize">{signal}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ActionsSection({ actions }: { actions: string[] }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <Section title={t.recommendedActions}>
      <ol className="grid gap-2.5">
        {actions.map((action, idx) => {
          const priority = actionPriority(action);
          const style = priorityStyles[priority];
          return (
            <li
              key={`${idx}-${action.slice(0, 24)}`}
              className="flex items-start gap-3 rounded-md border border-[#E1E1E1] bg-white px-3 py-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F2F1] text-xs font-semibold text-[#242424]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-[#242424]">{action}</p>
              </div>
              <span
                className="ml-2 shrink-0 rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {t.priorities[priority]}
              </span>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function ThaiPhraseCard({ phrase, onShowLarge }: { phrase: string; onShowLarge: () => void }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [copied, setCopied] = useState(false);
  async function copyPhrase() {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }
  return (
    <Section title={t.showInThai}>
      <div className="rounded-lg border border-[#0078D4]/20 bg-[#EFF6FC] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0078D4]">{t.showPhone}</p>
        <p className="mt-2 text-xl font-semibold leading-snug text-[#242424]">{phrase}</p>
        <p className="mt-2 text-xs text-[#616161]">
          {t.neutralPhrasing}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyPhrase}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? t.copied : t.copy}
          </button>
          <button
            type="button"
            onClick={onShowLarge}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#0078D4] bg-[#0078D4] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#106EBE]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t.showLarge}
          </button>
        </div>
      </div>
    </Section>
  );
}

function LargePhraseModal({ phrase, onClose }: { phrase: string; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadein"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl rounded-lg bg-white px-8 py-12 shadow-elevated sm:px-14 sm:py-16"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-2 text-[#616161] transition hover:bg-[#F3F2F1]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#0078D4]">{t.showToThai}</p>
        <p className="mt-6 text-center text-3xl font-semibold leading-snug text-[#242424] sm:text-4xl">
          {phrase}
        </p>
        <p className="mt-8 text-center text-xs text-[#616161]">{t.pressEscToClose}</p>
      </div>
    </div>
  );
}

function QuickTourModal({
  open,
  stepIndex,
  setStepIndex,
  onClose
}: {
  open: boolean;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const quickTourSteps = t.quickTourSteps;
  const step = quickTourSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === quickTourSteps.length - 1;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && !isLast) setStepIndex(stepIndex + 1);
      if (event.key === "ArrowLeft" && !isFirst) setStepIndex(stepIndex - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFirst, isLast, onClose, open, setStepIndex, stepIndex]);

  if (!open || !step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="quick-tour-title">
      <div className="w-full max-w-lg animate-fadein overflow-hidden rounded-lg border border-[#E1E1E1] bg-white shadow-elevated">
        <div className="border-b border-[#E1E1E1] bg-[#F5FAFD] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0078D4] text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0078D4]">{step.kicker}</p>
                <h2 id="quick-tour-title" className="mt-1 text-lg font-semibold leading-snug text-[#242424]">{step.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[#616161] transition hover:bg-white hover:text-[#242424]"
              aria-label="Close guide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-4 rounded-md border border-[#E1E1E1] bg-[#FAFAFA] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#616161]">{t.lookFor}</p>
            <p className="mt-1 text-sm font-semibold text-[#242424]">{step.target}</p>
          </div>
          <p className="text-sm leading-6 text-[#424242]">{step.body}</p>
          <div className="mt-5 flex gap-1.5" aria-label="Guide progress">
            {quickTourSteps.map((tourStep, index) => (
              <span
                key={tourStep.title}
                className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-[#0078D4]" : "bg-[#E1E1E1]"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E1E1] bg-[#FAFAFA] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-semibold text-[#616161] transition hover:bg-white hover:text-[#242424]"
          >
            {t.skip}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
              disabled={isFirst}
              className="rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-sm font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t.back}
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStepIndex(Math.min(quickTourSteps.length - 1, stepIndex + 1)))}
              className="rounded-md bg-[#0078D4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#106EBE]"
            >
              {isLast ? t.finish : t.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createReportEvidence(items: string[]): ReportEvidenceItem[] {
  return items.map((item, index) => ({
    id: `${index}-${item.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    label: item,
    saved: false,
    note: "",
    files: []
  }));
}

function EvidenceChecklist({
  items,
  onChange
}: {
  items: ReportEvidenceItem[];
  onChange: (items: ReportEvidenceItem[]) => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [customEvidence, setCustomEvidence] = useState("");

  function updateItem(id: string, updater: (item: ReportEvidenceItem) => ReportEvidenceItem) {
    onChange(items.map((item) => (item.id === id ? updater(item) : item)));
  }

  function clearItem(id: string) {
    updateItem(id, (item) => ({
      ...item,
      saved: false,
      note: "",
      files: []
    }));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function removeFile(id: string, fileIndex: number) {
    updateItem(id, (item) => ({
      ...item,
      files: item.files.filter((_, index) => index !== fileIndex)
    }));
  }

  function addCustomEvidence() {
    const label = customEvidence.trim();
    if (!label) return;
    onChange([
      ...items,
      {
        id: `custom-${Date.now()}`,
        label,
        saved: true,
        note: "",
        files: []
      }
    ]);
    setCustomEvidence("");
  }

  return (
    <Section title={t.evidenceToSave}>
      <ul className="grid gap-3">
        {items.map((item) => {
          const isCustom = item.id.startsWith("custom-");
          const hasUserInput = item.saved || item.note.trim() || item.files.length > 0;
          return (
            <li key={item.id} className="rounded-md border border-[#E1E1E1] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={item.saved}
                    onChange={(event) => updateItem(item.id, (current) => ({ ...current, saved: event.target.checked }))}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-[#C8C6C4] text-[#0078D4] focus:ring-[#0078D4]"
                  />
                  <span className={`leading-relaxed ${item.saved ? "font-semibold text-[#242424]" : "text-[#424242]"}`}>
                    {item.label}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => (isCustom ? removeItem(item.id) : clearItem(item.id))}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E1E1E1] bg-white text-[#616161] transition hover:border-[#D83B01]/40 hover:bg-[#FBEAE0] hover:text-[#B5340A] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isCustom ? t.tooltipDeleteEvidence : t.tooltipClearEvidence}
                  title={isCustom ? t.tooltipDeleteEvidence : t.tooltipClearEvidence}
                  disabled={!isCustom && !hasUserInput}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={item.note}
                  onChange={(event) => updateItem(item.id, (current) => ({ ...current, note: event.target.value }))}
                  placeholder={t.addNotePlaceholder}
                  className="min-w-0 rounded-md border border-[#E1E1E1] bg-[#FAFAFA] px-3 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20"
                />
                <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]">
                  <Paperclip className="h-3.5 w-3.5" />
                  {t.addFile}
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={async (event) => {
                      const input = event.currentTarget;
                      const files = await readReportEvidenceFiles(input.files);
                      if (files.length > 0) {
                        updateItem(item.id, (current) => ({
                          ...current,
                          saved: true,
                          files: [...current.files, ...files].slice(0, 6)
                        }));
                      }
                      input.value = "";
                    }}
                  />
                </label>
              </div>
              {item.files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.files.map((file, index) => (
                    <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-xl bg-[#EFF6FC] px-2 py-1 text-[11px] font-medium text-[#0B5394]">
                      <Paperclip className="h-3 w-3" />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeFile(item.id, index)}
                        className="ml-1 rounded-full p-0.5 text-[#0B5394] transition hover:bg-white hover:text-[#B5340A]"
                        aria-label={`Remove ${file.name}`}
                        title={t.tooltipRemoveFile}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-md border border-dashed border-[#C8C6C4] bg-[#FAFAFA] p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#616161]">{t.addEvidenceItemTitle}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={customEvidence}
            onChange={(event) => setCustomEvidence(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomEvidence();
              }
            }}
            placeholder={t.addCustomPlaceholder}
            className="min-w-0 rounded-md border border-[#E1E1E1] bg-white px-3 py-2 text-xs text-[#242424] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20"
          />
          <button
            type="button"
            onClick={addCustomEvidence}
            className="rounded-md bg-[#0078D4] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#106EBE] disabled:cursor-not-allowed disabled:bg-[#C8C6C4]"
            disabled={!customEvidence.trim()}
          >
            {t.addEvidence}
          </button>
        </div>
      </div>
    </Section>
  );
}

function readReportEvidenceFiles(fileList: FileList | null) {
  const files = Array.from(fileList || []);
  return Promise.all(
    files.map(
      (file) =>
        new Promise<ReportEvidenceItem["files"][number]>((resolve) => {
          const base = {
            name: file.name,
            type: file.type || "unknown",
            size: file.size
          };

          if (!file.type.startsWith("image/")) {
            resolve(base);
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              ...base,
              previewDataUrl: typeof reader.result === "string" ? reader.result : undefined
            });
          };
          reader.onerror = () => resolve(base);
          reader.readAsDataURL(file);
        })
    )
  );
}

function ContactSection({
  contactRecommendation,
  riskLevel
}: {
  contactRecommendation: string;
  riskLevel: RiskLevel;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const support = supportPlanFor(riskLevel, t);
  return (
    <Section title={t.recommendedSupport}>
      <div className="grid gap-3 sm:grid-cols-3">
        {support.map((item) => (
          <ContactCard
            key={item.title}
            title={item.title}
            subtitle={item.subtitle}
            value={item.value}
            icon={item.icon}
            highlight={item.highlight}
          />
        ))}
      </div>
      <p className="mt-3 rounded-md bg-[#FAFAFA] px-3 py-2.5 text-xs leading-relaxed text-[#616161]">
        {contactRecommendation}
      </p>
    </Section>
  );
}

function supportPlanFor(riskLevel: RiskLevel, t: typeof translations.en) {
  const icons = [<PhoneCall key="phone" className="h-4 w-4" />, <ShieldCheck key="shield" className="h-4 w-4" />, <AlertTriangle key="alert" className="h-4 w-4" />, <CheckCircle2 key="check" className="h-4 w-4" />];
  const planIcons: Record<string, typeof icons[number][]> = {
    emergency: [icons[0], icons[1], icons[2]],
    high: [icons[1], icons[3], icons[0]],
    caution: [icons[3], icons[1], icons[0]],
    low: [icons[3], icons[1], icons[2]]
  };
  const key = riskLevel.toLowerCase() as "emergency" | "high" | "caution" | "low";
  const plan = t.supportPlans[key] ?? t.supportPlans.low;
  const iconSet = planIcons[key] ?? planIcons.low;
  return plan.map((item, idx) => ({
    ...item,
    icon: iconSet[idx],
    highlight: idx === 0
  }));
}

function ContactCard({
  title,
  subtitle,
  value,
  icon,
  highlight
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight ? "border-[#0078D4] bg-[#EFF6FC]" : "border-[#E1E1E1] bg-white"
      }`}
    >
      <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
        highlight ? "text-[#0078D4]" : "text-[#616161]"
      }`}>
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[#242424]">{subtitle}</p>
      <p className={`mt-1 text-xs ${highlight ? "text-[#0B5394]" : "text-[#616161]"}`}>{value}</p>
    </div>
  );
}

function IncidentReportSection({
  result,
  category,
  city,
  evidence
}: {
  result: RiskCheckResult;
  category: string;
  city: string;
  evidence: ReportEvidenceItem[];
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"english" | "thai">("english");
  const [copied, setCopied] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
  const summary = result.incident_report_summary;
  const generatedAt = useMemo(() => new Date().toLocaleString(), []);
  const savedCount = evidence.filter((item) => item.saved || item.note.trim() || item.files.length > 0).length;
  const reportHtml = buildIncidentReportHtml(result, city, evidence, generatedAt, tab);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(buildPlainIncidentReport(result, city, evidence, generatedAt, tab, t));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  function generatePdf() {
    setReportStatus(t.printOpening);
    try {
      printIncidentReport(reportHtml);
      window.setTimeout(() => {
        setReportStatus(t.printFallback);
      }, 800);
    } catch {
      downloadPrintableReport(reportHtml, result.category);
      setReportStatus(t.printBlocked);
    }
  }

  return (
    <Section title={t.incidentReport}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-[#E1E1E1] bg-white px-4 py-3 text-left text-sm font-medium text-[#242424] transition hover:border-[#0078D4]/40 hover:bg-[#F5FAFD]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#0078D4]" />
          {t.viewReport}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#616161] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 animate-fadein rounded-md border border-[#E1E1E1] bg-white p-4">
          <div className="mb-3 inline-flex rounded-md border border-[#E1E1E1] bg-[#FAFAFA] p-0.5">
            <TabButton active={tab === "english"} onClick={() => setTab("english")}>{t.incidentTabLabel}</TabButton>
            <TabButton active={tab === "thai"} onClick={() => setTab("thai")}>{t.incidentTabThai}</TabButton>
          </div>
          <p className="rounded-md bg-[#FAFAFA] px-3 py-3 text-sm leading-relaxed text-[#242424]">
            {tab === "english" ? summary.english : summary.thai}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-[#616161]">
            <p className="font-semibold uppercase tracking-wider text-[#616161]">
              {tab === "english" ? t.reportKeyInfo : "ข้อมูลสำคัญ"}
            </p>
            <ul className="grid gap-1.5">
              <KeyFact label={tab === "english" ? t.reportCategory : "ประเภท"} value={tab === "english" ? category : thaiCategory(category)} />
              <KeyFact label={tab === "english" ? t.reportRiskLevel : "ระดับ"} value={tab === "english" ? result.risk_level : thaiRiskLevel(result.risk_level)} />
              <KeyFact label={tab === "english" ? t.reportCity : "เมือง"} value={city} />
              <KeyFact label={tab === "english" ? t.reportEvidence : "หลักฐาน"} value={`${savedCount}/${evidence.length}`} />
              <KeyFact label={tab === "english" ? t.reportTime : "เวลา"} value={generatedAt} />
            </ul>
          </div>
          <div className="mt-3 rounded-md border border-[#E1E1E1] bg-[#FAFAFA] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#616161]">
              {tab === "english" ? t.reportEvidenceIncluded : "หลักฐานที่จะใส่ในรายงาน"}
            </p>
            <ul className="mt-2 grid gap-1.5 text-xs text-[#424242]">
              {evidence.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">{item.saved ? (tab === "english" ? t.reportSaved : "บันทึกแล้ว") : (tab === "english" ? t.reportNotSaved : "ยังไม่บันทึก")}:</span>{" "}
                  {tab === "english" ? item.label : thaiEvidenceLabel(item.label)}
                  {item.note ? ` - ${tab === "english" ? t.reportNote : "หมายเหตุ"}: ${item.note}` : ""}
                  {item.files.length ? ` - ${tab === "english" ? t.reportFiles : "ไฟล์"}: ${item.files.map((file) => file.name).join(", ")}` : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyReport}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? t.copied : t.copyReport}
            </button>
            <button
              type="button"
              onClick={generatePdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0078D4] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#106EBE]"
            >
              <Download className="h-3.5 w-3.5" />
              {t.printSavePdf}
            </button>
            <button
              type="button"
              onClick={() => {
                downloadPrintableReport(reportHtml, result.category);
                setReportStatus(t.printDownloaded);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E1E1E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition hover:border-[#0078D4] hover:text-[#0078D4]"
            >
              <FileText className="h-3.5 w-3.5" />
              {t.downloadReport}
            </button>
          </div>
          {reportStatus && (
            <p className="mt-3 rounded-md bg-[#EFF6FC] px-3 py-2 text-xs leading-relaxed text-[#0B5394]">
              {reportStatus}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

function printIncidentReport(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "TrustPass printable incident report");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDocument || !iframe.contentWindow) {
    iframe.remove();
    throw new Error("Printable report frame was not available.");
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1500);
  }, 250);
}

function downloadPrintableReport(html: string, category: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trustpass-${toFileSlug(category)}-incident-report.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toFileSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "tourist-safety";
}

function buildPlainIncidentReport(
  result: RiskCheckResult,
  city: string,
  evidence: ReportEvidenceItem[],
  generatedAt: string,
  language: "english" | "thai",
  t: Translations
) {
  const savedEvidence = evidence.filter((item) => item.saved || item.note.trim() || item.files.length > 0);
  if (language === "thai") {
    return [
      "รายงานเหตุการณ์ TrustPass Thailand",
      `วันที่สร้างรายงาน: ${generatedAt}`,
      `เมือง: ${city}`,
      `ระดับความเสี่ยง: ${thaiRiskLevel(result.risk_level)}`,
      `ประเภทเหตุการณ์: ${thaiCategory(result.category)}`,
      "",
      "สรุปเหตุการณ์",
      result.incident_report_summary.thai,
      "",
      "สัญญาณความเสี่ยง",
      ...thaiSignals(result).map((signal) => `- ${signal}`),
      "",
      "คำแนะนำเบื้องต้น",
      ...thaiNextSteps(result).map((step) => `- ${step}`),
      "",
      "หลักฐานที่บันทึก",
      ...(savedEvidence.length
        ? savedEvidence.map((item) => {
            const parts = [`- ${thaiEvidenceLabel(item.label)}`];
            if (item.note.trim()) parts.push(`หมายเหตุ: ${item.note.trim()}`);
            if (item.files.length) parts.push(`ไฟล์: ${item.files.map((file) => file.name).join(", ")}`);
            return parts.join(" | ");
          })
        : ["- ยังไม่ได้บันทึกหลักฐานในรายการ"]),
      "",
      "การขอความช่วยเหลือ",
      thaiSupportRecommendation(result),
      "",
      "หมายเหตุสำคัญ",
      "รายงานนี้เป็นการสรุปสัญญาณความเสี่ยงเพื่อใช้ขอความช่วยเหลือ ไม่ใช่การกล่าวหาทางกฎหมาย หากมีภัยคุกคามหรือไม่สามารถออกจากสถานที่ได้ ให้โทร Tourist Police 1155 หรือขอความช่วยเหลือจากสถานที่ปลอดภัยทันที"
    ].join("\n");
  }

  const summary = result.incident_report_summary.english;

  return [
    t.reportTitle,
    `${t.reportGenerated}: ${generatedAt}`,
    `${t.reportCity}: ${city}`,
    `${t.reportRiskLevel}: ${result.risk_level}`,
    `${t.reportCategory}: ${result.category}`,
    "",
    t.reportSummary,
    summary,
    "",
    t.reportDetectedSignals,
    ...result.suspicious_signals.map((signal) => `- ${signal}`),
    "",
    t.reportRecommendedSteps,
    ...result.safe_next_steps.map((step) => `- ${step}`),
    "",
    t.reportEvidenceSaved,
    ...(savedEvidence.length
      ? savedEvidence.map((item) => {
          const parts = [`- ${item.label}`];
          if (item.note.trim()) parts.push(`${t.reportNote}: ${item.note.trim()}`);
          if (item.files.length) parts.push(`${t.reportFiles}: ${item.files.map((file) => file.name).join(", ")}`);
          return parts.join(" | ");
        })
      : [`- ${t.reportNoEvidence}`]),
    "",
    t.reportContactRec,
    result.contact_recommendation,
    "",
    t.reportDisclaimerLabel,
    t.reportDisclaimerText
  ].join("\n");
}

function buildIncidentReportHtml(
  result: RiskCheckResult,
  city: string,
  evidence: ReportEvidenceItem[],
  generatedAt: string,
  language: "english" | "thai"
) {
  if (language === "english") {
    return buildEnglishIncidentReportHtml(result, city, evidence, generatedAt);
  }

  return buildThaiIncidentReportHtml(result, city, evidence, generatedAt);
}

function buildThaiIncidentReportHtml(
  result: RiskCheckResult,
  city: string,
  evidence: ReportEvidenceItem[],
  generatedAt: string
) {
  const savedEvidence = evidence.filter((item) => item.saved || item.note.trim() || item.files.length > 0);
  const savedCount = savedEvidence.length;
  const orderedEvidence = [...evidence].sort((a, b) => evidencePriority(b) - evidencePriority(a));
  const hasImages = orderedEvidence.some((item) => item.files.some((file) => file.previewDataUrl));

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>รายงานเหตุการณ์ TrustPass Thailand</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #242424;
      background: #ffffff;
      font-family: "Segoe UI", "Tahoma", Arial, sans-serif;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 3px solid #0078D4;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .brand { color: #0078D4; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    h1 { margin: 4px 0 0; font-size: 28px; line-height: 1.15; }
    h2 { margin: 0 0 8px; font-size: 15px; }
    p { margin: 0; }
    .badge {
      display: inline-block;
      border-radius: 999px;
      background: ${riskReportColor(result.risk_level)};
      color: #ffffff;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .meta div, .section {
      border: 1px solid #E1E1E1;
      border-radius: 8px;
      padding: 12px;
    }
    .meta span {
      display: block;
      color: #605E5C;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .02em;
    }
    .meta strong { display: block; margin-top: 4px; font-size: 13px; }
    .section { margin-bottom: 12px; break-inside: avoid; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
    .evidence-list {
      display: grid;
      gap: 10px;
    }
    .evidence-card {
      border: 1px solid #E1E1E1;
      border-radius: 8px;
      padding: 10px;
      break-inside: avoid;
    }
    .evidence-title {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: space-between;
    }
    .evidence-title strong { font-size: 13px; }
    .evidence-note { color: #605E5C; font-size: 12px; margin-top: 6px; }
    .file-list { color: #605E5C; font-size: 11px; margin-top: 6px; padding-left: 18px; }
    .image-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 8px;
    }
    .evidence-image {
      border: 1px solid #E1E1E1;
      border-radius: 8px;
      max-height: 260px;
      object-fit: contain;
      width: 100%;
      background: #FAFAFA;
    }
    .saved, .pending {
      border-radius: 999px;
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
    }
    .saved { background: #E7F6E7; color: #107C10; }
    .pending { background: #F3F2F1; color: #605E5C; }
    .footer {
      color: #605E5C;
      border-top: 1px solid #E1E1E1;
      margin-top: 20px;
      padding-top: 10px;
      font-size: 11px;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="brand">TrustPass Thailand</p>
      <h1>รายงานเหตุการณ์สำหรับขอความช่วยเหลือ</h1>
      <p>เอกสารนี้จัดทำเพื่อส่งต่อให้ตำรวจท่องเที่ยว พนักงานโรงแรม สถานทูต บริษัทประกัน หรือผู้ที่สามารถช่วยเหลือนักท่องเที่ยวได้</p>
    </div>
    <div>
      <span class="badge">${escapeHtml(thaiRiskLevel(result.risk_level))}</span>
    </div>
  </div>

  <div class="meta">
    <div><span>วันที่สร้างรายงาน</span><strong>${escapeHtml(generatedAt)}</strong></div>
    <div><span>เมือง</span><strong>${escapeHtml(city)}</strong></div>
    <div><span>ประเภทเหตุการณ์</span><strong>${escapeHtml(thaiCategory(result.category))}</strong></div>
    <div><span>หลักฐานที่บันทึก</span><strong>${savedCount}/${evidence.length} รายการ</strong></div>
  </div>

  <div class="section">
    <h2>สรุปเหตุการณ์</h2>
    <p>${escapeHtml(result.incident_report_summary.thai)}</p>
  </div>

  <div class="section">
    <h2>สัญญาณความเสี่ยงที่พบ</h2>
    <ul>${thaiSignals(result).map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")}</ul>
  </div>

  <div class="section">
    <h2>คำแนะนำเบื้องต้น</h2>
    <ul>${thaiNextSteps(result).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
  </div>

  <div class="section">
    <h2>หลักฐานประกอบ</h2>
    <div class="evidence-list">
      ${orderedEvidence.map((item) => buildThaiEvidenceHtml(item)).join("")}
    </div>
    ${!hasImages ? `<p class="evidence-note">ยังไม่มีภาพหลักฐานแนบในรายงานนี้ หากมีภาพหน้าจอหรือรูปถ่าย ควรแนบเพิ่มเพื่อช่วยให้เจ้าหน้าที่ตรวจสอบได้ง่ายขึ้น</p>` : ""}
  </div>

  <div class="section">
    <h2>ข้อมูลติดต่อ / การขอความช่วยเหลือ</h2>
    <p>${escapeHtml(thaiSupportRecommendation(result))}</p>
  </div>

  <div class="section">
    <h2>หมายเหตุสำคัญ</h2>
    <p>รายงานนี้เป็นการสรุปสัญญาณความเสี่ยงเพื่อใช้ขอความช่วยเหลือ ไม่ใช่การกล่าวหาทางกฎหมาย หากมีการข่มขู่ กักตัว หรือไม่สามารถออกจากสถานที่ได้ ให้โทร Tourist Police 1155 หรือขอความช่วยเหลือจากโรงแรม/สถานที่สาธารณะที่ปลอดภัยทันที</p>
  </div>

  <p class="footer">
    สร้างโดย TrustPass Thailand เพื่อช่วยจัดระเบียบข้อมูลจากนักท่องเที่ยวและหลักฐานที่เกี่ยวข้อง
  </p>
  <button class="no-print" onclick="window.print()" style="margin-top: 16px; padding: 10px 14px; border: 0; border-radius: 8px; background: #0078D4; color: white; font-weight: 700;">Print / Save as PDF</button>
</body>
</html>`;
}

function buildEnglishIncidentReportHtml(
  result: RiskCheckResult,
  city: string,
  evidence: ReportEvidenceItem[],
  generatedAt: string
) {
  const savedEvidence = evidence.filter((item) => item.saved || item.note.trim() || item.files.length > 0);
  const savedCount = savedEvidence.length;
  const orderedEvidence = [...evidence].sort((a, b) => evidencePriority(b) - evidencePriority(a));
  const hasImages = orderedEvidence.some((item) => item.files.some((file) => file.previewDataUrl));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>TrustPass Thailand Incident Report</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #242424;
      background: #ffffff;
      font-family: "Segoe UI", "Tahoma", Arial, sans-serif;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 3px solid #0078D4;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .brand { color: #0078D4; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    h1 { margin: 4px 0 0; font-size: 28px; line-height: 1.15; }
    h2 { margin: 0 0 8px; font-size: 15px; }
    p { margin: 0; }
    .badge {
      display: inline-block;
      border-radius: 999px;
      background: ${riskReportColor(result.risk_level)};
      color: #ffffff;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .meta div, .section {
      border: 1px solid #E1E1E1;
      border-radius: 8px;
      padding: 12px;
    }
    .meta span {
      display: block;
      color: #605E5C;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .02em;
      text-transform: uppercase;
    }
    .meta strong { display: block; margin-top: 4px; font-size: 13px; }
    .section { margin-bottom: 12px; break-inside: avoid; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
    .evidence-list {
      display: grid;
      gap: 10px;
    }
    .evidence-card {
      border: 1px solid #E1E1E1;
      border-radius: 8px;
      padding: 10px;
      break-inside: avoid;
    }
    .evidence-title {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: space-between;
    }
    .evidence-title strong { font-size: 13px; }
    .evidence-note { color: #605E5C; font-size: 12px; margin-top: 6px; }
    .file-list { color: #605E5C; font-size: 11px; margin-top: 6px; padding-left: 18px; }
    .image-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 8px;
    }
    .evidence-image {
      border: 1px solid #E1E1E1;
      border-radius: 8px;
      max-height: 260px;
      object-fit: contain;
      width: 100%;
      background: #FAFAFA;
    }
    .saved, .pending {
      border-radius: 999px;
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
    }
    .saved { background: #E7F6E7; color: #107C10; }
    .pending { background: #F3F2F1; color: #605E5C; }
    .footer {
      color: #605E5C;
      border-top: 1px solid #E1E1E1;
      margin-top: 20px;
      padding-top: 10px;
      font-size: 11px;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="brand">TrustPass Thailand</p>
      <h1>Incident report for support</h1>
      <p>This document is prepared for hotel staff, embassies, insurers, tourist police, or local helpers.</p>
    </div>
    <div>
      <span class="badge">${escapeHtml(result.risk_level)}</span>
    </div>
  </div>

  <div class="meta">
    <div><span>Generated</span><strong>${escapeHtml(generatedAt)}</strong></div>
    <div><span>City</span><strong>${escapeHtml(city)}</strong></div>
    <div><span>Category</span><strong>${escapeHtml(result.category)}</strong></div>
    <div><span>Evidence saved</span><strong>${savedCount}/${evidence.length} items</strong></div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <p>${escapeHtml(result.incident_report_summary.english)}</p>
  </div>

  <div class="section">
    <h2>Detected risk signals</h2>
    <ul>${result.suspicious_signals.map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")}</ul>
  </div>

  <div class="section">
    <h2>Recommended next steps</h2>
    <ul>${result.safe_next_steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
  </div>

  <div class="section">
    <h2>Supporting evidence</h2>
    <div class="evidence-list">
      ${orderedEvidence.map((item) => buildEnglishEvidenceHtml(item)).join("")}
    </div>
    ${!hasImages ? `<p class="evidence-note">No image evidence is attached to this report yet. Add screenshots or photos if available.</p>` : ""}
  </div>

  <div class="section">
    <h2>Contact recommendation</h2>
    <p>${escapeHtml(result.contact_recommendation)}</p>
  </div>

  <div class="section">
    <h2>Important note</h2>
    <p>This report summarizes risk signals to help the tourist ask for support. It is not a legal accusation. If there is a threat, confinement, or immediate danger, contact Tourist Police 1155 or move to a safe public place immediately.</p>
  </div>

  <p class="footer">
    Generated by TrustPass Thailand to organize tourist safety information and related evidence.
  </p>
  <button class="no-print" onclick="window.print()" style="margin-top: 16px; padding: 10px 14px; border: 0; border-radius: 8px; background: #0078D4; color: white; font-weight: 700;">Print / Save as PDF</button>
</body>
</html>`;
}

function evidencePriority(item: ReportEvidenceItem) {
  if (item.saved) return 3;
  if (item.files.length > 0 || item.note.trim()) return 2;
  return 1;
}

function buildThaiEvidenceHtml(item: ReportEvidenceItem) {
  const imageFiles = item.files.filter((file) => file.previewDataUrl);
  const nonImageFiles = item.files.filter((file) => !file.previewDataUrl);
  return `
    <div class="evidence-card">
      <div class="evidence-title">
        <strong>${escapeHtml(thaiEvidenceLabel(item.label))}</strong>
        <span class="${item.saved ? "saved" : "pending"}">${item.saved ? "บันทึกแล้ว" : "ยังควรเก็บเพิ่ม"}</span>
      </div>
      ${item.note.trim() ? `<p class="evidence-note"><strong>หมายเหตุ:</strong> ${escapeHtml(item.note.trim())}</p>` : ""}
      ${nonImageFiles.length > 0 ? `
        <ul class="file-list">
          ${nonImageFiles.map((file) => `<li>${escapeHtml(file.name)} (${escapeHtml(file.type || "unknown")}, ${formatFileSize(file.size)})</li>`).join("")}
        </ul>
      ` : ""}
      ${imageFiles.length > 0 ? `
        <div class="image-grid">
          ${imageFiles.map((file) => `
            <div>
              <img class="evidence-image" src="${escapeHtml(file.previewDataUrl)}" alt="${escapeHtml(file.name)}" />
              <p class="evidence-note">${escapeHtml(file.name)} (${formatFileSize(file.size)})</p>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function buildEnglishEvidenceHtml(item: ReportEvidenceItem) {
  const imageFiles = item.files.filter((file) => file.previewDataUrl);
  const nonImageFiles = item.files.filter((file) => !file.previewDataUrl);
  return `
    <div class="evidence-card">
      <div class="evidence-title">
        <strong>${escapeHtml(item.label)}</strong>
        <span class="${item.saved ? "saved" : "pending"}">${item.saved ? "Saved" : "Still recommended"}</span>
      </div>
      ${item.note.trim() ? `<p class="evidence-note"><strong>Note:</strong> ${escapeHtml(item.note.trim())}</p>` : ""}
      ${nonImageFiles.length > 0 ? `
        <ul class="file-list">
          ${nonImageFiles.map((file) => `<li>${escapeHtml(file.name)} (${escapeHtml(file.type || "unknown")}, ${formatFileSize(file.size)})</li>`).join("")}
        </ul>
      ` : ""}
      ${imageFiles.length > 0 ? `
        <div class="image-grid">
          ${imageFiles.map((file) => `
            <div>
              <img class="evidence-image" src="${escapeHtml(file.previewDataUrl)}" alt="${escapeHtml(file.name)}" />
              <p class="evidence-note">${escapeHtml(file.name)} (${formatFileSize(file.size)})</p>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function thaiRiskLevel(riskLevel: RiskLevel) {
  if (riskLevel === "Emergency") return "ฉุกเฉิน";
  if (riskLevel === "High") return "สูง";
  if (riskLevel === "Caution") return "ควรระวัง";
  return "ต่ำ";
}

function thaiCategory(category: string) {
  const text = category.toLowerCase();
  if (text.includes("payment identity") || text.includes("qr")) return "ข้อมูลบัญชีรับเงินไม่ตรงกับร้านหรือธุรกิจ";
  if (text.includes("tour")) return "ความเสี่ยงจากการจองทัวร์หรือการชำระเงิน";
  if (text.includes("taxi") || text.includes("transport")) return "ความเสี่ยงด้านค่าโดยสารหรือการเดินทาง";
  if (text.includes("food") || text.includes("menu")) return "การตรวจสอบราคาอาหารหรือเมนู";
  if (text.includes("passport") || text.includes("document")) return "ความเสี่ยงจากการยึดเอกสารหรือพาสปอร์ต";
  if (text.includes("damage")) return "การเรียกค่าเสียหายหรือกดดันให้จ่ายเงินสด";
  if (text.includes("job") || text.includes("casting") || text.includes("luring")) return "ความเสี่ยงจากงาน/แคสติ้งที่อาจล่อลวง";
  if (text.includes("outside")) return "อยู่นอกขอบเขตการตรวจสอบ";
  if (text.includes("mismatch")) return "ข้อความและหลักฐานไม่ตรงกัน";
  return "เหตุการณ์ที่ควรตรวจสอบเพิ่มเติม";
}

function thaiEvidenceLabel(label: string) {
  const text = label.toLowerCase();
  if (text.includes("screenshots") || text.includes("photos") || text.includes("conversation") || text.includes("qr payment")) {
    return "ภาพหน้าจอหรือรูปถ่ายของแชท ใบเสร็จ สัญญา QR ชำระเงิน หรือหลักฐานการสนทนา";
  }
  if (text.includes("business name") || text.includes("account name") || text.includes("license")) {
    return "ชื่อร้าน/บริษัท เบอร์โทร ชื่อบัญชีรับเงิน ชื่อโปรไฟล์ และเลขใบอนุญาตถ้ามี";
  }
  if (text.includes("location") || text.includes("time") || text.includes("quoted price") || text.includes("vehicle plate")) {
    return "สถานที่ เวลา ราคาที่เรียก หมายเลขทะเบียนรถ หรือจุดรับส่งที่เกี่ยวข้อง";
  }
  if (text.includes("passport")) return "รูปหรือข้อความที่แสดงว่ามีการขอเก็บพาสปอร์ตตัวจริง";
  if (text.includes("receipt")) return "ใบเสร็จหรือหลักฐานการเรียกเก็บเงิน";
  return label;
}

function thaiSignals(result: RiskCheckResult) {
  const translated = result.suspicious_signals.map((signal) => thaiSignal(signal, result.category));
  const unique = Array.from(new Set(translated));
  return unique.length > 0 ? unique : thaiFallbackSignals(result);
}

function thaiSignal(signal: string, category: string) {
  const text = signal.toLowerCase();
  if (text.includes("payment account") || text.includes("personal") || text.includes("mismatch")) return "ชื่อบัญชีรับเงินเป็นชื่อบุคคลหรือไม่ตรงกับชื่อร้าน/ธุรกิจ";
  if (text.includes("qr")) return "มีการขอให้สแกนจ่ายผ่าน QR ก่อนยืนยันตัวตนของผู้รับเงิน";
  if (text.includes("receipt")) return "ไม่มีใบเสร็จหรือเอกสารยืนยันการชำระเงินที่ชัดเจน";
  if (text.includes("full advance") || text.includes("full payment")) return "มีการขอให้ชำระเงินเต็มจำนวนล่วงหน้า";
  if (text.includes("license")) return "ยังไม่พบเลขใบอนุญาตหรือหลักฐานการเป็นผู้ให้บริการที่ชัดเจน";
  if (text.includes("meter")) return "มีสัญญาณปฏิเสธการใช้มิเตอร์หรือแจ้งว่ามิเตอร์ใช้ไม่ได้";
  if (text.includes("fixed fare") || text.includes("above route")) return "ราคาที่เรียกสูงกว่าช่วงอ้างอิงของเส้นทาง";
  if (text.includes("passport")) return "มีการขอเก็บพาสปอร์ตตัวจริงเป็นหลักประกัน";
  if (text.includes("cash damage") || text.includes("damage")) return "มีการเรียกค่าเสียหายเป็นเงินสดโดยไม่มีเอกสารหรือการตรวจสอบกลาง";
  if (text.includes("pickup") || text.includes("secrecy") || text.includes("border") || text.includes("mae sot")) return "มีสัญญาณควบคุมการเดินทาง ความลับ หรือการพาไปพื้นที่ชายแดน";
  if (text.includes("price") || text.includes("menu") || text.includes("far above")) return "ราคาที่แสดงสูงกว่าช่วงอ้างอิงและควรยืนยันกับร้านก่อนชำระเงิน";
  return `พบสัญญาณที่ควรตรวจสอบเพิ่มเติมในกรณี${thaiCategory(category)}`;
}

function thaiFallbackSignals(result: RiskCheckResult) {
  if (result.risk_level === "Emergency") return ["มีสัญญาณด้านความปลอดภัยที่ควรหยุดดำเนินการและขอความช่วยเหลือทันที"];
  if (result.risk_level === "High") return ["มีสัญญาณความเสี่ยงสูง ควรหยุดจ่ายเงินหรือส่งมอบเอกสารจนกว่าจะตรวจสอบได้"];
  if (result.risk_level === "Caution") return ["มีข้อมูลที่ควรตรวจสอบเพิ่มเติมก่อนดำเนินการต่อ"];
  return ["ยังไม่พบสัญญาณความเสี่ยงชัดเจนจากข้อมูลที่ให้มา"];
}

function thaiNextSteps(result: RiskCheckResult) {
  const translated = result.safe_next_steps
    .map((step) => thaiNextStep(step))
    .filter((step): step is string => Boolean(step));
  const unique = Array.from(new Set(translated));
  const fallback = thaiFallbackSteps(result.risk_level);
  return [...unique, ...fallback].filter((step, index, arr) => arr.indexOf(step) === index).slice(0, 5);
}

function thaiNextStep(step: string): string | null {
  const text = step.toLowerCase();
  if (text.includes("confirm") && text.includes("account")) return "ตรวจสอบว่าชื่อบัญชีรับเงินเป็นของร้านหรือบริษัทจริงก่อนชำระเงิน";
  if (text.includes("receipt")) return "ขอใบเสร็จหรือหลักฐานการชำระเงินที่ระบุชื่อร้าน/บริษัทอย่างชัดเจน";
  if (text.includes("avoid") && (text.includes("transfer") || text.includes("advance"))) return "หลีกเลี่ยงการโอนเงินล่วงหน้าเข้าบัญชีบุคคลจนกว่าจะยืนยันตัวตนได้";
  if (text.includes("public area")) return "ย้ายไปอยู่ในพื้นที่สาธารณะหรือบริเวณที่มีพนักงาน/กล้องวงจรปิด";
  if (text.includes("hotel") || text.includes("front desk") || text.includes("platform")) return "ขอให้พนักงานโรงแรม แพลตฟอร์มจอง หรือช่องทางทางการช่วยตรวจสอบ";
  if (text.includes("do not pay") || text.includes("pause")) return "หยุดการชำระเงินหรือการเดินทางไว้ก่อนจนกว่าจะตรวจสอบได้";
  if (text.includes("police") || text.includes("1155")) return "โทร Tourist Police 1155 หากถูกข่มขู่ ถูกกักตัว หรือเกิดความเสียหายแล้ว";
  if (text.includes("passport")) return "อย่ามอบพาสปอร์ตตัวจริง ให้ใช้สำเนาพาสปอร์ตหรือเงินมัดจำแทน";
  if (text.includes("photo") || text.includes("evidence")) return "เก็บภาพหน้าจอ รูปถ่าย สถานที่ เวลา ชื่อบัญชี และรายละเอียดที่เกี่ยวข้องไว้";
  if (text.includes("safe") || text.includes("embassy")) return "อยู่ในพื้นที่ปลอดภัยและติดต่อโรงแรม สถานทูต หรือเจ้าหน้าที่ที่ไว้ใจได้";
  return null;
}

function thaiFallbackSteps(riskLevel: RiskLevel) {
  if (riskLevel === "Emergency") {
    return [
      "หยุดเดินทางหรือทำตามคำสั่งทันที และอยู่ในพื้นที่สาธารณะที่ปลอดภัย",
      "ติดต่อ Tourist Police 1155 โรงแรม หรือสถานทูตจากสถานที่ปลอดภัย",
      "ส่งตำแหน่งและหลักฐานให้คนที่ไว้ใจได้"
    ];
  }
  if (riskLevel === "High") {
    return [
      "หยุดชำระเงินหรือส่งมอบเอกสารจนกว่าจะตรวจสอบได้",
      "ขอหลักฐานชื่อร้าน/บริษัท ใบเสร็จ และช่องทางติดต่อทางการ",
      "ขอความช่วยเหลือจากโรงแรมหรือช่องทางทางการ หากถูกกดดันให้โทร 1155"
    ];
  }
  if (riskLevel === "Caution") {
    return [
      "ตรวจสอบราคา ชื่อผู้รับเงิน และเงื่อนไขก่อนดำเนินการต่อ",
      "ขอใบเสร็จหรือหลักฐานเป็นลายลักษณ์อักษร",
      "ขอความเห็นจากพนักงานโรงแรมหรือคนท้องถิ่นที่ไว้ใจได้"
    ];
  }
  return [
    "ดำเนินการต่อได้ตามปกติ แต่ควรเก็บใบเสร็จหรือหลักฐานพื้นฐานไว้",
    "ตรวจสอบรายละเอียดอีกครั้งหากมีการเปลี่ยนราคา เงื่อนไข หรือมีการกดดัน"
  ];
}

function thaiSupportRecommendation(result: RiskCheckResult) {
  if (result.risk_level === "Emergency") {
    return "กรณีนี้ควรหยุดดำเนินการทันที อยู่ในพื้นที่สาธารณะที่ปลอดภัย และติดต่อ Tourist Police 1155 โรงแรม หรือสถานทูตโดยเร็ว";
  }
  if (result.risk_level === "High") {
    return "ควรหยุดชำระเงิน เดินทาง หรือส่งมอบเอกสารก่อน และขอให้โรงแรม แพลตฟอร์มจอง หรือช่องทางทางการช่วยตรวจสอบ หากถูกข่มขู่ ถูกกดดัน หรือเกิดความเสียหายแล้ว ให้ติดต่อ Tourist Police 1155";
  }
  if (result.risk_level === "Caution") {
    return "ควรตรวจสอบกับพนักงานโรงแรม ช่องทางทางการ หรือผู้ให้บริการที่น่าเชื่อถือก่อนดำเนินการต่อ ยังไม่จำเป็นต้องติดต่อเจ้าหน้าที่ตำรวจ เว้นแต่มีการข่มขู่หรือไม่สามารถออกจากสถานที่ได้";
  }
  return "ยังไม่พบความเสี่ยงชัดเจน ไม่จำเป็นต้องติดต่อเจ้าหน้าที่ในตอนนี้ แต่ควรเก็บใบเสร็จและหลักฐานพื้นฐานไว้";
}

function escapeHtml(value: string | number | boolean | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function riskReportColor(riskLevel: RiskLevel) {
  if (riskLevel === "Emergency") return "#A4262C";
  if (riskLevel === "High") return "#D83B01";
  if (riskLevel === "Caution") return "#986F0B";
  return "#107C10";
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-white text-[#0078D4] shadow-card" : "text-[#616161] hover:text-[#242424]"
      }`}
    >
      {children}
    </button>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="min-w-[80px] text-[11px] font-semibold uppercase tracking-wider text-[#9A9A9A]">{label}</span>
      <span className="text-xs text-[#424242]">{value}</span>
    </li>
  );
}

function FooterDisclaimer({ source }: { source: RiskCheckResult["source"] }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  return (
    <footer className="border-t border-[#E1E1E1] bg-[#FAFAFA] px-6 py-4 sm:px-7">
      <p className="text-[11px] leading-relaxed text-[#616161]">
        {t.disclaimer}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#107C10]">
        <CheckCircle2 className="h-3 w-3" />
        {t.regionalIntelligence}
        <span className="ml-2 rounded-xl border border-[#E1E1E1] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#616161]">
          {source === "azure-openai" ? "Azure OpenAI" : "TrustPass Grounding"}
        </span>
      </p>
    </footer>
  );
}

function situationToRiskResult(response: CompletedSituation): RiskCheckResult {
  return {
    risk_level: response.risk_level,
    category: response.category,
    suspicious_signals: response.signals,
    why_it_matters: response.why_it_matters,
    safe_next_steps: response.next_steps,
    thai_phrase: response.thai_phrase,
    evidence_to_save: response.evidence_to_save,
    contact_recommendation: response.contact_recommendation,
    incident_report_summary: response.report,
    grounding: response.grounding,
    source: response.source
  };
}

function persistCase(result: RiskCheckResult, city: string) {
  if (typeof window === "undefined") return;
  if (!isDashboardEligible(result)) return;

  const now = new Date().toISOString();
  const sessionReport = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    city,
    category: result.category,
    risk_level: result.risk_level,
    risk_score: riskScoreFor(result),
    signal_count: result.suspicious_signals?.length || 0
  };

  const sessionExisting = JSON.parse(window.sessionStorage.getItem("trustpass-session-cases") || "[]");
  sessionExisting.unshift(sessionReport);
  window.sessionStorage.setItem("trustpass-session-cases", JSON.stringify(sessionExisting.slice(0, 50)));

  const existing = JSON.parse(window.localStorage.getItem("trustpass-cases") || "[]");
  existing.unshift({
    city,
    category: result.category,
    riskLevel: result.risk_level,
    signals: result.suspicious_signals,
    createdAt: now
  });
  window.localStorage.setItem("trustpass-cases", JSON.stringify(existing.slice(0, 20)));
}

function isDashboardEligible(result: RiskCheckResult) {
  if (result.risk_level === "Low") return false;
  if (result.category === "No strong scam pattern detected") return false;
  if (result.category === "Outside TrustPass scope") return false;
  if (result.category === "Evidence mismatch") return false;
  return true;
}

function formatEvidenceTopic(topic: string, labels: Record<string, string>) {
  return labels[topic] ?? labels.unknown ?? topic;
}
