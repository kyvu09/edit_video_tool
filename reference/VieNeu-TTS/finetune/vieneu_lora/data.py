"""Training rows -> 2-D token sequences for VieNeu-TTS v3 Turbo.

A training row is a dict with

    phones            : str            phonemes of the utterance (sea-g2p, as the SDK produces)
    codes             : list[list[int]] (T, n_vq) MOSS codec codes of the utterance
    speaker           : str            speaker name (rows of one speaker lend each other a reference)
    speaker_embedding : list[float]    192-d x-vector of the utterance

``prepare_dataset.py`` writes exactly this layout (parquet).

The model reads one row of ``n_vq + 1`` ids per position: column 0 is the text/slot
token, columns 1..n_vq the audio codes (``audio_pad_token_id`` where there is no audio).
A training sequence is

    [style][TPS] phones... [TPE]          text rows      (audio columns = pad)
    [REF ] codes of a reference clip      optional       (same speaker, other utterance)
    [SGS ] codes of the target, frame 0..T-1
    [EOS ]                                 (audio columns = pad)

which is the very prompt the SDK builds at inference time (``build_prompt_2d``) followed by
the frames the model has to produce.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
import torch
from torch.utils.data import Dataset

from vieneu._v3_turbo_engine.prompt_v3_turbo import build_prompt_2d


def load_rows(path: str | Path) -> List[Dict[str, Any]]:
    """Read ``train.parquet`` / ``.jsonl`` into a list of row dicts."""
    path = Path(path)
    if path.suffix == ".parquet":
        import pyarrow.parquet as pq
        return pq.read_table(str(path)).to_pylist()
    if path.suffix == ".jsonl":
        import json
        with open(path, encoding="utf-8") as f:
            return [json.loads(l) for l in f if l.strip()]
    raise ValueError(f"Unsupported dataset file: {path} (use .parquet or .jsonl)")


class V3TurboLoraDataset(Dataset):
    """Builds one ``(T, n_vq+1)`` sequence per row.

    Args:
        rows: training rows (see module docstring).
        tokenizer: the v3 Turbo tokenizer (phoneme vocabulary).
        config: the model config (token ids, ``n_vq``, ``ref_drop_rate``, style ids).
        max_length: hard cap on sequence length; rows whose target audio cannot fit
            together with the prompt, a full-size reference and the EOS row are dropped
            up front (a truncated sequence would lose its EOS and teach the model to
            never stop).
        use_ref: put a same-speaker reference clip in the prompt (voice-cloning mode).
        ref_drop_rate: fraction of samples trained WITHOUT the reference rows so the
            model also works from the speaker embedding alone (``None`` = model config).
        min_ref_frames / max_ref_frames: the reference is a random window of this many
            codec frames (12.5 frames/s: 38 ≈ 3 s, 125 ≈ 10 s).
        style: speaking-style label of the data (``config.style_labels``); the SDK
            always synthesises with the default (natural) style, so keep the default
            unless you know why.
    """

    def __init__(
        self,
        rows: Sequence[Dict[str, Any]],
        tokenizer,
        config,
        max_length: int = 1024,
        use_ref: bool = True,
        ref_drop_rate: Optional[float] = None,
        min_ref_frames: int = 38,
        max_ref_frames: int = 125,
        style: Optional[str] = None,
        seed: Optional[int] = None,
    ):
        self.tok, self.cfg = tokenizer, config
        self.rng = np.random.default_rng(seed)
        self.n_vq = int(config.n_vq)
        self.audio_pad = int(config.audio_pad_token_id)
        self.text_pad = int(config.pad_token_id)
        self.sgs = int(config.speech_generation_start_token_id)
        self.eos = int(config.speech_generation_end_token_id)
        self.max_length = int(max_length)
        self.use_ref = bool(use_ref)
        self.min_ref, self.max_ref = int(min_ref_frames), int(max_ref_frames)
        drop = config.ref_drop_rate if ref_drop_rate is None else ref_drop_rate
        self.ref_drop_rate = float(drop or 0.0)
        labels = getattr(config, "style_labels", None) or {}
        self.style_id = int(labels.get(style, config.default_style_token_id)) if style else int(config.default_style_token_id)
        self.spk_dim = int(getattr(config, "speaker_embedding_dim", 192))

        # Validate + budget check. Text tokens are counted once here.
        self.rows: List[Dict[str, Any]] = []
        n_bad = n_long = 0
        ref_budget = self.max_ref if self.use_ref else 0
        for r in rows:
            codes, emb = r.get("codes"), r.get("speaker_embedding")
            if not r.get("phones") or not codes or emb is None or len(emb) != self.spk_dim:
                n_bad += 1
                continue
            n_text = len(self.tok.encode(r["phones"], add_special_tokens=False)) + 3   # style, TPS, TPE
            if n_text + ref_budget + len(codes) + 1 > self.max_length:
                n_long += 1
                continue
            self.rows.append(r)
        if n_bad or n_long:
            print(f"[dataset] kept {len(self.rows)} rows; dropped {n_bad} invalid, "
                  f"{n_long} too long for max_length={self.max_length}")
        if not self.rows:
            raise ValueError("No usable training rows.")

        # Same-speaker index for reference sampling.
        self.by_speaker: Dict[str, List[int]] = {}
        for i, r in enumerate(self.rows):
            self.by_speaker.setdefault(str(r.get("speaker") or ""), []).append(i)

    def __len__(self) -> int:
        return len(self.rows)

    # ── helpers ────────────────────────────────────────────────────────────
    def _codes_tensor(self, codes) -> torch.LongTensor:
        t = torch.as_tensor(np.asarray(codes, dtype=np.int64))
        if t.ndim != 2 or t.shape[1] != self.n_vq:
            raise ValueError(f"codes must be (T, {self.n_vq}), got {tuple(t.shape)}")
        return t

    def _pick_ref(self, idx: int) -> Optional[torch.LongTensor]:
        """A random window of another utterance of the same speaker, or None."""
        if not self.use_ref or (self.ref_drop_rate > 0 and self.rng.random() < self.ref_drop_rate):
            return None
        peers = [j for j in self.by_speaker.get(str(self.rows[idx].get("speaker") or ""), []) if j != idx]
        if not peers:
            return None
        ref = self._codes_tensor(self.rows[int(self.rng.choice(peers))]["codes"])
        T = int(ref.shape[0])
        hi = min(self.max_ref, T)
        lo = min(self.min_ref, hi)
        win = int(self.rng.integers(lo, hi + 1)) if hi > lo else hi
        if win < T:
            s = int(self.rng.integers(0, T - win + 1))
            ref = ref[s:s + win]
        return ref

    # ── item ───────────────────────────────────────────────────────────────
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        r = self.rows[idx]
        target = self._codes_tensor(r["codes"])
        prompt = build_prompt_2d(r["phones"], self._pick_ref(idx), self.tok, self.cfg, style_token_id=self.style_id)
        gen = torch.full((target.shape[0], self.n_vq + 1), self.audio_pad, dtype=torch.long)
        gen[:, 0] = self.sgs
        gen[:, 1:] = target
        eos = torch.full((1, self.n_vq + 1), self.audio_pad, dtype=torch.long)
        eos[0, 0] = self.eos
        seq = torch.cat([prompt, gen, eos], dim=0)
        if seq.shape[0] > self.max_length:            # cannot happen after the init budget check
            raise RuntimeError(f"row {idx}: sequence {seq.shape[0]} > max_length {self.max_length}")
        return {
            "input_ids": seq,
            "prompt_len": torch.tensor(int(prompt.shape[0])),
            "speaker_emb": torch.as_tensor(np.asarray(r["speaker_embedding"], dtype=np.float32)),
        }

    def collate(self, items: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
        return collate_batch(items, text_pad=self.text_pad, audio_pad=self.audio_pad)


def collate_batch(items: List[Dict[str, torch.Tensor]], *, text_pad: int, audio_pad: int) -> Dict[str, torch.Tensor]:
    """Right-pad the sequences of a batch to the longest one."""
    T = max(int(it["input_ids"].shape[0]) for it in items)
    B, W = len(items), int(items[0]["input_ids"].shape[1])
    ids = torch.full((B, T, W), audio_pad, dtype=torch.long)
    ids[:, :, 0] = text_pad
    mask = torch.zeros((B, T), dtype=torch.bool)
    for b, it in enumerate(items):
        n = int(it["input_ids"].shape[0])
        ids[b, :n] = it["input_ids"]
        mask[b, :n] = True
    return {
        "input_ids": ids,
        "attention_mask": mask,
        "prompt_len": torch.stack([it["prompt_len"] for it in items]),
        "speaker_emb": torch.stack([it["speaker_emb"] for it in items]),
    }
