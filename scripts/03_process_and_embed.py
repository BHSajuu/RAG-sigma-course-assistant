import os
import json
import requests
import chromadb
from dotenv import load_dotenv
from google.cloud import translate


load_dotenv()

# Configuration
METADATA_FILE = "data/video_metadata.json"
TRANSCRIPTS_DIR = "data/transcripts_hindi"
CHROMA_DB_DIR = "data/chroma_db"
OLLAMA_EMBED_URL = os.getenv("OLLAMA_EMBED_URL")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID") 


# Initialize the Google Translate v3 client
parent = f"projects/{GCP_PROJECT_ID}/locations/global"
translate_client = translate.TranslationServiceClient()

def translate_text_batch(texts, target_language="en"):
    """Translates a list of text strings using the v3 Translation API."""
    try:
        response = translate_client.translate_text(
            request={
                "parent": parent,
                "contents": texts,
                "mime_type": "text/plain",
                "source_language_code": "hi-IN",
                "target_language_code": target_language,
            }
        )
        return [translation.translated_text for translation in response.translations]
    except Exception as e:
        print(f"  Error during batch translation: {e}")
        return None

def create_embeddings_batch(text_list):
    """Creates embeddings for a list of text strings in a single API call."""
    try:
        print(f"  Creating embeddings for {len(text_list)} sentences...")
        response = requests.post(
            OLLAMA_EMBED_URL,
            json={"model": "bge-m3", "input": text_list}
        )
        response.raise_for_status()
        print("  Embeddings created successfully.")
        return response.json().get("embeddings")
    except requests.exceptions.RequestException as e:
        print(f"  Error creating embeddings: {e}")
        return None

def group_words_into_sentences(word_chunks):
    """Groups word chunks from the transcription API into sentence chunks."""
    sentence_chunks = []
    current_sentence = ""
    sentence_start_time = None
    
    for i, word_chunk in enumerate(word_chunks):
        word = word_chunk["text"]
        
        if sentence_start_time is None:
            sentence_start_time = word_chunk["start"]

        current_sentence += word + " "

        if word.endswith(('।', '?', '!', '.')) or (i == len(word_chunks) - 1):
            sentence_chunks.append({
                "start": sentence_start_time,
                "end": word_chunk["end"],
                "text": current_sentence.strip()
            })
            current_sentence = ""
            sentence_start_time = None
            
    return sentence_chunks

if __name__ == "__main__":
    if not os.path.exists(CHROMA_DB_DIR):
        os.makedirs(CHROMA_DB_DIR)

    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        videos = json.load(f)

    # Initialize ChromaDB client and collection
    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    collection = client.get_or_create_collection(name="sigma_web_dev_course")

    # Use the current collection count as the starting ID to avoid duplicates if script is re-run
    doc_id_counter = collection.count()
    print(f"Starting document ID from: {doc_id_counter}")

    for video in videos:
        print(f"\n----- Processing and embedding: {video['title']} -----")
        
        base_filename = video['audio_filename'].removesuffix('.mp3')
        transcript_path = os.path.join(TRANSCRIPTS_DIR, f"{base_filename}.json")
        
        if not os.path.exists(transcript_path):
            print(f"  Transcript not found, skipping.")
            continue

        with open(transcript_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        hindi_sentences_data = group_words_into_sentences(data['word_chunks_hindi'])
        
        if not hindi_sentences_data:
            print("  No sentences found in this file, skipping.")
            continue
            
        print(f"  Found {len(hindi_sentences_data)} sentences to process for this video.")

        # Batch processing on a PER-FILE basis
        
        # 1. Translate all sentences from this file
        hindi_texts = [s['text'] for s in hindi_sentences_data]
        english_texts = translate_text_batch(hindi_texts)

        if not english_texts:
            print("  Translation failed for this file, skipping.")
            continue

        # 2. Create embeddings for all translated sentences from this file
        embeddings = create_embeddings_batch(english_texts)

        if not embeddings or len(embeddings) != len(english_texts):
            print("  Embedding failed or mismatch in counts for this file, skipping.")
            continue

        # 3. Prepare metadata and IDs for this file's chunks
        metadatas = []
        ids = []
        for i, sentence_data in enumerate(hindi_sentences_data):
            start_time_seconds = int(sentence_data['start'])
            video_url_with_timestamp = f"{video['url']}&t={start_time_seconds}s"
            
            metadatas.append({
                "video_title": video['title'],
                "video_number": video['number'],
                "start_time": sentence_data['start'],
                "end_time": sentence_data['end'],
                "youtube_url": video_url_with_timestamp,
                "hindi_text": sentence_data['text']
            })
            ids.append(str(doc_id_counter))
            doc_id_counter += 1

        # 4. Load all chunks from this file into ChromaDB
        collection.add(
            embeddings=embeddings,
            documents=english_texts,
            metadatas=metadatas,
            ids=ids
        )
        print(f"  Successfully added {len(ids)} documents from this file to the database.")
        

    print(f"\n----- Embedding and Loading Complete! -----")
    print(f"Total documents in collection: {collection.count()}")