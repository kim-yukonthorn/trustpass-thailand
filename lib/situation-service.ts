import OpenAI from "openai";
import { extractEvidenceHints } from "@/lib/evidence-hints";
import { buildGroundingContext, getKnownVenueMatch } from "@/lib/grounding-tools";
import { areTopicsCompatible, classifyTextRelevance, isGenericCheckMessage, topicLabel } from "@/lib/relevance";
import { buildPrompt, classifyWithLocalRules, normalizeRiskResult } from "@/lib/risk-engine";
import { TRUSTPASS_INTENT_ROUTER_PROMPT } from "@/lib/system-prompt";
import type { EvidenceRelevanceResult, EvidenceTopic, RiskCheckRequest, RiskCheckResult, SituationAnalyzeRequest, SituationAnalyzeResponse } from "@/lib/types";

type AnalyzeOptions = {
  allowClarification: boolean;
};

type IntentTopic = EvidenceTopic | "general_safety";

type QuestionIntent = {
  scope: "trustpass_case" | "not_related" | "unclear";
  topic: IntentTopic;
  action: "analyze_now" | "ask_clarification" | "reject";
  confidence: "low" | "medium" | "high";
  risk_hint: "low" | "caution" | "high" | "emergency" | "unknown";
  clarification_key: string | null;
  clarification_question: string | null;
  suggested_answers: string[];
  missing_context: string[];
  reason: string;
};

const intentTopics: IntentTopic[] = [
  "transport",
  "food_menu",
  "tour_payment",
  "qr_payment",
  "rental_document",
  "damage_claim",
  "job_lure",
  "general_safety",
  "unknown"
];

export async function analyzeSituation(input: SituationAnalyzeRequest, options: AnalyzeOptions): Promise<SituationAnalyzeResponse> {
  const payload = applyEvidencePolicy(normalizeAnalyzeRequest(input));
  const scopeResponse = await getScopeResponse(payload, options);
  if (scopeResponse) return scopeResponse;

  const grounding = await buildGroundingContext(payload);
  const clarification = options.allowClarification ? getClarification(payload, grounding) : null;

  if (clarification) {
    return {
      status: "needs_clarification",
      grounding,
      ...clarification
    };
  }

  const fallback = applyGroundingRiskAdjustments(
    {
      ...classifyWithLocalRules(payload),
      grounding
    },
    grounding,
    payload
  );

  if (hasDefinitiveGrounding(grounding)) {
    return toCompletedResponse(fallback);
  }

  const result = applyGroundingRiskAdjustments(
    await completeWithAzure(payload, fallback, grounding),
    grounding,
    payload
  );
  return toCompletedResponse(result);
}

export function normalizeAnalyzeRequest(input: Partial<SituationAnalyzeRequest | RiskCheckRequest>): RiskCheckRequest {
  return {
    message: input.message?.trim() || "",
    city: input.city || "Bangkok",
    language: input.language || "English",
    extractedText: "extractedText" in input ? input.extractedText?.trim() : undefined,
    evidenceText: "evidenceText" in input ? input.evidenceText?.trim() : undefined,
    evidenceRelevance: "evidenceRelevance" in input ? input.evidenceRelevance : undefined,
    incidentDateIso: input.incidentDateIso || new Date().toISOString(),
    userLocation: input.userLocation,
    clarificationAnswers: input.clarificationAnswers,
    attachmentsMetadata: input.attachmentsMetadata || []
  };
}

function getClarification(request: RiskCheckRequest, grounding: RiskCheckResult["grounding"]) {
  const combined = combineText(request);
  const hints = extractEvidenceHints(`${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""}`);
  const venueMatch = getKnownVenueMatch(request);
  const answeredVenue = hasAnswer(request, "venue_confirmation");
  const answeredVenueLocation = hasAnswer(request, "venue_location");
  const answeredQrAccount = hasAnswer(request, "qr_account_match");
  const answeredJobCastingContext = hasAnswer(request, "job_casting_context");
  const nonFoodGroundingPresent = hasGroundingTool(grounding, "operator_payment_reference") ||
    hasGroundingTool(grounding, "qr_payment_reference") ||
    hasGroundingTool(grounding, "rental_document_reference") ||
    hasGroundingTool(grounding, "damage_claim_reference") ||
    hasGroundingTool(grounding, "job_lure_reference") ||
    hasGroundingTool(grounding, "fare_reference");

  if (
    hasGroundingTool(grounding, "job_lure_reference") &&
    !hasHighRiskJobLureSignal(grounding) &&
    !answeredJobCastingContext
  ) {
    const isChinese = request.language === "Chinese";
    return {
      clarification_key: "job_casting_context",
      question: isChinese
        ? "他们是否提到私人接车、第二地点、前往曼谷以外、保密要求、处理护照/手机，或预付费用？"
        : "Did they mention private pickup, a second location, travel outside Bangkok, secrecy, passport/phone handling, or an upfront fee?",
      reason: isChinese
        ? "街头招聘/选角邀请可能是合法的，但如果涉及受控交通、保密要求、证件压力、付款压力或前往其他省份/边境地区，风险会急剧上升。"
        : "A street job/casting invitation can be legitimate, but the risk changes sharply if there is controlled transport, secrecy, document pressure, payment pressure, or travel toward another province or border area.",
      suggested_answers: isChinese
        ? ["不，只是街头邀请", "他们提供了私人接车或第二地点", "他们要求我保密", "他们提到了护照、手机、费用或边境出行"]
        : ["No, only a street invitation", "They offered private pickup or a second location", "They asked me to keep it secret", "They mentioned passport, phone, fee, or border travel"]
    };
  }

  if (hasDeterministicNonFoodEscalation(grounding)) {
    return null;
  }

  if (
    !nonFoodGroundingPresent &&
    hasMenuContext(combined, hints.prices) &&
    venueMatch?.matchedByLocation &&
    venueMatch.venue.food_tier_id === "premium_famous_venue" &&
    !venueMatch.matchedByText &&
    !answeredVenue
  ) {
    const isChinese = request.language === "Chinese";
    return {
      clarification_key: "venue_confirmation",
      question: isChinese
        ? `您目前是否在 ${venueMatch.venue.name} 内，或者这份菜单来自 ${venueMatch.venue.name}？`
        : `Are you currently inside ${venueMatch.venue.name}, or did this menu come from ${venueMatch.venue.name}?`,
      reason: isChinese
        ? "您的GPS位置靠近一处知名高端餐厅，但菜单文字未清晰显示餐厅名称。地点信息对于判断高价是否正常至关重要。"
        : "Your GPS is near a known premium venue, but the menu text does not clearly show the restaurant name. The venue context materially changes whether high prices are normal.",
      suggested_answers: isChinese
        ? [`是的，这是 ${venueMatch.venue.name}`, "不，这是另一家餐厅", "不确定"]
        : [`Yes, this is ${venueMatch.venue.name}`, "No, this is another restaurant", "Not sure"]
    };
  }

  if (
    !nonFoodGroundingPresent &&
    hasMenuContext(combined, hints.prices) &&
    !request.userLocation &&
    hints.place_names.length === 0 &&
    !hasFoodTierClue(combined) &&
    !answeredVenueLocation
  ) {
    const isChinese = request.language === "Chinese";
    return {
      clarification_key: "venue_location",
      question: isChinese
        ? "这份菜单来自哪里，或者您目前是否在餐厅内？"
        : "Where is this menu from, or are you currently at the restaurant?",
      reason: isChinese
        ? "菜单价格风险在很大程度上取决于餐厅和位置。OCR未找到清晰的场所名称，也未提供GPS位置。"
        : "Menu price risk depends heavily on the restaurant and location. The OCR did not find a clear venue name and no GPS location was provided.",
      suggested_answers: isChinese
        ? ["我目前在餐厅内", "我只有菜单截图"]
        : ["I am at the restaurant now", "I only have a menu screenshot"]
    };
  }

  if (
    !nonFoodGroundingPresent &&
    hasMenuContext(combined, hints.prices) &&
    hasStreetOrLocalStallClue(combined) &&
    highestPriceBaht(hints.prices) >= 300 &&
    !venueMatch?.matchedByLocation &&
    !hasConcreteFoodScamSignal(combined) &&
    !answeredVenueLocation
  ) {
    const isChinese = request.language === "Chinese";
    return {
      clarification_key: "venue_location",
      question: isChinese
        ? "这真的是路边摊/小店吗，还是正式餐厅、商场、海鲜或知名餐厅？"
        : "Is this really a street/local stall, or is it a sit-down, mall, seafood, or famous venue?",
      reason: isChinese
        ? "检测到的价格对于普通路边摊来说偏高，但同样的价格在海鲜、商场或知名餐厅可能属正常范围。"
        : "The detected price is high for a normal street/local stall, but the same price may be normal at seafood, mall, or famous venues.",
      suggested_answers: isChinese
        ? ["路边摊/小店", "商场或正式餐厅", "知名或海鲜餐厅"]
        : ["Street/local stall", "Mall or sit-down restaurant", "Famous or seafood venue"]
    };
  }

  if (
    hasQrPersonalAccountConcern(combined) &&
    !hasBusinessIdentity(combined, hints.business_names) &&
    !hasGroundingTool(grounding, "operator_payment_reference") &&
    !answeredQrAccount
  ) {
    const isChinese = request.language === "Chinese";
    return {
      clarification_key: "qr_account_match",
      question: isChinese
        ? "QR码/付款账户名称是否与商家或旅游运营商名称一致？"
        : "Does the QR/payment account name match the business or tour operator name?",
      reason: isChinese
        ? "对于部分小型商家，使用个人付款账户可能属正常情况，但账户不匹配会影响诈骗风险评估和退款纠纷处理。"
        : "A personal payment account can be normal for some small businesses, but a mismatch matters for fraud risk and refund disputes.",
      suggested_answers: isChinese
        ? ["是的，名称一致", "不，是不同的个人名称", "未显示商家名称"]
        : ["Yes, it matches", "No, it is a different personal name", "The business name is not shown"]
    };
  }

  if (
    grounding?.some((signal) => signal.tool === "venue_reference" && signal.title === "Menu venue unknown") &&
    !nonFoodGroundingPresent &&
    !hasFoodTierClue(combined) &&
    !answeredVenueLocation &&
    !answeredVenue
  ) {
    const isChinese = request.language === "Chinese";
    return {
      clarification_key: "venue_location",
      question: isChinese
        ? "您能确认餐厅名称或分享您的位置吗？"
        : "Can you confirm the restaurant name or share your location?",
      reason: isChinese
        ? "证据看起来是菜单，但系统无法确认该价格对该场所是否正常。"
        : "The evidence appears to be a menu, but the backend cannot ground whether the price is normal for that venue.",
      suggested_answers: isChinese ? ["我不确定"] : ["I am not sure"]
    };
  }

  return null;
}

async function completeWithAzure(payload: RiskCheckRequest, fallback: RiskCheckResult, grounding: NonNullable<RiskCheckResult["grounding"]>) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const timeoutMs = Number(process.env.AZURE_OPENAI_TIMEOUT_MS || 12000);

  if (!endpoint || !apiKey || !deployment) {
    return fallback;
  }

  try {
    const messages = buildPrompt(payload, fallback, grounding);
    const normalizedEndpoint = endpoint.replace(/\/$/, "");
    const openAICompatibleBaseUrl = getOpenAICompatibleBaseUrl(normalizedEndpoint);

    if (openAICompatibleBaseUrl) {
      const client = new OpenAI({
        baseURL: openAICompatibleBaseUrl,
        apiKey,
        timeout: timeoutMs
      });

      const completion = await client.chat.completions.create({
        model: deployment,
        messages,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : null;
      return normalizeRiskResult(parsed, fallback, "azure-openai");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      `${normalizedEndpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0.2,
          max_tokens: 900,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeout);

    if (!response.ok) return fallback;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : null;
    return normalizeRiskResult(parsed, fallback, "azure-openai");
  } catch {
    return fallback;
  }
}

function getOpenAICompatibleBaseUrl(endpoint: string) {
  if (endpoint.endsWith("/openai/v1")) return endpoint;
  if (endpoint.includes(".services.ai.azure.com") && endpoint.includes("/api/projects/")) {
    return `${endpoint}/openai/v1`;
  }
  return null;
}

async function classifyQuestionIntentWithAzure(
  message: string,
  evidenceRelevance?: EvidenceRelevanceResult,
  evidenceText?: string
): Promise<QuestionIntent | null> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const timeoutMs = Number(process.env.AZURE_OPENAI_TIMEOUT_MS || 12000);

  if (!endpoint || !apiKey || !deployment) return null;

  const normalizedEndpoint = endpoint.replace(/\/$/, "");
  const openAICompatibleBaseUrl = getOpenAICompatibleBaseUrl(normalizedEndpoint);
  const evidencePreview = (evidenceText || "").replace(/\s+/g, " ").trim().slice(0, 900);
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: TRUSTPASS_INTENT_ROUTER_PROMPT
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Classify the initial tourist question for TrustPass routing. Return JSON only.",
        allowed_topics: intentTopics,
        message,
        evidence_topic: evidenceRelevance?.topic || "unknown",
        evidence_relevance: evidenceRelevance?.relevance || "weak",
        evidence_reason: evidenceRelevance?.reason || null,
        evidence_preview: evidencePreview || null
      })
    }
  ];

  try {
    let content: string | undefined | null;

    if (openAICompatibleBaseUrl) {
      const client = new OpenAI({
        baseURL: openAICompatibleBaseUrl,
        apiKey,
        timeout: timeoutMs
      });

      const completion = await client.chat.completions.create({
        model: deployment,
        messages,
        temperature: 0,
        max_tokens: 420,
        response_format: { type: "json_object" }
      });

      content = completion.choices[0]?.message?.content;
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(
          `${normalizedEndpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "api-key": apiKey
            },
            body: JSON.stringify({
              messages,
              temperature: 0,
              max_tokens: 420,
              response_format: { type: "json_object" }
            }),
            signal: controller.signal
          }
        );

        if (!response.ok) return null;
        const data = await response.json();
        content = data?.choices?.[0]?.message?.content;
      } finally {
        clearTimeout(timeout);
      }
    }

    return normalizeQuestionIntent(content ? JSON.parse(content) : null);
  } catch {
    return null;
  }
}

function normalizeQuestionIntent(value: unknown): QuestionIntent | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const scope = raw.scope === "trustpass_case" || raw.scope === "not_related" || raw.scope === "unclear" ? raw.scope : "unclear";
  const topic = typeof raw.topic === "string" && intentTopics.includes(raw.topic as IntentTopic) ? raw.topic as IntentTopic : "unknown";
  const action = raw.action === "analyze_now" || raw.action === "ask_clarification" || raw.action === "reject" ? raw.action : scope === "trustpass_case" ? "analyze_now" : "reject";
  const confidence = raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low" ? raw.confidence : "low";
  const riskHint = raw.risk_hint === "low" || raw.risk_hint === "caution" || raw.risk_hint === "high" || raw.risk_hint === "emergency" || raw.risk_hint === "unknown"
    ? raw.risk_hint
    : "unknown";
  const clarificationKey = typeof raw.clarification_key === "string" && raw.clarification_key.trim() ? raw.clarification_key.slice(0, 80) : null;
  const clarificationQuestion = typeof raw.clarification_question === "string" && raw.clarification_question.trim() ? raw.clarification_question.slice(0, 260) : null;
  const suggestedAnswers = Array.isArray(raw.suggested_answers)
    ? raw.suggested_answers.filter((answer): answer is string => typeof answer === "string" && answer.trim().length > 0).slice(0, 4)
    : [];
  const missingContext = Array.isArray(raw.missing_context)
    ? raw.missing_context.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6)
    : [];
  const reason = typeof raw.reason === "string" ? raw.reason.slice(0, 180) : "Azure OpenAI intent routing.";

  return {
    scope,
    topic,
    action,
    confidence,
    risk_hint: riskHint,
    clarification_key: clarificationKey,
    clarification_question: clarificationQuestion,
    suggested_answers: suggestedAnswers,
    missing_context: missingContext,
    reason
  };
}

function shouldUseQuestionIntentRouter(message: string, hasRelevantEvidence: boolean) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized && !hasRelevantEvidence) return false;
  return normalized.length <= 600;
}

function toCompletedResponse(result: RiskCheckResult): SituationAnalyzeResponse {
  return {
    status: "completed",
    risk_level: result.risk_level,
    category: result.category,
    signals: result.suspicious_signals,
    next_steps: result.safe_next_steps,
    why_it_matters: result.why_it_matters,
    thai_phrase: result.thai_phrase,
    evidence_to_save: result.evidence_to_save,
    contact_recommendation: result.contact_recommendation,
    report: result.incident_report_summary,
    grounding: result.grounding || [],
    source: result.source
  };
}

function hasDefinitiveGrounding(grounding: NonNullable<RiskCheckResult["grounding"]>): boolean {
  return grounding.some((s) =>
    s.tool === "job_lure_reference" ||
    s.tool === "rental_document_reference" ||
    s.tool === "damage_claim_reference" ||
    (s.tool === "fare_reference" && (s.metadata?.fare_position === "above" || s.metadata?.fare_position === "far_above")) ||
    (s.tool === "food_price_reference" && (s.metadata?.price_position === "above" || s.metadata?.price_position === "far_above"))
  );
}

function applyGroundingRiskAdjustments(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult {
  const groundedResult = applyGroundedSignalLabels(result, grounding);
  const taxiFareRiskResult = getTaxiFareRiskResult(groundedResult, grounding, request);
  if (taxiFareRiskResult) return taxiFareRiskResult;

  const rentalDocumentRiskResult = getRentalDocumentRiskResult(groundedResult, grounding, request);
  if (rentalDocumentRiskResult) return rentalDocumentRiskResult;

  const jobLureRiskResult = getJobLureRiskResult(groundedResult, grounding, request);
  if (jobLureRiskResult) return jobLureRiskResult;

  const damageClaimRiskResult = getDamageClaimRiskResult(groundedResult, grounding, request);
  if (damageClaimRiskResult) return damageClaimRiskResult;

  const normalFoodPriceResult = getNormalFoodPriceResult(groundedResult, grounding, request);
  if (normalFoodPriceResult && !hasDeterministicNonFoodEscalation(grounding) && !hasConcreteFoodScamSignal(combineText(request))) {
    return normalFoodPriceResult;
  }

  if (groundedResult.risk_level !== "Low") return groundedResult;

  const normalTaxiResult = getNormalTaxiResult(groundedResult, grounding, request);
  if (normalTaxiResult) return normalTaxiResult;

  const foodPriceRiskResult = getFoodPriceRiskResult(groundedResult, grounding, request);
  if (foodPriceRiskResult) return foodPriceRiskResult;

  return groundedResult;
}

function getTaxiFareRiskResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const fareSignal = grounding.find((signal) => signal.tool === "fare_reference");
  if (!fareSignal) return null;

  const farePosition = fareSignal.metadata?.fare_position;
  if (farePosition !== "above" && farePosition !== "far_above") return null;

  const quotedFare = typeof fareSignal.metadata?.quoted_fare_baht === "number" ? fareSignal.metadata.quoted_fare_baht : null;
  const baseline = Array.isArray(fareSignal.metadata?.baseline_range_baht)
    ? fareSignal.metadata.baseline_range_baht
    : null;
  const ratio = typeof fareSignal.metadata?.fare_ratio_to_baseline === "number" ? fareSignal.metadata.fare_ratio_to_baseline : null;
  if (quotedFare === null || !baseline || ratio === null) return null;

  const suspiciousSignals = Array.isArray(fareSignal.metadata?.suspicious_fare_signals)
    ? fareSignal.metadata.suspicious_fare_signals
    : [];
  const hasMeterRefusal = suspiciousSignals.some((signal) => typeof signal === "string" && /meter|no meter|refuse/i.test(signal));
  const highRisk = farePosition === "far_above" || ratio >= 3 || (hasMeterRefusal && ratio >= 2);
  const riskLevel = highRisk ? "High" : "Caution";
  const baselineText = `${baseline[0]}-${baseline[1]} THB`;
  const isChinese = request.language === "Chinese";
  const ratioSignal = isChinese
    ? (ratio >= 3
        ? `报价约为路线基准的${ratio}倍，远超正常范围`
        : `报价约为路线基准的${ratio}倍`)
    : (ratio >= 3
        ? `Extreme fixed fare quote about ${ratio}x above route baseline`
        : `Quoted fare is about ${ratio}x above route baseline`);

  return {
    ...result,
    risk_level: riskLevel,
    category: isChinese
      ? (highRisk ? "出租车费用远超路线基准" : "出租车费用核实")
      : (highRisk ? "Taxi fare far above route baseline" : "Taxi fare verification"),
    suspicious_signals: Array.from(new Set([...(result.suspicious_signals || []), ratioSignal])).slice(0, 8),
    why_it_matters: isChinese
      ? `${quotedFare} 泰铢约为当地路线基准上限（${baselineText}）的 ${ratio} 倍。` +
        (highRisk
          ? "差距如此之大，可视为强烈的超额收费信号，尤其是在司机拒绝使用计价器或提前固定价格的情况下。"
          : "虽高于参考值，但单独来看并非极端情况；乘车前请核实路线、计价器、过路费及等待时间说明。")
      : `${quotedFare} THB is about ${ratio}x the upper end of the local route baseline (${baselineText}). ` +
        (highRisk
          ? "That gap is large enough to treat the fare as a strong overcharging signal, especially if the meter is unavailable or the price is fixed before the ride."
          : "That is higher than the reference, but not extreme by itself; verify the route, meter, tolls, and waiting-time explanation before riding."),
    safe_next_steps: isChinese
      ? (highRisk
          ? [
              "如司机拒绝使用计价器或无法说明价格，请拒绝乘坐。",
              "改用可信的网约车应用、酒店出租车台或其他出租车。",
              "如受到施压，请保存车牌、上车地点、目的地、时间及报价。"
            ]
          : [
              "询问费用是否包含过路费、长时间等待或特殊路线。",
              "要求使用计价器，或与可信的网约车报价进行比较。",
              "如报价仍感不明，选择其他出租车或网约车。"
            ])
      : (highRisk
          ? [
              "Decline the ride if the driver will not use the meter or explain the fare clearly.",
              "Use a trusted ride-hailing app, hotel taxi desk, or another taxi.",
              "Save the plate, pickup point, destination, time, and quoted fare if pressure continues."
            ]
          : [
              "Ask whether the fare includes tolls, heavy waiting time, or a special route.",
              "Request the meter or compare against a trusted ride-hailing estimate.",
              "Choose another taxi or app ride if the quote still feels unclear."
            ]),
    thai_phrase: hasMeterRefusal ? "กรุณาเปิดมิเตอร์ครับ/ค่ะ" : "ราคานี้รวมค่าทางด่วนหรือค่ารอไหมครับ/ค่ะ",
    evidence_to_save: isChinese
      ? ["报价金额", "上下车地点", "车牌号（如安全可记录）", "时间及地点"]
      : ["Quoted fare", "Pickup and destination", "Taxi plate if safe", "Time and location"],
    contact_recommendation: isChinese
      ? (highRisk
          ? "优先选择其他交通方式。仅在受到施压、威胁、被阻止离开或已遭受损失时，才联系酒店工作人员或旅游警察1155。"
          : "无需报警。冷静核实或选择另一辆出租车即可。")
      : (highRisk
          ? "Use another transport option first. Contact hotel staff or Tourist Police 1155 only if you are pressured, threatened, blocked from leaving, or already harmed."
          : "No police escalation is recommended. Verify calmly or choose another ride."),
    incident_report_summary: {
      english: `TrustPass taxi check in ${request.city}: ${riskLevel} risk. The quoted ${quotedFare} THB fare is about ${ratio}x above the ${baselineText} route baseline.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel} ค่าโดยสาร ${quotedFare} บาทสูงกว่าช่วงอ้างอิง ${baselineText} ประมาณ ${ratio} เท่า`
    }
  };
}

function getDamageClaimRiskResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const damageSignal = grounding.find((signal) => signal.tool === "damage_claim_reference");
  if (!damageSignal) return null;

  const amount = typeof damageSignal.metadata?.damage_amount_baht === "number" ? damageSignal.metadata.damage_amount_baht : null;
  const severity = typeof damageSignal.metadata?.damage_amount_severity === "string" ? damageSignal.metadata.damage_amount_severity : "unknown";
  const ratio = typeof damageSignal.metadata?.amount_ratio_to_minor_damage_reference === "number"
    ? damageSignal.metadata.amount_ratio_to_minor_damage_reference
    : null;
  const hasNoReceipt = damageSignal.metadata?.has_no_receipt === true;
  const hasImmediateCash = damageSignal.metadata?.has_immediate_cash_payment === true;
  const hasLargeDemand = damageSignal.metadata?.has_large_cash_demand === true;
  const interpretedSignals = Array.isArray(damageSignal.metadata?.interpreted_signals)
    ? damageSignal.metadata.interpreted_signals
    : [];
  const hasNeutralProcessPressure = interpretedSignals.some((signal) => typeof signal === "string" && /avoid police|neutral process|insurer/i.test(signal));

  if (amount === null && result.risk_level !== "High") return null;

  const isChinese = request.language === "Chinese";

  if (
    amount !== null &&
    ratio !== null &&
    ratio <= 1.3 &&
    !hasNoReceipt &&
    !hasImmediateCash &&
    !hasLargeDemand &&
    !hasNeutralProcessPressure
  ) {
    return {
      ...result,
      risk_level: "Low",
      category: isChinese ? "正常租赁损坏记录" : "Normal rental damage documentation",
      suspicious_signals: [],
      why_it_matters: isChinese
        ? `${amount.toLocaleString("en-US")} 泰铢在轻微租赁损坏索赔的低风险示范范围内。未检测到立即现金压力、拒绝提供收据或指示规避中立流程的信号。`
        : `${amount.toLocaleString("en-US")} THB is within the low demo range for a minor rental damage claim. No immediate cash pressure, receipt refusal, or instruction to avoid a neutral process was detected.`,
      safe_next_steps: isChinese
        ? [
            "付款前索取书面估价或收据。",
            "将索赔金额与您的使用前照片及租赁合同进行比对。",
            "保留收据和损坏照片以备记录。"
          ]
        : [
            "Ask for a written estimate or receipt before paying.",
            "Compare the claim against your before-use photos and rental contract.",
            "Keep the receipt and damage photo for your records."
          ],
      thai_phrase: "ขอใบเสร็จหรือใบแจ้งค่าเสียหายเป็นลายลักษณ์อักษรได้ไหมครับ/ค่ะ",
      evidence_to_save: isChinese
        ? ["收据或书面估价", "损坏照片", "租赁合同", "使用前照片"]
        : ["Receipt or written estimate", "Damage photo", "Rental contract", "Before-use photos"],
      contact_recommendation: isChinese
        ? "无需上报。将此视为正常文件核查；除非出现施压、拒绝提供收据、扣押护照或威胁行为，否则无需联系警方。"
        : "No escalation recommended. Treat this as a documentation check unless pressure, receipt refusal, passport leverage, or threats appear.",
      incident_report_summary: {
        english: `TrustPass rental damage check in ${request.city}: Low risk. The ${amount.toLocaleString("en-US")} THB amount is within the low demo range and no pressure signal was detected.`,
        thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Low จำนวน ${amount.toLocaleString("en-US")} บาทอยู่ในช่วงต่ำของตัวอย่างเดโม และไม่พบสัญญาณกดดัน`
      }
    };
  }

  const highRisk = hasLargeDemand || severity === "large" || severity === "extreme" || (hasNoReceipt && hasImmediateCash && severity === "elevated");
  const riskLevel = highRisk ? "High" : "Caution";
  const amountSignal = isChinese
    ? (amount === null
        ? "租赁损坏索赔需要书面记录"
        : highRisk
          ? `损坏索赔金额为 ${amount.toLocaleString("en-US")} 泰铢，约为轻微损坏参考值的${ratio ?? "数"}倍`
          : `损坏索赔金额较小，但仍需书面证明`)
    : (amount === null
        ? "Rental damage claim needs written documentation"
        : highRisk
          ? `Damage demand is ${amount.toLocaleString("en-US")} THB, about ${ratio ?? "several"}x the demo minor-damage threshold`
          : `Damage demand amount is modest but still needs written proof`);

  return {
    ...result,
    risk_level: riskLevel,
    category: isChinese
      ? (highRisk ? "租赁损坏现金压力" : "租赁损坏核实")
      : (highRisk ? "Rental damage cash pressure" : "Rental damage verification"),
    suspicious_signals: Array.from(new Set([...(result.suspicious_signals || []), amountSignal])).slice(0, 8),
    why_it_matters: isChinese
      ? (amount === null
          ? "该情况包含租赁损坏压力信号。最安全的做法是在付款前记录索赔内容。"
          : `${amount.toLocaleString("en-US")} 泰铢在本示范的租赁损坏启发算法中被视为"${severity}"级别。当现金索赔与无收据、无书面估价或被指示规避中立流程相结合时，风险会进一步升高。`)
      : (amount === null
          ? "The situation contains rental damage pressure signals. The safest path is to document the claim before paying."
          : `${amount.toLocaleString("en-US")} THB is treated as ${severity} for this demo's rental-damage heuristic. The risk increases when a cash demand is combined with no receipt, no written estimate, or pressure to avoid a neutral process.`),
    safe_next_steps: isChinese
      ? [
          "要求提供书面损坏估价、逐项收据及显示损坏情况的照片。",
          "将索赔与租赁合同及您的使用前照片进行比对。",
          highRisk ? "切勿在压力下支付大额现金；如被阻止或受到威胁，请联系酒店工作人员、平台客服、保险公司或旅游警察1155。" : "金额和收据明确后再付款。"
        ]
      : [
          "Ask for a written damage estimate, itemized receipt, and photos showing the claimed damage.",
          "Compare the claim against the rental contract and your before-use photos.",
          highRisk ? "Do not hand over large cash under pressure; ask hotel staff, platform support, insurer, or Tourist Police 1155 if blocked or threatened." : "Pay only after the amount and receipt are clear."
        ],
    thai_phrase: "ขอใบแจ้งค่าเสียหายเป็นลายลักษณ์อักษรและใบเสร็จก่อนครับ/ค่ะ",
    evidence_to_save: isChinese
      ? ["使用前后对比照片", "租赁合同", "损坏报价单", "收据", "店铺名称", "护照/押金条款"]
      : ["Before/after photos", "Rental contract", "Damage quote", "Receipt", "Shop name", "Passport/deposit terms"],
    contact_recommendation: isChinese
      ? (highRisk
          ? "暂停付款，联系酒店工作人员、平台客服或保险公司寻求帮助。如受到施压、威胁、被阻止离开或护照被用作筹码，请联系旅游警察1155。"
          : "仅凭金额无需报警。优先获取书面文件；如商店拒绝配合，联系酒店或平台客服协助。")
      : (highRisk
          ? "Pause payment and ask hotel staff, platform support, or insurer for help. Contact Tourist Police 1155 if pressured, threatened, blocked, or if your passport is being used as leverage."
          : "No police escalation is recommended from amount alone. Get documentation first and involve hotel/platform support if the shop refuses."),
    incident_report_summary: {
      english: `TrustPass rental damage check in ${request.city}: ${riskLevel} risk${amount ? ` for a ${amount.toLocaleString("en-US")} THB damage demand` : ""}. Documentation and neutral review are recommended before payment.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel}${amount ? ` สำหรับการเรียกค่าเสียหาย ${amount.toLocaleString("en-US")} บาท` : ""} ควรขอเอกสารและตรวจสอบอย่างเป็นกลางก่อนชำระเงิน`
    }
  };
}

function getRentalDocumentRiskResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const rentalSignal = grounding.find((signal) => signal.tool === "rental_document_reference");
  if (!rentalSignal || rentalSignal.metadata?.has_original_passport_request !== true) return null;

  const interpretedSignals = Array.isArray(rentalSignal.metadata?.interpreted_signals)
    ? rentalSignal.metadata.interpreted_signals.filter((signal): signal is string => typeof signal === "string")
    : [];
  const isChinese = request.language === "Chinese";
  const passportSignal = isChinese ? "要求以原护照作为押金" : "Original passport requested as deposit";
  const signals = Array.from(new Set([
    ...interpretedSignals,
    passportSignal
  ])).slice(0, 8);

  return {
    ...result,
    risk_level: "High",
    category: isChinese ? "租赁护照扣押风险" : "Rental passport retention risk",
    suspicious_signals: signals,
    why_it_matters: isChinese
      ? "原护照是游客的重要身份证件。如果租赁经营者将其作为押金扣押，游客在发生纠纷时将失去主动权，或被迫在取回护照前支付不明费用。"
      : "A tourist's original passport is a critical identity document. If a rental operator keeps it as a deposit, the tourist can lose leverage during disputes or be pressured to pay unclear fees before the passport is returned.",
    safe_next_steps: isChinese
      ? [
          "不要将原护照留作押金。",
          "改为提供护照复印件，并附上书面现金/刷卡押金收据。",
          "在使用租赁物品前，拍摄车辆状况、合同、店铺名称及押金条款的照片。",
          "如护照已被扣押且商店拒绝归还，请联系酒店工作人员、平台客服、大使馆或旅游警察1155寻求帮助。"
        ]
      : [
          "Do not leave your original passport as a deposit.",
          "Offer a passport copy plus a written cash/card deposit receipt instead.",
          "Photograph the vehicle condition, contract, shop name, and deposit terms before using the rental.",
          "If the passport is already being held and the shop refuses to return it, ask hotel staff, platform support, embassy, or Tourist Police 1155 for help."
        ],
    thai_phrase: "ขอใช้สำเนาพาสปอร์ตแทนตัวจริง และขอใบเสร็จเงินมัดจำได้ไหมครับ/ค่ะ",
    evidence_to_save: isChinese
      ? ["租赁合同", "护照/押金条款", "店铺名称及位置", "押金收据", "使用前车辆照片"]
      : ["Rental contract", "Passport/deposit clause", "Shop name and location", "Deposit receipt", "Before-use vehicle photos"],
    contact_recommendation: isChinese
      ? "避免交出原护照。如护照已被扣押或被用作筹码，请联系酒店工作人员、平台客服、大使馆或旅游警察1155寻求帮助。"
      : "Avoid handing over the original passport. If it is already being withheld or used as leverage, ask hotel staff, platform support, embassy, or Tourist Police 1155 for help.",
    incident_report_summary: {
      english: `TrustPass rental document check in ${request.city}: High risk because an original passport is requested or held as a rental deposit.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ High เนื่องจากมีการขอหรือถือพาสปอร์ตตัวจริงเป็นหลักประกันการเช่า`
    }
  };
}

function getJobLureRiskResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const jobSignal = grounding.find((signal) => signal.tool === "job_lure_reference");
  if (!jobSignal) return null;

  const interpretedSignals = Array.isArray(jobSignal.metadata?.interpreted_signals)
    ? jobSignal.metadata.interpreted_signals.filter((signal): signal is string => typeof signal === "string")
    : [];
  const highRisk = hasHighRiskJobLureSignal(grounding);
  const riskLevel = highRisk ? "Emergency" : "Caution";
  const isChinese = request.language === "Chinese";

  const zhSignalMap: Record<string, string> = {
    "Job or casting offer from informal channel": "非正规渠道的工作或试镜邀约",
    "Controlled pickup or free transport offered": "提供受控接送或免费交通",
    "Travel toward Mae Sot, Myanmar, or border area": "前往美索、缅甸或边境地区",
    "Secrecy or isolation instruction": "要求保密或隔离",
    "Passport or phone handling requested": "要求交出护照或手机",
    "Upfront fee or payment requested": "要求提前付费或押金"
  };

  const translatedSignals = isChinese
    ? interpretedSignals.map((s) => zhSignalMap[s] ?? s)
    : interpretedSignals;

  return {
    ...result,
    risk_level: riskLevel,
    category: isChinese
      ? (highRisk ? "虚假招聘/选角诈骗" : "招聘/选角邀约核实")
      : (highRisk ? "Fake casting or job luring" : "Job/casting invitation verification"),
    suspicious_signals: Array.from(new Set(translatedSignals)).slice(0, 8),
    why_it_matters: isChinese
      ? (highRisk
          ? "该邀约包含诱骗信号，如受控接送、要求保密、前往边境地区、交出证件或手机、付款压力等。这些信号可能对游客造成直接的人身安全威胁。"
          : "街头招聘或试镜邀约并非立即构成紧急情况，但在跟随任何人、前往第二地点、支付费用或分享证件之前，应先进行核实。")
      : (highRisk
          ? "The offer contains luring signals such as controlled pickup, secrecy, border-area travel, document/phone handling, or payment pressure. Those signals can create immediate personal safety risk for tourists."
          : "A street job or casting invitation is not automatically an emergency, but it should be verified before you follow anyone, travel to a second location, pay a fee, or share documents."),
    safe_next_steps: isChinese
      ? (highRisk
          ? [
              "请勿上私家车或前往第二地点。",
              "留在公共场所，如受到压力请联系酒店工作人员、旅游警察1155或您的大使馆/领事馆。",
              "如安全允许，保存对方头像名称、电话号码、聊天截图、接送地点和车辆信息。"
            ]
          : [
              "不要仅凭街头邀请前往私人地点或上私家车。",
              "要求提供公司名称、官方网站、办公地址及书面试镜详情。",
              "在继续前，请向酒店工作人员或当地可信联系人核实。",
              "不要交出护照、手机或任何预付费用。"
            ])
      : (highRisk
          ? [
              "Do not get into a private vehicle or travel to a second location.",
              "Stay in a public place and contact hotel staff, Tourist Police 1155, or your embassy if pressured.",
              "Save the profile name, phone number, chat screenshots, pickup point, and vehicle details if safe."
            ]
          : [
              "Do not go to a private location or vehicle based only on a street invitation.",
              "Ask for the company name, official website, office address, and written casting details.",
              "Verify with hotel staff or a trusted local contact before continuing.",
              "Do not hand over your passport, phone, or any upfront fee."
            ]),
    thai_phrase: highRisk
      ? "ฉันไม่สะดวกเดินทางไปตามนัดแล้ว และต้องการติดต่อโรงแรมหรือตำรวจท่องเที่ยวก่อน"
      : "ขอข้อมูลบริษัทและสถานที่นัดอย่างเป็นทางการก่อนตัดสินใจครับ/ค่ะ",
    evidence_to_save: isChinese
      ? ["对方个人或公司名称", "电话号码或聊天截图", "约见地点", "接送、收费、护照、手机、保密或旅行指示等相关信息"]
      : ["Profile or business name", "Phone number or chat screenshot", "Meeting location", "Any pickup, fee, passport, phone, secrecy, or travel instruction"],
    contact_recommendation: isChinese
      ? (highRisk
          ? "立即停止行动，留在公共场所。如感到被施压、被跟踪或人身不安全，请联系酒店保安、旅游警察1155、大使馆/领事馆或紧急服务。"
          : "根据现有信息，暂无需紧急上报。在继续行动或前往第二地点之前，请向酒店工作人员或当地可信人士核实；仅当出现压力、威胁、受控交通、保密要求或证件要求时，才联系旅游警察1155。")
      : (highRisk
          ? "Stop and stay public. Contact hotel security, Tourist Police 1155, embassy/consulate, or emergency services if you feel pressured, followed, or unsafe."
          : "No emergency escalation from the current information alone. Verify with hotel staff or a trusted local person before continuing; contact Tourist Police 1155 only if pressure, threats, controlled transport, secrecy, or document demands appear."),
    incident_report_summary: {
      english: `TrustPass job/casting check in ${request.city}: ${riskLevel} risk. ${highRisk ? "The offer includes controlled or coercive luring signals." : "The invitation needs verification before the tourist follows instructions or travels to a second location."}`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel} สำหรับการชวนไปงานหรือแคสติ้ง ${highRisk ? "พบสัญญาณการล่อลวงหรือการควบคุมการเดินทาง" : "ควรตรวจสอบข้อมูลก่อนเดินทางหรือทำตามคำชวน"}`
    }
  };
}

function getFoodPriceRiskResult(
  groundedResult: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const foodSignal = grounding.find((signal) => signal.tool === "food_price_reference");
  const pricePosition = foodSignal?.metadata?.price_position;
  const likelyTierLabel = typeof foodSignal?.metadata?.likely_tier_label === "string" ? foodSignal.metadata.likely_tier_label : "the likely restaurant tier";
  const normalItemRange = Array.isArray(foodSignal?.metadata?.normal_item_range_baht)
    ? foodSignal.metadata.normal_item_range_baht.join("-")
    : "the expected";
  const highestPrice = foodSignal?.metadata?.highest_price_baht;
  const maxRatio = typeof foodSignal?.metadata?.max_price_ratio_to_reference === "number" ? foodSignal.metadata.max_price_ratio_to_reference : null;
  const likelyTier = typeof foodSignal?.metadata?.likely_tier === "string" ? foodSignal.metadata.likely_tier : null;
  const confidence = foodSignal?.confidence;

  if (pricePosition !== "far_above" && pricePosition !== "above") return null;

  const highRisk =
    confidence !== "low" &&
    pricePosition === "far_above" &&
    maxRatio !== null &&
    maxRatio > 2;
  const riskLevel = highRisk ? "High" : "Caution";
  const isChinese = request.language === "Chinese";
  const ratioText = maxRatio
    ? (isChinese ? `约高出${maxRatio}倍` : `about ${maxRatio}x above`)
    : (pricePosition === "far_above" ? (isChinese ? "远超" : "far above") : (isChinese ? "高于" : "above"));

  return {
    ...groundedResult,
    risk_level: riskLevel,
    category: isChinese
      ? (highRisk ? "食物价格远超当地参考" : "食物价格核实")
      : (highRisk ? "Food price far above local reference" : "Food price verification"),
    suspicious_signals: isChinese
      ? [`检测到菜单价格 ${highestPrice ?? ""} 泰铢，${ratioText} ${likelyTierLabel} 参考价格区间`]
      : [`Detected menu price ${highestPrice ?? "is"} THB is ${ratioText} the ${likelyTierLabel} reference band`],
    why_it_matters: isChinese
      ? `该价格高于 ${likelyTierLabel} 的曼谷精选参考价格（每项 ${normalItemRange} 泰铢）。${highRisk ? "与所述场馆级别相比，差距异常之大，请在付款前核实场馆名称及显示价格。" : "这并不证明存在欺诈，但用户应在付款前确认场馆名称、显示价格、收据及服务条款。"}`
      : `The price is higher than the curated Bangkok reference for ${likelyTierLabel} (${normalItemRange} THB per item). ${highRisk ? "The gap is unusually large for the stated venue tier, so verify the venue and displayed price before paying." : "This does not prove fraud, but the user should confirm the venue, displayed price, receipt, and service terms before paying."}`,
    safe_next_steps: isChinese
      ? [
          "确认餐厅名称，以及您所在场馆的菜单是否属于该餐厅。",
          "在点餐或付款前，请工作人员指出官方显示价格。",
          "索取逐项收据并保留菜单照片。"
        ]
      : [
          "Confirm the restaurant name and whether the menu belongs to the venue you are inside.",
          "Ask staff to point to the official displayed price before ordering or paying.",
          "Request an itemized receipt and keep a photo of the menu."
        ],
    thai_phrase: "ขอดูราคาในเมนูอย่างเป็นทางการและขอใบเสร็จแบบแยกรายการได้ไหมครับ/ค่ะ",
    contact_recommendation: isChinese
      ? (highRisk
          ? "在确认场馆、菜品及显示价格之前，请勿付款。如需帮助，请联系酒店工作人员或场馆管理层；仅在受到施压、被阻止或受到威胁时，才联系旅游警察1155。"
          : "如场馆或价格显示不明，可向酒店工作人员寻求第二意见。仅在受到施压或威胁时，才联系旅游警察1155。")
      : (highRisk
          ? "Do not pay until the venue, item, and displayed price are confirmed. Ask hotel staff or venue management for help; contact Tourist Police 1155 only if pressured, blocked, or threatened."
          : "Ask hotel staff for a second opinion if the venue or price display feels unclear. Contact Tourist Police 1155 only if pressured or threatened."),
    incident_report_summary: {
      english: `TrustPass food price check in ${request.city}: ${riskLevel} risk for menu price verification. The detected price is above the likely tier reference and should be confirmed with the venue before payment.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ ${riskLevel} สำหรับการตรวจสอบราคาอาหาร ควรยืนยันราคากับร้านก่อนชำระเงิน`
    }
  };
}

function applyEvidencePolicy(request: RiskCheckRequest): RiskCheckRequest {
  const choice = request.clarificationAnswers?.evidence_choice;
  if (choice === "Use my typed situation") {
    return {
      ...request,
      ignoredEvidenceText: request.evidenceText || request.extractedText,
      evidenceText: undefined,
      extractedText: undefined,
      evidenceRelevance: undefined
    };
  }

  if (choice === "Use the uploaded evidence" && (request.evidenceText || request.extractedText)) {
    return {
      ...request,
      message: "Please check this uploaded evidence.",
      evidenceText: request.evidenceText || request.extractedText,
      extractedText: undefined,
      evidenceRelevance: request.evidenceRelevance || classifyTextRelevance(request.evidenceText || request.extractedText || "", "evidence")
    };
  }

  const evidenceText = request.evidenceText || request.extractedText || "";
  if (!evidenceText.trim()) return request;

  const evidenceRelevance = request.evidenceRelevance || classifyTextRelevance(evidenceText, "evidence");
  if (!evidenceRelevance.usable_as_case_evidence) {
    return {
      ...request,
      evidenceText: undefined,
      extractedText: undefined,
      ignoredEvidenceText: evidenceText,
      evidenceRelevance
    };
  }

  return {
    ...request,
    evidenceText,
    extractedText: undefined,
    evidenceRelevance
  };
}

async function getScopeResponse(request: RiskCheckRequest, options: AnalyzeOptions): Promise<SituationAnalyzeResponse | null> {
  const messageRelevance = classifyTextRelevance(request.message, "message");
  const evidenceText = request.evidenceText || "";
  const evidenceRelevance = request.evidenceRelevance || (evidenceText ? classifyTextRelevance(evidenceText, "evidence") : undefined);
  const hasRelevantEvidence = Boolean(evidenceRelevance?.usable_as_case_evidence && evidenceText.trim());
  const genericMessage = isGenericCheckMessage(request.message);
  const intent = shouldUseQuestionIntentRouter(request.message, hasRelevantEvidence)
    ? await classifyQuestionIntentWithAzure(request.message, evidenceRelevance, evidenceText)
    : null;
  const intentResponse = getIntentScopeResponse(request, intent, evidenceRelevance, hasRelevantEvidence, genericMessage, options);
  if (intentResponse) return intentResponse;

  const routedMessageTopic = intent?.scope === "trustpass_case" && intent.confidence !== "low" ? mapIntentTopicToEvidenceTopic(intent.topic) : "unknown";
  const routedAsGenericTrustQuestion = intent?.scope === "trustpass_case" && intent.confidence !== "low" && routedMessageTopic === "unknown";
  const routedAsSpecificTrustQuestion = intent?.scope === "trustpass_case" && intent.confidence !== "low" && routedMessageTopic !== "unknown";

  if ((genericMessage || routedAsGenericTrustQuestion) && hasRelevantEvidence) return null;

  if (routedAsSpecificTrustQuestion && hasRelevantEvidence && evidenceRelevance) {
    if (areTopicsCompatible(routedMessageTopic, evidenceRelevance.topic)) return null;
    const isChinese2 = request.language === "Chinese";
    return evidenceMismatchResponse(
      routedMessageTopic,
      evidenceRelevance,
      isChinese2
        ? `您的问题似乎与${topicLabel(routedMessageTopic)}有关，但上传的证据看起来是${topicLabel(evidenceRelevance.topic)}。您希望核查哪一个？`
        : `Your question appears to be about ${topicLabel(routedMessageTopic)}, but the uploaded evidence looks like ${topicLabel(evidenceRelevance.topic)}. Which one should I check?`,
      isChinese2
    );
  }

  const intentConfirmedCase = intent?.scope === "trustpass_case";
  if (!messageRelevance.usable_as_case_evidence && !hasRelevantEvidence && !intentConfirmedCase) {
    const isChinese = request.language === "Chinese";
    return {
      status: "out_of_scope",
      message: isChinese
        ? "TrustPass 核查泰国旅游诈骗、欺诈、付款、交通、租赁、菜单价格和安全风险情况。此处未检测到此类情况。"
        : "TrustPass checks Thailand tourist scam, fraud, payment, transport, rental, menu-price, and safety-risk situations. I could not detect that kind of situation here.",
      suggested_next_inputs: scopeExamples(request.language),
      evidence_relevance: evidenceRelevance,
      grounding: []
    };
  }

  if (messageRelevance.usable_as_case_evidence && !hasRelevantEvidence) return null;

  if (!messageRelevance.usable_as_case_evidence && hasRelevantEvidence && !genericMessage) {
    const isChinese3 = request.language === "Chinese";
    return evidenceMismatchResponse(
      "unknown",
      evidenceRelevance!,
      isChinese3
        ? "您的描述不构成TrustPass核查案例，但上传的证据看起来相关。您希望核查哪一个？"
        : "Your message does not describe a TrustPass case, but the uploaded evidence looks relevant. Which one should I check?",
      isChinese3
    );
  }

  if (
    messageRelevance.usable_as_case_evidence &&
    hasRelevantEvidence &&
    evidenceRelevance &&
    !areTopicsCompatible(messageRelevance.topic, evidenceRelevance.topic)
  ) {
    const isChinese4 = request.language === "Chinese";
    return evidenceMismatchResponse(
      messageRelevance.topic,
      evidenceRelevance!,
      isChinese4
        ? `您的描述与${topicLabel(messageRelevance.topic)}有关，但上传的证据看起来是${topicLabel(evidenceRelevance.topic)}。您希望核查哪一个？`
        : `Your message is about ${topicLabel(messageRelevance.topic)}, but the uploaded evidence looks like ${topicLabel(evidenceRelevance.topic)}. Which one should I check?`,
      isChinese4
    );
  }

  return null;
}

function getIntentScopeResponse(
  request: RiskCheckRequest,
  intent: QuestionIntent | null,
  evidenceRelevance: EvidenceRelevanceResult | undefined,
  hasRelevantEvidence: boolean,
  genericMessage: boolean,
  options: AnalyzeOptions
): SituationAnalyzeResponse | null {
  if (!intent) return null;

  const isChinese = request.language === "Chinese";

  if (intent.action === "reject" || intent.scope === "not_related" || (intent.scope === "unclear" && !hasRelevantEvidence)) {
    return {
      status: "out_of_scope",
      message: intent.scope === "unclear"
        ? (isChinese
            ? "TrustPass 需要旅游诈骗、欺诈、付款、租赁、交通、菜单价格或安全风险的具体情况才能进行风险核查。"
            : "TrustPass needs a tourist scam, fraud, payment, rental, transport, menu-price, or safety-risk situation before it can check risk.")
        : (isChinese
            ? "TrustPass 核查泰国旅游诈骗、欺诈、付款、交通、租赁、菜单价格和安全风险情况。此处未检测到此类情况。"
            : "TrustPass checks Thailand tourist scam, fraud, payment, transport, rental, menu-price, and safety-risk situations. I could not detect that kind of situation here."),
      suggested_next_inputs: scopeExamples(request.language),
      evidence_relevance: evidenceRelevance,
      grounding: []
    };
  }

  if (
    options.allowClarification &&
    intent.action === "ask_clarification" &&
    intent.clarification_key &&
    !hasAnswer(request, intent.clarification_key)
  ) {
    if (intent.clarification_key === "evidence_choice" && evidenceRelevance) {
      return evidenceMismatchResponse(
        mapIntentTopicToEvidenceTopic(intent.topic),
        evidenceRelevance,
        intent.clarification_question || (isChinese
          ? "文字描述和上传的证据似乎描述的是不同的情况。您希望核查哪一个？"
          : "The typed situation and uploaded evidence appear to describe different cases. Which one should I check?"),
        isChinese
      );
    }

    if (!["route_context", "general_context"].includes(intent.clarification_key)) {
      return null;
    }

    return {
      status: "needs_clarification",
      clarification_key: intent.clarification_key,
      question: intent.clarification_question || defaultIntentClarificationQuestion(intent.topic, isChinese),
      reason: intent.reason,
      suggested_answers: intent.suggested_answers.length > 0 ? intent.suggested_answers : defaultIntentSuggestedAnswers(intent.topic, isChinese),
      grounding: []
    };
  }

  if (
    intent.scope === "trustpass_case" &&
    hasRelevantEvidence &&
    evidenceRelevance &&
    !genericMessage &&
    intent.topic !== "general_safety" &&
    mapIntentTopicToEvidenceTopic(intent.topic) !== "unknown" &&
    !areTopicsCompatible(mapIntentTopicToEvidenceTopic(intent.topic), evidenceRelevance.topic)
  ) {
    return evidenceMismatchResponse(
      mapIntentTopicToEvidenceTopic(intent.topic),
      evidenceRelevance,
      intent.clarification_question || (isChinese
        ? `您的问题似乎与${topicLabel(mapIntentTopicToEvidenceTopic(intent.topic))}有关，但上传的证据看起来是${topicLabel(evidenceRelevance.topic)}。您希望核查哪一个？`
        : `Your question appears to be about ${topicLabel(mapIntentTopicToEvidenceTopic(intent.topic))}, but the uploaded evidence looks like ${topicLabel(evidenceRelevance.topic)}. Which one should I check?`),
      isChinese
    );
  }

  return null;
}

function mapIntentTopicToEvidenceTopic(topic: IntentTopic): EvidenceTopic {
  return topic === "general_safety" ? "unknown" : topic;
}

function defaultIntentClarificationQuestion(topic: IntentTopic, isChinese = false) {
  if (isChinese) {
    switch (topic) {
      case "transport": return "他们是否报了固定价格、拒绝计表、更改路线，或向您施压要求上车？";
      case "food_menu": return "这份菜单来自哪里，或者您目前是否在餐厅内？";
      case "qr_payment": return "QR码/付款账户名称是否与商家名称一致？";
      case "job_lure": return "他们是否提到私人接车、第二地点、前往曼谷以外、保密要求、处理护照/手机，或任何预付费用？";
      default: return "还有哪一个细节可以帮助TrustPass安全核查此情况？";
    }
  }
  switch (topic) {
    case "transport":
      return "Did they quote a fare, refuse the meter, change the route, or pressure you to get in?";
    case "food_menu":
      return "Where is this menu from, or are you currently at the restaurant?";
    case "qr_payment":
      return "Does the QR/payment account name match the business name?";
    case "job_lure":
      return "Did they mention private pickup, a second location, travel outside Bangkok, secrecy, passport/phone handling, or any upfront fee?";
    default:
      return "What is the one detail that would help TrustPass check this safely?";
  }
}

function defaultIntentSuggestedAnswers(topic: IntentTopic, isChinese = false) {
  if (isChinese) {
    switch (topic) {
      case "transport": return ["他们报了固定价格", "他们拒绝使用计表", "他们向我施压", "不，只是正常的出租车邀约"];
      case "food_menu": return ["我目前在餐厅内", "我只有菜单截图", "菜单上可以看到餐厅名称"];
      case "qr_payment": return ["是的，名称一致", "不，是不同的个人名称", "未显示商家名称"];
      case "job_lure": return ["不，只是街头邀请", "他们提供了私人接车或第二地点", "他们要求我保密", "他们提到了护照、手机、费用或边境出行"];
      default: return ["我可以提供更多背景信息", "使用已上传的证据", "这不是TrustPass核查的案例"];
    }
  }
  switch (topic) {
    case "transport":
      return ["They quoted a fixed fare", "They refused the meter", "They pressured me", "No, just a normal taxi offer"];
    case "food_menu":
      return ["I am at the restaurant now", "I only have a menu screenshot", "The restaurant name is visible"];
    case "qr_payment":
      return ["Yes, it matches", "No, it is a different personal name", "The business name is not shown"];
    case "job_lure":
      return ["No, only a street invitation", "They offered private pickup or a second location", "They asked me to keep it secret", "They mentioned passport, phone, fee, or border travel"];
    default:
      return ["I can add more context", "Use the uploaded evidence", "This is not a TrustPass case"];
  }
}

function evidenceMismatchResponse(
  messageTopic: EvidenceTopic,
  evidenceRelevance: NonNullable<RiskCheckRequest["evidenceRelevance"]>,
  question: string,
  isChinese = false
): SituationAnalyzeResponse {
  return {
    status: "evidence_mismatch",
    clarification_key: "evidence_choice",
    question,
    reason: isChinese
      ? "TrustPass将OCR视为辅助证据。在进行风险评分前，文字描述和上传的证据应描述同一个案例。"
      : "TrustPass treats OCR as supporting evidence. The typed situation and uploaded evidence should describe the same case before risk scoring.",
    suggested_answers: isChinese
      ? ["使用我的文字描述", "使用上传的证据", "我将上传正确的证据"]
      : ["Use my typed situation", "Use the uploaded evidence", "I will upload the correct evidence"],
    message_topic: messageTopic,
    evidence_topic: evidenceRelevance.topic,
    evidence_relevance: evidenceRelevance,
    grounding: []
  };
}

function scopeExamples(language?: string) {
  if (language === "Chinese") {
    return [
      "出租车司机说计价器坏了，要收800泰铢从暹罗送我去郑王庙。",
      "一个LINE旅游卖家要求全额预付到个人银行账户。",
      "租车店要扣押我的原版护照。",
      "这份菜单照片看起来很贵，这家餐厅正常吗？",
      "一个选角经纪人提出免费接机去美索，还叮嘱我不要告诉酒店。"
    ];
  }
  return [
    "Taxi driver says the meter is broken and asks 800 baht from Siam to Wat Pho.",
    "A LINE tour seller asks for full payment to a personal bank account.",
    "The rental shop wants to keep my original passport.",
    "This menu photo looks expensive; is it normal for this restaurant?",
    "A casting recruiter offered airport pickup to Mae Sot and told me not to tell my hotel."
  ];
}

function applyGroundedSignalLabels(result: RiskCheckResult, grounding: NonNullable<RiskCheckResult["grounding"]>): RiskCheckResult {
  const signals: string[] = [];
  const fareSignal = grounding.find((signal) => signal.tool === "fare_reference");
  const farePosition = fareSignal?.metadata?.fare_position;
  const suspiciousFareSignals = Array.isArray(fareSignal?.metadata?.suspicious_fare_signals)
    ? fareSignal.metadata.suspicious_fare_signals
    : [];
  const fareRatio = typeof fareSignal?.metadata?.fare_ratio_to_baseline === "number" ? fareSignal.metadata.fare_ratio_to_baseline : null;

  if (suspiciousFareSignals.some((signal) => typeof signal === "string" && /meter|no meter|refuse/i.test(signal))) {
    signals.push("Meter refusal or meter unavailable");
  }
  if (farePosition === "above" || farePosition === "far_above") {
    signals.push("Fixed fare quote above route baseline");
    if (fareRatio !== null) {
      signals.push(
        fareRatio >= 3
          ? `Extreme fixed fare quote about ${fareRatio}x above route baseline`
          : `Quoted fare is about ${fareRatio}x above route baseline`
      );
    }
  }

  for (const signal of grounding) {
    if (!["operator_payment_reference", "qr_payment_reference", "rental_document_reference", "damage_claim_reference", "job_lure_reference"].includes(signal.tool)) continue;
    const interpreted = signal.metadata?.interpreted_signals;
    if (Array.isArray(interpreted)) {
      signals.push(...interpreted.filter((item): item is string => typeof item === "string"));
    }
  }

  const uniqueSignals = Array.from(new Set(signals)).slice(0, 8);
  if (uniqueSignals.length === 0) return result;

  return {
    ...result,
    suspicious_signals: uniqueSignals
  };
}

function getNormalFoodPriceResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const foodSignal = grounding.find((signal) => signal.tool === "food_price_reference");
  if (!foodSignal || foodSignal.metadata?.price_position !== "within") return null;

  const confidence = foodSignal.confidence;
  const tierLabel = typeof foodSignal.metadata.likely_tier_label === "string" ? foodSignal.metadata.likely_tier_label : "the likely restaurant tier";
  const matchedVenue = typeof foodSignal.metadata.matched_known_venue === "string" ? foodSignal.metadata.matched_known_venue : null;
  const highestPrice = typeof foodSignal.metadata.highest_price_baht === "number" ? foodSignal.metadata.highest_price_baht : null;
  const normalItemRange = Array.isArray(foodSignal.metadata.normal_item_range_baht)
    ? foodSignal.metadata.normal_item_range_baht.join("-")
    : "the expected";
  const normalMealRange = Array.isArray(foodSignal.metadata.normal_meal_range_baht)
    ? foodSignal.metadata.normal_meal_range_baht.join("-")
    : "the expected";

  if (confidence !== "high" || !highestPrice) return null;

  const isChinese = request.language === "Chinese";
  const venueText = matchedVenue ? ` at ${matchedVenue}` : "";
  const venueTextZh = matchedVenue ? `（${matchedVenue}）` : "";

  return {
    ...result,
    risk_level: "Low",
    category: isChinese
      ? (matchedVenue ? `${matchedVenue} 价格背景` : "高档餐厅价格背景")
      : (matchedVenue ? `${matchedVenue} price context` : "Premium restaurant price context"),
    suspicious_signals: [],
    why_it_matters: isChinese
      ? `${highestPrice} 泰铢在曼谷精选 ${tierLabel} 参考价格范围内${venueTextZh}。预期价格区间约为每项 ${normalItemRange} 泰铢或每餐 ${normalMealRange} 泰铢，未检测到付款不符、隐藏收费、施压或诱导换项信号。`
      : `${highestPrice} THB is within the curated Bangkok ${tierLabel} reference${venueText}. The expected band is about ${normalItemRange} THB per item or ${normalMealRange} THB per meal, and no payment mismatch, hidden fee, pressure, or bait-and-switch signal was detected.`,
    safe_next_steps: isChinese
      ? ["仅凭价格未发现诈骗信号。", "点餐前向工作人员确认菜品及显示价格。", "如决定付款，请保留收据。"]
      : ["No scam signal is detected from the price alone.", "Confirm the menu item and displayed price with staff before ordering.", "Keep the receipt if you decide to pay."],
    thai_phrase: "ขอยืนยันราคาเมนูนี้ก่อนสั่งอาหารครับ/ค่ะ",
    evidence_to_save: isChinese
      ? ["仅在最终账单与显示价格不符时，保留收据或菜单照片。"]
      : ["Receipt or menu photo only if the final bill differs from the displayed price."],
    contact_recommendation: isChinese
      ? "无需上报。如有不明之处，向工作人员确认价格即可。"
      : "No escalation recommended. Ask staff to confirm the price if anything is unclear.",
    incident_report_summary: {
      english: `TrustPass food price check in ${request.city}: Low risk. The ${highestPrice} THB price is within the ${tierLabel} reference${venueText}, and no suspicious payment or pressure signal was detected.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Low ราคา ${highestPrice} บาทอยู่ในช่วงอ้างอิงของ ${tierLabel}${matchedVenue ? ` (${matchedVenue})` : ""} และไม่พบสัญญาณกดดันหรือการชำระเงินที่น่าสงสัย`
    }
  };
}

function getNormalTaxiResult(
  result: RiskCheckResult,
  grounding: NonNullable<RiskCheckResult["grounding"]>,
  request: RiskCheckRequest
): RiskCheckResult | null {
  const fareSignal = grounding.find((signal) => signal.tool === "fare_reference");
  if (!fareSignal) return null;

  const farePosition = fareSignal.metadata?.fare_position;
  const suspiciousSignals = Array.isArray(fareSignal.metadata?.suspicious_fare_signals)
    ? fareSignal.metadata.suspicious_fare_signals
    : [];
  const quotedFare = typeof fareSignal.metadata?.quoted_fare_baht === "number" ? fareSignal.metadata.quoted_fare_baht : null;
  const baseline = Array.isArray(fareSignal.metadata?.baseline_range_baht)
    ? fareSignal.metadata.baseline_range_baht
    : null;

  if (farePosition !== "within_or_below" || suspiciousSignals.length > 0 || quotedFare === null) return null;

  const isChinese = request.language === "Chinese";
  const baselineText = baseline?.length === 2 ? ` The local reference range for this route is about ${baseline[0]}-${baseline[1]} THB before heavy waiting time.` : "";
  const baselineTextZh = baseline?.length === 2 ? `该路线当地参考价格约为 ${baseline[0]}-${baseline[1]} 泰铢（不含长时间等待费）。` : "";

  return {
    ...result,
    risk_level: "Low",
    category: isChinese ? "正常出租车费用" : "Normal taxi fare",
    suspicious_signals: [],
    why_it_matters: isChinese
      ? `${quotedFare} 泰铢在曼谷出租车接地数据所述路线参考范围内或以下。${baselineTextZh}未检测到拒绝使用计价器、隐藏收费、路线偏离、施压或安全信号。`
      : `${quotedFare} THB is within or below the Bangkok taxi fare grounding for the described route.${baselineText} No meter refusal, hidden fee, route diversion, pressure, or safety signal was detected.`,
    safe_next_steps: isChinese
      ? ["仅凭费用无需采取特别行动。", "上车前确认目的地。", "行程结束后按约定或计价器价格付款。"]
      : ["No special action is needed based on the fare alone.", "Confirm the destination before getting in.", "Pay the agreed fare or meter fare at the end of the ride."],
    thai_phrase: "ไปวัดโพธิ์ ราคา 50 บาท ใช่ไหมครับ/ค่ะ",
    evidence_to_save: isChinese
      ? ["如情况发生变化，正常低风险行程无需留存证据。"]
      : ["No evidence needed for a normal low-risk ride unless something changes."],
    contact_recommendation: isChinese
      ? "无需上报。仅在司机更改价格、拒绝约定路线或向您施压时，寻求帮助。"
      : "No escalation recommended. Ask for help only if the driver changes the price, refuses the agreed route, or pressures you.",
    incident_report_summary: {
      english: `TrustPass taxi fare check in ${request.city}: Low risk. The quoted ${quotedFare} THB fare is within or below the local route reference and no suspicious signal was detected.`,
      thai: `รายงาน TrustPass ในพื้นที่ ${request.city}: ระดับ Low ค่าโดยสาร ${quotedFare} บาทอยู่ในช่วงปกติหรือต่ำกว่าช่วงอ้างอิง และไม่พบสัญญาณน่าสงสัย`
    }
  };
}

export function toLegacyRiskResult(response: SituationAnalyzeResponse): RiskCheckResult {
  if (response.status === "completed") {
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

  if (response.status === "out_of_scope") {
    return {
      risk_level: "Low",
      category: "Outside TrustPass scope",
      suspicious_signals: [],
      why_it_matters: response.message,
      safe_next_steps: response.suggested_next_inputs.map((input) => `Try: ${input}`),
      thai_phrase: "ขออภัย ระบบนี้ใช้ตรวจสอบความเสี่ยงสำหรับนักท่องเที่ยวในประเทศไทยครับ/ค่ะ",
      evidence_to_save: [],
      contact_recommendation: "No escalation recommended. Submit a tourist scam, payment, rental, transport, menu-price, or safety-risk situation for TrustPass to assess.",
      incident_report_summary: {
        english: "TrustPass did not generate a scam-risk report because the input was outside the supported tourist trust scope.",
        thai: "TrustPass ไม่ได้สร้างรายงานความเสี่ยง เนื่องจากข้อมูลไม่อยู่ในขอบเขตการตรวจสอบสำหรับนักท่องเที่ยว"
      },
      grounding: response.grounding,
      source: "local-demo"
    };
  }

  if (response.status === "evidence_mismatch") {
    return {
      risk_level: "Caution",
      category: "Evidence mismatch",
      suspicious_signals: [],
      why_it_matters: response.reason,
      safe_next_steps: response.suggested_answers,
      thai_phrase: "ขอเลือกว่าจะตรวจสอบข้อความหรือหลักฐานที่อัปโหลดครับ/ค่ะ",
      evidence_to_save: [],
      contact_recommendation: "No escalation recommended. Choose which case TrustPass should analyze before continuing.",
      incident_report_summary: {
        english: "TrustPass paused because the typed situation and uploaded evidence appear to describe different case types.",
        thai: "TrustPass หยุดการประเมินไว้ก่อน เนื่องจากข้อความและหลักฐานที่อัปโหลดดูเหมือนเป็นคนละกรณี"
      },
      grounding: response.grounding,
      source: "local-demo"
    };
  }

  return {
    risk_level: "Caution",
    category: "More context needed",
    suspicious_signals: [],
    why_it_matters: response.reason,
    safe_next_steps: [response.question, ...response.suggested_answers.map((answer) => `Answer option: ${answer}`)],
    thai_phrase: "ขอข้อมูลเพิ่มเติมเพื่อช่วยตรวจสอบความเสี่ยงครับ/ค่ะ",
    evidence_to_save: ["Restaurant/operator name if visible", "Current location or venue name", "Menu, QR, receipt, or chat screenshot"],
    contact_recommendation: "Ask staff to confirm the venue, price, receipt, or payment account before paying.",
    incident_report_summary: {
      english: `TrustPass needs clarification: ${response.question}`,
      thai: `TrustPass ต้องการข้อมูลเพิ่มเติม: ${response.question}`
    },
    grounding: response.grounding,
    source: "local-demo"
  };
}

function combineText(request: RiskCheckRequest) {
  const clarificationText = Object.values(request.clarificationAnswers || {}).join(" ");
  return `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""} ${clarificationText} ${request.city}`.toLowerCase();
}

function hasMenuContext(text: string, prices: string[]) {
  const dishOrMenuSignal = /menu|เมนู|food|dish|crab|omelette|noodle|rice|pad thai|ผัด|อาหาร/i.test(text);
  const restaurantMenuSignal = /(restaurant|ร้าน)[\s\S]{0,80}(menu|เมนู)|(menu|เมนู)[\s\S]{0,80}(restaurant|ร้าน)/i.test(text);
  return prices.length > 0 && (dishOrMenuSignal || restaurantMenuSignal);
}

function hasFoodTierClue(text: string) {
  return /jay fai|michelin|premium|famous venue|department store|food court|food hall|mall|paragon|emporium|emquartier|centralworld|gaysorn|central embassy|terminal 21|pier 21|mbk|street food|stall|market|local restaurant|local stall|sit-down|fine dining|higher-end|high end/i.test(text);
}

function hasStreetOrLocalStallClue(text: string) {
  return /street food|local stall|stall|market/i.test(text);
}

function highestPriceBaht(prices: string[]) {
  return prices
    .map((price) => Number(price.replace(/[^\d]/g, "")))
    .filter((price) => Number.isFinite(price))
    .reduce((highest, price) => Math.max(highest, price), 0);
}

function hasConcreteFoodScamSignal(text: string) {
  return /hidden fee|different price|forced|threat|pay now|cash only|no receipt|personal account|different name|account mismatch|name mismatch|scan to pay.*(?:account|personal|different|mismatch)|bait|not shown|menu price changed/i.test(text);
}

function hasQrPersonalAccountConcern(text: string) {
  if (/account name|ชื่อบัญชี|personal account|personal name|different name|account mismatch|name mismatch|not match|does not match|bank transfer|transfer to/i.test(text)) {
    return true;
  }
  return /qr|scan to pay/i.test(text) && /account|personal|different|mismatch|not match|bank|transfer|recipient|receiver|name/i.test(text);
}

function hasBusinessIdentity(text: string, businessNames: string[]) {
  return businessNames.length > 0 || /company|co\.|ltd|limited|license|operator|tour company|restaurant|ร้าน|บริษัท/i.test(text);
}

function hasGroundingTool(grounding: RiskCheckResult["grounding"], tool: string) {
  return Boolean(grounding?.some((signal) => signal.tool === tool));
}

function hasDeterministicNonFoodEscalation(grounding: RiskCheckResult["grounding"]) {
  return Boolean(
    grounding?.some((signal) =>
      ["operator_payment_reference", "rental_document_reference", "damage_claim_reference", "job_lure_reference"].includes(signal.tool)
    )
  );
}

function hasHighRiskJobLureSignal(grounding: RiskCheckResult["grounding"]) {
  const signal = grounding?.find((item) => item.tool === "job_lure_reference");
  if (!signal) return false;

  return signal.metadata?.has_controlled_pickup === true ||
    signal.metadata?.has_border_travel === true ||
    signal.metadata?.has_secrecy_instruction === true ||
    signal.metadata?.has_document_or_phone_request === true ||
    signal.metadata?.has_upfront_fee === true;
}

function hasAnswer(request: RiskCheckRequest, key: string) {
  const value = request.clarificationAnswers?.[key];
  return Boolean(value && value.trim());
}
