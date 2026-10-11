from semantic_search import find_relevant_chunks

chunks = [
    {
        "text": "Gradient descent minimizes a model's loss by updating its parameters.",
        "filename": "machine_learning.pdf",
        "page": 5,
    },
    {
        "text": "Photosynthesis allows plants to convert sunlight into chemical energy.",
        "filename": "biology.pdf",
        "page": 2,
    },
    {
        "text": "Neural networks learn patterns by adjusting weights during training.",
        "filename": "deep_learning.pdf",
        "page": 8,
    },
]

question = "How does a model improve by reducing its prediction errors?"

results = find_relevant_chunks(question, chunks, top_k=3)

for result in results:
    print(f"Similarity: {result['similarity']:.3f}")
    print(f"Document: {result['filename']}")
    print(f"Page: {result['page']}")
    print(f"Text: {result['text']}")
    print("-" * 50)