export type UILang = "en" | "zh";

const en = {
  // Navigation
  navSubtitle: "AI Scam & Fraud Shield",
  backToOverview: "Back to overview",

  // TrustPassChat page header
  riskCheckKicker: "Risk Check",
  mainTitle: "Check a tourist scam or safety situation",
  guideButton: "Guide",

  // FormPanel
  appTitle: "TrustPass Thailand",
  appSubtitle: "Tourism trust assistant",
  describeSituationTitle: "1. Describe Situation",
  addEvidenceTitle: "2. Add Evidence",
  optionalLabel: "Optional",
  situationPlaceholder:
    "Tell us what's happening. For example: A taxi driver says the meter is broken and wants 800 baht to take me to Wat Pho.",
  dropEvidence: "Drop evidence or browse files",
  browseFiles: "Browse files",
  fileFormats: "Supports JPG, PNG, PDF",
  extractedLabel: "Extracted:",
  checkRisk: "Check Risk",
  analyzing: "Analyzing…",
  poweredBy: "Powered by Azure AI · Document Intelligence + OpenAI",

  // EmptyState
  readyToCheck: "Ready to check",
  emptyStateDesc: "Submit a situation on the left to receive a structured risk assessment in seconds.",

  // Loading stages
  loadingStages: [
    "Reading your situation…",
    "Cross-referencing Thailand risk patterns…",
    "Generating action plan…"
  ] as [string, string, string],

  // Sample chips
  sampleChips: [
    { label: "Normal taxi", text: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?" },
    { label: "Suspicious taxi", text: "A taxi driver says the meter is broken and wants 800 baht to take me from Siam to Wat Pho." },
    { label: "Mall menu", text: "This menu shows seafood pasta 320 baht and crab fried rice 450 baht. I am at Siam Paragon. Is this suspicious?" },
    { label: "Street food high price", text: "A street food stall menu shows pad thai 320 baht and fried rice 350 baht. Is this normal?" },
    { label: "Jay Fai menu", text: "I am at Jay Fai. The menu shows crab omelette 1500 baht and drunken noodles 800 baht. Is this suspicious?" },
    { label: "Tour booking", text: "A LINE tour seller is asking for full payment today to a personal bank account and will not show a license number." },
    { label: "Passport rental", text: "The motorbike rental shop wants to keep my original passport as a deposit." },
    { label: "QR mismatch", text: "Restaurant QR payment account name is a different personal name and they say scan to pay now." },
    { label: "Casting offer", text: "A WeChat recruiter offered me a paid casting gig with free airport pickup. The driver said we'll go to Mae Sot for the interview and asked me not to tell my hotel." }
  ] as Array<{ label: string; text: string }>,

  // Quick tour steps
  quickTourSteps: [
    { kicker: "Step 1 of 5", title: "Set the travel context", target: "Context bar", body: "Choose the city, incident date, and location context before checking. Location helps TrustPass compare taxi fares, venue prices, and known tourist zones more accurately." },
    { kicker: "Step 2 of 5", title: "Describe what is happening", target: "Describe Situation", body: "Write the situation naturally, like you would text a hotel front desk. Include prices, names, places, instructions, and anything that feels suspicious." },
    { kicker: "Step 3 of 5", title: "Attach evidence if you have it", target: "Add Evidence", body: "Upload screenshots, QR payment screens, menus, receipts, contracts, rental forms, or chat logs. Azure Document Intelligence reads the evidence and TrustPass checks whether it matches your situation." },
    { kicker: "Step 4 of 5", title: "Read the risk result", target: "Assessment result", body: "After you press Check Risk, the result shows the risk level, suspicious signals, grounding details, Thai phrase, and safe next steps. If context is unclear, TrustPass asks a follow-up first." },
    { kicker: "Step 5 of 5", title: "Prepare a help report", target: "Incident report", body: "For caution or serious cases, save evidence in the checklist and generate a Thai report that can be handed to hotel staff, Tourist Police, embassy staff, or another local helper." }
  ],

  // Result panel
  assessmentComplete: "Assessment complete",
  newCheck: "New check",
  riskScore: "Risk score",

  // Sections
  whyRisky: "Why this is risky",
  detectedSignals: "Detected signals",
  noSignals: "No strong signals matched the situation. Stay alert and verify identity, price, and receipt before paying.",
  groundingDetails: "Grounding details",
  caseSpecificGuidance: "Case-specific guidance",
  recommendedActions: "Recommended actions",
  showInThai: "Show this in Thai",
  showPhone: "Show your phone",
  neutralPhrasing: "Polite, neutral phrasing meant to defuse the situation, not accuse.",
  copy: "Copy",
  copied: "Copied",
  showLarge: "Show large",
  evidenceToSave: "Evidence to save",
  recommendedSupport: "Recommended support level",
  incidentReport: "Incident report",

  // Signals count helper
  signalsDetected: (count: number) => `${count} ${count === 1 ? "signal" : "signals"} detected`,

  // ClarificationPanel
  oneDetailNeeded: "One detail needed",
  orTypeAnswer: "Or type an answer",
  typeVenueName: "Type the restaurant or venue name",
  venuePlaceholder: "Example: Jay Fai, Siam Paragon food court, local street stall",
  answerPlaceholder: "Type the restaurant name, venue context, or account detail",
  continueBtn: "Continue",

  // Evidence mismatch
  evidenceMismatchLabel: "Evidence mismatch",
  messageTopic: "Message:",
  evidenceTopic: "Evidence:",

  // OutOfScope
  outsideScope: "Outside TrustPass scope",
  outOfScopeTitle: "This does not look like a tourist scam or safety check.",

  // Context bar
  city: "City",
  date: "Date",
  locationContext: "Location context",
  useGps: "Use GPS",
  locationSet: "Location set:",

  // Evidence checklist
  addEvidenceItemTitle: "Add another evidence item",
  addEvidence: "Add evidence",
  addFile: "Add file",
  addNotePlaceholder: "Add note, e.g. account name, receipt number, location, or screenshot detail",
  addCustomPlaceholder: "Example: QR screenshot with personal account name",

  // Incident report section
  viewReport: "View structured incident report",
  printSavePdf: "Print / Save as PDF",
  downloadReport: "Download printable report",
  copyReport: "Copy report",
  incidentTabLabel: "English",
  incidentTabThai: "Thai",

  // Footer
  disclaimer: "This is a risk assessment based on observed signals, not a legal accusation. Always verify before acting. In emergencies call Tourist Police 1155.",
  regionalIntelligence: "Eligible Caution-or-higher signals can contribute to regional intelligence",

  // Risk levels
  riskLevels: {
    Emergency: "EMERGENCY",
    High: "HIGH",
    Caution: "CAUTION",
    Low: "LOW"
  } as Record<string, string>,

  // Priority labels
  priorities: {
    immediate: "Immediate",
    soon: "Soon",
    preventive: "Preventive"
  } as Record<string, string>,

  // Human headline
  headlines: {
    emergency: (category: string, city: string) => `Stop now — ${category.toLowerCase()} pattern detected in ${city}.`,
    high: (category: string) => `Don’t proceed yet — verify ${category.toLowerCase()} before paying or travelling.`,
    caution: (category: string) => `Verify before continuing — ${category.toLowerCase()} signals detected.`,
    low: "No strong scam pattern detected — stay alert and verify before paying."
  },

  // Error
  checkFailed: "We couldn’t complete the check.",

  // Tour modal
  skip: "Skip",
  back: "Back",
  next: "Next",
  finish: "Finish",
  lookFor: "Look for",

  // Large phrase modal
  showToThai: "Show this to a Thai speaker",
  pressEscToClose: "Press Esc or tap outside to close",

  // Home page
  homeBadge: "Tourism trust infrastructure",
  homeH1: "TrustPass Thailand",
  homeSubtitle: "AI Scam & Fraud Shield for Tourists",
  homeDesc:
    "A guided risk-check workflow where tourists can describe suspicious situations, attach evidence, and get Azure AI-powered risk signals, safe next steps, Thai phrases, and structured help reports before harm happens.",
  tryRiskCheck: "Try Risk Check",
  viewDashboard: "View Dashboard",
  problemKicker: "Problem",
  problemH2: "Thailand tourism trust is being damaged before tourists ask for help.",
  problemText:
    "Scams and fraud range from everyday overcharging to fake tour payments, passport leverage, and critical fake job or casting luring. Emergency tools help after an incident; TrustPass focuses on the uncertain moment before tourists pay, travel, or follow instructions.",
  problemCards: [
    ["Before payment", "Check QR accounts, deposits, receipts, and license clues."],
    ["Before travel", "Detect risky routes, border luring, secrecy pressure, and controlled transport."],
    ["Before conflict", "Give calm Thai phrases and evidence checklists."],
    ["After reporting", "Turn messy evidence into a structured help report."]
  ] as [string, string][],
  launchRiskCheck: "Launch Risk Check",
  showArchitecture: "Show Architecture",
  seeAllScenarios: "See all scenarios",

  // Grounding details
  menuPriceComparison: "Menu price comparison",
  menuPriceComparisonSubtitle: (tierLabel: string) =>
    `Compared against curated Bangkok references for ${tierLabel}.`,
  taxiRouteFare: "Taxi route and fare grounding",
  tableItem: "Item",
  tableListed: "Listed",
  tableNormalRange: "Normal range",
  tableStatus: "Status",
  distanceLabel: "Distance",
  expectedMeter: "Expected meter",
  quotedFare: "Quoted fare",
  overBaseline: "Over baseline",
  distanceUnknown: "Unknown",
  meterRuleOnly: "Rule only",
  fareNotProvided: "Not provided",
  ratioUnknown: "Unknown",

  // GPS errors
  locationNotSupported: "Location is not supported in this browser.",
  locationReadError: "Could not read browser location.",

  // Evidence readout
  evidenceReadoutTitle: "Evidence readout",
  evidenceSourceAzure: "Azure Document Intelligence",
  evidenceSourceDemo: "Demo fallback extraction",
  evidenceQualityRelevant: "Relevant evidence",
  evidenceQualityWeak: "Weak OCR",
  evidenceQualityIgnored: "Ignored as unrelated",
  evidenceNoText: "No readable text detected.",
  evidenceHintPrices: "Prices",
  evidenceHintAccounts: "Accounts",
  evidenceHintBusinesses: "Businesses",
  evidenceHintPlaces: "Places",
  evidenceHintRiskPhrases: "Risk phrases",
  evidenceHintDates: "Dates",

  // Price status badges (grounding table)
  priceNormal: "Normal",
  priceSlightlyHigh: "Slightly high",
  priceUnusuallyHigh: "Unusually high",

  // Taxi grounding source labels
  taxiMeterRule: "Bangkok taxi meter rule",
  taxiSourceAzureMaps: "Azure Maps",
  taxiSourceCurated: "Curated estimate",
  taxiSourceFallback: "Fallback",

  // Print / download status messages
  printOpening: "Opening the print dialog. Choose Save as PDF if you want a PDF file.",
  printFallback: "If the print dialog does not appear, use the downloadable printable report button.",
  printBlocked: "Printing was blocked, so a printable report file was downloaded instead.",
  printDownloaded: "Printable report downloaded. Open it and choose Print or Save as PDF.",

  // Incident report modal field labels
  reportKeyInfo: "Key information",
  reportCategory: "Category",
  reportRiskLevel: "Risk level",
  reportCity: "City",
  reportEvidence: "Evidence",
  reportTime: "Time",
  reportEvidenceIncluded: "Evidence included in the report",
  reportSaved: "Saved",
  reportNotSaved: "Not saved",
  reportNote: "Note",
  reportFiles: "Files",

  // Risk pill labels (home page scenario cards)
  riskPillLabels: { Low: "Low", Caution: "Caution", High: "High", Emergency: "Emergency" } as Record<string, string>,

  // Scenario cards (home page)
  scenarioCards: [
    { title: "Transport overcharging and detours", touristInput: "A taxi says the meter is broken, or a tuk-tuk says the temple is closed and wants to stop at a shop." },
    { title: "Food and menu price verification", touristInput: "This menu looks expensive. Is 1,500 baht for crab omelette normal here?" },
    { title: "Tour, QR, and payment fraud", touristInput: "A tour seller asks for full payment to a personal account, or a QR code name does not match the business." },
    { title: "Rental passport and document risk", touristInput: "A motorbike or scooter rental shop wants to keep my original passport as a deposit." },
    { title: "Rental damage cash pressure", touristInput: "A jet ski or motorbike shop claims damage and demands cash now with no receipt or neutral inspection." },
    { title: "Fake job or casting emergency luring", touristInput: "A recruiter offers paid casting, free pickup, secrecy, and travel toward Mae Sot or the border." }
  ],

  // Nav items
  navItems: [
    { href: "/", label: "Overview" },
    { href: "/check", label: "Risk Check" },
    { href: "/scenarios", label: "Scenarios" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/architecture", label: "Architecture" }
  ],

  // Home page stat cards
  evidenceCards: [
    { value: "35M+", label: "foreign visitors in 2024", note: "Thailand tourism is a national economic engine." },
    { value: "USD 48B", label: "tourism revenue in 2024", note: "Trust failures have direct economic consequences." },
    { value: "10K", label: "reported Chinese cancellations", note: "Safety concerns created real demand loss in early 2025." },
    { value: "2025", label: "Trusted Thailand Stamp", note: "TAT already treats safety and trust as a priority." }
  ],

  // Azure services cards
  azureServices: [
    { title: "Azure OpenAI", description: "Uses the configured GPT-4o deployment for structured risk reasoning, safe next steps, Thai phrases, and incident reports." },
    { title: "Azure AI Document Intelligence", description: "Reads uploaded images and PDFs, then returns OCR text and evidence hints such as prices, accounts, places, and risky phrases." },
    { title: "TrustPass Grounding Layer", description: "Local deterministic tools check scope, evidence mismatch, taxi fares, food tiers, payment fraud, rental risk, and job-lure patterns before Azure OpenAI." },
    { title: "Regional Intelligence Dashboard", description: "Aggregates eligible Caution, High, and Emergency cases into demo intelligence for hotels, tourism operators, TAT, and tourist police." }
  ],

  // Visual story cards
  visualStories: [
    { title: "Menu price context", label: "Food / venue grounding", text: "High food prices are not automatically scams. TrustPass asks for venue context, then compares visible menu items against Bangkok food tiers." },
    { title: "Payment identity risk", label: "Tour / QR fraud", text: "Full prepayment, personal accounts, missing license details, and urgency language are grounded as stronger payment-fraud signals." },
    { title: "QR account mismatch", label: "Restaurant payment", text: "TrustPass flags when the restaurant name and QR payment account do not match, especially when the tourist is pressured to scan and pay immediately." },
    { title: "Document leverage", label: "Rental protection", text: "Passport retention and unclear deposit terms are treated as document-leverage risk, with safer alternatives suggested before conflict starts." }
  ],

  // Home page — remaining sections
  touristEvidenceKicker: "Tourist Evidence",
  touristEvidenceH2: "The demo is built around real travel moments, not only system diagrams.",
  touristEvidenceDesc: "These synthetic evidence samples show the situations TrustPass is designed to read: menus, payment chats, and rental documents. OCR supports the story, but the typed situation remains the primary case unless the user chooses otherwise.",
  liveProductKicker: "Live Product",
  liveProductH2: "One guided risk-check workspace for the major tourist-trust cases.",
  whyNotChatGptKicker: "Why not just ChatGPT?",
  whyNotChatGptH2: "The value is evidence, tourism risk context, and action workflow.",
  whyNotCards: [
    ["Evidence-aware", "Accepts screenshots, receipts, contracts, QR screens, and chat logs."],
    ["Thailand-specific", "Uses tourism risk patterns, emergency contacts, and verified operator signals."],
    ["Actionable", "Returns Thai phrases, evidence checklists, and incident reports."],
    ["Transformational", "Aggregates eligible Caution, High, and Emergency signals into a dashboard for hotels, TAT, and tourist police."]
  ] as [string, string][],
  aiStackKicker: "AI + Grounding Stack",
  aiStackH2: "Azure AI powers OCR and reasoning after TrustPass grounding.",
  productFlowKicker: "Product Flow",
  productFlowH2: "Start with the trust crisis, then prove the product works.",

  // Case-specific card content
  operatorCard: {
    title: "Tour/operator verification",
    summary: "Verify identity before paying. TrustPass checks whether the seller is asking for advance transfer without the basic operator proof tourists need.",
    badge: "Tour payment",
    advancePayment: { label: "Advance payment", yes: "Full advance payment was detected.", no: "No full advance payment signal detected." },
    accountIdentity: { label: "Account identity", yes: "Payment appears to go to a personal account.", no: "No personal account signal detected." },
    licenseProof: { label: "License proof", yes: "Operator or TAT license details are missing.", no: "License concern was not detected." },
    saferPath: { label: "Safer path", value: "Ask for license details, written cancellation terms, and an official receipt before paying." }
  },
  qrCard: {
    title: "QR/payment identity check",
    summary: "The key issue is whether the account receiving money belongs to the business. A mismatch makes refunds and disputes much harder.",
    badge: "Payment",
    accountMatch: { label: "Account match", yes: "Account name appears personal or mismatched.", no: "No clear mismatch detected." },
    receipt: { label: "Receipt", value: "Ask for an itemized receipt that names the business before sending a large payment." },
    disputeRisk: { label: "Dispute risk", value: "If the account is personal, keep a screenshot of QR code, account name, amount, and chat context." },
    saferPath: { label: "Safer path", value: "Pay at the counter or through the official booking platform when possible." }
  },
  rentalCard: {
    title: "Rental/passport protection",
    summary: "TrustPass treats original passport retention as a leverage risk. Safer rental terms should avoid handing over the original document.",
    badge: "Rental",
    passport: { label: "Passport", yes: "Original passport requested as deposit.", no: "No original passport request detected." },
    alternative: { label: "Alternative", value: "Offer a passport copy plus refundable cash/card deposit instead." },
    beforeUse: { label: "Before use", value: "Take photos/video of all sides, fuel level, helmet, and existing scratches." },
    paperTrail: { label: "Paper trail", value: "Keep the contract, receipt, shop name, and deposit terms." }
  },
  damageCard: {
    title: "Rental damage dispute",
    summary: "The product separates legitimate damage claims from pressure patterns: large immediate cash demands, no receipt, and no neutral inspection.",
    badge: "Damage claim",
    demandAmount: { label: "Demand amount", noAmount: "No amount detected." },
    demandAmountValue: (amount: number, ratio: number | null) =>
      `${amount.toLocaleString("en-US")} THB${ratio ? `, about ${ratio}x the demo minor-damage threshold` : ""}.`,
    cashDemand: { label: "Cash demand", yes: "Immediate or large cash demand detected.", no: "No large immediate cash demand detected." },
    receipt: { label: "Receipt", yes: "No receipt or written estimate was detected.", no: "Receipt concern was not detected." },
    neutralProcess: { label: "Neutral process", value: "Ask for written estimate, photos, contract terms, insurer/platform, or neutral inspection." },
    ifPressured: { label: "If pressured", value: "Move to a public area and contact hotel staff, insurer, platform support, or Tourist Police 1155." }
  },
  jobLureCard: {
    title: "Fake job/casting emergency protocol",
    summary: "This pattern is safety-first. Recruitment plus controlled pickup, secrecy, and border travel should be treated as a stop condition.",
    badge: "Emergency",
    controlledPickup: { label: "Controlled pickup", yes: "Pickup or free transport was detected.", no: "No pickup signal detected." },
    borderTravel: { label: "Border travel", yes: "Mae Sot, Myanmar, or border travel was detected.", no: "No border travel signal detected." },
    secrecy: { label: "Secrecy", yes: "Secrecy or isolation instruction was detected.", no: "No secrecy signal detected." },
    stopAction: { label: "Stop action", value: "Do not travel to the pickup point. Stay public and contact hotel staff, Tourist Police 1155, or embassy." }
  },

  // Support plans (ContactSection)
  supportPlans: {
    emergency: [
      { title: "Immediate help", subtitle: "Tourist Police", value: "Call 1155 from a safe public place" },
      { title: "Safety backup", subtitle: "Hotel / Embassy", value: "Ask staff or consulate to help now" },
      { title: "Medical emergency", subtitle: "Emergency medical", value: "Call 1669 if injured or unsafe" }
    ],
    high: [
      { title: "First step", subtitle: "Pause and verify", value: "Do not pay, travel, or hand over documents yet" },
      { title: "Practical help", subtitle: "Hotel / official channel", value: "Ask front desk or platform support to verify" },
      { title: "Escalate if pressured", subtitle: "Tourist Police", value: "Call 1155 if threatened or blocked" }
    ],
    caution: [
      { title: "First step", subtitle: "Verify calmly", value: "Confirm price, identity, and receipt before paying" },
      { title: "Second opinion", subtitle: "Hotel / trusted local", value: "Ask staff if the price or terms feel unclear" },
      { title: "Escalate only if needed", subtitle: "Tourist Police", value: "Use 1155 only for pressure, threats, or refusal to let you leave" }
    ],
    low: [
      { title: "No escalation", subtitle: "Continue normally", value: "No police or official contact needed" },
      { title: "Basic check", subtitle: "Confirm details", value: "Confirm destination, price, menu, or receipt" },
      { title: "If things change", subtitle: "Re-check later", value: "Use TrustPass again if pressure or hidden fees appear" }
    ]
  } as Record<string, Array<{ title: string; subtitle: string; value: string }>>,

  // Dashboard page
  dashboardKicker: "Real-time Threat Intelligence",
  dashboardH1: "B2G Dashboard",
  dashboardDesc: "Live aggregated Caution, High, and Emergency signals from tourist risk-checks across Thailand. Used by TAT and Tourist Police to monitor hotspots, identify emerging scam patterns, and deploy preventive resources.",
  dashboardTrackedCases: "Tracked Cases (7d)",
  dashboardEmergencyCases: "Emergency Cases (7d)",
  dashboardTopCategory: "Top Scam Category",
  dashboardMostAffectedCity: "Most Affected City",
  dashboardSessionChecksLabel: "session checks",
  dashboardSessionIncluded: "with Caution or higher risk are included in this browser session.",
  dashboardUpdated: "Updated",
  dashboardRiskHeatmap: "Risk Heatmap",
  dashboardRecentReports: "Recent Live Reports",
  dashboardShowingLast10: "Showing last 10",
  dashboardColTime: "Time",
  dashboardColCity: "City",
  dashboardColCategory: "Category",
  dashboardColRiskLevel: "Risk Level",
  timeAgoMins: (n: number) => `${n}m ago`,
  timeAgoHours: (n: number) => `${n}h ago`,
  timeAgoDays: (n: number) => `${n}d ago`,

  // Dashboard intelligence category labels (from intelligence store / AI output)
  dashboardCategoryLabels: {
    taxi_overcharging: "Taxi overcharging",
    tour_payment_fraud: "Tour payment fraud",
    rental_passport_retention: "Rental passport retention",
    qr_payment_fraud: "QR payment fraud",
    fake_job_lure: "Fake job / casting lure",
    rental_damage_pressure: "Rental damage pressure",
    food_price_overcharge: "Food price overcharge"
  } as Record<string, string>,

  // Heatmap legend and tooltip
  heatmapTrackedRisk: "Tracked Risk",
  heatmapSizeNote: "Size = Report Count",
  heatmapHighestSeen: "Highest seen",
  heatmapTotalCases: "Total Cases",
  heatmapMapStatus: "Map status",
  heatmapTopIssue: "Top Issue",
  heatmapAllCaseTypes: "All case types",

  // Scenarios page
  scenariosPageKicker: "Guided Product Scenarios",
  scenariosPageH1: "Major tourist scam categories TrustPass can detect.",
  scenariosPageDesc: "Each category shows how the product combines situation details, evidence extraction, grounded risk checks, clarification, Thai phrase support, and incident reporting.",
  scenarioLabel: (index: number) => `Scenario ${index + 1}`,
  blockTouristQuestion: "What a tourist might ask",
  blockEvidenceType: "Evidence type",
  blockTrustPassDoes: "What TrustPass does",
  blockWhyItMatters: "Why it matters",
  scenarioSignalsHeader: "Detected signals",
  recommendedWalkthrough: "Recommended walkthrough",
  recommendedWalkthroughDesc: "Start with payment or transport, then try food/menu clarification, and finish with fake job/casting emergency luring.",
  scenariosFullData: [
    {
      id: "transport",
      title: "Transport overcharging and detours",
      riskRange: "Low to High",
      touristInput: "A taxi says the meter is broken, or a tuk-tuk says the temple is closed and wants to stop at a shop.",
      evidenceType: "Route, fare quote, taxi plate, chat, location context",
      signals: ["meter refusal", "fixed fare above route baseline", "attraction-closed detour", "shop commission stop"],
      trustPassDoes: "Compares route/fare context, separates normal cheap fares from suspicious quotes, and gives calm Thai phrases.",
      whyItMatters: "Transport scams are frequent trust leaks, but the app should not over-warn when a fare is normal."
    },
    {
      id: "food-menu",
      title: "Food and menu price verification",
      riskRange: "Low to Caution",
      touristInput: "This menu looks expensive. Is 1,500 baht for crab omelette normal here?",
      evidenceType: "Menu photo, OCR text, restaurant name, GPS or venue context",
      signals: ["menu item prices", "venue tier", "premium/famous venue context", "missing venue confirmation"],
      trustPassDoes: "Extracts all visible menu items, compares each item against the likely venue tier, and asks for venue clarification when needed.",
      whyItMatters: "High prices can be normal at famous venues but suspicious at local stalls. Venue context is the key."
    },
    {
      id: "payment",
      title: "Tour, QR, and payment fraud",
      riskRange: "Caution to High",
      touristInput: "A tour seller asks for full payment to a personal account, or a QR code name does not match the business.",
      evidenceType: "LINE/WhatsApp screenshot, flyer, QR screen, account name, receipt",
      signals: ["full advance payment", "personal or mismatched account", "missing license", "time pressure"],
      trustPassDoes: "Prioritizes payment fraud grounding over unrelated OCR noise and recommends verification before money leaves the account.",
      whyItMatters: "Payment identity and operator legitimacy are central to avoiding fake bookings and refund disputes."
    },
    {
      id: "rental-documents",
      title: "Rental passport and document risk",
      riskRange: "Caution to High",
      touristInput: "A motorbike or scooter rental shop wants to keep my original passport as a deposit.",
      evidenceType: "Rental contract, receipt, passport clause, shop name",
      signals: ["original passport requested", "unclear deposit terms", "vehicle rental leverage"],
      trustPassDoes: "Flags document leverage risk and suggests safer alternatives such as passport copy plus written deposit terms.",
      whyItMatters: "Passport leverage can turn a minor rental issue into a serious traveler safety problem."
    },
    {
      id: "rental-damage",
      title: "Rental damage cash pressure",
      riskRange: "High",
      touristInput: "A jet ski or motorbike shop claims damage and demands cash now with no receipt or neutral inspection.",
      evidenceType: "Damage photo, rental contract, chat/cash demand, receipt refusal",
      signals: ["large cash demand", "no receipt or written estimate", "pressure to avoid neutral process"],
      trustPassDoes: "Separates legitimate damage documentation from pressure patterns and recommends written estimates, photos, and neutral help.",
      whyItMatters: "Legitimate damage claims need documentation. TrustPass guides tourists toward receipts, inspection, insurer/platform help, and safe escalation."
    },
    {
      id: "job-lure",
      title: "Fake job or casting emergency luring",
      riskRange: "Emergency",
      touristInput: "A recruiter offers paid casting, free pickup, secrecy, and travel toward Mae Sot or the border.",
      evidenceType: "WeChat/LINE chat, profile, phone number, pickup point, route instruction",
      signals: ["controlled pickup", "border travel", "secrecy or isolation", "informal recruiter"],
      trustPassDoes: "Treats the combination as a stop-now emergency and generates evidence to save for hotel, police, or embassy help.",
      whyItMatters: "This connects directly to the trust crisis around fake job/casting luring and cross-border scam-compound fears."
    }
  ] as Array<{ id: string; title: string; riskRange: string; touristInput: string; evidenceType: string; signals: string[]; trustPassDoes: string; whyItMatters: string }>,

  // Architecture page
  architecturePageKicker: "Azure AI Architecture",
  architecturePageH1: "Azure AI powers OCR and reasoning after deterministic grounding.",
  architecturePageDesc: "TrustPass combines tourist-provided situation details, uploaded evidence, Azure Document Intelligence OCR, local tourism-grounding tools, and Azure OpenAI reasoning to produce safer next steps before tourists pay, travel, or follow instructions.",
  testLiveFlow: "Test the live flow",
  architectureCards: [
    {
      title: "Evidence processing",
      items: [
        "Azure Document Intelligence extracts OCR text from screenshots, menus, receipts, contracts, and PDFs",
        "OCR hints are shown to the user as supporting evidence",
        "Weak or unrelated evidence is ignored instead of being forced into the score"
      ]
    },
    {
      title: "Risk reasoning",
      items: [
        "Deterministic grounding runs before Azure OpenAI",
        "Azure OpenAI receives structured in-scope context and grounding signals",
        "The result is rendered as a consistent action card and help report"
      ]
    },
    {
      title: "Trust data layer",
      items: [
        "Tourism scam and fraud risk patterns",
        "Bangkok food tiers, taxi fare references, venue and event context",
        "Dashboard records only eligible Caution, High, and Emergency cases"
      ]
    }
  ] as Array<{ title: string; items: string[] }>,
  responsibleTrustKicker: "Responsible Trust Workflow",
  responsibleTrustItems: [
    "The app flags risk signals without declaring a business guilty.",
    "Tourists receive verification steps before payment or travel.",
    "High-risk situations produce clear escalation guidance.",
    "Aggregated Caution, High, and Emergency signals help tourism stakeholders understand where trust is breaking down."
  ] as string[],

  // TrustPassChat gaps
  categoryLabels: {
    transport: "Taxi / transport",
    food_menu: "Food / menu",
    tour_payment: "Tour payment",
    qr_payment: "QR payment",
    rental_document: "Rental document",
    damage_claim: "Damage claim",
    job_lure: "Job / casting risk",
    unknown: "Unknown"
  } as Record<string, string>,
  reportTitle: "TrustPass Thailand Incident Report",
  reportGenerated: "Generated",
  reportSummary: "Summary",
  reportDetectedSignals: "Detected signals",
  reportRecommendedSteps: "Recommended next steps",
  reportEvidenceSaved: "Evidence saved",
  reportNoEvidence: "No evidence marked as saved yet.",
  reportContactRec: "Contact recommendation",
  reportDisclaimerLabel: "Disclaimer",
  reportDisclaimerText: "This report summarizes risk signals for support staff, insurers, embassies, or tourist police. It is not a legal accusation.",
  evidenceStatusSaved: "Saved",
  evidenceStatusPending: "Still recommended",
  tooltipDeleteEvidence: "Delete evidence item",
  tooltipClearEvidence: "Clear saved state, notes, and files",
  tooltipRemoveFile: "Remove file from report",
};

const zh: typeof en = {
  // Navigation
  navSubtitle: "AI诈骗防护盾",
  backToOverview: "返回概览",

  // TrustPassChat page header
  riskCheckKicker: "风险核查",
  mainTitle: "检查旅游诈骗或安全风险",
  guideButton: "使用指南",

  // FormPanel
  appTitle: "TrustPass 泰国",
  appSubtitle: "旅游信任助手",
  describeSituationTitle: "1. 描述情况",
  addEvidenceTitle: "2. 添加证据",
  optionalLabel: "可选",
  situationPlaceholder: "描述您遇到的情况。例如：出租车司机说计价器坏了，要收800泰铢带我去郑王庙。",
  dropEvidence: "拖拽证据文件或点击浏览",
  browseFiles: "浏览文件",
  fileFormats: "支持 JPG、PNG、PDF",
  extractedLabel: "识别内容：",
  checkRisk: "检查风险",
  analyzing: "分析中…",
  poweredBy: "由 Azure AI · 文档智能 + OpenAI 提供支持",

  // EmptyState
  readyToCheck: "准备就绪",
  emptyStateDesc: "在左侧提交情况描述，几秒内即可获得结构化风险评估。",

  // Loading stages
  loadingStages: [
    "正在读取您的情况…",
    "正在比对泰国风险模式…",
    "正在生成行动建议…"
  ],

  // Sample chips
  sampleChips: [
    { label: "正常出租车", text: "出租车司机说要收50泰铢从暹罗送我去郑王庙，这正常吗？" },
    { label: "可疑出租车", text: "出租车司机说计价器坏了，要收800泰铢从暹罗送我去郑王庙。" },
    { label: "商场菜单", text: "菜单显示海鲜意面320铢，螃蟹炒饭450铢。我在Siam Paragon。价格可疑吗？" },
    { label: "路边摊高价", text: "路边摊菜单上pad thai 320铢，炒饭350铢，这正常吗？" },
    { label: "Jay Fai菜单", text: "我在Jay Fai。菜单上螃蟹煎蛋1500铢，醉面800铢，这可疑吗？" },
    { label: "旅游预订", text: "LINE上的旅游销售要求今天全款付到个人银行账户，且不提供执照号码。" },
    { label: "押护照", text: "摩托车租赁店要留我的原件护照作为押金。" },
    { label: "QR码不匹配", text: "餐厅QR码显示的付款账户是个人名字，他们说扫码立即付款。" },
    { label: "招聘诱骗（王星案）", text: "有人通过微信联系我，说要选角拍广告并提供免费机场接送。但司机说要带我去美索（Mae Sot）面试，还叮嘱我不要告诉酒店。" }
  ],

  // Quick tour steps
  quickTourSteps: [
    { kicker: "第 1 步，共 5 步", title: "设置出行背景", target: "背景栏", body: "核查前请先选择城市、事发日期和位置背景。位置信息有助于 TrustPass 更准确地比对出租车收费、场所价格和已知旅游区信息。" },
    { kicker: "第 2 步，共 5 步", title: "描述正在发生的事情", target: "描述情况", body: "像发短信给酒店前台一样自然地描述情况。请包括价格、名字、地点、收到的指示，以及任何让您感到可疑的内容。" },
    { kicker: "第 3 步，共 5 步", title: "如有证据请附上", target: "添加证据", body: "上传截图、QR码付款截图、菜单、收据、合同、租赁表格或聊天记录。Azure 文档智能将读取证据，TrustPass 将检查证据是否与您描述的情况相符。" },
    { kicker: "第 4 步，共 5 步", title: "查看风险结果", target: "评估结果", body: "点击「检查风险」后，结果将显示风险等级、可疑信号、基准数据详情、泰语短语和安全建议。如情况不明确，TrustPass 会先提出一个跟进问题。" },
    { kicker: "第 5 步，共 5 步", title: "准备求助报告", target: "事件报告", body: "对于警告或严重情况，请在清单中保存证据，并生成泰语报告，可交给酒店员工、旅游警察、大使馆人员或当地协助者。" }
  ],

  // Result panel
  assessmentComplete: "评估完成",
  newCheck: "新检查",
  riskScore: "风险评分",

  // Sections
  whyRisky: "为何存在风险",
  detectedSignals: "检测到的信号",
  noSignals: "未发现明显的诈骗信号。保持警惕，付款前请核实身份、价格和收据。",
  groundingDetails: "基准数据详情",
  caseSpecificGuidance: "针对性指引",
  recommendedActions: "建议行动",
  showInThai: "向泰国人展示（泰语短语）",
  showPhone: "将手机展示给对方",
  neutralPhrasing: "礼貌中性的措辞，旨在化解紧张气氛，而非指控对方。",
  copy: "复制",
  copied: "已复制",
  showLarge: "放大显示",
  evidenceToSave: "需要保存的证据",
  recommendedSupport: "建议的支持级别",
  incidentReport: "事件报告",

  // Signals count helper
  signalsDetected: (count: number) => `检测到 ${count} 个信号`,

  // ClarificationPanel
  oneDetailNeeded: "需要一个补充信息",
  orTypeAnswer: "或输入您的答案",
  typeVenueName: "输入餐厅或场所名称",
  venuePlaceholder: "例如：Jay Fai、Siam Paragon美食广场、路边小摊",
  answerPlaceholder: "输入餐厅名称、场所背景或账户信息",
  continueBtn: "继续",

  // Evidence mismatch
  evidenceMismatchLabel: "证据不匹配",
  messageTopic: "描述：",
  evidenceTopic: "证据：",

  // OutOfScope
  outsideScope: "超出 TrustPass 范围",
  outOfScopeTitle: "这似乎不是旅游诈骗或安全核查问题。",

  // Context bar
  city: "城市",
  date: "日期",
  locationContext: "位置背景",
  useGps: "使用GPS",
  locationSet: "位置已设置：",

  // Evidence checklist
  addEvidenceItemTitle: "添加另一项证据",
  addEvidence: "添加证据",
  addFile: "添加文件",
  addNotePlaceholder: "添加备注，例如账户名、收据号、位置或截图详情",
  addCustomPlaceholder: "例如：带个人账户名的QR码截图",

  // Incident report section
  viewReport: "查看结构化事件报告",
  printSavePdf: "打印 / 另存为PDF",
  downloadReport: "下载可打印报告",
  copyReport: "复制报告",
  incidentTabLabel: "英文",
  incidentTabThai: "泰文",

  // Footer
  disclaimer: "这是基于观察到的信号进行的风险评估，而非法律指控。采取行动前请务必核实。紧急情况请拨打泰国旅游警察 1155。",
  regionalIntelligence: "符合条件的警告或更高风险信号可提交至区域情报系统",

  // Risk levels
  riskLevels: {
    Emergency: "紧急",
    High: "高危",
    Caution: "警告",
    Low: "低风险"
  },

  // Priority labels
  priorities: {
    immediate: "立即",
    soon: "尽快",
    preventive: "预防"
  },

  // Human headline
  headlines: {
    emergency: (category: string, city: string) => `立即停止 — 在${city}发现${category}风险。`,
    high: (category: string) => `暂勿继续 — 付款或出行前请核实${category}。`,
    caution: (category: string) => `继续前请核实 — 发现${category}信号。`,
    low: "未发现明显诈骗模式 — 保持警惕，付款前请核实。"
  },

  // Error
  checkFailed: "无法完成核查，请稍后重试。",

  // Tour modal
  skip: "跳过",
  back: "上一步",
  next: "下一步",
  finish: "完成",
  lookFor: "寻找",

  // Large phrase modal
  showToThai: "将此内容展示给泰语使用者",
  pressEscToClose: "按 Esc 键或点击外部关闭",

  // Home page
  homeBadge: "旅游信任基础设施",
  homeH1: "TrustPass 泰国",
  homeSubtitle: "游客AI诈骗与欺诈防护盾",
  homeDesc: "引导式风险核查流程，让游客描述可疑情况、上传证据，在危险发生前获取Azure AI驱动的风险信号、安全建议、泰语短语和结构化求助报告。",
  tryRiskCheck: "开始风险核查",
  viewDashboard: "查看仪表盘",
  problemKicker: "问题",
  problemH2: "泰国旅游信任正在游客求助之前受到损害。",
  problemText: "诈骗和欺诈的范围从日常的价格欺诈，到伪造旅游付款、护照胁迫，以及危险的招聘/选角诱骗（如王星事件）。紧急应对工具在事件发生后才能起作用；TrustPass 专注于游客付款、出行或遵从指示之前的关键时刻。",
  problemCards: [
    ["付款前", "核查QR账户、押金、收据和许可证信息。"],
    ["出行前", "检测危险路线、边境诱骗、秘密压力和受控交通。"],
    ["冲突前", "提供冷静的泰语短语和证据清单。"],
    ["报案后", "将混乱的证据整理成结构化求助报告。"]
  ],
  launchRiskCheck: "启动风险核查",
  showArchitecture: "查看架构图",
  seeAllScenarios: "查看全部场景",

  // Grounding details
  menuPriceComparison: "菜单价格比较",
  menuPriceComparisonSubtitle: (tierLabel: string) => `已与${tierLabel}的曼谷精选参考价进行比较。`,
  taxiRouteFare: "出租车路线与收费核对",
  tableItem: "项目",
  tableListed: "标价",
  tableNormalRange: "正常范围",
  tableStatus: "状态",
  distanceLabel: "距离",
  expectedMeter: "预期计价",
  quotedFare: "报价",
  overBaseline: "超出基准",
  distanceUnknown: "未知",
  meterRuleOnly: "仅计费规则",
  fareNotProvided: "未提供",
  ratioUnknown: "未知",

  // GPS errors
  locationNotSupported: "此浏览器不支持位置功能。",
  locationReadError: "无法读取浏览器位置。",

  // Evidence readout
  evidenceReadoutTitle: "证据读取结果",
  evidenceSourceAzure: "Azure 文档智能",
  evidenceSourceDemo: "演示备用提取",
  evidenceQualityRelevant: "相关证据",
  evidenceQualityWeak: "OCR 识别较弱",
  evidenceQualityIgnored: "已忽略（不相关）",
  evidenceNoText: "未检测到可读文本。",
  evidenceHintPrices: "价格",
  evidenceHintAccounts: "账户",
  evidenceHintBusinesses: "商家",
  evidenceHintPlaces: "地点",
  evidenceHintRiskPhrases: "风险词语",
  evidenceHintDates: "日期",

  // Price status badges
  priceNormal: "正常",
  priceSlightlyHigh: "略高",
  priceUnusuallyHigh: "异常偏高",

  // Taxi grounding source labels
  taxiMeterRule: "曼谷出租车计价规则",
  taxiSourceAzureMaps: "Azure 地图",
  taxiSourceCurated: "精选估算",
  taxiSourceFallback: "备用数据",

  // Print / download status messages
  printOpening: "正在打开打印对话框，如需PDF请选择「另存为PDF」。",
  printFallback: "如果打印对话框未出现，请使用可下载的打印报告按钮。",
  printBlocked: "打印被阻止，已自动下载可打印报告文件。",
  printDownloaded: "报告已下载，请打开后选择打印或另存为PDF。",

  // Incident report modal field labels
  reportKeyInfo: "关键信息",
  reportCategory: "类别",
  reportRiskLevel: "风险等级",
  reportCity: "城市",
  reportEvidence: "证据",
  reportTime: "时间",
  reportEvidenceIncluded: "报告中包含的证据",
  reportSaved: "已保存",
  reportNotSaved: "未保存",
  reportNote: "备注",
  reportFiles: "文件",

  // Nav items
  navItems: [
    { href: "/", label: "概览" },
    { href: "/check", label: "风险核查" },
    { href: "/scenarios", label: "场景" },
    { href: "/dashboard", label: "仪表盘" },
    { href: "/architecture", label: "架构" }
  ],

  // Risk pill labels
  riskPillLabels: { Low: "低风险", Caution: "注意", High: "高风险", Emergency: "紧急" } as Record<string, string>,

  // Scenario cards
  scenarioCards: [
    { title: "交通宰客与绕路", touristInput: "出租车司机说计价器坏了，或者嘟嘟车说寺庙关门了，要带我去一家商店。" },
    { title: "餐饮与菜单价格核查", touristInput: "这份菜单看起来很贵，这里的螃蟹炒蛋要1500泰铢正常吗？" },
    { title: "旅游、QR码与付款诈骗", touristInput: "旅游卖家要求全额打款到个人账户，或QR码账户名称与商家不符。" },
    { title: "租赁护照与证件风险", touristInput: "摩托车或踏板车租赁店要扣押我的原版护照作为押金。" },
    { title: "租赁损坏现金施压", touristInput: "摩托艇或摩托车租赁店索赔损坏费，要求立即付现金，不提供收据或中立检验。" },
    { title: "虚假招聘/选角紧急诱骗", touristInput: "一名招募者提供有偿选角、免费接机、要求保密，并前往美索或边境地区。" }
  ],

  // Home page stat cards
  evidenceCards: [
    { value: "3500万+", label: "2024年外国游客", note: "泰国旅游业是国家经济支柱。" },
    { value: "USD 480亿", label: "2024年旅游收入", note: "信任危机对经济产生直接影响。" },
    { value: "1万", label: "中国游客取消记录", note: "2025年初安全顾虑导致实际客流损失。" },
    { value: "2025", label: "泰国信任认证计划", note: "泰国旅游局已将安全与信任列为优先事项。" }
  ],

  // Azure services cards
  azureServices: [
    { title: "Azure OpenAI", description: "使用已配置的GPT-4o部署进行结构化风险推理、安全建议、泰语短语和事件报告生成。" },
    { title: "Azure AI 文档智能", description: "读取上传的图片和PDF，返回OCR文本及价格、账户、地点、风险词语等证据提示。" },
    { title: "TrustPass 数据接地层", description: "本地确定性工具在调用Azure OpenAI之前检查范围、证据不匹配、出租车费率、餐饮级别、付款欺诈、租赁风险和招聘诱骗模式。" },
    { title: "区域情报仪表盘", description: "将符合条件的警告、高风险和紧急案例汇总为演示情报，供酒店、旅游运营商、泰国旅游局和旅游警察使用。" }
  ],

  // Visual story cards
  visualStories: [
    { title: "菜单价格背景", label: "餐饮/场所核查", text: "高价食品不等于诈骗。TrustPass会询问场所背景，再将菜单价格与曼谷餐饮级别参考数据进行比较。" },
    { title: "付款身份风险", label: "旅游/QR诈骗", text: "全额预付、个人账户、缺少许可证信息及催促语言，均被作为较强的付款欺诈信号处理。" },
    { title: "QR账户不匹配", label: "餐厅付款", text: "当餐厅名称与QR付款账户不符时，TrustPass会发出警示，尤其是在游客被催促立即扫码付款的情况下。" },
    { title: "证件胁迫", label: "租赁保护", text: "护照扣押和不明确的押金条款被视为证件胁迫风险，并在冲突发生前提供更安全的替代方案。" }
  ],

  // Home page — remaining sections
  touristEvidenceKicker: "游客证据",
  touristEvidenceH2: "演示围绕真实旅行场景构建，而非仅限系统图示。",
  touristEvidenceDesc: "这些合成证据样本展示了TrustPass设计用于识别的情况：菜单、付款聊天记录和租赁文件。OCR辅助提供信息，但除非用户另行选择，否则文字描述仍为主要依据。",
  liveProductKicker: "实际产品",
  liveProductH2: "针对主要旅游信任风险场景的一站式风险核查工作台。",
  whyNotChatGptKicker: "为什么不直接用ChatGPT？",
  whyNotChatGptH2: "核心价值在于证据分析、泰国旅游风险背景和行动流程。",
  whyNotCards: [
    ["证据感知", "接受截图、收据、合同、QR付款截图和聊天记录。"],
    ["泰国专项", "使用旅游风险模式、紧急联系人和已验证运营商信号。"],
    ["可操作", "返回泰语短语、证据清单和事件报告。"],
    ["数据聚合", "将符合条件的警告、高风险和紧急信号汇总至酒店、泰国旅游局和旅游警察的仪表盘。"]
  ] as [string, string][],
  aiStackKicker: "AI + 数据接地栈",
  aiStackH2: "Azure AI 在TrustPass数据接地后驱动OCR和推理。",
  productFlowKicker: "产品流程",
  productFlowH2: "从信任危机出发，验证产品效果。",

  // Case-specific card content
  operatorCard: {
    title: "旅行/运营商核实",
    summary: "付款前请核实对方身份。TrustPass 检查销售方是否要求在没有基本运营商证明的情况下进行预付款转账。",
    badge: "旅游付款",
    advancePayment: { label: "预付款", yes: "已检测到全额预付款要求。", no: "未检测到全额预付款信号。" },
    accountIdentity: { label: "账户身份", yes: "付款似乎转入个人账户。", no: "未检测到个人账户信号。" },
    licenseProof: { label: "许可证证明", yes: "缺少运营商或泰国旅游局许可证信息。", no: "未检测到许可证问题。" },
    saferPath: { label: "更安全的做法", value: "付款前索取许可证详情、书面取消条款和正式收据。" }
  },
  qrCard: {
    title: "QR码/付款身份核实",
    summary: "关键问题是收款账户是否属于该商家。账户不匹配会使退款和争议变得更加困难。",
    badge: "付款",
    accountMatch: { label: "账户匹配", yes: "账户名似乎是个人名字或存在不匹配。", no: "未发现明显不匹配。" },
    receipt: { label: "收据", value: "支付大额款项前，请索取注明商家名称的逐项收据。" },
    disputeRisk: { label: "争议风险", value: "如账户为个人账户，请保存QR码截图、账户名、金额和聊天记录。" },
    saferPath: { label: "更安全的做法", value: "尽量在柜台付款或通过官方预订平台支付。" }
  },
  rentalCard: {
    title: "租赁/护照保护",
    summary: "TrustPass 将扣押原件护照视为胁迫风险。更安全的租赁条款应避免交出原件证件。",
    badge: "租赁",
    passport: { label: "护照", yes: "已要求提供原件护照作为押金。", no: "未检测到原件护照要求。" },
    alternative: { label: "替代方案", value: "提供护照复印件加上可退还的现金/刷卡押金作为替代。" },
    beforeUse: { label: "使用前", value: "对各侧面、油量、头盔和现有划痕进行拍照/录像。" },
    paperTrail: { label: "书面记录", value: "保留合同、收据、店铺名称和押金条款。" }
  },
  damageCard: {
    title: "租赁损坏纠纷",
    summary: "本功能区分合理的损坏索赔与施压模式：大额即时现金要求、无收据、无中立检验。",
    badge: "损坏索赔",
    demandAmount: { label: "索赔金额", noAmount: "未检测到金额。" },
    demandAmountValue: (amount: number, ratio: number | null) => {
      const ratioText = ratio ? `，约为参考损坏阈值的 ${ratio} 倍` : "";
      return `${amount.toLocaleString("zh-CN")} 泰铢${ratioText}。`;
    },
    cashDemand: { label: "现金要求", yes: "已检测到即时或大额现金要求。", no: "未检测到大额即时现金要求。" },
    receipt: { label: "收据", yes: "未检测到收据或书面估价。", no: "未检测到收据问题。" },
    neutralProcess: { label: "中立流程", value: "索取书面估价、照片、合同条款、保险人/平台信息或要求中立检验。" },
    ifPressured: { label: "受到施压时", value: "移至公共区域，联系酒店员工、保险人、平台客服或旅游警察 1155。" }
  },
  jobLureCard: {
    title: "虚假招聘/选角紧急处置",
    summary: "此模式以安全为优先。招聘 + 受控接送 + 保密要求 + 边境出行，应作为立即停止的信号。",
    badge: "紧急",
    controlledPickup: { label: "受控接送", yes: "已检测到接送或免费交通安排。", no: "未检测到接送信号。" },
    borderTravel: { label: "边境出行", yes: "已检测到美索（Mae Sot）、缅甸或边境出行信号。", no: "未检测到边境出行信号。" },
    secrecy: { label: "保密要求", yes: "已检测到保密或隔离指示。", no: "未检测到保密信号。" },
    stopAction: { label: "停止行动", value: "不要前往接送地点。留在公共场所，联系酒店员工、旅游警察 1155 或大使馆。" }
  },

  // Support plans
  supportPlans: {
    emergency: [
      { title: "立即求助", subtitle: "旅游警察", value: "在安全的公共场所拨打 1155" },
      { title: "安全后援", subtitle: "酒店 / 大使馆", value: "立即请工作人员或领事馆协助" },
      { title: "医疗紧急情况", subtitle: "急救医疗", value: "如受伤或人身不安全，请拨打 1669" }
    ],
    high: [
      { title: "第一步", subtitle: "暂停并核实", value: "暂勿付款、出行或交出任何证件" },
      { title: "实际帮助", subtitle: "酒店 / 官方渠道", value: "请前台或平台客服协助核实" },
      { title: "受到施压时升级", subtitle: "旅游警察", value: "受到威胁或被拦截时拨打 1155" }
    ],
    caution: [
      { title: "第一步", subtitle: "冷静核实", value: "付款前确认价格、身份和收据" },
      { title: "寻求第二意见", subtitle: "酒店 / 可信本地人", value: "如对价格或条款感到不安，请咨询酒店员工" },
      { title: "必要时升级", subtitle: "旅游警察", value: "仅在受到施压、威胁或被阻止离开时使用 1155" }
    ],
    low: [
      { title: "无需升级", subtitle: "正常进行", value: "无需联系警察或官方机构" },
      { title: "基本核查", subtitle: "确认信息", value: "确认目的地、价格、菜单或收据" },
      { title: "情况变化时", subtitle: "稍后重新核查", value: "如出现施压或隐藏费用，请再次使用 TrustPass" }
    ]
  },

  // Dashboard page
  dashboardKicker: "实时威胁情报",
  dashboardH1: "B2G 仪表盘",
  dashboardDesc: "汇聚泰国各地旅游风险核查中的警告、高风险和紧急信号实时数据，供泰国旅游局（TAT）和旅游警察监控风险热点、识别新型诈骗模式并调配防护资源。",
  dashboardTrackedCases: "追踪案例（7天）",
  dashboardEmergencyCases: "紧急案例（7天）",
  dashboardTopCategory: "主要诈骗类别",
  dashboardMostAffectedCity: "受影响最多城市",
  dashboardSessionChecksLabel: "次核查",
  dashboardSessionIncluded: "包含警告或更高风险级别，已纳入本次浏览器会话。",
  dashboardUpdated: "已更新",
  dashboardRiskHeatmap: "风险热图",
  dashboardRecentReports: "最近实时报告",
  dashboardShowingLast10: "显示最近10条",
  dashboardColTime: "时间",
  dashboardColCity: "城市",
  dashboardColCategory: "类别",
  dashboardColRiskLevel: "风险级别",
  timeAgoMins: (n: number) => `${n}分钟前`,
  timeAgoHours: (n: number) => `${n}小时前`,
  timeAgoDays: (n: number) => `${n}天前`,

  // Dashboard intelligence category labels
  dashboardCategoryLabels: {
    taxi_overcharging: "出租车宰客",
    tour_payment_fraud: "旅游付款诈骗",
    rental_passport_retention: "租赁护照扣押",
    qr_payment_fraud: "QR码付款诈骗",
    fake_job_lure: "虚假招聘/选角诱骗",
    rental_damage_pressure: "租赁损坏施压",
    food_price_overcharge: "餐饮价格欺诈"
  } as Record<string, string>,

  // Heatmap legend and tooltip
  heatmapTrackedRisk: "风险追踪",
  heatmapSizeNote: "圆点大小 = 报告数量",
  heatmapHighestSeen: "最高风险",
  heatmapTotalCases: "案例总数",
  heatmapMapStatus: "地图状态",
  heatmapTopIssue: "主要问题",
  heatmapAllCaseTypes: "所有案例类型",

  // Scenarios page
  scenariosPageKicker: "精选产品场景",
  scenariosPageH1: "TrustPass 能够检测的主要旅游诈骗类别。",
  scenariosPageDesc: "每个类别展示了产品如何综合情况描述、证据提取、基准风险核查、澄清问答、泰语短语支持和事件报告等功能。",
  scenarioLabel: (index: number) => `场景 ${index + 1}`,
  blockTouristQuestion: "游客可能会问什么",
  blockEvidenceType: "证据类型",
  blockTrustPassDoes: "TrustPass 如何处理",
  blockWhyItMatters: "为什么重要",
  scenarioSignalsHeader: "检测到的信号",
  recommendedWalkthrough: "推荐体验流程",
  recommendedWalkthroughDesc: "建议从付款或交通场景开始，然后尝试餐饮/菜单价格核查，最后体验虚假招聘/选角紧急诱骗场景。",
  scenariosFullData: [
    {
      id: "transport",
      title: "交通宰客与绕路",
      riskRange: "低至高",
      touristInput: "出租车司机说计价器坏了，或者嘟嘟车说寺庙关门了，要带我去一家商店。",
      evidenceType: "路线、报价、出租车车牌、聊天记录、位置信息",
      signals: ["拒绝使用计价器", "固定收费高于路线基准价", "以景点关闭为由绕道", "带客进入佣金商店"],
      trustPassDoes: "比对路线/收费背景信息，区分正常低价与可疑报价，并提供冷静的泰语短语。",
      whyItMatters: "交通诈骗是常见的信任漏洞，但当收费正常时，应用不应过度预警。"
    },
    {
      id: "food-menu",
      title: "餐饮与菜单价格核查",
      riskRange: "低至注意",
      touristInput: "这份菜单看起来很贵，这里的螃蟹炒蛋要1500泰铢正常吗？",
      evidenceType: "菜单照片、OCR文字、餐厅名称、GPS或场所信息",
      signals: ["菜单项目价格", "场所档次", "高端/知名场所背景", "缺少场所确认"],
      trustPassDoes: "提取所有可见菜单项目，与可能的场所档次进行比较，并在需要时要求澄清场所信息。",
      whyItMatters: "高价在知名场所可能属于正常，但在路边摊则属可疑。场所背景是关键。"
    },
    {
      id: "payment",
      title: "旅游、QR码与付款诈骗",
      riskRange: "注意至高危",
      touristInput: "旅游卖家要求全额打款到个人账户，或QR码账户名称与商家不符。",
      evidenceType: "LINE/WhatsApp截图、传单、QR码截图、账户名称、收据",
      signals: ["全额预付款", "个人或不匹配账户", "缺少执照", "时间压力"],
      trustPassDoes: "优先处理付款诈骗基准信号，排除无关OCR噪音，并建议在转账前进行核实。",
      whyItMatters: "付款身份和运营商合规性是避免虚假预订和退款纠纷的核心。"
    },
    {
      id: "rental-documents",
      title: "租赁护照与证件风险",
      riskRange: "注意至高危",
      touristInput: "摩托车或踏板车租赁店要扣押我的原版护照作为押金。",
      evidenceType: "租赁合同、收据、护照条款、店铺名称",
      signals: ["要求提供原版护照", "押金条款不明确", "车辆租赁胁迫"],
      trustPassDoes: "标记证件胁迫风险，并建议更安全的替代方案，如护照复印件加书面押金条款。",
      whyItMatters: "护照胁迫可能将小型租赁问题升级为严重的旅行安全问题。"
    },
    {
      id: "rental-damage",
      title: "租赁损坏现金施压",
      riskRange: "高危",
      touristInput: "摩托艇或摩托车租赁店索赔损坏费，要求立即付现金，不提供收据或中立检验。",
      evidenceType: "损坏照片、租赁合同、聊天/现金要求、拒绝开收据",
      signals: ["大额现金要求", "无收据或书面估价", "施压回避中立流程"],
      trustPassDoes: "将合理的损坏证明与施压模式区分开来，并建议书面估价、拍照和寻求中立帮助。",
      whyItMatters: "合理的损坏索赔需要文件证明。TrustPass 引导游客索取收据、检验报告、保险人/平台帮助及安全升级渠道。"
    },
    {
      id: "job-lure",
      title: "虚假招聘/选角紧急诱骗",
      riskRange: "紧急",
      touristInput: "一名招募者提供有偿选角、免费接机、要求保密，并前往美索或边境地区。",
      evidenceType: "微信/LINE聊天记录、个人资料、电话号码、接送地点、路线指示",
      signals: ["受控接送", "边境出行", "保密或隔离要求", "非正规招募者"],
      trustPassDoes: "将上述组合视为立即停止的紧急信号，并生成可交给酒店、警察或大使馆的证据材料。",
      whyItMatters: "这与围绕虚假招聘/选角诱骗和跨境诈骗园区的信任危机直接相关。"
    }
  ] as Array<{ id: string; title: string; riskRange: string; touristInput: string; evidenceType: string; signals: string[]; trustPassDoes: string; whyItMatters: string }>,

  // Architecture page
  architecturePageKicker: "Azure AI 架构",
  architecturePageH1: "Azure AI 在确定性数据接地后驱动OCR和推理。",
  architecturePageDesc: "TrustPass 综合游客提供的情况描述、上传的证据、Azure 文档智能OCR、本地旅游接地工具和 Azure OpenAI 推理，在游客付款、出行或遵从指示之前提供更安全的建议。",
  testLiveFlow: "测试实时流程",
  architectureCards: [
    {
      title: "证据处理",
      items: [
        "Azure 文档智能从截图、菜单、收据、合同和PDF中提取OCR文字",
        "OCR提示作为佐证证据展示给用户",
        "弱相关或不相关的证据将被忽略，而不是强制纳入评分"
      ]
    },
    {
      title: "风险推理",
      items: [
        "确定性数据接地在 Azure OpenAI 之前运行",
        "Azure OpenAI 接收结构化的范围内背景和接地信号",
        "结果以一致的行动卡片和求助报告形式呈现"
      ]
    },
    {
      title: "信任数据层",
      items: [
        "旅游诈骗与欺诈风险模式",
        "曼谷餐饮档次、出租车收费参考、场所和活动背景",
        "仪表盘仅记录符合条件的警告、高风险和紧急案例"
      ]
    }
  ] as Array<{ title: string; items: string[] }>,
  responsibleTrustKicker: "负责任的信任工作流程",
  responsibleTrustItems: [
    "应用标记风险信号，而不是宣告商家有罪。",
    "游客在付款或出行前获得核实步骤。",
    "高风险情况提供清晰的升级指引。",
    "汇总的警告、高风险和紧急信号帮助旅游利益相关方了解信任危机发生的地点。"
  ] as string[],

  // TrustPassChat gaps
  categoryLabels: {
    transport: "出租车 / 交通",
    food_menu: "餐饮 / 菜单",
    tour_payment: "旅游付款",
    qr_payment: "QR码付款",
    rental_document: "租赁证件",
    damage_claim: "损坏索赔",
    job_lure: "招聘 / 选角风险",
    unknown: "未知"
  } as Record<string, string>,
  reportTitle: "TrustPass 泰国事件报告",
  reportGenerated: "生成时间",
  reportSummary: "摘要",
  reportDetectedSignals: "检测到的信号",
  reportRecommendedSteps: "建议下一步行动",
  reportEvidenceSaved: "已保存的证据",
  reportNoEvidence: "尚未标记任何已保存的证据。",
  reportContactRec: "联系建议",
  reportDisclaimerLabel: "免责声明",
  reportDisclaimerText: "本报告汇总风险信号，供酒店员工、保险人、大使馆或旅游警察参考，不构成法律指控。",
  evidenceStatusSaved: "已保存",
  evidenceStatusPending: "仍建议保存",
  tooltipDeleteEvidence: "删除证据项",
  tooltipClearEvidence: "清除已保存状态、备注和文件",
  tooltipRemoveFile: "从报告中移除文件",
};

export const translations: Record<UILang, typeof en> = { en, zh };
export type Translations = typeof en;
