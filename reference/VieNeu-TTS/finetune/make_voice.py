"""Pack a reference clip into a preset voice that ships with your fine-tuned model.

    uv run python finetune/make_voice.py --audio ref.wav --name "Giọng của tôi" \
        --description "Nữ · Bắc · Phong cách tự nhiên" --gender female \
        --out finetune/output/my_voice/merged

Writes (or updates) ``<out>/voices_v3_turbo.json``. The SDK loads that file from a
model folder / Hub repo on top of its built-in voices, so users of your model can call
``tts.infer(text, voice="Giọng của tôi")`` without any reference audio. Enrolment uses
the same speaker encoder + codec as voice cloning, so it runs torch-free on the CPU.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "finetune"))

from vieneu_lora.utils import safe_path   # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio", required=True, help="3–8 s clean clip of the voice")
    ap.add_argument("--name", required=True)
    ap.add_argument("--description", default="")
    ap.add_argument("--gender", default="", help="male | female")
    ap.add_argument("--out", required=True, help="merged model folder (or a path ending in .json)")
    ap.add_argument("--base", default="pnnbao-ump/VieNeu-TTS-v3-Turbo", help="repo providing codec + speaker encoder")
    ap.add_argument("--no-denoise", action="store_true")
    ap.add_argument("--default", action="store_true", help="make this the default voice of the file")
    args = ap.parse_args()

    from vieneu import Vieneu
    tts = Vieneu(mode="v3turbo", backend="onnx", precision="fp32", backbone_repo=args.base)
    spk, codes = tts.encode_reference(str(safe_path(args.audio)), denoise=not args.no_denoise)
    spk, codes = np.asarray(spk).reshape(-1), np.asarray(codes)

    path = safe_path(args.out)
    if path.suffix != ".json":
        path = path / "voices_v3_turbo.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {"presets": {}}
    data.setdefault("presets", {})[args.name] = {
        "description": args.description, "gender": args.gender,
        "speaker_emb": [round(float(x), 6) for x in spk],
        "codes": [[int(x) for x in row] for row in codes],
    }
    if args.default or not data.get("default_voice"):
        data["default_voice"] = args.name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"voice '{args.name}' ({codes.shape[0]} ref frames) written to {path}")


if __name__ == "__main__":
    main()
