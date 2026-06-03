function parseScript(scriptContent) {
  const scenes = [];
  const lines = scriptContent.split('\n').map(line => line.trim()).filter(line => line);

  let currentScene = null;
  let sceneNum = 0;

  for (const line of lines) {
    const sceneMatch = line.match(/^SCENE\s+(\d+)$/i);
    
    if (sceneMatch) {
      if (currentScene) {
        scenes.push(currentScene);
      }
      sceneNum = parseInt(sceneMatch[1]);
      currentScene = {
        scene: sceneNum,
        text: ''
      };
    } else if (currentScene && line) {
      if (currentScene.text) {
        currentScene.text += ' ' + line;
      } else {
        currentScene.text = line;
      }
    }
  }

  if (currentScene) {
    scenes.push(currentScene);
  }

  // Fallback: If no explicit "SCENE" tags are found, treat each non-empty line as a separate scene
  if (scenes.length === 0 && lines.length > 0) {
    console.log('⚠️ No explicit SCENE tags found in script. Falling back to line-by-line scene parsing.');
    lines.forEach((line, index) => {
      scenes.push({
        scene: index + 1,
        text: line
      });
    });
  }

  return scenes;
}

module.exports = { parseScript };

