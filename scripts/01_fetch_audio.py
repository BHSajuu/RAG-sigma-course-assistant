import json
import os
from yt_dlp import YoutubeDL


# Configuration
YOUTUBE_PLAYLIST_URL = "https://youtube.com/playlist?list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w&si=xrYddIJeNTeS007V"
AUDIO_DIR = "data/audio"
METADATA_FILE = "data/video_metadata.json"


def fetch_playlist_metadata_and_audio(playlist_url):
    """
    Downloads audio and metadata for all videos in a YouTube playlist.
    """
    if not os.path.exists(AUDIO_DIR):
        os.makedirs(AUDIO_DIR)

    # Options to get playlist metadata without downloading videos yet
    ydl_opts_meta = {
        'extract_flat': 'in_playlist',
        'skip_download': True,
        'quiet': True,
    }

    video_metadata = []
    
    print(f"Fetching metadata for playlist: {playlist_url}")
    with YoutubeDL(ydl_opts_meta) as ydl:
        playlist_dict = ydl.extract_info(playlist_url, download=False)
        
        for i, video in enumerate(playlist_dict['entries']):
            video_id = video.get('id')
            title = video.get('title').split('|')[0].strip()
            
            if not video_id or not title:
                print(f"Skipping a video due to missing ID or title.")
                continue


            url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Sanitize the title to create a safe filename
            safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
            filename = f"{i+1:03d}_{safe_title}.mp3" 
            filepath = os.path.join(AUDIO_DIR, filename)

            video_info = {
                "number": i + 1,
                "video_id": video_id,
                "title": title, 
                "url": url,
                "audio_filename": filename,
                "audio_filepath": filepath
            }
            video_metadata.append(video_info)

            # Now download the audio for this specific video if it doesn't exist
            if not os.path.exists(filepath):
                print(f"Downloading audio for: {title}")
                audio_ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': filepath,
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                    'quiet': True,
                }
                try:
                    with YoutubeDL(audio_ydl_opts) as audio_ydl:
                        audio_ydl.download([url])
                except Exception as e:
                    print(f"Could not download {title}. Error: {e}")
            else:
                print(f"Audio for '{title}' already exists. Skipping download.")

    print("\nDownload process complete.")
    return video_metadata


if __name__ == "__main__":
      metadata = fetch_playlist_metadata_and_audio(YOUTUBE_PLAYLIST_URL)
      with open(METADATA_FILE, "w", encoding='utf-8') as f:
            json.dump(metadata, f , ensure_ascii=False, indent=4)
      print(f"Metadata for {len(metadata)} videos saved to {METADATA_FILE}") 