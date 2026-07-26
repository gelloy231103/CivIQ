"""Inventory reviewer sources and extract text into a reviewable workspace.

Usage:
    python scripts/import_reviewer_sources.py reviewers/new

The script does not mark questions as verified. It creates extracted text files
and an inventory JSON so question-generation scripts can work from normalized
source text without exposing raw reviewer paths in the app UI.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from xml.etree import ElementTree


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
DEFAULT_OUTPUT_DIR = Path("tmp/reviewer-import")
PYPDF_EXTRACT_SCRIPT = r"""
import sys
from pypdf import PdfReader

reader = PdfReader(sys.argv[1])
print("\n\n".join(page.extract_text() or "" for page in reader.pages))
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract reviewer source text for CivIQ imports.")
    parser.add_argument("source", nargs="?", default="reviewers/new", help="Reviewer folder to scan.")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT_DIR), help="Output directory for extracted text and inventory.")
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Relative path, folder name, or glob to skip. Can be passed multiple times.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Optional max number of files to scan for smoke tests.")
    parser.add_argument("--file-timeout", type=int, default=20, help="Max seconds for command-line PDF extraction per file.")
    args = parser.parse_args()

    source_dir = Path(args.source).resolve()
    output_dir = Path(args.out).resolve()

    if not source_dir.exists():
        print(f"Source folder not found: {source_dir}", file=sys.stderr)
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    text_dir = output_dir / "text"
    text_dir.mkdir(parents=True, exist_ok=True)

    inventory = {
        "sourceRoot": str(source_dir),
        "excluded": args.exclude,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "files": [],
    }

    files = [
        path
        for path in sorted(source_dir.rglob("*"))
        if path.is_file() and not is_excluded(path.relative_to(source_dir), args.exclude)
    ]
    if args.limit > 0:
        files = files[:args.limit]

    for index, path in enumerate(files, start=1):
        if not path.is_file():
            continue

        extension = path.suffix.lower()
        record = {
            "id": f"source-{index:04d}",
            "name": path.name,
            "relativePath": str(path.relative_to(source_dir)),
            "extension": extension,
            "supported": extension in SUPPORTED_EXTENSIONS,
            "textFile": None,
            "status": "skipped",
            "notes": [],
        }

        if extension in SUPPORTED_EXTENSIONS:
            text_path = text_dir / f"{record['id']}{extension}.txt"
            if text_path.exists() and text_path.stat().st_size > 0:
                record["notes"] = ["reused existing extraction"]
                record["textFile"] = str(text_path.relative_to(output_dir))
                record["status"] = "extracted"
            else:
                text, notes = extract_text(path, extension, args.file_timeout)
                record["notes"] = notes
                if text.strip():
                    text_path.write_text(normalize_text(text), encoding="utf-8")
                    record["textFile"] = str(text_path.relative_to(output_dir))
                    record["status"] = "extracted"
                else:
                    record["status"] = "empty"
        inventory["files"].append(record)
        write_inventory(output_dir, inventory)
        if index % 25 == 0:
            print(f"Scanned {index} files...")

    write_inventory(output_dir, inventory)
    print(f"Wrote {output_dir / 'inventory.json'}")
    print(f"Extracted {sum(1 for item in inventory['files'] if item['status'] == 'extracted')} supported files.")
    return 0


def extract_text(path: Path, extension: str, file_timeout: int) -> tuple[str, list[str]]:
    if extension in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="replace"), []
    if extension == ".docx":
        return extract_docx_text(path)
    if extension == ".pdf":
        return extract_pdf_text(path, file_timeout)
    return "", ["unsupported extension"]


def is_excluded(relative_path: Path, patterns: list[str]) -> bool:
    if not patterns:
        return False

    relative = relative_path.as_posix()
    parts = set(relative_path.parts)
    for pattern in patterns:
        clean_pattern = pattern.strip().replace("\\", "/").strip("/")
        if not clean_pattern:
            continue
        if clean_pattern in parts:
            return True
        if relative == clean_pattern or relative.startswith(f"{clean_pattern}/"):
            return True
        if fnmatch.fnmatch(relative, clean_pattern):
            return True
    return False


def write_inventory(output_dir: Path, inventory: dict[str, object]) -> None:
    (output_dir / "inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")


def extract_pdf_text(path: Path, file_timeout: int) -> tuple[str, list[str]]:
    notes: list[str] = []
    pdftotext = shutil.which("pdftotext")
    if pdftotext:
        try:
            result = subprocess.run(
                [pdftotext, "-layout", str(path), "-"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
                timeout=file_timeout,
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout, ["extracted with pdftotext"]
            notes.append("pdftotext returned no text")
        except subprocess.TimeoutExpired:
            notes.append(f"pdftotext timed out after {file_timeout}s")

    try:
        result = subprocess.run(
            [sys.executable, "-c", PYPDF_EXTRACT_SCRIPT, str(path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=file_timeout,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout, notes + ["extracted with pypdf"]
        notes.append("pypdf returned no text")
    except subprocess.TimeoutExpired:
        notes.append(f"pypdf timed out after {file_timeout}s")
    except Exception as error:  # pragma: no cover - optional dependency path
        notes.append(f"pypdf failed: {error}")

    return "", notes or ["no pdf extractor available"]


def extract_docx_text(path: Path) -> tuple[str, list[str]]:
    try:
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml")
        root = ElementTree.fromstring(xml)
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs: list[str] = []
        for paragraph in root.findall(".//w:p", namespace):
            parts = [node.text or "" for node in paragraph.findall(".//w:t", namespace)]
            text = "".join(parts).strip()
            if text:
                paragraphs.append(text)
        return "\n".join(paragraphs), ["extracted with docx xml"]
    except Exception as error:
        return "", [f"docx extraction failed: {error}"]


def normalize_text(text: str) -> str:
    cleaned = unescape(text).replace("\r\n", "\n").replace("\r", "\n")
    cleaned = cleaned.encode("utf-8", errors="replace").decode("utf-8")
    lines = [line.rstrip() for line in cleaned.split("\n")]
    return "\n".join(lines).strip() + "\n"


if __name__ == "__main__":
    raise SystemExit(main())
