# 🦜 VieNeu-TTS

[![Awesome](https://img.shields.io/badge/Awesome-NLP-green?logo=github)](https://github.com/keon/awesome-nlp)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-5865F2?logo=discord&logoColor=white)](https://discord.gg/yJt8kzjzWZ)

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1b9PO-lcGZX9pEkEwQmu8MfhSnjxKrALW?usp=sharing)
[![Hugging Face VieNeu-TTS-v3-Turbo](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-v3--Turbo-red)](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Turbo)
[![Hugging Face VieNeu-TTS-v2](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-v2-blue)](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v2)
[![Hugging Face VieNeu-TTS](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-v1-orange)](https://huggingface.co/pnnbao-ump/VieNeu-TTS)

<img width="1087" height="710" alt="image" src="https://github.com/user-attachments/assets/5534b5db-f30b-4d27-8a35-80f1cf6e5d4d" />

**VieNeu-TTS** is the next generation of on-device Vietnamese TTS, featuring **10,000+ hours** of bilingual training, **instant voice cloning**, and a dedicated **Podcast/Conversation** mode.

> [!IMPORTANT]
> **🦜 VieNeu-TTS v4 — available on [vieneu.io](https://www.vieneu.io)**
>
> VieNeu-TTS v4 delivers **near-original voice cloning fidelity**, allowing a short reference clip to be reproduced with very high speaker similarity.
>
> Due to the strength of its voice-cloning capabilities and the potential for misuse, **v4 is proprietary and will not be open-sourced**. It is available exclusively through the **VieNeu API / vieneu.io**.
>
> **VieNeu-TTS v3 Turbo remains the latest open-source version available in this repository.** Future open-source releases, including potential v3.x updates, may also be published here.

> [!NOTE]
> **🦜 VieNeu-TTS v3 Turbo is officially released!**
> A brand-new architecture **designed and trained from scratch by Phạm Nguyễn Ngọc Bảo** (codec: [MOSS-Audio-Tokenizer-Nano](https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano); phonemizer: [sea-g2p](https://github.com/pnnbao97/sea-g2p)):
> - **48 kHz** high-fidelity audio (up from 24 kHz).
> - **Built-in default voices** — stable and consistent, no reference clip needed.
> - **Natural reading style** everywhere — the style follows the reference voice (the `style` argument is deprecated and ignored).
> - **Emotion / non-verbal cues** *(experimental)*: drop `[cười]`, `[thở dài]`, `[hắng giọng]` straight into the text.
> - **Batched generation** (batch size up to 32), including a multi-speaker **Conversation** mode that batches the whole script regardless of speaker.
> - **Instant voice cloning** from a 3–8s clip, with automatic reference denoising.
>
> Try it in the Web UI (backbone **"VieNeu-TTS-v3-Turbo"**) or the SDK (`Vieneu(mode="v3turbo")`, the default).

<h3>🎬 Demos</h3>

<table>
  <tr>
    <td align="center">
      <b>Voice Cloning</b><br><br>
      <video
        src="https://github.com/user-attachments/assets/021f6671-2d7f-4635-91fb-88b2ab0ddbcd"
        controls
        width="100%">
      </video>
    </td>
    <td align="center">
      <b>Dubbing</b><br><br>
      <video
        src="https://github.com/user-attachments/assets/5888aea1-4f32-4397-9dd9-9c7b743d31bd"
        controls
        width="100%">
      </video>
    </td>
    <td align="center">
      <b>Dubbing / Conversation</b><br><br>
      <video
        src="https://github.com/user-attachments/assets/28104b78-2d55-4914-85b7-5f425a7e99da"
        controls
        width="100%">
      </video>
    </td>
  </tr>
</table>


## 📌 Table of Contents

1. [🦜 Installation & Web UI](#installation)
2. [📦 Using the Python SDK](#sdk)
3. [🐳 API Server (v2 — deprecated)](#docker-remote)
4. [🎓 Fine-tuning (LoRA)](#finetune)
5. [🔬 Model Overview](#backbones)
6. [🚀 Roadmap](#roadmap)
7. [🤝 Support & Contact](#support)
8. [📑 Citation](#citation)

---

## 🦜 1. Installation & Web UI <a name="installation"></a>
> [!TIP]
> **On Windows?** The fastest way to get started is the standalone installer at **[vieneu.io/#/download](https://www.vieneu.io/#/download)** — no need to install `uv` or clone the repo manually.
> **macOS**: a similar installer is coming in an upcoming release; for now, please use the `uv sync` steps below.

### Setup with `uv` (Recommended)
`uv` is the fastest way to manage dependencies. 
```bash
# Windows:
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Linux/macOS:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

1. **Clone the Repo:**
   ```bash
   git clone https://github.com/pnnbao97/VieNeu-TTS.git
   cd VieNeu-TTS
   ```

2. **Install Dependencies:**
   - **Option 1: CPU & macOS (minimal, torch-free) — recommended for maximum speed** — runs **v3 Turbo via ONNX**
     > 💡 *No GPU required. Installs only the lightweight ONNX stack; **v3 Turbo runs on CPU (48 kHz)** with default voices, voice cloning and emotion cues. PyTorch is never installed.*
     >
     > ⚡ **For the fastest CPU inference, install with `uv sync` — not `pip install`.** `uv sync` reproduces the locked environment that pins the optimized ONNX Runtime build, so you get maximum speed out of the box.
     >
     > 🍎 **macOS users: use this option too.** For v3 Turbo the torch-free ONNX path on the CPU is *faster* than the MPS/PyTorch build (`--extra cuda`), so prefer `uv sync` for top speed on Apple Silicon.
     ```bash
     uv sync
     ```
   - **Option 2: GPU** — **v3 Turbo on GPU (PyTorch)**
     > 💡 The `cuda` extra adds only torch + transformers so **v3 Turbo runs on GPU** — inference is batched automatically on CUDA (same API, no code change). The legacy v1/v2 backends (LMDeploy, llama-cpp) live in `uv sync --group gpu`.*

     ```bash
     uv sync --extra cuda
     ```

3. **Start the Web UI:**
   ```bash
   uv run vieneu-web
   ```
   Access the UI at `http://127.0.0.1:7860`.

---


## 📦 2. Using the Python SDK (vieneu) <a name="sdk"></a>

The `vieneu` SDK **defaults to VieNeu-TTS v3 Turbo (48 kHz)**. The minimal install is **torch-free**: on CPU everything runs on **ONNX Runtime** (PyTorch is never imported), and on a CUDA machine it auto-switches to the PyTorch engine — where inference is **batched automatically** (same API, no code change).

### Quick Start

**CPU (default)** — torch-free, runs v3 Turbo via ONNX Runtime. Most users want this:
> ⚡**On CPU the backbone runs `fp32` by default** (maximum fidelity). Need more speed? Pass `Vieneu(precision="int8")` — ~1.6× faster and ~4× smaller, but it requires a CPU with VNNI (AVX-512 VNNI / AVX-VNNI); on older CPUs int8 can produce garbled audio. `precision` only affects the CPU/ONNX path; on GPU it's ignored (PyTorch).
>
> 🪶 **Still too slow, or deploying on a phone / ARM board?** Try **[VieNeu-TTS v3 Nano (preview)](#v3-nano)** — `Vieneu(mode="v3nano")`, ~3× faster than Turbo fp32 on CPU (RTF 0.11–0.22 on a desktop CPU), but **noticeably lower quality** (especially English / bilingual), 24 kHz, 11 preset voices + voice cloning. Details and caveats in the [v3 Nano section](#v3-nano) below.

```bash
pip install vieneu
```

**GPU (CUDA)** — only if you have an NVIDIA GPU. On Linux `pip install "vieneu[cuda]"` is enough (PyPI torch ships CUDA there); on Windows install the CUDA torch **first** as below. 
> ℹ️ **When is GPU actually worth it?** The GPU win comes from **batching**, so it
> only pays off on **long text** (many chunks generated together in one forward —
> long-form or bulk synthesis). For **short text** the torch-free **CPU/ONNX** path
> is usually *faster* (there's no batch to fill, and no kernel-launch overhead). Use
> CPU for short, interactive calls; reach for GPU for long-form or high-throughput work.

```bash
pip install torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128
pip install "transformers==4.57.6"   # pinned — most stable transformers for the GPU SDK
pip install vieneu
```

```python
import time
from vieneu import Vieneu

# Default = v3 Turbo (48 kHz). GPU → PyTorch (auto-detected).
vieneu = Vieneu() # On a GPU machine you can still switch to ONNX/CPU if you prefer: Vieneu(backend="onnx")

# 1. Built-in voice by name — no reference clip needed
print("🔊 Generating speech...")

start_time = time.time()
audio = vieneu.infer("[cười] Trời ơi, cái giọng nó tự nhiên mà nó mượt mà dã man, nghe không khác gì người thật luôn. Giờ thì tha hồ mà quẩy content với cả kho giọng nói đa dạng, đủ mọi sắc thái biểu cảm. Mọi người bật loa lên rồi cùng trải nghiệm thử với mình nhé!", voice="Phạm Tuyên")
elapsed_time = time.time() - start_time

vieneu.save(audio, "output.wav")
print("✅ Saved to output.wav")

# Tính RTF (Real-Time Factor)
sample_rate = 48000
audio_duration = len(audio) / sample_rate
rtf = elapsed_time / audio_duration

print(f"\n⏱️  Thời gian xử lý: {elapsed_time:.3f}s")
print(f"🎵 Thời lượng audio: {audio_duration:.3f}s")
print(f"📊 RTF: {rtf:.4f}  ({'nhanh hơn' if rtf < 1 else 'chậm hơn'} real-time {1/rtf:.2f}x)" if rtf > 0 else "")

# List the built-in voices
voices = vieneu.list_preset_voices()
print(f"\n🎙️  {len(voices)} built-in voices available:")
for label, voice_id in voices:
    print(f"  - {label} ({voice_id})")

# 2. ⚡ Batch on GPU: infer_batch() runs many texts in ONE batched forward — same API.
#    On a CUDA GPU the chunks from every text share each forward step (big throughput
#    win). On CPU it still WORKS (no error) — just sequentially, so there's no batch
#    gain. Batch caps at max_batch_size (default 32; tune via Vieneu(max_batch_size=64)
#    or infer_batch(..., batch_size=64), or batch_size=1 to disable). A single long
#    infer() also auto-batches its own chunks. Uncomment to try (GPU recommended):
#
# import time
# texts = [
#     "Chào cả nhà, hôm nay mình sẽ hướng dẫn các bạn cách cài đặt và sử dụng bộ giọng đọc mới.",
#     "Giọng nghe cực kỳ tự nhiên và truyền cảm, lại có thể chuyển đổi biểu cảm một cách linh hoạt.",
#     "Nếu thấy hữu ích, các bạn nhớ để lại một lượt thích và chia sẻ video này cho mọi người nhé!",
# ] * 10   # 30 texts — enough to fill the batch and really show the GPU throughput win
# t0 = time.time()
# audios = vieneu.infer_batch(texts, voice="Minh Quân")
# elapsed = time.time() - t0
# total_audio = sum(len(a) for a in audios) / 48_000
# print(f"⚡ {len(texts)} texts | audio {total_audio:.1f}s | wall {elapsed:.1f}s | RTF {elapsed/total_audio:.3f}")
# for i, a in enumerate(audios):
#     vieneu.save(a, f"batch_{i}.wav")
```

#### Streaming (real-time) 🔊

> v3 Turbo supports **frame-level streaming**: audio starts in ~300 ms and generation stays *ahead* of playback (RTF < 1 on CPU — ~2–3× on a laptop, ~7× on Apple Silicon), so it's ideal for realtime / interactive apps. Streaming runs on the > **ONNX/CPU** engine — low first-audio latency, frame-by-frame; the GPU/PyTorch engine is built for **batch throughput**, not streaming, so pin `backend="onnx"` for realtime. Just iterate `infer_stream`:

```python
from vieneu import Vieneu
vieneu = Vieneu(backend="onnx")                      # force ONNX/CPU — the streaming path (int8)
for chunk in vieneu.infer_stream("Xin chào các bạn!", voice="Minh Quân"):
    play(chunk)                                   # np.float32 @ 48 kHz — play/write as it arrives
```

A complete **FastAPI web streaming demo** is in [`apps/web_stream.py`](apps/web_stream.py):

```bash
uv run python -m apps.web_stream                  # → http://127.0.0.1:8001
```

#### Available Voices

The v3 Turbo engine includes **23 curated preset voices** covering **3 regions** (North, Central, South) with diverse genders and speaking characters:

- **Northern (Bắc)**: e.g. Minh Quân *(default)*, Minh Đức, Phạm Tuyên, Trúc Ly, Mai Anh, Quỳnh Anh, Xuân Vĩnh, Anh Khôi, Mạnh Dũng
- **Central (Trung)**: Quang Sơn, Ngọc Trân
- **Southern (Nam)**: e.g. Adam, Thái Sơn, Thùy Dung, Mỹ Duyên

### Reading style — **deprecated** ⚠️

> [!WARNING]
> **`style` is deprecated on v3 Turbo and has no effect.** The reading style is already
> baked into the reference itself (the speaker embedding + reference codes of the preset
> voice or of your cloned clip), so every generation follows the reference and comes out
> in its natural reading style.
>
> The `style` argument is **still accepted** by `infer`, `infer_stream`, `infer_batch`
> and `add_voice` so existing code keeps running — whatever you pass (`"tin_tuc"`,
> `"doc_truyen"`, …) is simply ignored. New code should just omit it.

```python
# Old code — still runs, but `style` is ignored
audio = vieneu.infer("Bản tin sáng nay.", voice="Minh Quân", style="tin_tuc")

# New code — pick the reading character through the voice / reference clip instead
audio = vieneu.infer("Bản tin sáng nay.", voice="Minh Quân")
```

### Emotion cues (experimental)

Inline tags are supported anywhere in the text: `[cười]` (chuckle), `[thở dài]` (sigh), `[hắng giọng]` (clear throat).

```python
audio = vieneu.infer("Nghe hay quá đi [cười]. Để mình nói tiếp [hắng giọng].", voice="Minh Quân")
```

### Voice cloning

Clone any voice from a short reference clip. The clip is cleaned up automatically
(background noise removed, and trimmed to ≤ 8 seconds) before cloning — keep
`denoise=True` unless your clip is already clean.

```python
audio = vieneu.infer(
    "Đây là giọng được nhân bản tức thì.",
    ref_audio="my_voice.wav",   # a 3–8s reference clip
    denoise=True,               # default; set False if the clip is already clean
)
vieneu.save(audio, "cloned.wav")
```

### Save & reuse a cloned voice

Register a reference once with `add_voice`, then use it by name like a built-in voice.

```python
# Enroll a voice (denoises + extracts the speaker profile once)
vieneu.add_voice("Giọng của tôi", "my_voice.wav")

# Now reuse it anywhere, including the conversation mode
audio = vieneu.infer("Câu này dùng giọng đã lưu.", voice="Giọng của tôi")

# Persist your voices so they load next session
vieneu.save_voices()                 # writes to the default voices file
# vieneu.remove_voice("Giọng của tôi")

# Add a voice you already cleaned yourself → skip denoising
vieneu.add_voice("Giọng sạch", "already_clean.wav", denoise=False)
```

### Clean up a clip on its own

Get the denoised audio without synthesizing anything (e.g. to inspect or store it):

```python
wav, sr = vieneu.denoise("noisy.wav", out_path="clean.wav")   # 44.1 kHz mono
```

> **Note:** `denoise`, `add_voice`, and voice cloning work on every backend — the
> torch-free CPU/ONNX install included (the whole cloning pipeline runs on
> onnxruntime + soxr + kaldi-native-fbank). **v3 Nano** below clones the same way (its cloning graphs are fetched on first use).

<a id="v3-nano"></a>
### v3 Nano (preview) — for edge devices / weak CPUs only 🪶

> [!WARNING]
> **v3 Turbo remains the default and the recommended model.** Use v3 Nano only when Turbo is
> too slow on your hardware (old laptops, mini PCs, ARM boards, CPUs without AVX-512/VNNI where
> the int8 Turbo build produces garbled audio). Nano is a 48M-parameter flow-matching model
> (ONNX, CPU, torch-free) and it **trades quality for speed**:
> - **Lower quality than v3 Turbo — most noticeably on English and code-switched (En-Vi) text.**
>   Vietnamese is close; English words come out with a Vietnamese accent and are less stable.
> - **24 kHz** output (Turbo: 48 kHz).
> - **11 preset voices + voice cloning** (`ref_audio`, `add_voice`, `encode_reference` work like Turbo; the three cloning graphs, ~110 MB, download on first use).
> - **No frame-level streaming** — `infer_stream` yields one finished chunk at a time.

Measured on the same desktop CPU (12th-gen Intel i7, 6 ONNX Runtime threads, ~9 s of speech):

| Engine | RTF ↓ | Sample rate | Load time |
|---|---|---|---|
| v3 Turbo ONNX fp32 (default on CPU) | 0.62 | 48 kHz | ~19 s |
| v3 Turbo ONNX int8 | 0.37 | 48 kHz | ~14 s |
| **v3 Nano, 16 steps, cfg 3** (default) | **0.22** | 24 kHz | ~3 s |
| **v3 Nano, 8 steps, sway −1** | **0.11** | 24 kHz | ~3 s |

RTF = compute time ÷ audio duration (lower is faster; 0.22 = 4.5× faster than real time). The ratio carries over to slower machines: expect Nano to be roughly **1.7× faster than Turbo int8** and **~3× faster than Turbo fp32**, with a 282 MB download instead of Turbo's.

```python
from vieneu import Vieneu

tts = Vieneu(mode="v3nano")                      # ONNX, CPU, torch-free
audio = tts.infer("Xin chào, mình là giọng đọc của VieNeu Nano.", voice="Minh Quân")
tts.save(audio, "nano.wav")                      # 24 kHz

tts.list_preset_voices()                         # Adam, Ái Hân, Mỹ Duyên, Đức Trí, Hữu Quân, Xuân Tiên, Mai Anh, Trúc Ly, Anh Khôi, Minh Quân, Mạnh Dũng
audio = tts.infer("Bản nhanh cho máy rất yếu.", voice="Ái Hân", steps=8, sway=-1)   # ~2× faster
```

Knobs: `steps` (Euler steps, 16 default; 8 ≈ 2× faster, slightly rougher — pair with `sway=-1`),
`cfg` (classifier-free guidance, 3.0 default; `cfg=0` halves compute but hurts intelligibility),
`speed`, `seed`, `threads`. Emotion cues `[cười]` `[thở dài]` `[hắng giọng]` work as on Turbo.

---

## 🐳 3. API Server (v2 — deprecated) <a name="docker-remote"></a>

> [!WARNING]
> **Deprecated.** This LMDeploy server and the `remote` mode only work with **VieNeu-TTS v2**, which is no longer updated. They are kept for existing deployments.
>
> A **server release of VieNeu-TTS v3** (the full GPU model, built for API deployment) is coming soon. **v3 Turbo** is the on-device version for personal use: run it through the SDK, the [Docker Web UI](#installation), or the FastAPI streaming demo in [`apps/web_stream.py`](apps/web_stream.py) in the meantime.

<details>
<summary><b>Legacy v2 server instructions (Docker + remote mode)</b></summary>

Deploy VieNeu-TTS as a high-performance API Server (powered by LMDeploy) with a single command.

### 1. Run with Docker

**Requirement**: [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) is required for GPU support.

**Start the Server with a Public Tunnel (No port forwarding needed):**
```bash
docker run --gpus all -p 23333:23333 -v huggingface_cache:/root/.cache/huggingface pnnbao/vieneu-tts:latest --tunnel
```

*   **Default**: The server loads the `VieNeu-TTS-v2` model for maximum quality.
*   **Tunneling**: The Docker image includes a built-in `bore` tunnel. Check the container logs to find your public address (e.g., `bore.pub:31631`).

### 2. Using the SDK (Remote Mode)

Once the server is running, you can connect from anywhere (Colab, Web Apps, etc.) without loading heavy models locally.

**Installation**:
```bash
pip install "vieneu[legacy]"
```

**Usage**:
```python
from vieneu import Vieneu
import os

# Configuration
REMOTE_API_BASE = 'http://your-server-ip:23333/v1'  # Or bore tunnel URL
REMOTE_MODEL_ID = "pnnbao-ump/VieNeu-TTS-v2"

# Initialization (LIGHTWEIGHT - only loads small codec locally)
# Default emotion is "natural" (conversational) - set emotion="storytelling" for storytelling mode
vieneu = Vieneu(mode='remote', api_base=REMOTE_API_BASE, model_name=REMOTE_MODEL_ID, emotion="natural")
os.makedirs("outputs", exist_ok=True)

# List remote voices
available_voices = vieneu.list_preset_voices()
for desc, name in available_voices:
    print(f"   - {desc} (ID: {name})")

# Use specific voice (dynamically select second voice)
if available_voices:
    _, my_voice_id = available_voices[1]
    voice_data = vieneu.get_preset_voice(my_voice_id)
    audio_spec = vieneu.infer(text="Chào bạn, tôi đang nói bằng giọng của bác sĩ Tuyên.", voice=voice_data)
    vieneu.save(audio_spec, f"outputs/remote_{my_voice_id}.wav")
    print(f"💾 Saved synthesis to: outputs/remote_{my_voice_id}.wav")

# Standard synthesis (uses default voice)
text_input = "Chế độ remote giúp tích hợp VieNeu vào ứng dụng Web hoặc App cực nhanh mà không cần GPU tại máy khách."
audio = vieneu.infer(text=text_input)
vieneu.save(audio, "outputs/remote_output.wav")
print("💾 Saved remote synthesis to: outputs/remote_output.wav")

# Zero-shot voice cloning (encodes audio locally, sends codes to server)
if os.path.exists("examples/audio_ref/example_ngoc_huyen.wav"):
    cloned_audio = vieneu.infer(
        text="Đây là giọng nói được clone và xử lý thông qua VieNeu Server.",
        ref_audio="examples/audio_ref/example_ngoc_huyen.wav",
        ref_text="Tác phẩm dự thi bảo đảm tính khoa học, tính đảng, tính chiến đấu, tính định hướng."
    )
    vieneu.save(cloned_audio, "outputs/remote_cloned_output.wav")
    print("💾 Saved remote cloned voice to: outputs/remote_cloned_output.wav")
```
*For full implementation details, see: [examples/main_remote.py](examples/main_remote.py)*

### Voice Preset Specification (v1.0)
VieNeu-TTS uses the official `vieneu.voice.presets` specification to define reusable voice assets. Only `voices.json` files following this spec are guaranteed to be compatible with VieNeu-TTS SDK ≥ v1.x.

### 3. Advanced Configuration

Customize the server to run specific versions or your own fine-tuned models.

**Run the 0.3B Model (Faster):**
```bash
docker run --gpus all pnnbao/vieneu-tts:serve --model pnnbao-ump/VieNeu-TTS-0.3B --tunnel
```

**Fine-tuned v3 Turbo models** are not served by this container (it hosts the v1/v2 LMDeploy backends). Load them with the SDK instead — see [Fine-tuning (LoRA)](#finetune):

```python
tts = Vieneu(mode="v3turbo", backbone_repo="finetune/output/my_voice/merged")
```

</details>

---

## 🎓 4. Fine-tuning (LoRA) <a name="finetune"></a>

v3 Turbo already clones a voice from a clip of a few seconds. Fine-tune with **LoRA** when you need a tighter match than cloning, a specific reading style (storytelling, news, narration…), or better reading on your own domain. One voice needs about **10–30 minutes** of clean audio; 2–4 hours only when packing several voices into one model. Only a few million parameters are trained, so a ~6 GB GPU is enough.

```bash
uv sync --extra finetune
uv run python finetune/prepare_dataset.py --dataset-dir finetune/dataset --speaker my_voice   # CPU, torch-free
uv run python finetune/train_lora.py --data finetune/dataset/train.parquet --run my_voice --merge
uv run python finetune/make_voice.py --audio ref.wav --name "My voice" --out finetune/output/my_voice/merged
```

```python
tts = Vieneu(mode="v3turbo", backbone_repo="finetune/output/my_voice/merged")   # or your Hub repo
audio = tts.infer("Xin chào!", voice="My voice")        # packed voice — no reference audio needed
```

The merged model keeps the full v3 Turbo API (cloning, presets, streaming) on the PyTorch/GPU backend. Data layout, options and tips: [`finetune/README.md`](finetune/README.md).

---

## 🔬 5. Model Overview <a name="backbones"></a>

| Model | Format | Device | Bilingual | Features | Speed |
|---|---|---|---|---|---|
| **VieNeu-TTS-v3-Turbo** *(default)* | PyTorch/ONNX | **GPU/CPU** | ✅ | **48 kHz, Default voices, Cloning, Emotion cues, Conversation** | **Fast (batched)** |
| **VieNeu-TTS-v3-Nano** *(preview)* | ONNX | **weak CPU / edge** | ⚠️ weak | 24 kHz, 11 preset voices, cloning, emotion cues — **lower quality (esp. English / En-Vi)** | **Fastest on CPU (RTF 0.11–0.22 desktop)** |
| **VieNeu-TTS-v2** | PyTorch | **GPU** | ✅ | **Podcast, En-Vi CS** | **Fast (LMDeploy)** |
| **VieNeu-v2-CPU** | GGUF/ONNX | **CPU/Edge** | ✅ | **Podcast, En-Vi CS** | **Extreme Speed** |
| **VieNeu-v2-Turbo** | GGUF/ONNX | **CPU/Edge** | ✅ | Lightweight En-Vi | **Ultra Fast** |
| **VieNeu-TTS (v1)** | PyTorch | GPU/CPU | ❌ | Stable (Vi only) | Standard |

---

## 🚀 6. Roadmap <a name="roadmap"></a>

- [x] **VieNeu-TTS v3 Turbo** *(on-device, personal use)*: from-scratch 48 kHz architecture — preset voices, instant voice cloning, emotion cues, batched generation, multi-speaker conversation, frame-level streaming; torch-free on CPU.
- [x] **VieNeu-TTS v3 Nano** *(preview)*: 48M flow-matching model for weak CPUs / edge devices — 11 preset voices + cloning, torch-free.
- [x] **LoRA fine-tuning** for v3 Turbo — train your own voice or reading style on one consumer GPU.
- [ ] **VieNeu-TTS v3 (GPU, server release)**: the full v3 model for API / server deployment — finalized quality, stable emotion control, more voices.
- [ ] **Mobile SDK**: official Android / iOS deployment.

---

## 🤝 7. Support & Contact <a name="support"></a>

- **Hugging Face:** [pnnbao-ump](https://huggingface.co/pnnbao-ump)
- **Discord:** [Join our community](https://discord.gg/yJt8kzjzWZ)
- **Facebook:** [Pham Nguyen Ngoc Bao](https://www.facebook.com/pnnbao97)
- **License:** Apache 2.0 (Free to use).

---
## 📑 8. Citation <a name="citation"></a>

```bibtex
@misc{vieneutts2026,
  title        = {VieNeu-TTS: Advanced Vietnamese Text-to-Speech with Instant Voice Cloning},
  author       = {Pham Nguyen Ngoc Bao},
  year         = {2026},
  publisher    = {Hugging Face},
  howpublished = {\url{https://huggingface.co/pnnbao-ump/VieNeu-TTS}}
}
```

---

## 🌟 Star History

<a href="https://github.com/pnnbao97/VieNeu-TTS/stargazers">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/pnnbao97/star-charts/main/charts/pnnbao97/VieNeu-TTS/dark.svg" />
   <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/pnnbao97/star-charts/main/charts/pnnbao97/VieNeu-TTS/light.svg" />
   <img alt="Star History Chart" src="https://raw.githubusercontent.com/pnnbao97/star-charts/main/charts/pnnbao97/VieNeu-TTS/light.svg" />
 </picture>
</a>

---

## 🤝 Contributors

Thanks to all the amazing people who have contributed to this project!

<a href="https://github.com/pnnbao97/VieNeu-TTS/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pnnbao97/VieNeu-TTS" />
</a>

---

## 🙏 Acknowledgements

This project uses [neucodec](https://huggingface.co/neuphonic/neucodec) (v1/v2) and [MOSS-Audio-Tokenizer-Nano](https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano) (v3 Turbo) for audio coding, and [sea-g2p](https://github.com/pnnbao97/sea-g2p) for text normalization and phonemization.

**Made with ❤️ for the Vietnamese TTS community**
