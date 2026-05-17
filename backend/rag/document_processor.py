import asyncio
from pathlib import Path
from typing import List, Dict, Any
import aiofiles

from config import get_settings

settings = get_settings()

class DocumentProcessor:
    def __init__(self):
        self.chunk_size = settings.rag_chunk_size
        self.chunk_overlap = settings.rag_chunk_overlap

    async def process_file(self, filepath: str) -> List[str]:
        path = Path(filepath)

        if path.suffix.lower() in [".txt", ".md", ".py", ".json", ".csv"]:
            async with aiofiles.open(filepath, "r", encoding="utf-8") as f:
                content = await f.read()
        elif path.suffix.lower() in [".pdf"]:
            content = await self._extract_pdf(filepath)
        elif path.suffix.lower() in [".docx"]:
            content = await self._extract_docx(filepath)
        else:
            async with aiofiles.open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = await f.read()

        return self._chunk_text(content)

    def _chunk_text(self, text: str) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunk = text[start:end]

            # Try to break at sentence or paragraph
            if end < len(text):
                for sep in ["", "", ". ", "! ", "? "]:
                    last_sep = chunk.rfind(sep)
                    if last_sep > self.chunk_size * 0.5:
                        chunk = chunk[:last_sep + len(sep)]
                        end = start + len(chunk)
                        break

            chunks.append(chunk.strip())
            start = end - self.chunk_overlap

        return [c for c in chunks if c]

    async def _extract_pdf(self, filepath: str) -> str:
        try:
            import PyPDF2
            text = ""
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
            return text
        except:
            return "[PDF extraction failed]"

    async def _extract_docx(self, filepath: str) -> str:
        try:
            import docx
            doc = docx.Document(filepath)
            return "".join([p.text for p in doc.paragraphs])
        except:
            return "[DOCX extraction failed]"

processor = DocumentProcessor()
