/**
 * Làm sạch văn bản câu thoại: loại bỏ dấu ngoặc kép thừa, nhãn kịch bản,...
 */
function cleanDialogueText(text) {
  if (!text) return '';
  return text
    .replace(/^(?:Script|Script line|Lời thoại|Dialogue)\s*:\s*/i, '')
    .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
    .trim();
}

/**
 * Kiểm tra xem một dòng có phải là dòng rác / metadata không phải lời thoại không
 */
function isMetadataLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^[─\-—=_*]{3,}$/.test(trimmed)) return true;
  if (/^(?:THUMBNAIL|Reason|Thumbnail Prompt|Image Prompt|Prompt)\b/i.test(trimmed)) return true;
  return false;
}

/**
 * Phân tích nội dung file script thành danh sách các scenes
 * Hỗ trợ cả file có nhãn SCENE 1..N và file văn bản thuần
 */
function parseScript(scriptContent) {
  if (!scriptContent || !scriptContent.trim()) return [];

  const scenes = [];
  const rawLines = scriptContent.split(/\r?\n/).map(l => l.trim());

  let currentScene = null;
  let inImagePrompt = false;

  for (const line of rawLines) {
    if (!line) {
      inImagePrompt = false;
      continue;
    }

    const sceneMatch = line.match(/^(?:SCENE|PHÂN CẢNH|CẢNH)\s+(\d+)/i);
    if (sceneMatch) {
      if (currentScene && currentScene.text) {
        currentScene.text = cleanDialogueText(currentScene.text);
        scenes.push(currentScene);
      }
      currentScene = {
        scene: parseInt(sceneMatch[1], 10),
        text: ''
      };
      inImagePrompt = false;
      continue;
    }

    // Nếu gặp dòng bắt đầu Image Prompt, bỏ qua cho tới hết block
    if (/^(?:Image Prompt|Thumbnail Prompt|Prompt|Reason)\b/i.test(line)) {
      inImagePrompt = true;
      continue;
    }

    if (inImagePrompt || isMetadataLine(line)) {
      continue;
    }

    if (currentScene) {
      const cleaned = cleanDialogueText(line);
      if (cleaned) {
        if (currentScene.text) {
          currentScene.text += ' ' + cleaned;
        } else {
          currentScene.text = cleaned;
        }
      }
    }
  }

  if (currentScene && currentScene.text) {
    currentScene.text = cleanDialogueText(currentScene.text);
    scenes.push(currentScene);
  }

  // Fallback 1: Nếu không có tag SCENE, thử tách theo các đoạn văn bản (paragraphs)
  if (scenes.length === 0) {
    const paragraphs = scriptContent
      .split(/\n\s*\n+/)
      .map(p => cleanDialogueText(p.replace(/\r?\n+/g, ' ')))
      .filter(p => p && !isMetadataLine(p));

    if (paragraphs.length > 0) {
      console.log(`[ScriptParser] Nhận diện ${paragraphs.length} scenes theo đoạn văn.`);
      paragraphs.forEach((text, index) => {
        scenes.push({
          scene: index + 1,
          text
        });
      });
    }
  }

  // Fallback 2: Tách theo từng dòng đơn lẻ
  if (scenes.length === 0) {
    const validLines = rawLines
      .filter(l => l && !isMetadataLine(l))
      .map(cleanDialogueText)
      .filter(Boolean);

    console.log(`⚠️ Nhận diện ${validLines.length} scenes theo từng dòng.`);
    validLines.forEach((text, index) => {
      scenes.push({
        scene: index + 1,
        text
      });
    });
  }

  return scenes;
}

module.exports = { parseScript };
