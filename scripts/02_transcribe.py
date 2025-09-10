import os 
import json 
from google.cloud import speech, storage
from dotenv import load_dotenv



load_dotenv()

# Configuration
METADATA_FILE = "data/video_metadata.json"
TRANSCRIPTS_DIR = "data/transcripts_hindi"
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
LANGUAGE_CODE = "hi-IN"


def upload_to_gcs(bucket_name, source_file_path, destination_blob_name):
    """Uploads a file to the bucket."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)
        
        print(f"Uploading {source_file_path} to gs://{bucket_name}/{destination_blob_name}...")
        blob.upload_from_filename(source_file_path)
        print("Upload complete.")
    except Exception as e:
        print(f"Error during GCS Upload: {e}")
        raise


def transcribe_gcs_audio(gcs_uri):
    """
    Initiates a long-running transcription job for a file in GCS.
    Returns the full API response object.
    """
    client = speech.SpeechClient()
    audio = speech.RecognitionAudio(uri=gcs_uri)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.MP3,
        sample_rate_hertz=16000,
        language_code=LANGUAGE_CODE,
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True, 
    )
    
    print(f"Submitting transcription job for {gcs_uri}...")
    operation = client.long_running_recognize(config=config, audio=audio)
    
    print(f"Waiting for transcription of {gcs_uri} to complete...")
    # Increased timeout to 30 minutes for potentially very long videos
    response = operation.result(timeout=2400)
    print("Transcription job finished.")
    return response

if __name__ == "__main__":
    if not os.path.exists(TRANSCRIPTS_DIR):
        os.makedirs(TRANSCRIPTS_DIR)

    # Load the list of videos to process
    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        videos = json.load(f)

    for video in videos:
        print(f"\n----- Processing: {video['title']} -----")
        local_path = video['audio_filepath']
        filename = video['audio_filename']
        transcript_path = os.path.join(TRANSCRIPTS_DIR, f"{filename.removesuffix('.mp3')}.json")

        # Skip if the transcript already exists
        if os.path.exists(transcript_path):
            print("Transcript already exists, skipping.")
            continue
        
        # Ensure the audio file exists before proceeding
        if not os.path.exists(local_path):
            print(f"Audio file not found at {local_path}, skipping.")
            continue

        try:
            # 1. Upload the local audio file to Google Cloud Storage
            upload_to_gcs(GCS_BUCKET_NAME, local_path, filename)
            
            # 2. Get the GCS URI and start the transcription job
            gcs_uri = f"gs://{GCS_BUCKET_NAME}/{filename}"
            response = transcribe_gcs_audio(gcs_uri)

            # 3. Extract the necessary data from the response
            word_chunks = []
            full_transcript = ""
            for result in response.results:
                alternative = result.alternatives[0]
                full_transcript += alternative.transcript + " "
                for word_info in alternative.words:
                    word_chunks.append({
                        "start": word_info.start_time.total_seconds(),
                        "end": word_info.end_time.total_seconds(),
                        "text": word_info.word,
                    })
            
            output_data = {
                "full_transcript_hindi": full_transcript.strip(),
                "word_chunks_hindi": word_chunks
            }

            # 4. Save the processed data to a JSON file
            with open(transcript_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=4)
            print(f"Successfully saved Hindi transcript to {transcript_path}")

        except Exception as e:
            print(f"An error occurred while processing {filename}: {e}")
        
       