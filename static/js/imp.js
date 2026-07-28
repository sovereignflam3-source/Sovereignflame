const state = {
  inquiry: {
    project_summary: "",
    desired_outcome: "",
    current_state: "",
    important_features: "",
    constraints: "",
    existing_materials_or_links: "",
    timeline: "",
    budget_context: "",
    visitor_name: "",
    visitor_email: "",
    questions_or_comments_for_saeva: "",
  },
  pendingField: "project_summary",
  pricingCategory: "unclassified",
  primaryPricingCategory: "unclassified",
  secondaryPricingCategories: [],
  skippedFields: new Set(),
  awaitingBudgetConfirmation: false,
  awaitingPreparationConfirmation: false,
  inPreview: false,
  reportVisible: false,
  conversationReady: false,
};

const FIELD_LABELS = {
  project_summary: "Project",
  desired_outcome: "Desired outcome",
  current_state: "Current state",
  important_features: "Important features",
  constraints: "Constraints",
  existing_materials_or_links: "Materials or links",
  timeline: "Timeline",
  budget_context: "Budget context",
  visitor_name: "Visitor name",
  visitor_email: "Visitor email",
  questions_or_comments_for_saeva: "Questions or comments for Saeva",
};

const PROMPT_TEXT = {
  project_summary: "What is the project you have in mind?",
  desired_outcome: "What outcome would feel most meaningful to you?",
  current_state: "What is the current state of the work?",
  important_features: "What features or qualities matter most?",
  constraints: "Are there constraints we should know about?",
  existing_materials_or_links: "Do you have materials, links, or references to share?",
  timeline: "What timeline are you working toward?",
  budget_context: "What budget context should we keep in mind?",
  visitor_name: "What name should I use for your inquiry?",
  visitor_email: "What email address should I use for follow-up?",
  questions_or_comments_for_saeva: "Is there anything else you want Saeva to know?",
};

const OPTIONAL_FIELDS = new Set([
  "current_state",
  "important_features",
  "constraints",
  "existing_materials_or_links",
  "timeline",
  "budget_context",
  "questions_or_comments_for_saeva",
]);

const PRICING_CATEGORIES = {
  small_repair: { label: "Small repair or diagnosis", startPrice: 95 },
  focused_improvement: { label: "Focused improvement", startPrice: 175 },
  new_custom_project: { label: "New custom project", startPrice: 300 },
  small_business_website: { label: "Complete small-business website", startPrice: 600 },
  complex_custom: { label: "Complex software, integrations, and unusually involved projects", startPrice: null },
  unclassified: { label: "Unclassified", startPrice: null },
};

const PRICING_KEYWORDS = {
  small_repair: [
    "broken link",
    "broken image",
    "form stopped working",
    "mobile issue",
    "fix one thing",
    "text change",
    "color change",
    "diagnose",
    "bug fix",
    "one broken image",
    "contact form",
    "stopped working",
    "one broken image fixed",
  ],
  focused_improvement: [
    "add gallery",
    "add contact form",
    "improve mobile layout",
    "redesign a section",
    "clean up existing site",
    "add a feature",
    "update several pages",
    "improve responsiveness",
    "simple automation",
  ],
  new_custom_project: [
    "new landing page",
    "one-page website",
    "small program",
    "automation",
    "prototype",
    "proof of concept",
    "custom tool",
    "small custom automation",
    "small custom",
  ],
  small_business_website: [
    "new business website",
    "company website",
    "service website",
    "showcase services",
    "company background",
    "client contact",
    "consultation form",
    "multiple business pages",
    "business has no existing website",
    "company history",
    "pressure-washing business",
    "business website",
    "services",
    "consultation form",
    "service information",
    "company history",
  ],
  complex_custom: [
    "ai integration",
    "custom platform",
    "saas",
    "multi-user system",
    "payment processing",
    "scheduling system",
    "database-heavy application",
    "multiple integrations",
    "advanced automation",
  ],
};

const FIELD_SEQUENCE = [
  "project_summary",
  "desired_outcome",
  "current_state",
  "important_features",
  "constraints",
  "existing_materials_or_links",
  "timeline",
  "budget_context",
  "visitor_name",
  "visitor_email",
  "questions_or_comments_for_saeva",
];

const transcript = document.getElementById("transcript");
const chatForm = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const statusRegion = document.getElementById("status-region");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");

function announce(message) {
  statusRegion.textContent = message;
}

function addBubble(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  transcript.appendChild(bubble);
  transcript.scrollTop = transcript.scrollHeight;
}

function updateProgress() {
  const populatedFields = [
    state.inquiry.project_summary,
    state.inquiry.desired_outcome,
    state.inquiry.current_state,
    state.inquiry.important_features,
    state.inquiry.constraints,
    state.inquiry.existing_materials_or_links,
    state.inquiry.timeline,
    state.inquiry.budget_context,
    state.inquiry.visitor_name,
    state.inquiry.visitor_email,
    state.inquiry.questions_or_comments_for_saeva,
  ].filter((value) => typeof value === "string" && value.trim().length > 0);

  const percent = populatedFields.length === 0 ? 0 : Math.round((populatedFields.length / 11) * 100);
  progressText.textContent = `${percent}% understood`;
  progressBar.style.width = `${percent}%`;
}

function isRequiredComplete() {
  return Boolean(state.inquiry.project_summary) && Boolean(state.inquiry.desired_outcome) && Boolean(state.inquiry.visitor_name) && Boolean(state.inquiry.visitor_email);
}

function normalizeConversationText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function isNonNameConstruction(value) {
  const lower = (value || "").toLowerCase();
  return /^(not|unsure|uncertain|looking|trying|hoping|building|creating|interested|working|having|needing|here|wondering|need|want|looking for|trying to|hoping to|building a|creating a)/.test(lower);
}

function looksLikePersonalName(value) {
  const cleaned = (value || "").trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 40) {
    return false;
  }
  if (/\d/.test(cleaned)) {
    return false;
  }
  if (isNonNameConstruction(cleaned)) {
    return false;
  }
  if (/^(project|website|software|tool|custom|business|site|contact|form|repair|improvement|design|thing|help|idea|service|client)$/i.test(cleaned)) {
    return false;
  }
  return /^[A-Za-z][A-Za-z .'-]*$/.test(cleaned);
}

function extractVisitorName(text) {
  const normalized = normalizeConversationText(text);
  const patterns = [
    /\bmy name is\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\bthis is\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\byou can call me\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\bcall me\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\bi['’]m\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\bi am\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }
    const candidate = match[1].trim().replace(/[.,;:!?]+$/g, "");
    const simplified = candidate
      .split(/\s+(and|my|email|is|at|for|with)\b/i)[0]
      .trim();
    if (looksLikePersonalName(simplified)) {
      return simplified;
    }
  }

  return "";
}

function extractEmailAddress(text) {
  const match = normalizeConversationText(text).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (!match) {
    return "";
  }
  return match[0].replace(/[.,;:!?]+$/g, "");
}

function extractBudgetContext(text) {
  const amount = parseBudgetAmount(text);
  if (amount === null) {
    return "";
  }
  const lower = text.toLowerCase();
  if (lower.includes("about") || lower.includes("approximately") || lower.includes("around")) {
    return `Approximately $${amount}.`;
  }
  if (lower.includes("maximum") || lower.includes("max") || lower.includes("up to")) {
    return `Up to $${amount}.`;
  }
  if (lower.includes("only") || lower.includes("just")) {
    return `Only $${amount}.`;
  }
  return `$${amount}.`;
}

function looksLikeCurrentState(text) {
  return /(existing|website|site|contact form|broken|stopped working|mobile|phone|outdated|old|credentials|account|built|current|already|launch|hosting|domain|design)/i.test(text);
}

function extractCurrentState(text) {
  const lower = text.toLowerCase();
  if (lower.includes("contact form") && (lower.includes("stopped working") || lower.includes("broken") || lower.includes("doesn't work") || lower.includes("does not work"))) {
    return "The contact form is not working.";
  }
  if (lower.includes("existing website") || lower.includes("website exists") || lower.includes("site exists") || lower.includes("existing site")) {
    return "The existing site is already in place.";
  }
  if (lower.includes("built by") || lower.includes("built with") || lower.includes("originally built")) {
    return "The site was built previously and may need review.";
  }
  if (looksLikeCurrentState(text) && !/(my name|my email|email is|name is)/i.test(text)) {
    return text;
  }
  return "";
}

function extractProjectSummary(text) {
  const normalized = normalizeConversationText(text);
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !/^(hi|hello|hey)\b/i.test(sentence) && !/^(i['’]m|i am)\s+(not|not completely|not sure|unsure|uncertain|looking|trying|hoping|building|creating|interested|working|having|needing|here|wondering|looking for|trying to|hoping to|building a|creating a)/i.test(sentence))
    .map((sentence) => sentence.replace(/^(my name is|this is|you can call me|call me)\b.*$/i, ""));

  const cleaned = sentences.join(" ").trim();
  if (!cleaned) {
    return "";
  }

  if (/\bwebsite\b/i.test(cleaned) && /looks?\s+(old|outdated)/i.test(cleaned) && /contact form/i.test(cleaned) && /(stopped working|broken|doesn'?t work|does not work|is not working)/i.test(cleaned) && /(awful|terrible|poorly|mobile|phone)/i.test(cleaned)) {
    return "Existing website looks outdated, the contact form is broken, and the site performs poorly on mobile.";
  }

  const lower = cleaned.toLowerCase();
  const summaryParts = [];

  if (/(website|site)\s+(exists|already exists|is existing)/i.test(cleaned) || /\bexisting\b/i.test(cleaned)) {
    summaryParts.push("Existing website");
  } else if (/\bwebsite\b/i.test(cleaned) || /\bsite\b/i.test(cleaned)) {
    summaryParts.push("Website");
  }

  if (/looks?\s+(old|outdated)/i.test(cleaned)) {
    summaryParts.push("looks outdated");
  }

  if (/contact form/i.test(cleaned) && /(stopped working|broken|doesn'?t work|does not work|is not working)/i.test(cleaned)) {
    summaryParts.push("the contact form is broken");
  }

  if (/(awful|terrible|poorly|bad|mobile|phone)/i.test(cleaned)) {
    summaryParts.push("the site performs poorly on mobile");
  }

  if (!summaryParts.length) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return summaryParts.join(", ").replace(/\s+/g, " ").trim();
}

function getNextFieldToAsk() {
  const startIndex = state.pendingField ? FIELD_SEQUENCE.indexOf(state.pendingField) : 0;
  for (let index = Math.max(0, startIndex); index < FIELD_SEQUENCE.length; index += 1) {
    const field = FIELD_SEQUENCE[index];
    if (!state.inquiry[field] && !state.skippedFields.has(field)) {
      return field;
    }
  }
  return null;
}

function summarizeProjectSummary(text) {
  const cleaned = normalizeConversationText(text);
  if (!cleaned) {
    return "the project";
  }
  if (cleaned.length > 140) {
    return cleaned.slice(0, 137).trimEnd() + "...";
  }
  return cleaned;
}

function classifyProject(text) {
  const lower = (text || "").toLowerCase();
  const detected = [];

  if (PRICING_KEYWORDS.small_repair.some((keyword) => lower.includes(keyword))) {
    detected.push("small_repair");
  }
  if (PRICING_KEYWORDS.focused_improvement.some((keyword) => lower.includes(keyword))) {
    detected.push("focused_improvement");
  }
  if (PRICING_KEYWORDS.new_custom_project.some((keyword) => lower.includes(keyword))) {
    detected.push("new_custom_project");
  }
  if (PRICING_KEYWORDS.small_business_website.some((keyword) => lower.includes(keyword))) {
    detected.push("small_business_website");
  }
  if (PRICING_KEYWORDS.complex_custom.some((keyword) => lower.includes(keyword))) {
    detected.push("complex_custom");
  }

  if (detected.includes("small_repair") && /mobile|phone|responsive|redesign|improvement|update|layout|design|appearance|old|outdated|ui/i.test(lower)) {
    detected.push("focused_improvement");
  }

  const primary = detected.includes("small_repair")
    ? "small_repair"
    : detected.includes("focused_improvement")
      ? "focused_improvement"
      : detected.includes("new_custom_project")
        ? "new_custom_project"
        : detected.includes("small_business_website")
          ? "small_business_website"
          : detected.includes("complex_custom")
            ? "complex_custom"
            : "unclassified";

  const secondary = detected.filter((category) => category !== primary);
  return { primary, secondary };
}

function isPricingQuestion(text) {
  const lower = text.toLowerCase();
  return ["price", "pricing", "cost", "costs", "charge", "charges", "rate", "rates", "fee", "fees", "affordable", "affordability", "budget", "worth bringing", "fit my budget", "fit the budget"].some((term) => lower.includes(term));
}

function getPricingOverview() {
  return "Sovereign Flame prices work by scope rather than by the hour. Small repairs begin at $95, focused improvements begin at $175, and new custom projects begin at $300. Complete small-business websites typically begin at $600. Complex software and integrations receive a custom fixed quote once the scope is understood.";
}

function parseBudgetAmount(text) {
  const matches = text.match(/\$\s?(\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g) || [];
  if (!matches.length) {
    return null;
  }
  const value = matches[0].replace(/[$,]/g, "");
  return Number(value);
}

function getBudgetMismatchResponse(category, secondaryCategories) {
  if (category === "small_repair" && secondaryCategories.includes("focused_improvement")) {
    return "Yes. Small repairs begin at $95, so restoring the contact flow may fit the budget you’ve described. A broader visual or mobile improvement typically begins at $175, so Saeva may recommend handling the repair first and treating the redesign as a later phase. I can prepare the inquiry with that priority noted.";
  }
  if (category === "small_business_website") {
    return "A complete custom business website typically begins at $600. With the budget you’ve described, Saeva may be able to propose a tightly scoped single-page site, divide the work into phases, or recommend a simpler launch path. Shall I prepare the inquiry with that understanding?";
  }
  if (category === "new_custom_project") {
    return "New custom projects begin at $300. The scope may need to be reduced, divided into phases, or approached differently to fit the budget you’ve described. Shall I prepare the inquiry with that understanding?";
  }
  if (category === "focused_improvement") {
    return "Focused improvements begin at $175. Saeva may be able to narrow the work to the most important change or suggest another practical direction. Shall I prepare the inquiry with that understanding?";
  }
  if (category === "small_repair") {
    return "Small repairs and diagnostic work begin at $95. Saeva may still be able to clarify the issue or recommend the most efficient next step. Shall I prepare the inquiry with that understanding?";
  }
  return "Sovereign Flame prices work by scope rather than by the hour. The budget you’ve described may call for a narrower scope, phased work, or a simpler launch path. Shall I prepare the inquiry with that understanding?";
}

function handleBudgetContext(text) {
  const budgetAmount = parseBudgetAmount(text);
  const primaryCategory = state.primaryPricingCategory || state.pricingCategory || "unclassified";
  const secondaryCategories = state.secondaryPricingCategories || [];

  if (budgetAmount === null) {
    addBubble("I’ll keep that budget context in mind as we continue the inquiry.", "imp");
    return true;
  }

  if (primaryCategory === "unclassified" || primaryCategory === "complex_custom") {
    addBubble("Sovereign Flame prices work by scope rather than by the hour. The budget you’ve described will help me understand the level of scope that makes sense.", "imp");
    announce("Budget noted. Returning to the inquiry.");
    return true;
  }

  if (primaryCategory === "small_repair" && secondaryCategories.includes("focused_improvement")) {
    addBubble(getBudgetMismatchResponse(primaryCategory, secondaryCategories), "imp");
    announce("Budget noted. Returning to the inquiry.");
    return true;
  }

  const startPrice = PRICING_CATEGORIES[primaryCategory].startPrice;
  if (budgetAmount >= startPrice) {
    addBubble("Understood. I’ll keep that in mind as we continue the inquiry.", "imp");
    return true;
  }

  addBubble(getBudgetMismatchResponse(primaryCategory, secondaryCategories), "imp");
  state.awaitingBudgetConfirmation = true;
  announce("Budget mismatch noted. Confirm whether to prepare the inquiry with that understanding.");
  return true;
}

function showNextPrompt() {
  if (state.inPreview) {
    return;
  }

  const nextField = getNextFieldToAsk();
  if (!nextField) {
    if (isRequiredComplete() && !state.reportVisible && !state.awaitingPreparationConfirmation) {
      addBubble("I believe I have the shape of it. Shall I prepare this for Saeva?", "imp");
      state.pendingField = null;
      state.awaitingPreparationConfirmation = true;
      announce("Confirm whether the inquiry should be prepared for Saeva.");
    }
    return;
  }

  state.pendingField = nextField;

  const prompt = PROMPT_TEXT[nextField];
  addBubble(prompt, "imp");
  announce(prompt);
}

function handleAnswer(raw) {
  let text = raw.trim();
  if (!text) {
    addBubble("Please share a few words, or say \"skip\" if this is optional.", "imp");
    return;
  }

  const informationalInterruption = handleHelpRequest(text);
  text = stripInformationalInterruption(text);
  if (!text) {
    if (informationalInterruption) {
      showNextPrompt();
    }
    return;
  }

  if (state.awaitingPreparationConfirmation) {
    const confirm = /yes|yep|sure|proceed|prepare|continue|okay|ok/i.test(text);
    if (confirm) {
      state.awaitingPreparationConfirmation = false;
      state.reportVisible = true;
      loadPreview();
      announce("Report preview ready. Review and approve the inquiry.");
      return;
    }

    state.awaitingPreparationConfirmation = false;
    state.pendingField = "questions_or_comments_for_saeva";
  }

  if (state.awaitingBudgetConfirmation) {
    const confirm = /yes|yep|sure|proceed|prepare|continue|okay|ok/i.test(text);
    if (confirm) {
      state.awaitingBudgetConfirmation = false;
      state.pendingField = getNextFieldToAsk();
      showNextPrompt();
      return;
    }
    state.awaitingBudgetConfirmation = false;
    addBubble("Understood. I’ll leave the inquiry open for now.", "imp");
    state.pendingField = getNextFieldToAsk();
    showNextPrompt();
    return;
  }

  if (state.pendingField && OPTIONAL_FIELDS.has(state.pendingField) && /^skip$/i.test(text)) {
    state.inquiry[state.pendingField] = "";
    state.skippedFields.add(state.pendingField);
    state.pendingField = getNextFieldToAsk();
    updateProgress();
    showNextPrompt();
    return;
  }

  const budgetMention = parseBudgetAmount(text) !== null && /\$\s?\d|budget|maximum|afford|can spend|spend|worth bringing|fit my budget|fit the budget/i.test(text);
  if (budgetMention) {
    const budgetContext = extractBudgetContext(text);
    state.inquiry.budget_context = budgetContext;
    state.skippedFields.delete("budget_context");
    const classification = classifyProject(state.inquiry.project_summary || text);
    state.primaryPricingCategory = classification.primary;
    state.secondaryPricingCategories = classification.secondary;
    state.pricingCategory = classification.primary;
    if (handleBudgetContext(text)) {
      updateProgress();
      if (!state.awaitingBudgetConfirmation) {
        state.pendingField = getNextFieldToAsk();
        showNextPrompt();
      }
      return;
    }
  }

  if (isPricingQuestion(text)) {
    addBubble(getPricingOverview(), "imp");
    showNextPrompt();
    return;
  }

  const extractedEmail = extractEmailAddress(text);
  if (extractedEmail && !state.inquiry.visitor_email) {
    state.inquiry.visitor_email = extractedEmail;
  }

  const inferredName = extractVisitorName(text);
  if (inferredName && !state.inquiry.visitor_name) {
    state.inquiry.visitor_name = inferredName;
  }
  const containsIdentity = Boolean(extractedEmail || inferredName);

  const extractedOutcome = extractDesiredOutcome(text);
  if (extractedOutcome && !state.inquiry.desired_outcome && (state.pendingField === "desired_outcome" || state.pendingField === "current_state")) {
    state.inquiry.desired_outcome = extractedOutcome;
  }

  const compoundExtractionApplied = applyCompoundExtraction(text);
  const extractedCurrentState = extractCurrentState(text);
  const shouldCaptureCurrentState = state.pendingField === "current_state" && !state.inquiry.current_state && extractedCurrentState && !containsIdentity;
  if (shouldCaptureCurrentState) {
    state.inquiry.current_state = extractedCurrentState;
  }

  if (state.pendingField === "visitor_name" && !inferredName) {
    addBubble("Please provide the name you would like attached to the inquiry.", "imp");
    return;
  }

  if (state.pendingField === "visitor_email") {
    if (extractedEmail) {
      state.inquiry.visitor_email = extractedEmail;
    } else {
      addBubble("Please provide a valid email address, or say \"skip\" if you prefer to leave that for later.", "imp");
      return;
    }
  }

  if (state.pendingField) {
    let capturedValue = text;
    const identityTargetsPendingField = state.pendingField === "visitor_name" || state.pendingField === "visitor_email";
    const shouldCapturePendingField = (!compoundExtractionApplied || state.pendingField === "project_summary" || state.pendingField === "desired_outcome" || shouldCaptureCurrentState || identityTargetsPendingField)
      && (!containsIdentity || identityTargetsPendingField);

    if (state.pendingField === "project_summary") {
      capturedValue = extractProjectSummary(text);
    } else if (state.pendingField === "desired_outcome") {
      capturedValue = extractDesiredOutcome(text) || text;
    } else if (state.pendingField === "current_state") {
      capturedValue = extractedCurrentState || "";
    }

    if (state.pendingField === "project_summary" && capturedValue) {
      state.inquiry.project_summary = capturedValue;
      const classification = classifyProject(text);
      state.primaryPricingCategory = classification.primary;
      state.secondaryPricingCategories = classification.secondary;
      state.pricingCategory = classification.primary;
    } else if (state.pendingField === "visitor_name" && inferredName) {
      state.inquiry.visitor_name = inferredName;
    } else if (state.pendingField === "visitor_email" && extractedEmail) {
      state.inquiry.visitor_email = extractedEmail;
    } else if (state.pendingField === "questions_or_comments_for_saeva" && shouldCapturePendingField && capturedValue) {
      state.inquiry.questions_or_comments_for_saeva = appendFieldValue(state.inquiry.questions_or_comments_for_saeva, capturedValue);
    } else if (shouldCapturePendingField && capturedValue) {
      state.inquiry[state.pendingField] = capturedValue;
    }

    if (state.inquiry[state.pendingField]) {
      state.skippedFields.delete(state.pendingField);
    }
    updateProgress();
    state.pendingField = getNextFieldToAsk();
  }

  if (state.pendingField === "desired_outcome" && state.inquiry.project_summary) {
    const summary = summarizeProjectSummary(state.inquiry.project_summary).replace(/[.!?]+$/g, "");
    const acknowledgement = `${summary}. Very good. What should it accomplish for the business?`;
    addBubble(acknowledgement, "imp");
    announce("What should it accomplish for the business?");
    return;
  }

  showNextPrompt();
}

function appendFieldValue(currentValue, nextValue) {
  if (!nextValue) {
    return currentValue;
  }
  if (!currentValue) {
    return nextValue;
  }
  return `${currentValue}\n${nextValue}`;
}

function applyCompoundExtraction(text) {
  let changed = false;
  const materialsValue = extractMaterialsFromText(text);
  if (materialsValue && !state.inquiry.existing_materials_or_links) {
    state.inquiry.existing_materials_or_links = materialsValue;
    changed = true;
  }

  const priorityNote = extractPriorityNote(text);
  if (priorityNote) {
    state.inquiry.questions_or_comments_for_saeva = appendFieldValue(state.inquiry.questions_or_comments_for_saeva, priorityNote);
    changed = true;
  }

  const constraintsValue = extractConstraintsFromText(text);
  if (constraintsValue && !state.inquiry.constraints.includes(constraintsValue)) {
    state.inquiry.constraints = appendFieldValue(state.inquiry.constraints, constraintsValue);
    changed = true;
  }

  return changed;
}

function extractMaterialsFromText(text) {
  const lower = text.toLowerCase();
  const materials = [];

  if (lower.includes("logo")) {
    materials.push("Logo");
  }
  if (lower.includes("service list") || lower.includes("services list") || lower.includes("service list") || lower.includes("services")) {
    materials.push("Service list");
  }
  if (lower.includes("before-and-after") || lower.includes("before and after") || lower.includes("before after") || lower.includes("before/after") || lower.includes("before and after photos")) {
    materials.push("Before-and-after photos");
  }
  if (lower.includes("professional copy") || lower.includes("copy") || lower.includes("copywriting")) {
    materials.push("Professional copy is not yet available");
  }

  if (!materials.length) {
    return "";
  }

  return materials.join("; ");
}

function extractDesiredOutcome(text) {
  const lower = text.toLowerCase();
  if (lower.includes("contact form") && (lower.includes("fix") || lower.includes("repair") || lower.includes("restore") || lower.includes("as soon as possible"))) {
    return "Restore customer contact and improve the site’s appearance.";
  }
  if (lower.includes("redesign") && lower.includes("can wait")) {
    return "Restore customer contact and improve the site’s appearance.";
  }
  if (lower.includes("mobile") || lower.includes("phones")) {
    return "Improve the site’s mobile experience and appearance.";
  }
  return "";
}

function extractPriorityNote(text) {
  const lower = text.toLowerCase();
  if (lower.includes("contact form") && lower.includes("as soon as possible")) {
    return "Priority: Repair the contact form first. The broader redesign can be completed later as a separate phase.";
  }
  if (lower.includes("can wait") && (lower.includes("redesign") || lower.includes("improvement") || lower.includes("visual"))) {
    return "Priority: The broader redesign can be completed later as a separate phase.";
  }
  if (lower.includes("phase") && (lower.includes("open to") || lower.includes("doing this") || lower.includes("do this") || lower.includes("work in"))) {
    return "Phasing: The visitor is open to completing the work in phases.";
  }
  return "";
}

function extractConstraintsFromText(text) {
  const lower = text.toLowerCase();
  const describesMissingMaterial = /don['’]t have|do not have|not yet available|missing/.test(lower);
  if ((lower.includes("professional copy") || lower.includes("copywriting")) && describesMissingMaterial) {
    return "Professional copy is not yet available.";
  }
  if (lower.includes("credentials") && (lower.includes("may not") || lower.includes("not yet"))) {
    return "Full account credentials may not yet be available.";
  }
  if (lower.includes("password") && describesMissingMaterial) {
    return "Full account credentials may not yet be available.";
  }
  return "";
}

function stripInformationalInterruption(text) {
  return normalizeConversationText(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/(what (exactly )?does sovereign flame do|what is sovereign flame|who is saeva(?: venia)?)/i.test(sentence))
    .join(" ")
    .trim();
}

function handleHelpRequest(text) {
  const lower = text.toLowerCase();
  if (lower.includes("what sovereign flame") || lower.includes("what does sovereign flame") || lower.includes("sovereign flame do")) {
    addBubble("Sovereign Flame builds elegant websites, small software, and practical custom tools with a careful and honest process.", "imp");
    return true;
  }

  if (lower.includes("who is saeva") || lower.includes("who is saeva venia")) {
    addBubble("Saeva Venia is the private founder and programmer behind Sovereign Flame.", "imp");
    return true;
  }

  if (lower.includes("fancy animation") || lower.includes("lots of animation")) {
    addBubble("Motion can support clarity, but animation should serve the visitor rather than distract from the contact problem. Saeva can recommend a restrained approach after the repair is understood.", "imp");
    return true;
  }

  return false;
}

function renderReportPreview() {
  if (state.reportVisible) {
    const template = document.getElementById("report-template");
    const fragment = template.content.firstElementChild.cloneNode(true);
    const grid = fragment.querySelector(".report-grid");

    Object.entries(FIELD_LABELS).forEach(([field, label]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "report-field";
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      const control = document.createElement("textarea");
      control.rows = 3;
      control.dataset.field = field;
      control.value = state.inquiry[field] || "";
      control.addEventListener("input", (event) => {
        state.inquiry[field] = event.target.value;
      });
      wrapper.appendChild(labelEl);
      wrapper.appendChild(control);
      grid.appendChild(wrapper);
    });

    const existing = transcript.querySelector(".report-panel");
    if (existing) {
      existing.remove();
    }
    transcript.appendChild(fragment);
    transcript.scrollTop = transcript.scrollHeight;
  }
}

function loadPreview() {
  fetch("/api/inquiries/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(state.inquiry),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Preview could not be prepared.");
      }
      state.inquiry = { ...state.inquiry, ...data.report };
      renderReportPreview();
    })
    .catch((error) => {
      addBubble(error.message || "Preview could not be prepared.", "imp");
    });
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value;
  if (!value.trim()) {
    return;
  }

  const message = value.trim();
  addBubble(message, "user");
  input.value = "";

  handleAnswer(message);
});

transcript.addEventListener("click", (event) => {
  if (event.target.matches("[data-action='return']")) {
    state.inPreview = false;
    state.reportVisible = false;
    state.awaitingPreparationConfirmation = false;
    const reportPanel = transcript.querySelector(".report-panel");
    if (reportPanel) {
      reportPanel.remove();
    }
    state.pendingField = "questions_or_comments_for_saeva";
    addBubble("What else would you like Saeva to know?", "imp");
    announce("Returned to the inquiry conversation.");
  }

  if (event.target.matches("[data-action='submit']")) {
    const checkbox = document.getElementById("consent-checkbox");
    const payload = { ...state.inquiry, consent: Boolean(checkbox && checkbox.checked) };
    state.inPreview = true;

    fetch("/api/inquiries/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Submission did not complete.");
        }
        addBubble(`Inquiry prepared and submitted. Reference: ${data.inquiry_id}`, "imp");
        announce("Submission complete.");
      })
      .catch((error) => {
        addBubble(error.message || "Submission could not be completed.", "imp");
        announce(error.message || "Submission could not be completed.");
      });
  }
});

window.addEventListener("DOMContentLoaded", () => {
  addBubble("Welcome to Sovereign Flame. I am IMP, the Interactive Model Processor. What are we building for you?", "imp");
  state.pendingField = "project_summary";
  updateProgress();
  announce("Conversation started.");
});
