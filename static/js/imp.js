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

function showNextPrompt() {
  if (state.inPreview) {
    return;
  }

  const nextField = FIELD_SEQUENCE.find((field) => {
    if (field === state.pendingField) {
      return true;
    }
    return Boolean(state.inquiry[field]) || field === "questions_or_comments_for_saeva";
  });

  if (nextField && state.pendingField !== nextField) {
    state.pendingField = nextField;
  }

  if (!state.pendingField) {
    state.pendingField = "questions_or_comments_for_saeva";
  }

  if (isRequiredComplete() && !state.reportVisible) {
    addBubble("I believe I have the shape of it. Shall I prepare this for Saeva?", "imp");
    state.pendingField = null;
    state.reportVisible = true;
    loadPreview();
    announce("Report preview ready. Review and approve the inquiry.");
    return;
  }

  const prompt = PROMPT_TEXT[state.pendingField];
  addBubble(prompt, "imp");
  announce(prompt);
}

function handleAnswer(raw) {
  const text = raw.trim();
  if (!text) {
    addBubble("Please share a few words, or say \"skip\" if this is optional.", "imp");
    return;
  }

  if (state.pendingField && OPTIONAL_FIELDS.has(state.pendingField) && /^skip$/i.test(text)) {
    state.inquiry[state.pendingField] = "";
    const nextField = FIELD_SEQUENCE[FIELD_SEQUENCE.indexOf(state.pendingField) + 1] || null;
    state.pendingField = nextField;
    updateProgress();
    showNextPrompt();
    return;
  }

  if (state.pendingField === "visitor_email") {
    const simpleEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!simpleEmail.test(text)) {
      addBubble("Please provide a valid email address, or say \"skip\" if you prefer to leave that for later.", "imp");
      return;
    }
  }

  if (state.pendingField) {
    state.inquiry[state.pendingField] = text;
    updateProgress();
    const nextField = FIELD_SEQUENCE[FIELD_SEQUENCE.indexOf(state.pendingField) + 1] || null;
    state.pendingField = nextField;
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
  showNextPrompt();
  updateProgress();
  announce("Conversation started.");
});
