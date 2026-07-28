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
  awaitingBudgetConfirmation: false,
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
  const fields = Object.entries(state.inquiry).filter(([, value]) => Boolean(value));
  const percent = Math.round((fields.length / Object.keys(state.inquiry).length) * 100);
  progressText.textContent = `${percent}% understood`;
  progressBar.style.width = `${percent}%`;
}

function isRequiredComplete() {
  return Boolean(state.inquiry.project_summary) && Boolean(state.inquiry.desired_outcome) && Boolean(state.inquiry.visitor_name) && Boolean(state.inquiry.visitor_email);
}

function extractVisitorName(text) {
  const patterns = [
    /\bmy name is\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\bi['’]m\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
    /\bi am\s+([A-Za-z][A-Za-z .'-]{0,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name && name.length <= 40) {
        return name;
      }
    }
  }

  return "";
}

function extractProjectSummary(text) {
  const cleaned = text.replace(/^(hello|hi)\s+imp[,.\s]*/i, "").replace(/\bmy name is\s+([A-Za-z][A-Za-z .'-]{0,30})/i, "").replace(/\bi['’]m\s+([A-Za-z][A-Za-z .'-]{0,30})/i, "").replace(/\bi am\s+([A-Za-z][A-Za-z .'-]{0,30})/i, "").replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "A project";
  }

  if (/power\s*[- ]?washing/i.test(cleaned) && /website/i.test(cleaned)) {
    return "A website for a power-washing company";
  }

  if (/website/i.test(cleaned)) {
    return "A website project";
  }

  if (/software/i.test(cleaned)) {
    return "A software project";
  }

  if (/tool/i.test(cleaned)) {
    return "A custom tool";
  }

  const withoutLead = cleaned.replace(/^i have\s+/i, "").replace(/^i need\s+/i, "").replace(/^i want\s+/i, "").replace(/^i am looking for\s+/i, "").replace(/^i would like\s+/i, "").replace(/^a\s+/i, "").trim();
  return withoutLead ? withoutLead.charAt(0).toUpperCase() + withoutLead.slice(1) : cleaned;
}

function getNextFieldToAsk() {
  const startIndex = state.pendingField ? FIELD_SEQUENCE.indexOf(state.pendingField) : 0;
  for (let index = Math.max(0, startIndex); index < FIELD_SEQUENCE.length; index += 1) {
    const field = FIELD_SEQUENCE[index];
    if (!state.inquiry[field]) {
      return field;
    }
  }
  return null;
}

function summarizeProjectSummary(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "the project";
  }

  const lower = cleaned.toLowerCase();
  if (lower.includes("power washing") || lower.includes("power-washing")) {
    return "a website for a power-washing company";
  }

  if (lower.includes("website")) {
    return "a website project";
  }

  if (lower.includes("software")) {
    return "a software project";
  }

  if (lower.includes("tool")) {
    return "a custom tool";
  }

  return cleaned;
}

function classifyProject(text) {
  const lower = (text || "").toLowerCase();
  for (const [category, keywords] of Object.entries(PRICING_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return "unclassified";
}

function isPricingQuestion(text) {
  const lower = text.toLowerCase();
  return ["price", "pricing", "cost", "costs", "charge", "charges", "rate", "rates", "fee", "fees", "affordable", "affordability", "budget"].some((term) => lower.includes(term));
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

function getBudgetMismatchResponse(category) {
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
  const category = state.pricingCategory || "unclassified";
  if (budgetAmount === null || category === "unclassified" || category === "complex_custom") {
    addBubble("Sovereign Flame prices work by scope rather than by the hour. The budget you’ve described will help me understand the level of scope that makes sense. Shall I prepare the inquiry with that understanding?", "imp");
    state.awaitingBudgetConfirmation = true;
    announce("Budget noted. Confirm whether to prepare the inquiry with that understanding.");
    return true;
  }

  const startPrice = PRICING_CATEGORIES[category].startPrice;
  if (budgetAmount >= startPrice) {
    addBubble("Understood. I’ll keep that in mind as we continue the inquiry.", "imp");
    return false;
  }

  addBubble(getBudgetMismatchResponse(category), "imp");
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
    if (isRequiredComplete() && !state.reportVisible) {
      addBubble("I believe I have the shape of it. Shall I prepare this for Saeva?", "imp");
      state.pendingField = null;
      state.reportVisible = true;
      loadPreview();
      announce("Report preview ready. Review and approve the inquiry.");
    }
    return;
  }

  state.pendingField = nextField;

  if (isRequiredComplete() && !state.reportVisible) {
    addBubble("I believe I have the shape of it. Shall I prepare this for Saeva?", "imp");
    state.pendingField = null;
    state.reportVisible = true;
    loadPreview();
    announce("Report preview ready. Review and approve the inquiry.");
    return;
  }

  const prompt = PROMPT_TEXT[nextField];
  addBubble(prompt, "imp");
  announce(prompt);
}

function handleAnswer(raw) {
  const text = raw.trim();
  if (!text) {
    addBubble("Please share a few words, or say \"skip\" if this is optional.", "imp");
    return;
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
    state.pendingField = getNextFieldToAsk();
    updateProgress();
    showNextPrompt();
    return;
  }

  if (isPricingQuestion(text)) {
    addBubble(getPricingOverview(), "imp");
    showNextPrompt();
    return;
  }

  const budgetMention = /\$\s?\d|budget|maximum|afford|can spend|spend|cost/i.test(text);
  if (budgetMention && !state.inquiry.budget_context && state.pendingField !== "budget_context") {
    state.inquiry.budget_context = text;
    state.pricingCategory = state.pricingCategory || classifyProject(state.inquiry.project_summary || text);
    if (handleBudgetContext(text)) {
      return;
    }
  }

  if (state.pendingField === "visitor_email") {
    if (budgetMention) {
      state.inquiry.budget_context = text;
      state.pricingCategory = state.pricingCategory || classifyProject(state.inquiry.project_summary || text);
      if (handleBudgetContext(text)) {
        return;
      }
    }
    const simpleEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!simpleEmail.test(text)) {
      addBubble("Please provide a valid email address, or say \"skip\" if you prefer to leave that for later.", "imp");
      return;
    }
  }

  if (state.pendingField) {
    const capturedValue = state.pendingField === "project_summary" ? extractProjectSummary(text) : text;
    state.inquiry[state.pendingField] = capturedValue;
    if (state.pendingField === "project_summary") {
      state.pricingCategory = classifyProject(text);
      const inferredName = extractVisitorName(text);
      if (inferredName && !state.inquiry.visitor_name) {
        state.inquiry.visitor_name = inferredName;
      }
    }

    if (state.pendingField === "budget_context") {
      state.inquiry.budget_context = text;
      if (handleBudgetContext(text)) {
        return;
      }
    }

    updateProgress();
    state.pendingField = getNextFieldToAsk();
  }

  if (state.pendingField === "desired_outcome" && state.inquiry.project_summary) {
    const acknowledgement = `${summarizeProjectSummary(state.inquiry.project_summary)}. Very good. What should it accomplish for the business?`;
    addBubble(acknowledgement, "imp");
    announce("What should it accomplish for the business?");
    return;
  }

  if (isRequiredComplete()) {
    addBubble("I believe I have the shape of it. Shall I prepare this for Saeva?", "imp");
    state.pendingField = null;
    state.reportVisible = true;
    loadPreview();
    announce("Report preview ready. Review and approve the inquiry.");
    return;
  }

  showNextPrompt();
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

  if (handleHelpRequest(message)) {
    showNextPrompt();
    return;
  }

  if (state.reportVisible && !state.inPreview) {
    const button = transcript.querySelector("[data-action='return']");
    if (button) {
      button.click();
    }
    return;
  }

  handleAnswer(message);
});

transcript.addEventListener("click", (event) => {
  if (event.target.matches("[data-action='return']")) {
    state.inPreview = false;
    state.pendingField = state.pendingField || "questions_or_comments_for_saeva";
    showNextPrompt();
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
