import os
import json
import requests
import chromadb
import google.generativeai as genai
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from dotenv import load_dotenv
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware  
import database
from sqlalchemy import delete



load_dotenv()
database.init_db() 

# Configuration
CHROMA_DB_DIR = "data/chroma_db"
COLLECTION_NAME = "sigma_web_dev_course"
OLLAMA_EMBED_URL = os.getenv("OLLAMA_EMBED_URL")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app = FastAPI()

origins = [FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)
oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

collection = None
gemini_model = None

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

@app.get("/api/me")
async def read_user_me(request: Request):
    """An endpoint to check the current user's session."""
    user = request.session.get('user')
    if not user:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})
    return JSONResponse(content=user)


@app.get('/login')
async def login(request: Request):
      redirect_uri = request.url_for('auth') 
      return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth')
async def auth(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')
    request.session['user'] = dict(user_info)

    # Check if user exists, if not, create them
    user = db.query(database.User).filter(database.User.email == user_info['email']).first()
    if not user:
        new_user = database.User(email=user_info['email'], name=user_info['name'], picture=user_info['picture'])
        db.add(new_user)
        db.commit()

    return RedirectResponse(url=FRONTEND_URL)

@app.get('/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url=FRONTEND_URL)

@app.get("/conversations")
async def get_conversations(request: Request, db: Session = Depends(get_db)):
    user_info = request.session.get('user')
    if not user_info:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})
    
    user = db.query(database.User).filter(database.User.email == user_info['email']).first()
    if not user:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    conversations = db.query(database.Conversation).filter(database.Conversation.user_id == user.id).order_by(database.Conversation.created_at.desc()).all()
    return [{"id": c.id, "title": c.title} for c in conversations]

@app.get("/conversations/{conversation_id}")
async def get_conversation_messages(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    user_info = request.session.get('user')
    if not user_info:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})
    
    messages = db.query(database.Message).filter(database.Message.conversation_id == conversation_id).order_by(database.Message.id).all()
    return [{"role": m.role, "content": m.content, "sources": json.loads(m.sources) if m.sources else []} for m in messages]


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    user_info = request.session.get('user')
    if not user_info:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    user = db.query(database.User).filter(database.User.email == user_info['email']).first()
    if not user:
        return JSONResponse(status_code=404, content={"error": "User not found"})

    conversation = db.query(database.Conversation).filter(database.Conversation.id == conversation_id, database.Conversation.user_id == user.id).first()
    if not conversation:
        return JSONResponse(status_code=404, content={"error": "Conversation not found or access denied"})

    db.query(database.Message).filter(database.Message.conversation_id == conversation_id).delete()
    db.delete(conversation)
    db.commit()

    return JSONResponse(status_code=200, content={"message": "Conversation deleted successfully"})


@app.delete("/conversations")
async def delete_all_conversations(request: Request, db: Session = Depends(get_db)):
    user_info = request.session.get('user')
    if not user_info:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    user = db.query(database.User).filter(database.User.email == user_info['email']).first()
    if not user:
        return JSONResponse(status_code=404, content={"error": "User not found"})

    conversation_ids = [c.id for c in db.query(database.Conversation).filter(database.Conversation.user_id == user.id).all()]

    if conversation_ids:
        db.query(database.Message).filter(database.Message.conversation_id.in_(conversation_ids)).delete(synchronize_session=False)
        db.query(database.Conversation).filter(database.Conversation.user_id == user.id).delete(synchronize_session=False)
        db.commit()

    return JSONResponse(status_code=200, content={"message": "All conversations deleted successfully"})


@app.post("/ask")
async def ask_question(request: Request, db: Session = Depends(get_db)):
    
    user_info = request.session.get('user')
    if not user_info:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})


    if collection is None or gemini_model is None:
        return JSONResponse(status_code=503, content={"error": "Server is not ready. Please check logs."})

    try:
        data = await request.json()
        query = data.get("query")
        if not query:
            return JSONResponse(status_code=400, content={"error": "Query not provided"})
        
        conversation_id = data.get("conversation_id")

        user = db.query(database.User).filter(database.User.email == user_info['email']).first()

        # Save user message
        if not conversation_id:
            # Create a new conversation
            title = query[:50] + "..." if len(query) > 50 else query
            new_convo = database.Conversation(user_id=user.id, title=title)
            db.add(new_convo)
            db.commit()
            db.refresh(new_convo)
            conversation_id = new_convo.id
    
        user_message = database.Message(conversation_id=conversation_id, role="user", content=query)
        db.add(user_message)
        db.commit()

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

                if len(unique_sources) < 3:
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
        
        bot_message = database.Message(conversation_id=conversation_id, role="bot", content=answer, sources=json.dumps(sources_list))
        db.add(bot_message)
        db.commit()

        print("Gemini response received.")
        return {
            "answer": answer.strip(),
            "sources": sources_list,
            "conversation_id": conversation_id
        } 

    except Exception as e:
        print(f"An error occurred in /ask endpoint: {e}")
        return JSONResponse(status_code=500, content={"error": "An internal server error occurred."})