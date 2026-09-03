import sys
import json
import os

def print_utf8(data_dict):
    sys.stdout.buffer.write(json.dumps(data_dict, ensure_ascii=False).encode('utf-8'))
    sys.stdout.buffer.write(b'\n')
    sys.stdout.flush()

try:
    from faster_whisper import WhisperModel
except ImportError:
    print_utf8({"error": "faster-whisper is not installed. Please run 'pip install faster-whisper' to enable local offline transcription."})
    sys.exit(1)

def transcribe(audio_path):
    if not os.path.exists(audio_path):
        print_utf8({"error": f"Audio file not found at: {audio_path}"})
        sys.exit(1)

    model_size = os.getenv("LOCAL_WHISPER_MODEL", "tiny")

    try:
        model = WhisperModel(model_size, device="cpu", compute_type="float32")

        # word_timestamps=True enables per-word start/end times for karaoke highlighting
        # language="vi" forces Vietnamese recognition to prevent hallucination to other languages
        segments, info = model.transcribe(audio_path, beam_size=5, word_timestamps=True, language="vi")

        result_segments = []
        all_words = []  # flat list for karaoke subtitle generator

        for segment in segments:
            seg_words = []
            if segment.words:
                for w in segment.words:
                    word_obj = {
                        "word":  w.word.strip(),
                        "start": round(w.start, 2),
                        "end":   round(w.end,   2)
                    }
                    seg_words.append(word_obj)
                    all_words.append(word_obj)

            result_segments.append({
                "text":  segment.text.strip(),
                "start": round(segment.start, 2),
                "end":   round(segment.end,   2),
                "words": seg_words
            })

        print_utf8({
            "status":   "success",
            "language": info.language,
            "duration": round(info.duration, 2),
            "segments": result_segments,
            "words":    all_words   # consumed by subtitleGenerator for karaoke
        })

    except Exception as e:
        print_utf8({"error": str(e)})
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_utf8({"error": "No audio path provided."})
        sys.exit(1)

    transcribe(sys.argv[1])
