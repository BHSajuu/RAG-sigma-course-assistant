# RAG Sigma Course Assistant


A sophisticated, Retrieval-Augmented Generation (RAG) based course assistant designed to provide intelligent, context-aware answers to questions about the **Sigma Web Development** course by CodeWithHarry. This project leverages the power of Large Language Models (LLMs) to help students quickly find information within the course's extensive video library.

## 🌟 Overview

Navigating through hours of video content to find specific topics can be a daunting task for any student. The RAG Sigma Course Assistant is a smart solution that acts as a personal teaching assistant. It allows users to ask questions in natural language and receive precise answers, complete with timestamps and links to the exact moments in the course videos where the topic is discussed.

This project is a full-stack application featuring a modern, reactive frontend and a robust Python backend that orchestrates the entire RAG pipeline.

***

## ✨ Features

* **🧠 Intelligent Q&A:** Ask complex questions and get accurate, contextually relevant answers.
* **📚 Retrieval-Augmented Generation (RAG):** Utilizes a state-of-the-art RAG pipeline to retrieve information from course video transcripts before generating an answer.
* **💬 Interactive Chat Interface:** A clean and intuitive chat UI built with Next.js and Tailwind CSS for a seamless user experience.
* **🔐 Secure User Authentication:** Google OAuth for secure and easy user login.
* **📖 Conversation History:** Saves your chat history, allowing you to revisit previous questions and answers.
* **📝 Sourced Answers:** Every answer is backed by sources, pointing to the specific video and timestamp, so you can jump right to the relevant content.

***

## 🛠️ Tech Stack

This project is built with a modern and powerful tech stack:

| Component         | Technology                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Frontend** | [**Next.js**](https://nextjs.org/), [**React**](https://reactjs.org/), [**Tailwind CSS**](https://tailwindcss.com/) |
| **Backend** | [**FastAPI**](https://fastapi.tiangolo.com/), [**Python**](https://www.python.org/)                           |
| **LLM** | [**Google Gemini**](https://deepmind.google/technologies/gemini/) (gemini-1.5-flash)                          |
| **Vector Database** | [**ChromaDB**](https://www.trychroma.com/)                                                                 |
| **Embeddings** | [**Ollama**](https://ollama.ai/) with `bge-m3`                                                              |
| **Database** | **SQLAlchemy** (for user and conversation data)                                                             |
| **Authentication**| **Google OAuth** |

***


## 🙏 Acknowledgements

* A huge thank you to **CodeWithHarry** for creating the comprehensive and high-quality **Sigma Web Development** course.
* The creators of the open-source tools that made this project possible.
