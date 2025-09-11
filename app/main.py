import os
import requests
import chromadb
import google.generativeai as genai
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv


load_dotenv()

# Configuration
CHROMA_DB_DIR = "data/chroma_db"
COLLECTION_NAME = "sigma_web_dev_course"
OLLAMA_EMBED_URL = os.getenv("OLLAMA_EMBED_URL")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")



app = FastAPI()


app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


collection = None
gemini_model = None

@app.on_event("startup")
def startup_event():
    """
    Load ChromaDB and configure the Gemini client on startup.
    """
    global collection, gemini_model
    
    # 1. Load ChromaDB collection
    print("Loading ChromaDB collection...")
    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        collection = client.get_collection(name=COLLECTION_NAME)
        print("Collection loaded successfully.")
    except Exception as e:
        print(f"Error loading ChromaDB collection: {e}")

    # 2. Configure the Gemini client
    print("Configuring Gemini client...")
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash') 
        print("Gemini client configured successfully.")
    except Exception as e:
        print(f"Error configuring Gemini client: {e}")


def create_embedding(text):
    """Creates an embedding using the local Ollama model."""
    try:
        response = requests.post(
            OLLAMA_EMBED_URL,
            json={"model": "bge-m3", "input": [text]}
        )
        response.raise_for_status()
        return response.json()["embeddings"][0]
    except requests.exceptions.RequestException as e:
        print(f"Error calling embedding API: {e}")
        return None

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/ask")
async def ask_question(request: Request):
    if collection is None or gemini_model is None:
        return JSONResponse(status_code=503, content={"error": "Server is not ready. Please check logs."})

    try:
        data = await request.json()
        query = data.get("query")
        if not query:
            return JSONResponse(status_code=400, content={"error": "Query not provided"})

        print(f"Creating embedding for query: '{query}'")
        query_embedding = create_embedding(query)
        if query_embedding is None:
            return JSONResponse(status_code=500, content={"error": "Failed to create query embedding."})

        
        print("Querying database for 7 chunks...")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=7  
        )

        unique_sources = {}
        context_for_prompt = "" 
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i]
                start_seconds = int(metadata.get('start_time', 0))
                minutes = start_seconds // 60
                seconds = start_seconds % 60
                timestamp = f"{minutes:02d}:{seconds:02d}"
                video_url_with_timestamp = metadata.get('youtube_url')

                context_for_prompt += f"""---
                Video Title: {metadata.get('video_title')}
                Video Number: {metadata.get('video_number')}
                Timestamp: {timestamp} ({start_seconds}s)
                Content: {doc}
                ---\n"""

                if video_url_with_timestamp not in unique_sources:
                    unique_sources[video_url_with_timestamp] = {
                        "title": metadata.get('video_title'),
                        "url": video_url_with_timestamp
                 }
        
        # Convert the dictionary of sources to a list
        sources_list = list(unique_sources.values())

        prompt = f"""
        You are an expert teaching assistant for the "Sigma Web Development" course.
        Your primary goal is to help users find where specific topics are taught by analyzing the provided video transcript chunks.

        Here are the relevant transcript chunks retrieved for the user's question:
        {context_for_prompt}

        Here is the user's question: "{query}"

        Please follow these instructions precisely to formulate your answer:
        1.  Carefully analyze all the provided chunks to identify the most relevant one(s).
        2.  Your main task is to answer in a helpful, human-friendly way, explaining where the topic is taught.
        3.  Explicitly mention the video title and the start time (e.g., "at around 5 minutes and 30 seconds").
        4.  Provide a brief, one or two-sentence summary of what is discussed in that segment.
        5.  If the context suggests the topic is only briefly mentioned, state that and guide the user appropriately (e.g., "it is only a brief introduction").
        6.  If the provided context does not contain enough information to answer the question, you MUST respond with: "I'm sorry, but I don't have enough information from the course videos to answer that question." Do not make up information.
        """

        print("Sending refined prompt to Gemini API...")
        response = gemini_model.generate_content(prompt)
        answer = response.text
        
        print("Gemini response received.")
        return {
            "answer": answer.strip(),
            "source": sources_list
        } 

    except Exception as e:
        print(f"An error occurred in /ask endpoint: {e}")
        return JSONResponse(status_code=500, content={"error": "An internal server error occurred."})
 