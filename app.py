import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import BadRequest

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "inquiries.jsonl"

MAX_TEXT_LENGTH = 1600
MAX_SHORT_LENGTH = 400

FIELD_ORDER = [
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
]

REQUIRED_FIELDS = ["project_summary", "desired_outcome", "visitor_name", "visitor_email"]
OPTIONAL_FIELDS = [
    "current_state",
    "important_features",
    "constraints",
    "existing_materials_or_links",
    "timeline",
    "budget_context",
    "questions_or_comments_for_saeva",
]


def normalize_text(value, max_length=MAX_TEXT_LENGTH):
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) > max_length:
        value = value[:max_length]
    return value


def validate_email(value):
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value))


def same_origin_allowed(request_obj):
    origin = request_obj.headers.get("Origin")
    referer = request_obj.headers.get("Referer")
    target = origin or referer
    if not target:
        return True

    parsed = urlparse(target)
    if not parsed.hostname:
        return True

    request_host = request_obj.host.split(":", 1)[0]
    return parsed.hostname == request_host


def parse_json_body():
    try:
        payload = request.get_json(silent=False)
    except BadRequest:
        raise ValueError("Malformed JSON.")

    if not isinstance(payload, dict):
        raise ValueError("JSON object required.")
    return payload


def validate_inquiry(payload):
    errors = {}
    report = {}

    for field in FIELD_ORDER:
        value = payload.get(field, "")
        if field in REQUIRED_FIELDS:
            trimmed = normalize_text(value, MAX_SHORT_LENGTH)
            if not trimmed:
                errors[field] = [f"{field.replace('_', ' ')} is required."]
            else:
                report[field] = trimmed
        else:
            report[field] = normalize_text(value, MAX_SHORT_LENGTH)

    if "visitor_email" in report and report["visitor_email"] and not validate_email(report["visitor_email"]):
        errors["visitor_email"] = ["Please provide a valid email address."]

    return report, errors


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/inquiries/preview")
def preview_inquiry():
    if not same_origin_allowed(request):
        return jsonify({"error": "Request origin is not allowed."}), 403

    try:
        payload = parse_json_body()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    report, errors = validate_inquiry(payload)
    if errors:
        return jsonify({"error": "Validation failed.", "errors": errors}), 400

    return jsonify({"report": report})


@app.post("/api/inquiries/submit")
def submit_inquiry():
    if not same_origin_allowed(request):
        return jsonify({"error": "Request origin is not allowed."}), 403

    try:
        payload = parse_json_body()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    report, errors = validate_inquiry(payload)
    consent = payload.get("consent", False)

    if not consent:
        errors["consent"] = ["Consent is required before submitting the inquiry."]

    if errors:
        return jsonify({"error": "Validation failed.", "errors": errors}), 400

    inquiry_record = {
        **report,
        "inquiry_id": str(uuid.uuid4()),
        "submitted_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "status": "new",
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(inquiry_record, ensure_ascii=False) + "\n")

    notify_saeva(inquiry_record)

    return jsonify({"success": True, "inquiry_id": inquiry_record["inquiry_id"]})


def notify_saeva(inquiry):
    # Future email providers can be connected here without changing the API contract.
    return {"configured": False, "message": "Email notifications are not configured yet."}


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
