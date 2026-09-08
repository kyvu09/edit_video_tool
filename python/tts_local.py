#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Local TTS Runner for edit_video_tool
Supports:
  1. VieNeu-TTS (Vietnamese v3 Turbo 48kHz, preset voices + instant voice cloning via --ref_audio)
  2. Kokoro-TTS (English / Multilingual ONNX)
  3. Dummy audio (fallback test mode)

Outputs JSON to stdout:
  {"success": true, "engine": "vieneu", "voice": "Minh Quân", "output": "...", "duration": 3.4}
  or
  {"success": false, "error": "..."}
"""

import sys
import os
import argparse
import json
import math
import struct
import wave
import time

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"


def generate_vieneu(text: str, output_path: str, voice: str = "Minh Quân", ref_audio: str = None, speed: float = 1.0) -> tuple[float, str]:
    """Synthesize speech using VieNeu-TTS v3 Turbo (Native Vietnamese, 48kHz, with voice cloning)."""
    from vieneu import Vieneu

    v = Vieneu()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    if ref_audio and os.path.exists(ref_audio):
        audio = v.infer(text, ref_audio=ref_audio, denoise=True)
        chosen_voice = f"Clone ({os.path.basename(ref_audio)})"
    else:
        if not voice or voice in ("default", "auto"):
            voice = "Minh Quân"
        audio = v.infer(text, voice=voice)
        chosen_voice = voice

    v.save(audio, output_path)
    sample_rate = 48000
    duration = round(len(audio) / float(sample_rate), 2)
    return duration, chosen_voice


def get_kokoro_model_paths():
    """Returns absolute paths to Kokoro ONNX model and voices bin."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "models", "kokoro")
    model_path = os.path.join(models_dir, "kokoro-v1.0.onnx")
    voices_path = os.path.join(models_dir, "voices-v1.0.bin")
    return model_path, voices_path


def generate_kokoro(text: str, output_path: str, voice: str = "af_heart", speed: float = 1.0) -> tuple[float, str]:
    """Synthesize speech using Kokoro ONNX engine."""
    import kokoro_onnx
    import soundfile as sf

    model_path, voices_path = get_kokoro_model_paths()
    if not os.path.exists(model_path) or not os.path.exists(voices_path):
        raise FileNotFoundError(f"Kokoro model files not found in {os.path.dirname(model_path)}")

    kokoro = kokoro_onnx.Kokoro(model_path, voices_path)
    available_voices = kokoro.get_voices()

    if not voice or voice in ("default", "auto"):
        voice = "af_heart"
    elif voice not in available_voices:
        if "male" in voice.lower():
            voice = "am_adam" if "am_adam" in available_voices else available_voices[0]
        else:
            voice = "af_heart" if "af_heart" in available_voices else available_voices[0]

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    samples, sample_rate = kokoro.create(
        text=text,
        voice=voice,
        speed=float(speed),
        lang="en-us"
    )

    sf.write(output_path, samples, sample_rate)
    duration = round(len(samples) / float(sample_rate), 2)
    return duration, voice


def generate_dummy_wav(text: str, output_path: str, speed: float = 1.0) -> float:
    """Generates a clean synthetic dummy WAV to test pipeline fallback."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    sample_rate = 24000
    chars = len(text.strip())
    duration = max(1.0, (chars / 15.0) / max(0.1, speed))
    total_samples = int(sample_rate * duration)
    freq = 440.0

    with wave.open(output_path, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for i in range(total_samples):
            t = float(i) / sample_rate
            envelope = min(1.0, i / 2400.0) * min(1.0, (total_samples - i) / 2400.0)
            sample = int(12000 * envelope * math.sin(2.0 * math.pi * freq * t))
            frames.extend(struct.pack("<h", sample))

        wav_file.writeframes(frames)

    return round(duration, 2)


def main():
    parser = argparse.ArgumentParser(description="Local TTS Runner for edit_video_tool")
    parser.add_argument("--text", type=str, required=True, help="Text to synthesize")
    parser.add_argument("--output", type=str, required=True, help="Path to output WAV file")
    parser.add_argument("--voice", type=str, default="Minh Quân", help="Voice profile/name")
    parser.add_argument("--ref_audio", type=str, default=None, help="Path to reference audio (3-8s) for voice cloning")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier")
    parser.add_argument("--engine", type=str, default="auto", help="TTS Engine: auto, vieneu, kokoro, dummy")

    args = parser.parse_args()

    try:
        text = args.text.strip()
        if not text:
            raise ValueError("Input text cannot be empty.")

        output_path = os.path.abspath(args.output)
        engine = args.engine.lower()

        # By default (auto) or explicit vieneu: use VieNeu-TTS
        if engine in ("auto", "vieneu"):
            try:
                duration, chosen_voice = generate_vieneu(
                    text=text,
                    output_path=output_path,
                    voice=args.voice,
                    ref_audio=args.ref_audio,
                    speed=args.speed
                )
                result = {
                    "success": True,
                    "engine": "vieneu",
                    "voice": chosen_voice,
                    "output": output_path,
                    "duration": duration
                }
                print(json.dumps(result, ensure_ascii=False))
                sys.exit(0)
            except Exception as vieneu_err:
                if engine == "vieneu":
                    raise vieneu_err
                # Try kokoro as secondary fallback
                try:
                    duration, chosen_voice = generate_kokoro(
                        text=text,
                        output_path=output_path,
                        voice="af_heart",
                        speed=args.speed
                    )
                    result = {
                        "success": True,
                        "engine": "kokoro_fallback",
                        "voice": chosen_voice,
                        "warning": f"VieNeu failed: {vieneu_err}",
                        "output": output_path,
                        "duration": duration
                    }
                    print(json.dumps(result, ensure_ascii=False))
                    sys.exit(0)
                except Exception:
                    # Final fallback to dummy
                    duration = generate_dummy_wav(text, output_path, speed=args.speed)
                    result = {
                        "success": True,
                        "engine": "dummy_fallback",
                        "warning": f"VieNeu failed: {vieneu_err}",
                        "output": output_path,
                        "duration": duration
                    }
                    print(json.dumps(result, ensure_ascii=False))
                    sys.exit(0)

        elif engine == "kokoro":
            duration, chosen_voice = generate_kokoro(
                text=text,
                output_path=output_path,
                voice=args.voice,
                speed=args.speed
            )
            result = {
                "success": True,
                "engine": "kokoro",
                "voice": chosen_voice,
                "output": output_path,
                "duration": duration
            }
            print(json.dumps(result, ensure_ascii=False))
            sys.exit(0)

        elif engine == "dummy":
            duration = generate_dummy_wav(text, output_path, speed=args.speed)
            result = {
                "success": True,
                "engine": "dummy",
                "output": output_path,
                "duration": duration
            }
            print(json.dumps(result, ensure_ascii=False))
            sys.exit(0)
        else:
            raise NotImplementedError(f"Engine '{engine}' is not supported.")

    except Exception as e:
        err_res = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(err_res, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
