from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model():
    """Load the embedding model once and reuse it."""
    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> np.ndarray:
    """Convert text into normalized semantic vectors."""
    model = get_embedding_model()

    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return embeddings


def find_relevant_chunks(
    question: str,
    chunks: list[dict],
    top_k: int = 5,
) -> list[dict]:
    """
    Rank text chunks by semantic similarity to a question.

    Each chunk must contain:
        - text: the passage content
        - filename: its source document
        - page: its page number
    """
    if not question.strip() or not chunks:
        return []

    valid_chunks = [
        chunk
        for chunk in chunks
        if isinstance(chunk.get("text"), str)
        and chunk["text"].strip()
    ]

    if not valid_chunks:
        return []

    vectors = embed_texts(
        [question]
        + [chunk["text"] for chunk in valid_chunks]
    )

    question_vector = vectors[0]
    chunk_vectors = vectors[1:]

    # Normalized vectors allow cosine similarity through dot products.
    scores = chunk_vectors @ question_vector

    ranked_indices = np.argsort(scores)[::-1][:max(1, top_k)]

    results = []

    for index in ranked_indices:
        result = dict(valid_chunks[int(index)])
        result["similarity"] = float(scores[int(index)])
        results.append(result)

    return results