from __future__ import annotations

import json
import re
from argparse import ArgumentParser
from collections import Counter
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE_NAME = "Number Series - 98 Problems With Solutions.pdf"
BASE_QUESTIONS_JSON = ROOT / "src/data/professional/2026.generated.json"
OUTPUT_JSON = ROOT / "src/data/professional/2026.number-series.generated.json"
SUMMARY_JSON = ROOT / "src/data/professional/2026.number-series.import-summary.json"
SOURCE_LABEL = "Civil Service Reviewer"


def clean(value: str | None) -> str:
    text = " ".join((value or "").split()).strip()
    text = re.sub(r"[_\.]{3,}", "______", text)
    text = re.sub(r"\s+([?,])", r"\1", text)
    text = text.replace("None of The Above", "None of the above")
    return text


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", clean(value).lower())


def default_source_pdf() -> Path:
    matches = sorted((ROOT / "reviewers").rglob(SOURCE_NAME))
    if not matches:
        raise FileNotFoundError(f"Could not find {SOURCE_NAME!r} under the reviewers folder.")

    new_reviewers = [path for path in matches if f"{Path('reviewers/new')}" in str(path)]
    return (new_reviewers or matches)[0]


def extract_ordered_lines(page: Any, left: int, right: int) -> list[str]:
    words = page.crop((left, 0, right, page.height)).extract_words(
        use_text_flow=False,
        keep_blank_chars=False,
        extra_attrs=["size"],
    )
    words = [word for word in words if word.get("size", 0) < 20]

    rows: list[dict[str, Any]] = []
    for word in sorted(words, key=lambda item: (round(item["top"], 1), item["x0"])):
        if not rows or abs(rows[-1]["top"] - word["top"]) > 3:
            rows.append({"top": word["top"], "words": [word]})
            continue

        rows[-1]["words"].append(word)
        rows[-1]["top"] = (rows[-1]["top"] + word["top"]) / 2

    return [clean(" ".join(word["text"] for word in row["words"])) for row in rows]


def finalize_item(
    item: dict[str, Any] | None,
    imported: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
    existing_question_keys: set[str],
    _reason: str,
) -> None:
    if not item:
        return

    question_text = clean(" ".join(item["questionLines"]))
    choices = [
        {"id": choice["id"], "text": clean(choice["text"])}
        for choice in item["choices"]
        if choice["id"] and clean(choice["text"])
    ]
    answer = item.get("answer")
    choice_ids = {choice["id"] for choice in choices}
    question_key = normalized(question_text)

    if question_key in existing_question_keys:
        skipped.append({"number": item["number"], "page": item["page"], "reason": "duplicate"})
        return

    if question_text and answer in choice_ids and len(choices) >= 5 and len(choice_ids) == len(choices):
        imported.append(
            {
                "id": f"cse-pro-2026-number-series-{len(imported) + 1:04d}",
                "examLevel": "professional",
                "year": 2026,
                "source": f"{SOURCE_LABEL} - Number Series, page {item['page']}",
                "topic": "Numerical Reasoning",
                "question": f"Find the missing number in the series: {question_text}",
                "choices": choices,
                "answer": answer,
                "explanation": f"The reviewer answer marker lists option {answer.upper()} as correct for this number series item.",
                "feedback": {
                    "correct": "Correct. Your answer matches the answer marker.",
                    "incorrect": "Review the number pattern and compare it with the marked option.",
                },
                "status": "verified",
            }
        )
        existing_question_keys.add(question_key)
        return

    if not question_text:
        reason = "missing question text"
    elif len(choices) < 5:
        reason = "not multiple choice"
    elif len(choices) > 5 or len(choice_ids) != len(choices):
        reason = "ambiguous choices"
    elif answer not in choice_ids:
        reason = "missing answer marker"
    else:
        reason = "unverified"

    skipped.append(
        {
            "number": item.get("number"),
            "page": item.get("page"),
            "reason": reason,
            "answer": answer,
            "choiceCount": len(choices),
        }
    )


def existing_question_keys() -> set[str]:
    if not BASE_QUESTIONS_JSON.exists():
        return set()
    questions = json.loads(BASE_QUESTIONS_JSON.read_text(encoding="utf-8"))
    return {normalized(question["question"]) for question in questions}


def extract_questions(source_pdf: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    imported: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    question_keys = existing_question_keys()
    current: dict[str, Any] | None = None
    current_choice: dict[str, str] | None = None

    with pdfplumber.open(str(source_pdf)) as document:
        for page_index, page in enumerate(document.pages, start=1):
            for left, right in [(0, 306), (306, 612)]:
                for line in extract_ordered_lines(page, left, right):
                    if not line or line in {"Number", "Series", "Number Series", "r Series"}:
                        continue

                    question_start = re.match(r"^(\d{1,3})\)\s*(.*)$", line)
                    if question_start:
                        finalize_item(current, imported, skipped, question_keys, "new question")
                        current = {
                            "number": int(question_start.group(1)),
                            "questionLines": [question_start.group(2)],
                            "choices": [],
                            "answer": None,
                            "page": page_index,
                        }
                        current_choice = None
                        continue

                    if not current:
                        continue

                    choice_start = re.match(r"^([a-e])\)\s*(.*)$", line, re.IGNORECASE)
                    if choice_start:
                        current["choices"].append(
                            {
                                "id": choice_start.group(1).lower(),
                                "text": choice_start.group(2),
                            }
                        )
                        current_choice = current["choices"][-1]
                        continue

                    answer_marker = re.search(r"(?:Solution|Answer)\s*\(?\s*Option\s*([A-E])\)?", line, re.IGNORECASE)
                    if answer_marker:
                        current["answer"] = answer_marker.group(1).lower()
                        current_choice = None
                        continue

                    if re.search(r"(?:Solution|Answer)", line, re.IGNORECASE):
                        current_choice = None
                        continue

                    if current_choice:
                        current_choice["text"] = clean(f"{current_choice['text']} {line}")
                    else:
                        current["questionLines"].append(line)

    finalize_item(current, imported, skipped, question_keys, "end of file")
    return imported, skipped


def main() -> None:
    parser = ArgumentParser(description="Extract verified Number Series questions from the 2026 reviewer set.")
    parser.add_argument("--pdf", type=Path, help="Path to the Number Series source PDF.")
    args = parser.parse_args()

    source_pdf = (args.pdf or default_source_pdf()).resolve()
    imported, skipped = extract_questions(source_pdf)

    OUTPUT_JSON.write_text(json.dumps(imported, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    summary = {
        "source": SOURCE_LABEL,
        "sourceFile": source_pdf.name,
        "imported": len(imported),
        "skipped": len(skipped),
        "byTopic": dict(sorted(Counter(item["topic"] for item in imported).items())),
        "skipReasons": dict(sorted(Counter(item["reason"] for item in skipped).items())),
    }
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
