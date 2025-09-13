import os
import json
import requests
import chromadb
from dotenv import load_dotenv
from google.cloud import translate

load_dotenv()

# --- Configuration (remains the same) ---
METADATA_FILE = "data/video_metadata.json"
TRANSCRIPTS_DIR = "data/transcripts_hindi"
CHROMA_DB_DIR = "data/chroma_db"
OLLAMA_EMBED_URL = os.getenv("OLLAMA_EMBED_URL")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

parent = f"projects/{GCP_PROJECT_ID}/locations/global"
translate_client = translate.TranslationServiceClient()


def translate_text_batch(texts, target_language="en"):
    try:
        response = translate_client.translate_text(
            request={
                "parent": parent, "contents": texts, "mime_type": "text/plain",
                "source_language_code": "hi-IN", "target_language_code": target_language,
            }
        )
        return [translation.translated_text for translation in response.translations]
    except Exception as e:
        print(f"  Error during batch translation: {e}")
        return None

def create_embeddings_batch(text_list):
    try:
        print(f"  Creating embeddings for {len(text_list)} chunks...")
        response = requests.post(
            OLLAMA_EMBED_URL, json={"model": "bge-m3", "input": text_list}
        )
        response.raise_for_status()
        print("  Embeddings created successfully.")
        return response.json().get("embeddings")
    except requests.exceptions.RequestException as e:
        print(f"  Error creating embeddings: {e}")
        return None

def create_time_based_chunks(word_chunks, max_duration_seconds=45):
    """
    Groups word chunks into larger chunks based on a maximum time duration.
    """
    if not word_chunks:
        return []

    chunks = []
    current_chunk_text = ""
    current_chunk_start = word_chunks[0]['start']
    
    for word in word_chunks:
        current_duration = word['end'] - current_chunk_start
        
        # If adding the next word exceeds the max duration, finalize the current chunk
        if current_duration > max_duration_seconds and current_chunk_text:
            chunks.append({
                "start": current_chunk_start,
                "end": word_chunks[len(chunks)]['end'], # Use the previous word's end time
                "text": current_chunk_text.strip()
            })
            # Start a new chunk
            current_chunk_text = ""
            current_chunk_start = word['start']
        
        current_chunk_text += word['text'] + " "

    # Add the last remaining chunk
    if current_chunk_text:
        chunks.append({
            "start": current_chunk_start,
            "end": word_chunks[-1]['end'],
            "text": current_chunk_text.strip()
        })
        
    return chunks



if __name__ == "__main__":
    if not os.path.exists(CHROMA_DB_DIR):
        os.makedirs(CHROMA_DB_DIR)

    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        videos = json.load(f)

    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    collection = client.get_or_create_collection(
        name="sigma_web_dev_course",
        metadata={"hnsw:space": "cosine"}
    )

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


        hindi_chunks_data = create_time_based_chunks(data['word_chunks_hindi'])
        
        if not hindi_chunks_data:
            print("  No chunks found in this file, skipping.")
            continue
            
        print(f"  Found {len(hindi_chunks_data)} semantic chunks to process for this video.")

        # (The rest of the script remains the same)
        hindi_texts = [s['text'] for s in hindi_chunks_data]
        english_texts = translate_text_batch(hindi_texts)

        if not english_texts:
            print("  Translation failed for this file, skipping.")
            continue

        embeddings = create_embeddings_batch(english_texts)

        if not embeddings or len(embeddings) != len(english_texts):
            print("  Embedding failed or mismatch in counts for this file, skipping.")
            continue

        metadatas = []
        ids = []
        for i, chunk_data in enumerate(hindi_chunks_data):
            start_time_seconds = int(chunk_data['start'])
            video_url_with_timestamp = f"{video['url']}&t={start_time_seconds}s"
            
            metadatas.append({
                "video_title": video['title'],
                "video_number": video['number'],
                "start_time": chunk_data['start'],
                "end_time": chunk_data['end'],
                "youtube_url": video_url_with_timestamp,
                "hindi_text": chunk_data['text']
            })
            ids.append(str(doc_id_counter))
            doc_id_counter += 1

        collection.add(
            embeddings=embeddings, documents=english_texts, metadatas=metadatas, ids=ids
        )
        print(f"  Successfully added {len(ids)} documents from this file to the database.")

    print(f"\n----- Embedding and Loading Complete! -----")
    print(f"Total documents in collection: {collection.count()}")