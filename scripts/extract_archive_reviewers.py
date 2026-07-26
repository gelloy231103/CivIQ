from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TEXT_DIR = ROOT / "tmp/reviewer-import-archive/text"
OUTPUT_DIR = ROOT / "src/data/professional"
SOURCE_LABEL = "Civil Service Archive"

CHOICE_IDS = {
    "1": "a",
    "2": "b",
    "3": "c",
    "4": "d",
    "5": "e",
    "6": "f",
}


@dataclass(frozen=True)
class SectionSpec:
    key: str
    title: str
    topic: str
    start: str
    end: str | None


@dataclass(frozen=True)
class SourceSpec:
    year: int
    slug: str
    title: str
    files: tuple[str, ...]
    answer_file: str
    sections: dict[str, tuple[SectionSpec, ...]]


@dataclass
class RawQuestion:
    number: int
    question_lines: list[str] = field(default_factory=list)
    choices: list[dict[str, str]] = field(default_factory=list)
    current_choice_index: int | None = None


ANSWER_HEADERS = {
    "grammar": "English Grammar and Correct Usage Test Answers:",
    "vocabulary": "English Vocabulary Answers:",
    "idiomatic": "Correct Spelling and Idiomatic Expressions Answers:",
    "analogy": "Analogy and Logic Answers:",
    "reading": "Reading Comprehension Answers:",
    "paragraph": "Paragraph Organization Answers:",
    "numerical": "Numerical Reasoning Correct Answers with Solutions and Explanations:",
    "clerical": "Clerical Operations / Clerical Reasoning Answers:",
    "general": "Philippine Constitution, General Information, Current Events Answers:",
}

COMPLETE_REVIEWER_SECTIONS = (
    SectionSpec(
        "grammar",
        "Grammar and Correct Usage",
        "Grammar",
        "Sample Tests",
        "English Vocabulary Questions",
    ),
    SectionSpec(
        "vocabulary",
        "Vocabulary",
        "Vocabulary",
        "English Vocabulary Questions",
        "Correct Spelling, Idiomatic",
    ),
    SectionSpec(
        "idiomatic",
        "Idiomatic Expressions",
        "Vocabulary",
        "Correct Spelling, Idiomatic",
        "Analogy",
    ),
    SectionSpec(
        "analogy",
        "Analogy and Logic",
        "Analogy",
        "Analogy",
        "Reading Comprehension Test",
    ),
    SectionSpec(
        "reading",
        "Reading Comprehension",
        "Reading Comprehension",
        "Reading Comprehension Test Sample",
        "Paragraph Organization Test Samples",
    ),
    SectionSpec(
        "paragraph",
        "Paragraph Organization",
        "Paragraph Organization",
        "Paragraph Organization Test Samples",
        "Numerical Reasoning Test Samples:",
    ),
    SectionSpec(
        "numerical",
        "Numerical Reasoning",
        "Numerical Reasoning",
        "Numerical Reasoning Test Samples:",
        "Civil Service Exam Clerical Operations",
    ),
    SectionSpec(
        "clerical",
        "Clerical Operations",
        "Clerical Operations",
        "Civil Service Exam Clerical Operations",
        "Constitution, General Information, Current",
    ),
    SectionSpec(
        "general",
        "General Information",
        "General Information",
        "Constitution, General Information, Current",
        "Free Answer Key:",
    ),
)

ONE_TAKER_PART_1_SECTIONS = (
    SectionSpec(
        "vocabulary",
        "Vocabulary",
        "Vocabulary",
        "English Vocabulary Questions with Answers:",
        "Correct Spelling and Idiomatic Expressions with",
    ),
    SectionSpec(
        "idiomatic",
        "Idiomatic Expressions",
        "Vocabulary",
        "Idiomatic Expressions Questions",
        "Civil Service Exam Reviewer for Analogy",
    ),
    SectionSpec(
        "analogy",
        "Analogy and Logic",
        "Analogy",
        "Analogy and Logic Questions and Answers",
        "English Grammar and Correct Usage Sample",
    ),
    SectionSpec(
        "grammar",
        "Grammar and Correct Usage",
        "Grammar",
        "Instruction: Choose the correct answer for each question.",
        "Reading Comprehension Test, Exercise",
    ),
    SectionSpec(
        "reading",
        "Reading Comprehension",
        "Reading Comprehension",
        "Reading Comprehension Test Sample Questions",
        "Paragraph Organization Civil Service Test Examples",
    ),
    SectionSpec(
        "paragraph",
        "Paragraph Organization",
        "Paragraph Organization",
        "Paragraph Organization Test Samples Civil",
        "Numerical Reasoning Practice Test",
    ),
    SectionSpec(
        "numerical",
        "Numerical Reasoning",
        "Numerical Reasoning",
        "Numerical Reasoning Test Samples:",
        "Answer Key and Tips for Civil Service Exam",
    ),
)

ONE_TAKER_PART_2_SECTIONS = (
    SectionSpec(
        "clerical",
        "Clerical Operations",
        "Clerical Operations",
        "Civil Service Exam Clerical Operations Questions:",
        "Constitution, General Information, Current",
    ),
    SectionSpec(
        "general",
        "General Information",
        "General Information",
        "Civil Service Exam 2015 Philippine Constitution",
        None,
    ),
)

SOURCES = (
    SourceSpec(
        2017,
        "complete-reviewer",
        "Complete Reviewer",
        ("source-0005.pdf.txt",),
        "source-0005.pdf.txt",
        {"source-0005.pdf.txt": COMPLETE_REVIEWER_SECTIONS},
    ),
    SourceSpec(
        2018,
        "complete-reviewer",
        "Complete Reviewer",
        ("source-0006.pdf.txt",),
        "source-0006.pdf.txt",
        {"source-0006.pdf.txt": COMPLETE_REVIEWER_SECTIONS},
    ),
    SourceSpec(
        2022,
        "1taker-drill",
        "1Taker Drill",
        ("source-0048.pdf.txt", "source-0049.pdf.txt"),
        "source-0047.pdf.txt",
        {
            "source-0048.pdf.txt": ONE_TAKER_PART_1_SECTIONS,
            "source-0049.pdf.txt": ONE_TAKER_PART_2_SECTIONS,
        },
    ),
)


def main() -> int:
    if not TEXT_DIR.exists():
        raise FileNotFoundError(
            f"Archive text directory not found: {TEXT_DIR}. Run import_reviewer_sources.py first."
        )

    for source in SOURCES:
        questions, skipped = extract_source(source)
        output_path = OUTPUT_DIR / f"{source.year}.{source.slug}.generated.json"
        summary_path = OUTPUT_DIR / f"{source.year}.{source.slug}.import-summary.json"
        public_questions = [without_private_fields(question) for question in questions]
        output_path.write_text(json.dumps(public_questions, indent=2) + "\n", encoding="utf-8")
        summary = {
            "source": f"{SOURCE_LABEL} {source.year} - {source.title}",
            "imported": len(questions),
            "skipped": len(skipped),
            "byTopic": dict(sorted(Counter(question["topic"] for question in questions).items())),
            "bySection": dict(sorted(Counter(item["section"] for item in questions).items())),
            "skipReasons": dict(sorted(Counter(item["reason"] for item in skipped).items())),
        }
        summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(summary, indent=2))

    return 0


def extract_source(source: SourceSpec) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    answers = parse_answer_file(read_lines(source.answer_file))
    imported: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for file_name in source.files:
        lines = read_lines(file_name)
        cursor = 0
        for section in source.sections[file_name]:
            section_lines, cursor = slice_section(lines, section.start, section.end, cursor)
            if not section_lines:
                skipped.append(
                    {
                        "section": section.title,
                        "reason": "missing section text",
                        "file": file_name,
                    }
                )
                continue

            raw_questions = parse_questions(section_lines)
            section_answers = answers.get(section.key, {})
            for raw_question in raw_questions:
                question = build_question(source, section, raw_question, section_answers, len(imported) + 1)
                if not question:
                    skipped.append(
                        {
                            "section": section.title,
                            "number": raw_question.number,
                            "reason": skip_reason(raw_question, section_answers),
                            "choiceCount": len(raw_question.choices),
                        }
                    )
                    continue

                question_key = normalized(question["question"])
                if question_key in seen_keys:
                    skipped.append(
                        {
                            "section": section.title,
                            "number": raw_question.number,
                            "reason": "duplicate in source",
                        }
                    )
                    continue

                seen_keys.add(question_key)
                imported.append(question)

    return imported, skipped


def without_private_fields(question: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in question.items() if key != "section"}


def read_lines(file_name: str) -> list[str]:
    return (TEXT_DIR / file_name).read_text(encoding="utf-8", errors="replace").splitlines()


def clean(value: str | None) -> str:
    text = " ".join((value or "").split()).strip()
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2026": "...",
        "\u00d7": "x",
        "\u00f7": "/",
        "\u00be": "3/4",
        "\u00bd": "1/2",
        "\u00e2\u20ac\u2122": "'",
        "\u00e2\u20ac\u0153": '"',
        "\u00e2\u20ac\u009d": '"',
        "\u00e2\u20ac\u201d": '"',
        "\u00e2\u20ac\u201c": "-",
        "\u00e2\u20ac\u00a6": "...",
        "\u00c3\u2014": "x",
        "\u00c3\u00b7": "/",
        "\u00c2\u00be": "3/4",
        "\u00c2\u00bd": "1/2",
        "\u00ef\u201a\u00b7": "-",
        "\u00ef\u20ac\u00b1": "-",
        "r\u00c3\u00a9sum\u00c3\u00a9": "resume",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"\s+([?.!,;:])", r"\1", text)
    return text


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", clean(value).lower())


def contains_marker(line: str, marker: str) -> bool:
    return marker.lower() in clean(line).lower()


def slice_section(
    lines: list[str],
    start_marker: str,
    end_marker: str | None,
    start_at: int = 0,
) -> tuple[list[str], int]:
    start = next((index for index in range(start_at, len(lines)) if contains_marker(lines[index], start_marker)), None)
    if start is None:
        return [], start_at

    end = len(lines)
    if end_marker:
        for index in range(start + 1, len(lines)):
            if contains_marker(lines[index], end_marker):
                end = index
                break

    return lines[start:end], end


def parse_answer_file(lines: list[str]) -> dict[str, dict[int, dict[str, str | None]]]:
    answers: dict[str, dict[int, dict[str, str | None]]] = {}
    header_positions = [
        (key, index)
        for key, header in ANSWER_HEADERS.items()
        for index, line in enumerate(lines)
        if contains_marker(line, header)
    ]
    header_positions.sort(key=lambda item: item[1])

    for position, (key, start_index) in enumerate(header_positions):
        end_index = header_positions[position + 1][1] if position + 1 < len(header_positions) else len(lines)
        answers[key] = parse_answer_entries(lines[start_index + 1 : end_index])

    return answers


def parse_answer_entries(lines: list[str]) -> dict[int, dict[str, str | None]]:
    entries: dict[int, dict[str, str | None]] = {}
    current_number: int | None = None

    for raw_line in lines:
        line = clean(raw_line)
        if not line:
            continue
        answer_start = re.match(r"^(\d{1,3})\.\s*(?:\(([1-6A-Fa-f])\))?\s*(.*)$", line)
        if answer_start:
            current_number = int(answer_start.group(1))
            marker = answer_start.group(2)
            answer_text = clean(answer_start.group(3))
            entries[current_number] = {
                "choice": CHOICE_IDS.get(marker.lower(), marker.lower()) if marker else None,
                "text": answer_text,
            }
            continue

        if current_number and entries[current_number].get("text"):
            entries[current_number]["text"] = clean(f"{entries[current_number]['text']} {line}")

    return entries


def parse_questions(lines: list[str]) -> list[RawQuestion]:
    questions: list[RawQuestion] = []
    current: RawQuestion | None = None

    for raw_line in lines:
        line = clean(raw_line)
        if not line:
            continue
        if is_answer_key_line(line):
            break
        if current is None and not re.match(r"^\d{1,3}\.\s*", line):
            continue

        numbered = re.match(r"^(\d{1,3})\.\s*(.*)$", line)
        if numbered:
            label = numbered.group(1)
            label_number = int(label)
            rest = clean(numbered.group(2))

            if should_start_question(current, label_number, rest):
                if current:
                    questions.append(current)
                current = RawQuestion(label_number, [rest] if rest else [])
                continue

            if current and label in CHOICE_IDS:
                choices = extract_numbered_choices(line)
                if len(choices) > 1:
                    for choice_label, choice_text in choices:
                        add_choice(current, choice_label, choice_text)
                else:
                    add_choice(current, label, rest)
                continue

        if not current:
            continue

        if current.current_choice_index is not None and looks_like_choice_continuation(line):
            choice = current.choices[current.current_choice_index]
            choice["text"] = clean(f"{choice['text']} {line}")
        else:
            current.question_lines.append(line)
            current.current_choice_index = None

    if current:
        questions.append(current)

    return questions


def is_answer_key_line(line: str) -> bool:
    lower = line.lower()
    return lower.startswith("answer key") or lower.startswith("correct answers")


def should_start_question(current: RawQuestion | None, label_number: int, text: str) -> bool:
    if current is None:
        return True
    if label_number != current.number + 1:
        return False
    if len(current.choices) >= 4:
        return True
    return len(current.choices) >= 3 and looks_like_question_text(text)


def looks_like_question_text(text: str) -> bool:
    lower = text.lower()
    question_starters = (
        "what ",
        "which ",
        "who ",
        "when ",
        "where ",
        "why ",
        "how ",
        "find ",
        "arrange ",
        "choose ",
        "the ",
        "a ",
        "an ",
    )
    return (
        "?" in text
        or "____" in text
        or ":" in text
        or any(lower.startswith(starter) for starter in question_starters)
        or len(text.split()) >= 5
    )


def extract_numbered_choices(line: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"(?:^|\s)([1-6])\.\s*", line))
    if len(matches) < 2:
        return []

    choices: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(line)
        choices.append((match.group(1), clean(line[start:end])))
    return choices


def add_choice(question: RawQuestion, label: str, text: str) -> None:
    question.choices.append({"id": CHOICE_IDS[label], "text": clean(text)})
    question.current_choice_index = len(question.choices) - 1


def looks_like_choice_continuation(line: str) -> bool:
    if re.match(r"^[A-E]\.\s+", line):
        return False
    if re.match(r"^\d{1,3}\.\s*", line):
        return False
    return True


def build_question(
    source: SourceSpec,
    section: SectionSpec,
    raw_question: RawQuestion,
    section_answers: dict[int, dict[str, str | None]],
    index: int,
) -> dict[str, Any] | None:
    question_text = clean(" ".join(raw_question.question_lines))
    choices = [
        {"id": choice["id"], "text": clean(choice["text"])}
        for choice in raw_question.choices
        if choice["id"] and clean(choice["text"])
    ]
    answer = resolve_answer(section_answers.get(raw_question.number), choices)
    choice_ids = {choice["id"] for choice in choices}

    if not question_text or not answer or answer not in choice_ids or len(choices) < 4:
        return None

    return {
        "id": f"cse-pro-{source.year}-{source.slug}-{index:04d}",
        "examLevel": "professional",
        "year": source.year,
        "source": f"{SOURCE_LABEL} {source.year} - {source.title}, {section.title}",
        "topic": section.topic,
        "question": question_text,
        "choices": choices,
        "answer": answer,
        "explanation": f"The {source.year} archive answer key marks choice {answer.upper()} as correct.",
        "feedback": {
            "correct": "Correct. Your answer matches the archive answer key.",
            "incorrect": "Review the choices and compare your answer with the archive key.",
        },
        "status": "verified",
        "section": section.title,
    }


def resolve_answer(answer_entry: dict[str, str | None] | None, choices: list[dict[str, str]]) -> str | None:
    if not answer_entry:
        return None
    choice = answer_entry.get("choice")
    if choice:
        return choice

    answer_text = answer_entry.get("text")
    if not answer_text:
        return None

    answer_key = normalized(answer_text)
    for choice_item in choices:
        choice_key = normalized(choice_item["text"])
        if choice_key and (choice_key == answer_key or choice_key in answer_key or answer_key in choice_key):
            return choice_item["id"]
    return None


def skip_reason(raw_question: RawQuestion, section_answers: dict[int, dict[str, str | None]]) -> str:
    if not clean(" ".join(raw_question.question_lines)):
        return "missing question text"
    if len(raw_question.choices) < 4:
        return "missing choices"
    if raw_question.number not in section_answers:
        return "missing answer key"
    return "answer does not match choices"


if __name__ == "__main__":
    raise SystemExit(main())
