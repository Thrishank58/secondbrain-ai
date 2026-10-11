# 🧠 SecondBrain AI

An AI-powered personal knowledge assistant that helps users organize documents, search information semantically, and get answers from their uploaded PDFs.

## 🚀 Features

- 🔐 User registration and login
- 📄 PDF document uploads
- 💬 AI-powered question answering over documents
- 🔎 Semantic search using sentence embeddings
- 🤖 Local language model integration through Ollama
- 🗂️ Conversation history
- ⚙️ Application settings

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Motion
- Lucide React

### Backend
- Python
- FastAPI
- SQLite
- PyMuPDF
- Sentence Transformers
- NumPy
- Ollama

## 🏗️ Architecture

SecondBrain AI uses a React frontend to provide the user interface and a FastAPI backend to handle authentication, document processing, semantic retrieval, and AI responses.

SQLite stores application data locally. Sentence Transformers generates embeddings for semantic search, while Ollama provides language model inference.

## 📋 Prerequisites

Install the following before running the application:

- Node.js and npm
- Python 3.11 or a compatible version
- Ollama
- Git

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Thrishank58/secondbrain-ai.git
cd secondbrain-ai
