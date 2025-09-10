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

        # 1. Create embedding for the query (using local Ollama)
        print(f"Creating embedding for query: '{query}'")
        query_embedding = create_embedding(query)
        if query_embedding is None:
            return JSONResponse(status_code=500, content={"error": "Failed to create query embedding."})

        # 2. Query ChromaDB
        print("Querying database...")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5
        )

        # 3. Format the context
        context = ""
        source_info = {}
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i]
                context += f"Chunk {i+1} from video '{metadata.get('video_title')}':\n{doc}\n\n"
            
            first_metadata = results['metadatas'][0][0]
            source_info = {
                "title": first_metadata.get('video_title'),
                "url": first_metadata.get('youtube_url')
            }
        
        # 4. Build the prompt
        prompt = f"""
        You are an expert teaching assistant for the Sigma Web Development course.
        A user has asked a question. Answer it based ONLY on the following relevant video transcript chunks.
        Be helpful, clear, and concise. Your answer must be in a user-friendly format.
        After the answer, do not add any extra information or text.
        If the context does not contain the answer, you MUST state that you don't have enough information from the course videos to answer.

        CONTEXT FROM VIDEO TRANSCRIPTS:
        ------------------------------
        {context}
        ------------------------------
        USER'S QUESTION: "{query}"

        YOUR ANSWER:
        """


        print("Sending prompt to Gemini API...")
        response = gemini_model.generate_content(prompt)
        answer = response.text
        

        print("Gemini response received.")
        return {
            "answer": answer.strip(),
            "source": source_info
        }

    except Exception as e:
        print(f"An error occurred in /ask endpoint: {e}")
        return JSONResponse(status_code=500, content={"error": "An internal server error occurred."})