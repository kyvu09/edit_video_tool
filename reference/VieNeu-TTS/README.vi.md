# 🦜 VieNeu-TTS

[![Awesome](https://img.shields.io/badge/Awesome-NLP-green?logo=github)](https://github.com/keon/awesome-nlp)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-5865F2?logo=discord&logoColor=white)](https://discord.gg/yJt8kzjzWZ)

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1b9PO-lcGZX9pEkEwQmu8MfhSnjxKrALW?usp=sharing)
[![Hugging Face VieNeu-TTS-v3-Turbo](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-v3--Turbo-red)](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Turbo)
[![Hugging Face VieNeu-TTS-v2](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-v2-blue)](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v2)
[![Hugging Face VieNeu-TTS](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-v1-orange)](https://huggingface.co/pnnbao-ump/VieNeu-TTS)

<img width="1087" height="710" alt="image" src="https://github.com/user-attachments/assets/5534b5db-f30b-4d27-8a35-80f1cf6e5d4d" />

**VieNeu-TTS** là thế hệ tiếp theo của mô hình chuyển văn bản thành giọng nói (TTS) tiếng Việt chạy trên thiết bị: **10.000+ giờ dữ liệu** huấn luyện song ngữ, **clone giọng tức thì**, và chế độ **Podcast/Hội thoại** chuyên dụng.

> [!IMPORTANT]
> **🦜 VieNeu-TTS v4 — đã có trên [vieneu.io](https://www.vieneu.io)**
>
> VieNeu-TTS v4 clone giọng với độ trung thực **gần như bản gốc**: chỉ cần một clip ngắn là tái tạo được giọng với độ giống rất cao.
>
> Vì khả năng clone quá mạnh và nguy cơ bị lạm dụng, **v4 là bản độc quyền, không mã nguồn mở**. v4 chỉ có qua **VieNeu API / vieneu.io**.
>
> **VieNeu-TTS v3 Turbo vẫn là bản mã nguồn mở mới nhất trong repo này.** Các bản mở tiếp theo, kể cả v3.x, cũng sẽ được phát hành ở đây.

> [!NOTE]
> **🦜 VieNeu-TTS v3 Turbo đã chính thức ra mắt!**
> Kiến trúc hoàn toàn mới, **do Phạm Nguyễn Ngọc Bảo thiết kế và huấn luyện từ đầu** (codec: [MOSS-Audio-Tokenizer-Nano](https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano); phiên âm: [sea-g2p](https://github.com/pnnbao97/sea-g2p)):
> - Âm thanh **48 kHz** chất lượng cao (trước đây 24 kHz).
> - **Giọng dựng sẵn** — ổn định, nhất quán, không cần clip mẫu.
> - **Phong cách đọc tự nhiên** ở mọi nơi — phong cách đi theo giọng mẫu (tham số `style` đã bỏ, truyền vào cũng bị bỏ qua).
> - **Tag cảm xúc / phi ngôn từ** *(thử nghiệm)*: chèn `[cười]`, `[thở dài]`, `[hắng giọng]` thẳng vào văn bản.
> - **Sinh theo lô** (batch tới 32), gồm chế độ **Hội thoại** nhiều người nói batch cả kịch bản bất kể người nói.
> - **Clone giọng tức thì** từ clip 3–8 giây, tự khử nhiễu clip mẫu.
>
> Dùng thử trong Web UI (backbone **"VieNeu-TTS-v3-Turbo"**) hoặc SDK (`Vieneu(mode="v3turbo")`, là mặc định).

[<img width="600" height="595" alt="VieNeu-TTS Demo" src="https://github.com/user-attachments/assets/021f6671-2d7f-4635-91fb-88b2ab0ddbcd" />](https://github.com/user-attachments/assets/021f6671-2d7f-4635-91fb-88b2ab0ddbcd)

## 📌 Mục lục

1. [🦜 Cài đặt & Giao diện Web](#installation)
2. [📦 Sử dụng Python SDK](#sdk)
3. [🐳 API Server (v2 — đã ngừng)](#docker-remote)
4. [🎓 Fine-tune (LoRA)](#finetune)
5. [🔬 Tổng quan mô hình](#backbones)
6. [🚀 Lộ trình phát triển](#roadmap)
7. [🤝 Hỗ trợ & Liên hệ](#support)
8. [📑 Trích dẫn](#citation)

---

## 🦜 1. Cài đặt & Giao diện Web <a name="installation"></a>

### Thiết lập với `uv` (Khuyến nghị)
`uv` là cách nhanh nhất để quản lý các phụ thuộc.
```bash
# Windows:
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Linux/macOS:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

1. **Clone Repo:**
   ```bash
   git clone https://github.com/pnnbao97/VieNeu-TTS.git
   cd VieNeu-TTS
   ```

2. **Cài đặt các phụ thuộc:**
   - **Lựa chọn 1: CPU & macOS (tối giản, không cần torch) — khuyến nghị để đạt tốc độ tối đa** — chạy **v3 Turbo bằng ONNX**
     > 💡 *Không cần GPU. Chỉ cài bộ ONNX nhẹ; **v3 Turbo chạy trên CPU (48 kHz)** với giọng mặc định, voice cloning và tag cảm xúc. Hoàn toàn không cài PyTorch.*
     >
     > ⚡ **Để CPU chạy nhanh nhất, hãy cài bằng `uv sync` — đừng dùng `pip install`.** `uv sync` dựng lại đúng môi trường đã khóa (lockfile) với bản ONNX Runtime đã tối ưu, nhờ đó đạt tốc độ tối đa ngay từ đầu.
     >
     > 🍎 **Người dùng macOS: cũng dùng lựa chọn này.** Với v3 Turbo, đường ONNX không-torch chạy trên CPU *nhanh hơn* bản MPS/PyTorch (`--extra cuda`), nên hãy ưu tiên `uv sync` để đạt tốc độ cao nhất trên Apple Silicon.
     ```bash
     uv sync
     ```
   - **Lựa chọn 2: GPU** — **v3 Turbo chạy trên GPU (PyTorch)**
     > 💡 *Yêu cầu GPU NVIDIA CUDA (CUDA ≥ 12.8). Khuyến nghị cài [NVIDIA Toolkit](https://developer.nvidia.com/cuda-downloads). Extra `cuda` chỉ thêm torch + transformers để **v3 Turbo chạy trên GPU** — trên CUDA suy luận được **batch tự động** (cùng API, không đổi code). Các backend v1/v2 cũ (LMDeploy, llama-cpp) nằm ở `uv sync --group gpu`.*

     ```bash
     uv sync --extra cuda
     ```

3. **Khởi chạy Giao diện Web:**
   ```bash
   uv run vieneu-web
   ```
   Truy cập giao diện tại `http://127.0.0.1:7860`.

### Docker (Web UI, chỉ v3 Turbo + v3 Nano)

```bash
# CPU — image không torch (v3 Turbo qua ONNX Runtime + v3 Nano)
docker compose -f docker/docker-compose.yml --profile cpu up
# GPU — v3 Turbo trên CUDA (PyTorch) — cần NVIDIA Container Toolkit
docker compose -f docker/docker-compose.yml --profile gpu up
```

Sau đó mở http://localhost:7860. Image chỉ cài bộ v3 (không lmdeploy / llama-cpp / eSpeak); model tải về nằm trong volume `huggingface_cache`.

---


## 📦 2. Sử dụng Python SDK (vieneu) <a name="sdk"></a>

SDK `vieneu` **mặc định dùng VieNeu-TTS v3 Turbo (48 kHz)**. Bản cài tối giản **không cần torch**: trên CPU mọi thứ chạy bằng **ONNX Runtime** (PyTorch không bao giờ được import), còn trên máy CUDA nó tự chuyển sang engine PyTorch — nơi suy luận được **batch tự động** (cùng API, không đổi code).

> ⚡ **Trên CPU, backbone chạy `fp32` theo mặc định** (chất lượng tối đa). Cần nhanh hơn? Truyền `Vieneu(precision="int8")` — nhanh ~1.6× và nhẹ ~4×, nhưng cần CPU hỗ trợ VNNI (AVX-512 VNNI / AVX-VNNI); trên CPU đời cũ int8 có thể cho audio méo/vô nghĩa. `precision` chỉ ảnh hưởng đường CPU/ONNX; trên GPU nó bị bỏ qua (PyTorch).
>
> 🪶 **Vẫn quá chậm, hoặc cần deploy trên điện thoại / board ARM?** Dùng **[VieNeu-TTS v3 Nano (preview)](#v3-nano)** — `Vieneu(mode="v3nano")`, nhanh hơn Turbo fp32 ~3× trên CPU (RTF 0.11–0.22 trên CPU desktop), nhưng **chất lượng kém hơn rõ rệt** (nhất là tiếng Anh / song ngữ), 24 kHz, 11 giọng có sẵn + clone giọng. Xem chi tiết và các hạn chế ở [mục v3 Nano](#v3-nano) bên dưới.
>
> ```python
> vieneu = Vieneu()                    # backbone fp32 (mặc định, chất lượng tối đa)
> vieneu = Vieneu(precision="int8")    # backbone int8 (nhanh hơn trên CPU có VNNI)
> ```

### Bắt đầu nhanh
**CPU (mặc định)** — không cần torch, chạy v3 Turbo bằng ONNX Runtime. Đa số người dùng chọn cái này:

```bash
pip install vieneu
```

**GPU (CUDA)** — chỉ khi bạn có GPU NVIDIA. Trên Linux `pip install "vieneu[cuda]"` là đủ (torch trên PyPI đã kèm CUDA); trên Windows cài torch CUDA **trước** như dưới. Trên CUDA, batch tự bật — cùng API, không đổi code:

```bash
pip install torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128
pip install "transformers==4.57.6"   # Qwen3 backbone + MOSS codec (bản ổn định nhất cho SDK GPU)
pip install vieneu
```

> ℹ️ **Khi nào GPU thật sự đáng dùng?** Lợi thế của GPU đến từ **batch**, nên chỉ
> đáng khi **text dài** (nhiều chunk chạy chung một forward — đọc dài, tổng hợp hàng
> loạt). Với **text ngắn**, đường **CPU/ONNX** không-torch thường *nhanh hơn* (không
> có gì để lấp batch). Dùng CPU cho câu ngắn, tương tác; dùng GPU cho đọc dài hoặc
> khối lượng lớn.

```python
from vieneu import Vieneu

# Mặc định = v3 Turbo (48 kHz). GPU → PyTorch (tự nhận diện).
vieneu = Vieneu()
# 💡 Trên máy GPU vẫn có thể chuyển sang ONNX/CPU nếu muốn: Vieneu(backend="onnx")

# 1. Giọng dựng sẵn theo tên — không cần audio mẫu
print("🔊 Đang sinh giọng nói...")
audio = vieneu.infer("Xin chào, đây là VieNeu-TTS.", voice="Minh Quân")
vieneu.save(audio, "output.wav")
print("✅ Đã lưu vào output.wav")

# Liệt kê các giọng dựng sẵn
voices = vieneu.list_preset_voices()
print(f"\n🎙️  Có {len(voices)} giọng dựng sẵn:")
for label, voice_id in voices:
    print(f"  - {label} ({voice_id})")

# 2. ⚡ Batch trên GPU: infer_batch() chạy nhiều text trong MỘT lần forward — cùng API.
#    Trên GPU CUDA, các chunk của mọi text dùng chung mỗi bước forward (throughput cao
#    hơn nhiều); trên CPU vẫn CHẠY ĐƯỢC (không lỗi), chỉ là tuần tự. Batch tối đa
#    max_batch_size (mặc định 32; hoặc infer_batch(..., batch_size=64); batch_size=1 để
#    tắt). Một infer() cho text dài cũng tự batch các chunk. Bỏ comment để thử (nên dùng GPU):
#
# import time
# texts = [
#     "Chào cả nhà, hôm nay mình sẽ hướng dẫn các bạn cách cài đặt và sử dụng bộ giọng đọc mới.",
#     "Giọng nghe cực kỳ tự nhiên và truyền cảm, lại có thể chuyển đổi biểu cảm một cách linh hoạt.",
#     "Nếu thấy hữu ích, các bạn nhớ để lại một lượt thích và chia sẻ video này cho mọi người nhé!",
# ] * 10   # 30 câu — đủ lấp đầy batch để thấy rõ sức mạnh throughput của GPU
# t0 = time.time()
# audios = vieneu.infer_batch(texts, voice="Minh Quân")
# elapsed = time.time() - t0
# total_audio = sum(len(a) for a in audios) / 48_000
# print(f"⚡ {len(texts)} câu | audio {total_audio:.1f}s | thời gian {elapsed:.1f}s | RTF {elapsed/total_audio:.3f}")
# for i, a in enumerate(audios):
#     vieneu.save(a, f"batch_{i}.wav")
```

### Streaming thời gian thực 🔊

v3 Turbo hỗ trợ **streaming theo frame**: audio ra sau ~300 ms và generator luôn *chạy vượt* player (RTF < 1 trên CPU — ~2–3× trên laptop, ~7× trên Apple Silicon), rất hợp cho ứng dụng realtime / tương tác. Streaming chạy trên engine **ONNX/CPU** — độ trễ audio đầu thấp, theo từng frame; engine GPU/PyTorch sinh ra để **batch throughput**, không dành cho streaming, nên hãy ép `backend="onnx"` cho realtime. Chỉ cần lặp `infer_stream`:

```python
from vieneu import Vieneu
vieneu = Vieneu(backend="onnx")                      # ép ONNX/CPU — đường dành cho streaming (int8)
for chunk in vieneu.infer_stream("Xin chào các bạn!", voice="Minh Quân"):
    play(chunk)                                   # np.float32 @ 48 kHz — phát/ghi ngay khi có
```

Bản demo **web streaming FastAPI** đầy đủ (player trên trình duyệt, hiện time-to-first-audio, dark mode) nằm ở [`apps/web_stream.py`](apps/web_stream.py):

```bash
uv run python -m apps.web_stream                  # → http://localhost:8001
```

> Engine chia chunk thích ứng (chunk đầu ~320 ms cho độ trễ thấp, rồi phình tới ~2 s khi đã dư lead). Vì RTF < 1 nên lead chỉ tăng dần → player prebuffer ~300 ms là dư, không underrun.

#### Giọng có sẵn

v3 Turbo đi kèm **23 giọng dựng sẵn** phủ **3 miền** (Bắc, Trung, Nam), đủ giới tính và tính cách đọc:

- **Miền Bắc**: Minh Quân *(mặc định)*, Minh Đức, Phạm Tuyên, Trúc Ly, Mai Anh, Quỳnh Anh, Xuân Vĩnh, Anh Khôi, Mạnh Dũng, …
- **Miền Trung**: Quang Sơn, Ngọc Trân
- **Miền Nam**: Adam, Thái Sơn, Thùy Dung, Mỹ Duyên, …

### Phong cách đọc — **đã bỏ (deprecated)** ⚠️

> [!WARNING]
> **`style` không còn tác dụng trên v3 Turbo.** Phong cách đọc đã được *ám sẵn trong
> reference* (speaker embedding + ref codes của giọng dựng sẵn hoặc của clip bạn clone),
> nên mô hình luôn bám theo reference và đọc ở phong cách **tự nhiên**.
>
> Tham số `style` **vẫn được chấp nhận** ở `infer`, `infer_stream`, `infer_batch` và
> `add_voice` để code cũ không vỡ — truyền gì (`"tin_tuc"`, `"doc_truyen"`, …) cũng bị
> bỏ qua. Code mới nên bỏ hẳn tham số này.

```python
# Code cũ — vẫn chạy, nhưng `style` bị bỏ qua
audio = vieneu.infer("Bản tin sáng nay.", voice="Minh Quân", style="tin_tuc")

# Code mới — chọn chất giọng/cách đọc bằng chính giọng mẫu hoặc clip reference
audio = vieneu.infer("Bản tin sáng nay.", voice="Minh Quân")
```

### Tag cảm xúc (thử nghiệm)

Chèn trực tiếp trong văn bản: `[cười]`, `[thở dài]`, `[hắng giọng]`.

```python
audio = vieneu.infer("Nghe hay quá đi [cười]. Để mình nói tiếp [hắng giọng].", voice="Minh Quân")
```

> [!TIP]
> Temperature ~0.8 ổn định nhất.

### 🦜 Clone giọng nói Zero-shot (SDK) <a name="cloning"></a>
Clone bất kỳ giọng nào từ một clip ngắn. Clip mẫu được **tự khử nhiễu nền** và **cắt còn ≤ 8 giây** trước khi clone — cứ để `denoise=True` trừ khi clip đã sạch.

```python
from vieneu import Vieneu

vieneu = Vieneu()

# Clone trực tiếp từ clip mẫu (3–8 giây)
audio = vieneu.infer(
    text="Đây là giọng được nhân bản tức thì.",
    ref_audio="examples/audio_ref/example.wav",
    denoise=True,          # mặc định; đặt False nếu clip đã sạch
)
vieneu.save(audio, "cloned_voice.wav")
```

#### Lưu & tái dùng giọng đã clone
Đăng ký clip một lần bằng `add_voice`, sau đó gọi theo tên như giọng dựng sẵn (dùng được cả ở chế độ Hội thoại).

```python
# Đăng ký giọng (tự denoise + trích hồ sơ giọng một lần)
vieneu.add_voice("Giọng của tôi", "my_voice.wav")

audio = vieneu.infer("Câu này dùng giọng đã lưu.", voice="Giọng của tôi")

# Lưu lại để lần sau vẫn còn
vieneu.save_voices()
# vieneu.remove_voice("Giọng của tôi")

# Thêm giọng bạn đã tự làm sạch → bỏ qua bước denoise
vieneu.add_voice("Giọng sạch", "already_clean.wav", denoise=False)
```

#### Chỉ khử nhiễu một clip
Lấy audio đã khử nhiễu mà không tổng hợp gì (để nghe/lưu lại):

```python
wav, sr = vieneu.denoise("noisy.wav", out_path="clean.wav")   # 44.1 kHz mono
```

> **Lưu ý:** `denoise`, `add_voice` và voice cloning chạy trên mọi backend — kể cả bản cài CPU/ONNX không torch (toàn bộ pipeline cloning chạy bằng onnxruntime + soxr + kaldi-native-fbank). **v3 Nano** bên dưới clone theo đúng cách này (các đồ thị clone tải ở lần dùng đầu).

<a id="v3-nano"></a>
### v3 Nano (preview) — chỉ dành cho edge device / máy CPU yếu 🪶

> [!WARNING]
> **v3 Turbo vẫn là mặc định và là bản được khuyến nghị.** Chỉ dùng v3 Nano khi Turbo quá chậm
> trên máy của bạn (laptop cũ, mini PC, board ARM, CPU không có AVX-512/VNNI khiến bản Turbo int8
> bị méo tiếng). Nano là model flow-matching 48M tham số (ONNX, CPU, không cần torch) và
> **đánh đổi chất lượng lấy tốc độ**:
> - **Chất lượng thấp hơn v3 Turbo — rõ nhất ở tiếng Anh và câu song ngữ Anh-Việt.**
>   Tiếng Việt gần tương đương; từ tiếng Anh đọc mang giọng Việt và kém ổn định hơn.
> - Âm thanh **24 kHz** (Turbo: 48 kHz).
> - **11 giọng có sẵn + clone giọng** (`ref_audio`, `add_voice`, `encode_reference` dùng như Turbo; ba đồ thị clone ~110 MB tải ở lần dùng đầu).
> - **Không streaming theo frame** — `infer_stream` trả từng chunk đã hoàn chỉnh.

Đo trên cùng một CPU desktop (Intel i7 thế hệ 12, 6 luồng ONNX Runtime, ~9 giây tiếng nói):

| Engine | RTF ↓ | Sample rate | Thời gian nạp |
|---|---|---|---|
| v3 Turbo ONNX fp32 (mặc định trên CPU) | 0.62 | 48 kHz | ~19 s |
| v3 Turbo ONNX int8 | 0.37 | 48 kHz | ~14 s |
| **v3 Nano, 16 bước, cfg 3** (mặc định) | **0.22** | 24 kHz | ~3 s |
| **v3 Nano, 8 bước, sway −1** | **0.11** | 24 kHz | ~3 s |

RTF = thời gian tính ÷ thời lượng audio (càng nhỏ càng nhanh; 0.22 = nhanh gấp 4.5 lần thời gian thực). Tỉ lệ này giữ nguyên trên máy chậm hơn: Nano nhanh hơn Turbo int8 khoảng **1.7 lần** và Turbo fp32 khoảng **3 lần**, dung lượng tải 282 MB.

```python
from vieneu import Vieneu

tts = Vieneu(mode="v3nano")                      # ONNX, CPU, không cần torch
audio = tts.infer("Xin chào, mình là giọng đọc của VieNeu Nano.", voice="Minh Quân")
tts.save(audio, "nano.wav")                      # 24 kHz

tts.list_preset_voices()                         # Adam, Ái Hân, Mỹ Duyên, Đức Trí, Hữu Quân, Xuân Tiên, Mai Anh, Trúc Ly, Anh Khôi, Minh Quân, Mạnh Dũng
audio = tts.infer("Bản nhanh cho máy rất yếu.", voice="Ái Hân", steps=8, sway=-1)   # nhanh gấp ~2
```

Tham số: `steps` (số bước Euler, mặc định 16; 8 nhanh gấp ~2, hơi thô hơn — đi kèm `sway=-1`),
`cfg` (classifier-free guidance, mặc định 3.0; `cfg=0` giảm nửa tính toán nhưng kém rõ chữ),
`speed`, `seed`, `threads`. Tag cảm xúc `[cười]` `[thở dài]` `[hắng giọng]` dùng như Turbo.

---

## 🐳 3. API Server (v2 — đã ngừng) <a name="docker-remote"></a>

> [!WARNING]
> **Đã ngừng cập nhật.** Server LMDeploy và chế độ `remote` này chỉ chạy với **VieNeu-TTS v2**, bản v2 không còn được cập nhật. Phần này giữ lại cho các hệ thống đang chạy.
>
> **Bản server của VieNeu-TTS v3** (model GPU đầy đủ, dành cho deploy API) sẽ ra mắt trong thời gian tới. **v3 Turbo** là bản chạy trên thiết bị cho người dùng cá nhân: trong lúc chờ, dùng qua SDK, [Docker Web UI](#installation), hoặc demo streaming FastAPI ở [`apps/web_stream.py`](apps/web_stream.py).

<details>
<summary><b>Hướng dẫn server v2 cũ (Docker + chế độ remote)</b></summary>

Triển khai VieNeu-TTS dưới dạng API Server hiệu suất cao (được hỗ trợ bởi LMDeploy) chỉ bằng một câu lệnh duy nhất.

### 1. Chạy với Docker

**Yêu cầu**: Cần cài đặt [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) để hỗ trợ GPU.

**Khởi chạy Server với Đường hầm công khai (Không cần mở cổng modem):**
```bash
docker run --gpus all -p 23333:23333 -v huggingface_cache:/root/.cache/huggingface pnnbao/vieneu-tts:latest --tunnel
```

*   **Mặc định**: Server sẽ tải model `VieNeu-TTS-v2` để đạt chất lượng tối đa.
*   **Tunneling**: Docker image tích hợp sẵn đường hầm `bore`. Kiểm tra container logs để tìm địa chỉ công khai của bạn (VD: `bore.pub:31631`).

### 2. Sử dụng SDK (Chế độ Remote)

Khi server đã chạy, bạn có thể kết nối từ bất kỳ đâu (Colab, Web App, v.v.) mà không cần tải các model nặng cục bộ.

**Cài đặt**:
```bash
pip install "vieneu[legacy]"
```

**Sử dụng**:
```python
from vieneu import Vieneu
import os

# Cấu hình
REMOTE_API_BASE = 'http://your-server-ip:23333/v1'  # Hoặc URL từ bore tunnel
REMOTE_MODEL_ID = "pnnbao-ump/VieNeu-TTS-v2"

# Khởi tạo (Cực kỳ NHẸ - chỉ tải codec nhỏ cục bộ)
# Cảm xúc mặc định là "natural" (tự nhiên) - đặt emotion="storytelling" cho chế độ kể chuyện
vieneu = Vieneu(mode='remote', api_base=REMOTE_API_BASE, model_name=REMOTE_MODEL_ID, emotion="natural")
os.makedirs("outputs", exist_ok=True)

# Liệt kê các giọng mẫu trên server
available_voices = vieneu.list_preset_voices()
for desc, name in available_voices:
    print(f"   - {desc} (ID: {name})")

# Sử dụng giọng cụ thể (chọn động giọng thứ hai)
if available_voices:
    _, my_voice_id = available_voices[1]
    voice_data = vieneu.get_preset_voice(my_voice_id)
    audio_spec = vieneu.infer(text="Chào bạn, tôi đang nói bằng giọng của bác sĩ Tuyên.", voice=voice_data)
    vieneu.save(audio_spec, f"outputs/remote_{my_voice_id}.wav")
    print(f"💾 Đã lưu kết quả tại: outputs/remote_{my_voice_id}.wav")

# Tổng hợp chuẩn (dùng giọng mặc định)
text_input = "Chế độ remote giúp tích hợp VieNeu vào ứng dụng Web hoặc App cực nhanh mà không cần GPU tại máy khách."
audio = vieneu.infer(text=text_input)
vieneu.save(audio, "outputs/remote_output.wav")
print("💾 Đã lưu kết quả remote_output.wav")

# Clone giọng Zero-shot (Mã hóa âm thanh cục bộ, gửi code lên server)
if os.path.exists("examples/audio_ref/example_ngoc_huyen.wav"):
    cloned_audio = vieneu.infer(
        text="Đây là giọng nói được clone và xử lý thông qua VieNeu Server.",
        ref_audio="examples/audio_ref/example_ngoc_huyen.wav",
        ref_text="Tác phẩm dự thi bảo đảm tính khoa học, tính đảng, tính chiến đấu, tính định hướng."
    )
    vieneu.save(cloned_audio, "outputs/remote_cloned_output.wav")
    print("💾 Đã lưu kết quả remote_cloned_output.wav")
```
*Chi tiết xem tại: [examples/main_remote.py](examples/main_remote.py)*

### Quy chuẩn Voice Preset (v1.0)
VieNeu-TTS sử dụng quy chuẩn chính thức `vieneu.voice.presets` để định nghĩa các tài nguyên giọng nói có thể tái sử dụng. Chỉ các tệp `voices.json` tuân theo quy chuẩn này mới đảm bảo tương thích với VieNeu-TTS SDK ≥ v1.x.

### 3. Cấu hình Nâng cao

Tùy chỉnh server để chạy các phiên bản cụ thể hoặc các model đã được fine-tune của riêng bạn.

**Chạy model 0.3B (Nhanh hơn):**
```bash
docker run --gpus all pnnbao/vieneu-tts:serve --model pnnbao-ump/VieNeu-TTS-0.3B --tunnel
```

**Model v3 Turbo đã fine-tune** không chạy qua container này (container chỉ phục vụ backend LMDeploy của v1/v2). Hãy nạp bằng SDK — xem [Fine-tune (LoRA)](#finetune):

```python
tts = Vieneu(mode="v3turbo", backbone_repo="finetune/output/my_voice/merged")
```

</details>

---

## 🎓 4. Fine-tune (LoRA) <a name="finetune"></a>

v3 Turbo đã clone giọng từ một clip vài giây. Chỉ fine-tune bằng **LoRA** khi cần bám giọng chặt hơn clone, một phong cách đọc riêng (đọc truyện, tin tức, thuyết minh…), hoặc đọc tốt hơn trên miền văn bản của bạn. Một giọng cần khoảng **10–30 phút** audio sạch; 2–4 giờ chỉ khi gộp nhiều giọng vào một model. Chỉ vài triệu tham số được train nên GPU ~6 GB là đủ.

```bash
uv sync --extra finetune
uv run python finetune/prepare_dataset.py --dataset-dir finetune/dataset --speaker my_voice   # CPU, không cần torch
uv run python finetune/train_lora.py --data finetune/dataset/train.parquet --run my_voice --merge
uv run python finetune/make_voice.py --audio ref.wav --name "Giọng của tôi" --out finetune/output/my_voice/merged
```

```python
tts = Vieneu(mode="v3turbo", backbone_repo="finetune/output/my_voice/merged")   # hoặc repo Hub của bạn
audio = tts.infer("Xin chào!", voice="Giọng của tôi")   # giọng đóng gói sẵn — không cần audio mẫu
```

Model merge giữ nguyên toàn bộ API của v3 Turbo (clone, preset, streaming) trên backend PyTorch/GPU. Định dạng dữ liệu, tuỳ chọn và mẹo: [`finetune/README.md`](finetune/README.md).

---

## 🔬 5. Tổng quan mô hình <a name="backbones"></a>

| Model | Định dạng | Thiết bị | Song ngữ | Tính năng | Tốc độ |
|---|---|---|---|---|---|
| **VieNeu-TTS-v3-Turbo** *(mặc định)* | PyTorch/ONNX | **GPU/CPU** | ✅ | **48 kHz, giọng dựng sẵn, clone giọng, tag cảm xúc, hội thoại** | **Nhanh (batch)** |
| **VieNeu-TTS-v3-Nano** *(preview)* | ONNX | **CPU yếu / edge** | ⚠️ yếu | 24 kHz, 11 giọng dựng sẵn, clone giọng, tag cảm xúc — **chất lượng thấp hơn (nhất là tiếng Anh / Anh-Việt)** | **Nhanh nhất trên CPU (RTF 0.11–0.22 desktop)** |
| **VieNeu-TTS-v2** | PyTorch | **GPU** | ✅ | **Podcast, Anh-Việt CS** | **Nhanh (LMDeploy)** |
| **VieNeu-v2-CPU** | GGUF/ONNX | **CPU/Edge** | ✅ | **Podcast, Anh-Việt CS** | **Cực nhanh** |
| **VieNeu-v2-Turbo** | GGUF/ONNX | **CPU/Edge** | ✅ | Anh-Việt gọn nhẹ | **Siêu nhanh** |
| **VieNeu-TTS (v1)** | PyTorch | GPU/CPU | ❌ | Ổn định (chỉ tiếng Việt) | Thường |

> [!TIP]
> Trên **CPU**, backbone chạy `fp32` mặc định (chất lượng tối đa); dùng `Vieneu(precision="int8")` nếu cần nhanh hơn (cần CPU có VNNI). Trên **GPU (CUDA)**, suy luận **tự động batch** — cùng API, không đổi code. Máy quá yếu hoặc deploy trên điện thoại: xem [v3 Nano (preview)](#v3-nano).

---

## 🚀 6. Lộ trình phát triển <a name="roadmap"></a>

- [x] **VieNeu-TTS v3 Turbo** *(chạy trên thiết bị, người dùng cá nhân)*: kiến trúc 48 kHz huấn luyện từ đầu — giọng dựng sẵn, clone giọng tức thì, tag cảm xúc, sinh theo lô, hội thoại nhiều người nói, streaming theo frame; chạy CPU không cần torch.
- [x] **VieNeu-TTS v3 Nano** *(preview)*: model flow-matching 48M cho CPU yếu / thiết bị edge — 11 giọng dựng sẵn + clone giọng, không cần torch.
- [x] **Fine-tune LoRA** cho v3 Turbo — train giọng hoặc phong cách đọc riêng trên một GPU phổ thông.
- [ ] **VieNeu-TTS v3 (GPU, bản server)**: model v3 đầy đủ để deploy API / server — chất lượng chốt, điều khiển cảm xúc ổn định, thêm giọng.
- [ ] **Mobile SDK**: hỗ trợ chính thức Android / iOS.

---

## 🤝 7. Hỗ trợ & Liên hệ <a name="support"></a>

- **Hugging Face:** [pnnbao-ump](https://huggingface.co/pnnbao-ump)
- **Discord:** [Tham gia cộng đồng](https://discord.gg/yJt8kzjzWZ)
- **Facebook:** [Phạm Nguyễn Ngọc Bảo](https://www.facebook.com/pnnbao97)
- **Giấy phép:** Apache 2.0 (Sử dụng tự do).

---
## 📑 8. Trích dẫn <a name="citation"></a>

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

## 🤝 Người đóng góp

Cảm ơn tất cả những người tuyệt vời đã đóng góp cho dự án này!

<a href="https://github.com/pnnbao97/VieNeu-TTS/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pnnbao97/VieNeu-TTS" />
</a>

---

## 🙏 Lời cảm ơn

Dự án này sử dụng [neucodec](https://huggingface.co/neuphonic/neucodec) (v1/v2) và [MOSS-Audio-Tokenizer-Nano](https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano) (v3 Turbo) để mã hoá âm thanh, và [sea-g2p](https://github.com/pnnbao97/sea-g2p) để chuẩn hóa văn bản và phiên âm.

**Được thực hiện với ❤️ dành cho cộng đồng TTS Việt Nam**
