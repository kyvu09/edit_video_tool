# 🦜 Fine-tune VieNeu-TTS v3 Turbo bằng LoRA

Thư mục này cho phép bạn dạy **VieNeu-TTS v3 Turbo** một giọng mới (hoặc một phong cách đọc mới) bằng **LoRA**: chỉ vài triệu tham số được học, model gốc giữ nguyên, train được trên một GPU phổ thông (~6 GB VRAM với cấu hình mặc định).

Toàn bộ quy trình dựa trên chính SDK `vieneu`: dữ liệu được chuẩn hoá, phiên âm và mã hoá **giống hệt lúc suy luận**, nên model sau khi merge dùng được ngay với `Vieneu(mode="v3turbo")`, kể cả voice cloning và giọng đóng gói sẵn.

> **Bao nhiêu dữ liệu?** v3 Turbo đã clone giọng tức thì từ một clip **vài giây**, nên chỉ fine-tune khi cần bám giọng chặt hơn clone, một phong cách đọc đặc thù (đọc truyện, tin tức, thuyết minh…), hoặc sửa cách đọc trên một miền văn bản riêng.
>
> | Mục tiêu | Dữ liệu |
> |---|---|
> | Một giọng, bám giọng và phong cách chặt hơn clone | **10–30 phút** audio sạch (100–300 câu khác nhau) |
> | Nhiều giọng trong một model, hoặc đổi hẳn phong cách đọc | 2–4 giờ, chia đều cho các giọng |
>
> Câu đa dạng quan trọng hơn tổng thời lượng. Data ít thì rủi ro là overfit chứ không phải thiếu: giữ eval bật và dừng khi eval loss ngừng giảm.

## ⚙️ Cài đặt

```bash
git clone https://github.com/pnnbao97/VieNeu-TTS.git
cd VieNeu-TTS
uv sync --extra finetune        # torch, transformers, peft, accelerate (cần GPU CUDA để train)
```

## 1. Chuẩn bị dữ liệu

```
finetune/dataset/
  metadata.csv        mỗi dòng: file_name|text          (hoặc file_name|text|speaker)
  raw_audio/          các file audio được nhắc trong metadata.csv
```

- Mỗi clip **1–20 giây**, một người nói, nội dung đúng với `text` (kể cả dấu câu). Clip dài hơn hãy cắt nhỏ trước.
- Audio sạch, ít vang, không nhạc nền. Tần số lấy mẫu bất kỳ, mono hay stereo đều được.
- Cột `speaker` chỉ cần khi bạn train nhiều giọng trong một lần: các clip cùng `speaker` sẽ mượn nhau làm clip tham chiếu trong lúc train.

```bash
uv run python finetune/prepare_dataset.py --dataset-dir finetune/dataset --speaker my_voice
```

Script chạy trên CPU, không cần torch: phiên âm bằng sea-g2p, mã hoá audio bằng codec MOSS (ONNX) và trích speaker embedding 192 chiều. Kết quả là `finetune/dataset/train.parquet`.

## 2. Train LoRA

```bash
uv run python finetune/train_lora.py --data finetune/dataset/train.parquet --run my_voice --merge
```

Mặc định: LoRA rank 16 trên toàn bộ attention và MLP của backbone, learning rate 2e-4, 3 epoch, batch hiệu dụng 16, bf16. Vài tuỳ chọn hay dùng:

| Tuỳ chọn | Ý nghĩa |
|---|---|
| `--epochs 3` / `--max-steps N` | thời lượng train |
| `--r 16 --alpha 32` | dung lượng LoRA; giọng khó hoặc data nhiều thì tăng `--r 32` |
| `--target all` | thêm LoRA cho acoustic decoder (chất giọng bám sát hơn, cần data nhiều hơn) |
| `--no-ref` | train không dùng clip tham chiếu, chỉ dựa speaker embedding (một giọng, ít clip) |
| `--grad-checkpoint` | tiết kiệm VRAM khi tăng `--batch-size` hoặc `--max-length` |
| `--merge` | ghi thêm model đầy đủ đã merge ở cuối |

Theo dõi log: `audio` là cross-entropy trung bình của 16 codebook, `acc_cb0` là độ chính xác top-1 của codebook đầu. Trên pipeline đúng, `acc_cb0` phải ở mức 0.2–0.4 ngay từ bước đầu và tăng dần; nếu gần 0 thì dữ liệu có vấn đề (phiên âm hoặc codes không khớp audio).

Kết quả nằm trong `finetune/output/my_voice/`:

```
adapter/        LoRA adapter (vài MB) — dùng với merge_lora.py
checkpoint-*/   adapter trung gian
merged/         model đầy đủ, đúng bố cục repo chính thức (khi có --merge)
```

## 3. Merge và dùng model

```bash
uv run python finetune/merge_lora.py --adapter finetune/output/my_voice/adapter --out finetune/output/my_voice/merged
# đẩy lên Hugging Face: thêm --push-to-hub your-name/VieNeu-TTS-v3-Turbo-my-voice [--private]
```

```python
from vieneu import Vieneu
tts = Vieneu(mode="v3turbo", backbone_repo="finetune/output/my_voice/merged")   # hoặc "your-name/…"
audio = tts.infer("Xin chào, đây là giọng đã fine-tune.", ref_audio="ref.wav")
tts.save(audio, "out.wav")
```

Model merge chạy trên **GPU (PyTorch)**. Đường CPU/ONNX của SDK dùng đồ thị đã export sẵn của model gốc, nên chưa nhận model fine-tune.

## 4. Đóng gói giọng sẵn (khuyên dùng)

Để người dùng model của bạn không cần cung cấp audio mẫu:

```bash
uv run python finetune/make_voice.py --audio ref.wav --name "Giọng của tôi" \
    --description "Nữ · Bắc · Phong cách tự nhiên" --gender female \
    --out finetune/output/my_voice/merged
```

Lệnh này ghi `voices_v3_turbo.json` vào thư mục model. SDK tự nạp file đó từ thư mục local hoặc từ repo Hub, cộng thêm vào các giọng có sẵn, và giọng bạn đặt sẽ thành mặc định:

```python
tts = Vieneu(mode="v3turbo", backbone_repo="your-name/VieNeu-TTS-v3-Turbo-my-voice")
audio = tts.infer("Không cần audio mẫu nữa.", voice="Giọng của tôi")
```

Có thể chạy `make_voice.py` nhiều lần với `--name` khác nhau để đóng gói nhiều giọng.

## Cấu trúc code

```
finetune/
  prepare_dataset.py   audio + text  →  train.parquet
  train_lora.py        train LoRA (peft)
  merge_lora.py        adapter + base  →  model đầy đủ, tuỳ chọn push Hub
  make_voice.py        clip  →  voices_v3_turbo.json
  vieneu_lora/
    data.py            dựng chuỗi token 2 chiều và nhãn từ một hàng dữ liệu
    model.py           forward teacher-forcing + loss trên model của SDK
    lora.py            gắn, lưu, nạp, merge, export LoRA
```
