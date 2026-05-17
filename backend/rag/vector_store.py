import asyncio
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import faiss

from config import get_settings

settings = get_settings()

class VectorStore:
    def __init__(self):
        self._model = None
        self._index = None
        self._documents: List[Dict[str, Any]] = []
        self._storage_path = Path(settings.rag_storage_path)
        self._storage_path.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._model_loaded = False
        self._model_error = ""

    async def initialize(self):
        if self._model is None:
            try:
                # Try loading local BGE-M3 from ./bge-m3
                model_path = Path(settings.bge_model)
                if not model_path.exists():
                    self._model_error = f"Model folder not found: {settings.bge_model}"
                    print(f"[RAG] {self._model_error}")
                    return

                from FlagEmbedding import BGEM3FlagModel
                self._model = BGEM3FlagModel(
                    str(model_path.resolve()),
                    use_fp16=True,
                    device=settings.bge_device
                )
                self._model_loaded = True
                print(f"[RAG] BGE-M3 loaded from {settings.bge_model} on {settings.bge_device}")
            except Exception as e:
                self._model_error = str(e)
                print(f"[RAG] Failed to load BGE-M3: {e}")
                # Try sentence-transformers fallback
                try:
                    from sentence_transformers import SentenceTransformer
                    model_path = Path(settings.bge_model)
                    if model_path.exists():
                        self._model = SentenceTransformer(str(model_path.resolve()), device=settings.bge_device)
                        self._model_loaded = True
                        print(f"[RAG] Fallback ST loaded from {settings.bge_model}")
                except Exception as e2:
                    self._model_error += f" | ST fallback failed: {e2}"
                    print(f"[RAG] ST fallback failed: {e2}")

        # Load existing index
        index_file = self._storage_path / "index.faiss"
        docs_file = self._storage_path / "documents.json"

        if index_file.exists() and docs_file.exists():
            try:
                self._index = faiss.read_index(str(index_file))
                with open(docs_file, "r", encoding="utf-8") as f:
                    self._documents = json.load(f)
                print(f"[RAG] Loaded {len(self._documents)} documents")
            except Exception as e:
                print(f"[RAG] Error loading index: {e}")

    async def add_documents(self, texts: List[str], metadatas: Optional[List[Dict]] = None) -> Dict[str, Any]:
        async with self._lock:
            if not self._model_loaded or self._model is None:
                return {"error": "RAG model not loaded", "added": 0, "total": len(self._documents)}

            metadatas = metadatas or [{} for _ in texts]

            try:
                embeddings = self._model.encode(texts, batch_size=8, max_length=512)["dense_vecs"]
            except TypeError:
                # sentence-transformers path
                embeddings = self._model.encode(texts, batch_size=8, show_progress_bar=False)

            embeddings = np.array(embeddings).astype("float32")
            faiss.normalize_L2(embeddings)

            dim = embeddings.shape[1]
            if self._index is None:
                self._index = faiss.IndexFlatIP(dim)

            self._index.add(embeddings)

            for i, (text, meta) in enumerate(zip(texts, metadatas)):
                self._documents.append({
                    "id": len(self._documents),
                    "content": text,
                    "metadata": meta
                })

            await self._save()
            return {"added": len(texts), "total": len(self._documents)}

    async def similarity_search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        async with self._lock:
            if not self._model_loaded or self._index is None or len(self._documents) == 0:
                return []

            try:
                query_embedding = self._model.encode([query], max_length=512)["dense_vecs"]
            except TypeError:
                query_embedding = self._model.encode([query], show_progress_bar=False)

            query_embedding = np.array(query_embedding).astype("float32")
            faiss.normalize_L2(query_embedding)

            scores, indices = self._index.search(query_embedding, k)

            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx >= 0 and idx < len(self._documents):
                    doc = self._documents[idx].copy()
                    doc["score"] = float(score)
                    results.append(doc)

            return results

    async def delete_all(self):
        async with self._lock:
            self._index = None
            self._documents = []
            await self._save()

    async def _save(self):
        if self._index is not None:
            faiss.write_index(self._index, str(self._storage_path / "index.faiss"))
        with open(self._storage_path / "documents.json", "w", encoding="utf-8") as f:
            json.dump(self._documents, f, ensure_ascii=False, indent=2)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "documents_count": len(self._documents),
            "index_exists": self._index is not None,
            "model_loaded": self._model_loaded,
            "model_path": settings.bge_model,
            "model_error": self._model_error,
            "storage_path": str(self._storage_path)
        }

vector_store = VectorStore()
