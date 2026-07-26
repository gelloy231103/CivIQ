from __future__ import annotations

import json
import re
from argparse import ArgumentParser
from collections import Counter
from pathlib import Path
from typing import Any

import pdfplumber
from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_NAME = "Civil Service Exam Reviewer for 2026.pdf"
OUTPUT_JSON = ROOT / "src/data/professional/2026.generated.json"
SUMMARY_JSON = ROOT / "src/data/professional/2026.import-summary.json"
ABSTRACT_ASSET_DIR = ROOT / "public/reviewer-assets/2026/abstract"

SOURCE_LABEL = "Civil Service Reviewer"

TOPIC_MAP = [
    ("Word Problems and Operations", "Numerical Reasoning"),
    ("Data Sufficiency", "Numerical Reasoning"),
    ("Alphabetizing", "General Information"),
    ("Synonyms", "Vocabulary"),
    ("Antonyms", "Vocabulary"),
    ("Single-Word Analogy", "Analogy"),
    ("Double-Word Analogy", "Analogy"),
    ("Identifying Errors", "Grammar"),
    ("Correct Usage", "Grammar"),
    ("Paragraph Development", "Reading Comprehension"),
    ("Reading Comprehension", "Reading Comprehension"),
    ("Kasingkahulugan", "Filipino"),
    ("Kasalungat", "Filipino"),
    ("Mga Kawikaan", "Filipino"),
    ("Wastong Gamit", "Filipino"),
    ("Pagkilala sa Mali", "Filipino"),
    ("Pag-unawa sa Binasa", "Filipino"),
    ("Pagtatalata", "Filipino"),
    ("Philippine Constitution", "Philippine Constitution"),
    ("Inductive Reasoning", "Logic"),
    ("Abstract Reasoning", "Abstract Reasoning"),
]

DATA_SUFFICIENCY_CHOICES = [
    ("a", "Statement (1) alone is sufficient, but statement (2) alone is not sufficient."),
    ("b", "Statement (2) alone is sufficient, but statement (1) alone is not sufficient."),
    ("c", "Both statements together are sufficient, but neither statement alone is sufficient."),
    ("d", "Each statement alone is sufficient."),
    ("e", "Statements (1) and (2) together are not sufficient."),
]

GENERIC_ERROR_CHOICES = [
    ("a", "Marked part A"),
    ("b", "Marked part B"),
    ("c", "Marked part C"),
    ("d", "Marked part D"),
    ("e", "No error"),
]

ABSTRACT_ANSWERS = {
    1: "d",
    2: "b",
    3: "b",
    4: "c",
    5: "d",
    6: "a",
    7: "d",
    8: "d",
    9: "c",
    10: "b",
    11: "c",
    12: "b",
    13: "a",
    14: "d",
    15: "d",
    16: "b",
    17: "b",
    18: "b",
    19: "b",
    20: "d",
    21: "b",
    22: "d",
    23: "d",
    24: "a",
    25: "b",
    26: "c",
    27: "c",
    28: "c",
    29: "b",
    30: "d",
}

ABSTRACT_PROMPTS = {
    range(1, 6): "Choose the option that logically completes the circle pattern. Options in the image are ordered left to right.",
    range(6, 7): "Choose the option that replaces the missing hexagon in the pyramid. Options in the image are ordered left to right.",
    range(7, 13): "Choose the option that fits the missing square. Options in the image are ordered left to right.",
    range(14, 17): "Choose the missing tile by comparing each row and column. Options in the image are ordered left to right.",
    range(18, 19): "Choose the missing piece that completes the symmetrical square. Options in the image are ordered left to right.",
    range(19, 31): "Choose the figure that contains the smaller figure shown on the left. Options in the image are ordered left to right.",
}

# Crops use PDF point coordinates and intentionally omit PDF answer labels.
ABSTRACT_IMAGE_PIECES = {
    1: [(154, 96, 128, 222, 268), (154, 238, 158, 455, 207)],
    2: [(154, 92, 330, 204, 467), (154, 242, 498, 455, 547)],
    3: [(155, 86, 64, 200, 202), (155, 242, 80, 458, 128)],
    4: [(155, 90, 226, 213, 376), (155, 232, 238, 475, 290)],
    5: [(155, 85, 468, 210, 622), (155, 232, 493, 470, 548)],
    6: [(156, 82, 160, 208, 282), (156, 232, 296, 462, 348)],
    7: [(156, 94, 412, 198, 517), (156, 234, 526, 462, 575)],
    8: [(157, 94, 64, 200, 176), (157, 232, 54, 470, 110)],
    9: [(157, 94, 176, 202, 290), (157, 242, 176, 465, 217)],
    10: [(157, 95, 320, 202, 431), (157, 236, 306, 465, 358)],
    11: [(157, 96, 480, 212, 600), (157, 230, 468, 470, 528)],
    12: [(158, 98, 64, 212, 184), (158, 230, 64, 470, 112)],
    13: [(158, 100, 190, 216, 308), (158, 235, 205, 405, 248)],
    14: [(158, 100, 398, 212, 518), (158, 235, 408, 470, 455)],
    15: [(158, 100, 514, 212, 625), (158, 234, 520, 470, 562)],
    16: [(159, 100, 64, 212, 175), (159, 240, 64, 470, 115)],
    17: [(159, 100, 182, 212, 290), (159, 240, 181, 462, 218)],
    18: [(159, 100, 365, 218, 485), (159, 225, 355, 480, 420)],
    19: [(159, 100, 606, 465, 675)],
    20: [(160, 92, 88, 470, 160)],
    21: [(160, 100, 268, 470, 340)],
    22: [(160, 95, 380, 470, 452)],
    23: [(160, 100, 494, 475, 568)],
    24: [(160, 100, 632, 475, 708)],
    25: [(161, 95, 96, 475, 172)],
    26: [(161, 85, 205, 465, 320)],
    27: [(161, 100, 408, 475, 482)],
    28: [(161, 105, 525, 480, 594)],
    29: [(162, 100, 64, 470, 132)],
    30: [(162, 98, 164, 475, 240)],
}

ABSTRACT_ASSET_ERASURES = {
    1: [(112, 206, 158, 254)],
}


def is_red(char: dict[str, Any]) -> bool:
    color = char.get("non_stroking_color")
    return isinstance(color, tuple) and len(color) >= 3 and color[0] > 0.8 and color[1] < 0.2 and color[2] < 0.2


def clean(value: str | None) -> str:
    text = " ".join((value or "").split()).strip()
    replacements = {
        "×": "x",
        "–": "-",
        "’": "'",
        "“": '"',
        "”": '"',
        "˝": "1/2",
        "Ľ": "1/4",
        "≤": "<=",
        "≥": ">=",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"([A-Za-z0-9])x$", r"\1?", text)
    return text


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", clean(value).lower())


def topic_for_heading(text: str, current_topic: str) -> tuple[str, str | None]:
    lower = clean(text).lower()
    for heading, topic in TOPIC_MAP:
        if lower == heading.lower() or heading.lower() in lower:
            return topic, heading
    if lower == "mathematics":
        return "Numerical Reasoning", "Mathematics"
    if lower == "filipino":
        return "Filipino", "Filipino"
    if lower == "english":
        return "Vocabulary", "English"
    if lower == "philippine constitution":
        return "Philippine Constitution", "Philippine Constitution"
    return current_topic, None


def answer_from_line(text: str, red_text: str) -> str | None:
    lower = clean(text).lower()
    red = clean(red_text).lower().replace(" ", "")
    explicit = re.search(r"answer:\s*([a-e])\.", lower)
    if explicit:
        return explicit.group(1)

    marker = re.search(r"\b([a-e])\.?\b", red)
    if marker and (
        "a. b. c." in lower
        or "a b c" in lower
        or "walang mali" in lower
        or "no error" in lower
    ):
        return marker.group(1)
    return None


def start_question(number: str, text: str, page: int, topic: str, section: str, mode: str) -> dict[str, Any]:
    return {
        "number": int(number),
        "question_lines": [clean(text)] if clean(text) else [],
        "choices": [],
        "answer": None,
        "topic": topic,
        "section": section,
        "page": page,
        "mode": mode,
        "bad": False,
    }


def should_skip(candidate: dict[str, Any], question_text: str, choices: list[dict[str, str]]) -> bool:
    combined = " ".join([question_text, *[choice["text"] for choice in choices]]).lower()
    if candidate.get("bad"):
        return True
    if candidate["topic"] == "Abstract Reasoning":
        return True
    if "congratulations" in combined or "corresponds to your answer" in combined:
        return True
    if len({choice["id"] for choice in choices}) != len(choices):
        return True
    return False


def abstract_prompt(question_number: int) -> str:
    for question_range, prompt in ABSTRACT_PROMPTS.items():
        if question_number in question_range:
            return prompt
    return "Choose the option that completes the Abstract Reasoning figure. Options in the image are ordered left to right."


def neutralize_answer_color(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue = pixels[x, y]
            if red > 130 and green < 100 and blue < 100:
                pixels[x, y] = (0, 0, 0)
    return ImageOps.autocontrast(ImageOps.grayscale(image), cutoff=1).convert("RGB")


def crop_rendered_page(page_image: Image.Image, box: tuple[int, int, int, int, int], scale: int) -> Image.Image:
    _, x0, top, x1, bottom = box
    return page_image.crop(tuple(int(value * scale) for value in (x0, top, x1, bottom)))


def compose_abstract_asset(number: int, pieces: list[Image.Image]) -> Image.Image:
    label_height = 42
    spacing = 28
    padding = 28
    width = max(piece.width for piece in pieces) + padding * 2
    height = label_height + sum(piece.height for piece in pieces) + spacing * (len(pieces) - 1) + padding
    canvas = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(canvas)
    draw.text((padding, 18), f"Item {number}", fill=(17, 24, 39))
    y = label_height
    for piece in pieces:
        x = (width - piece.width) // 2
        canvas.paste(piece, (x, y))
        y += piece.height + spacing
    draw = ImageDraw.Draw(canvas)
    for erasure in ABSTRACT_ASSET_ERASURES.get(number, []):
        draw.rectangle(erasure, fill="white")
    return canvas


def extract_abstract_questions(source_pdf: Path) -> list[dict[str, Any]]:
    ABSTRACT_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    scale = 2
    needed_pages = sorted({piece[0] for pieces in ABSTRACT_IMAGE_PIECES.values() for piece in pieces})

    generated: list[dict[str, Any]] = []
    with pdfplumber.open(str(source_pdf)) as document:
        rendered_pages = {
            page_number: document.pages[page_number - 1].to_image(resolution=72 * scale).original.convert("RGB")
            for page_number in needed_pages
        }

        for number, boxes in ABSTRACT_IMAGE_PIECES.items():
            parts = [neutralize_answer_color(crop_rendered_page(rendered_pages[box[0]], box, scale)) for box in boxes]
            asset = compose_abstract_asset(number, parts)
            asset_path = ABSTRACT_ASSET_DIR / f"abstract-{number:02d}.png"
            asset.save(asset_path, optimize=True)
            choice_ids = ["a", "b", "c"] if number == 13 else ["a", "b", "c", "d"]
            generated.append(
                {
                    "examLevel": "professional",
                    "year": 2026,
                    "source": SOURCE_LABEL,
                    "topic": "Abstract Reasoning",
                    "question": abstract_prompt(number),
                    "imageUrl": f"/reviewer-assets/2026/abstract/{asset_path.name}",
                    "imageAlt": f"Abstract Reasoning item {number} visual pattern and answer options.",
                    "choices": [
                        {"id": choice_id, "text": f"Option {choice_id.upper()}"}
                        for choice_id in choice_ids
                    ],
                    "answer": ABSTRACT_ANSWERS[number],
                    "explanation": f"The answer key marks choice {ABSTRACT_ANSWERS[number].upper()} as correct for this visual item.",
                    "feedback": {
                        "correct": "Correct. Your answer matches the marked answer key.",
                        "incorrect": "Review the figure and compare the option order with the marked answer.",
                    },
                    "status": "verified",
                    "_section": "Abstract Reasoning",
                    "_page": boxes[0][0],
                }
            )

    return generated


def finalize_candidate(
    candidate: dict[str, Any] | None,
    imported: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
    reason: str,
) -> None:
    if not candidate:
        return

    question_text = clean(" ".join(candidate["question_lines"]))
    for choice in candidate["choices"]:
        choice["text"] = clean(choice["text"])

    choices = [choice for choice in candidate["choices"] if choice["id"] and choice["text"]]
    answer = candidate["answer"]
    choice_ids = {choice["id"] for choice in choices}

    if (
        question_text
        and answer
        and len(choices) >= 4
        and answer in choice_ids
        and not should_skip(candidate, question_text, choices)
    ):
        imported.append(
            {
                "examLevel": "professional",
                "year": 2026,
                "source": SOURCE_LABEL,
                "topic": candidate["topic"],
                "question": question_text,
                "choices": choices,
                "answer": answer,
                "explanation": f"The answer key marks choice {answer.upper()} as correct.",
                "feedback": {
                    "correct": "Correct. Your answer matches the marked answer key.",
                    "incorrect": "Review the marked answer and compare it with your selected choice.",
                },
                "status": "verified",
                "_section": candidate["section"],
                "_page": candidate["page"],
            }
        )
        return

    if question_text or choices or answer:
        skipped.append(
            {
                "page": candidate.get("page"),
                "section": candidate.get("section"),
                "number": candidate.get("number"),
                "reason": reason,
                "bad": bool(candidate.get("bad")),
                "answer": answer,
                "choiceCount": len(choices),
            }
        )


def default_source_pdf() -> Path:
    matches = sorted((ROOT / "reviewers").rglob(DEFAULT_SOURCE_NAME))
    if not matches:
        raise FileNotFoundError(f"Could not find {DEFAULT_SOURCE_NAME!r} under the reviewers folder.")
    return matches[0]


def extract_questions(source_pdf: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    imported: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    current_choice: dict[str, str] | None = None
    current_topic = "General Information"
    current_section = "General Information"
    mode = "normal"

    with pdfplumber.open(str(source_pdf)) as document:
        for page_index, page in enumerate(document.pages):
            lines = page.extract_text_lines(layout=True, return_chars=True)
            for line in lines:
                text = clean(line.get("text"))
                red_text = clean("".join(char["text"] for char in line.get("chars", []) if is_red(char)))
                if not text or re.match(r"^P\s*a\s*g\s*e\s*\|", text):
                    continue

                next_topic, heading = topic_for_heading(text, current_topic)
                if heading:
                    current_topic = next_topic
                    current_section = heading
                    mode = "data_sufficiency" if heading == "Data Sufficiency" else "normal"
                    continue

                if text.startswith("Directions") or text.startswith("Panuto:") or text == "Answer Sheet":
                    continue

                if mode == "data_sufficiency" and text.lower().startswith("answer:"):
                    if current:
                        current["answer"] = answer_from_line(text, red_text) or answer_from_line(text, text)
                        current["choices"] = [
                            {"id": choice_id, "text": choice_text}
                            for choice_id, choice_text in DATA_SUFFICIENCY_CHOICES
                        ]
                        finalize_candidate(current, imported, skipped, "data-sufficiency answer")
                        current = None
                        current_choice = None
                    continue

                question_start = re.match(r"^(\d{1,3})\.\s*(.*)$", text)
                if question_start and not re.match(r"^[a-e]\.\s*", text.lower()):
                    finalize_candidate(current, imported, skipped, "new question")
                    current = start_question(
                        question_start.group(1),
                        question_start.group(2),
                        page_index + 1,
                        current_topic,
                        current_section,
                        mode,
                    )
                    current_choice = None
                    continue

                if not current:
                    continue

                if mode == "data_sufficiency":
                    current["question_lines"].append(text)
                    continue

                label_row = "a. b. c." in text.lower() or re.fullmatch(
                    r"(?:[a-e]\.?(?:\s+|$)){4,5}.*",
                    text.lower(),
                )
                if label_row:
                    answer = answer_from_line(text, red_text)
                    if answer:
                        current["answer"] = answer
                        current["choices"] = [
                            {"id": choice_id, "text": choice_text}
                            for choice_id, choice_text in GENERIC_ERROR_CHOICES
                        ]
                    else:
                        current["question_lines"].append(text)
                    current_choice = None
                    continue

                choice_start = re.match(r"^([a-e])\.\s*(.*)$", text, re.IGNORECASE)
                if choice_start:
                    choice_id = choice_start.group(1).lower()
                    choice_text = clean(choice_start.group(2))
                    current["choices"].append({"id": choice_id, "text": choice_text})
                    current_choice = current["choices"][-1]
                    if red_text:
                        red_norm = normalized(red_text)
                        choice_norm = normalized(choice_text)
                        meaningful_answer = (
                            bool(choice_norm)
                            and (choice_norm in red_norm or red_norm in choice_norm)
                            and len(red_norm.replace(choice_id, "")) > 0
                        )
                        if meaningful_answer:
                            current["answer"] = choice_id
                            if not current_choice["text"]:
                                current_choice["text"] = red_text
                        elif normalized(red_text) in {choice_id, f"{choice_id}."} or re.fullmatch(
                            r"[a-e]",
                            normalized(red_text),
                        ):
                            current["bad"] = True
                    continue

                answer = answer_from_line(text, red_text)
                if answer and current["choices"]:
                    current["answer"] = answer
                    continue

                if current_choice and current["choices"]:
                    current_choice["text"] = clean(f"{current_choice['text']} {text}")
                    if red_text:
                        red_norm = normalized(red_text)
                        choice_norm = normalized(current_choice["text"])
                        if choice_norm and (red_norm in choice_norm or choice_norm in red_norm):
                            current["answer"] = current_choice["id"]
                else:
                    current["question_lines"].append(text)

    finalize_candidate(current, imported, skipped, "end of file")
    return imported, skipped


def main() -> None:
    parser = ArgumentParser(description="Extract answer-key verified questions from the 2026 reviewer PDF.")
    parser.add_argument("--pdf", type=Path, help="Path to the source reviewer PDF.")
    args = parser.parse_args()

    source_pdf = (args.pdf or default_source_pdf()).resolve()
    imported, skipped = extract_questions(source_pdf)
    abstract_questions = extract_abstract_questions(source_pdf)
    skipped = [item for item in skipped if item.get("section") != "Abstract Reasoning"]
    imported.extend(abstract_questions)
    generated = []
    for index, item in enumerate(imported, start=1):
        section = item.pop("_section")
        page = item.pop("_page")
        item["id"] = f"cse-pro-2026-{index:04d}"
        item["source"] = f"{SOURCE_LABEL} - {section}, page {page}"
        generated.append(item)

    OUTPUT_JSON.write_text(json.dumps(generated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    summary = {
        "source": SOURCE_LABEL,
        "sourceFile": source_pdf.name,
        "imported": len(generated),
        "skipped": len(skipped),
        "byTopic": dict(sorted(Counter(item["topic"] for item in generated).items())),
        "bySection": dict(sorted(Counter(item["source"].split(" - ", 1)[1].split(", page ", 1)[0] for item in generated).items())),
    }
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
