const fs = require('fs');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// The closing div of create-video-tab is just before:
// <!-- ══════════ TAB 4: AI IMAGE GENERATOR (ẩn trong menu) ══════════ -->
// We will find that comment and the closing </div> right above it.
const targetRegex = /<\/div>\s*<!-- ══════════ TAB 4: AI IMAGE GENERATOR \(ẩn trong menu\) ══════════ -->/s;
if (!targetRegex.test(content)) {
    console.log("Could not find insertion point.");
    process.exit(1);
}

// We need to cut:
// <!-- ══════════ PROGRESS VIEW ══════════ -->
// ... down to the end of <!-- ══════════ SUCCESS VIEW ══════════ --> (including its closing </div> which is just before <!-- ══════════ TAB 4: ĐĂNG & LÊN LỊCH YOUTUBE ══════════ -->)
const progressSuccessRegex = /(<!-- ══════════ PROGRESS VIEW ══════════ -->.*?)(\s*<!-- ══════════ TAB 4: ĐĂNG & LÊN LỊCH YOUTUBE ══════════ -->)/s;
const match = content.match(progressSuccessRegex);
if (!match) {
    console.log("Could not find progress/success blocks.");
    process.exit(1);
}

let blocksToMove = match[1];
// Remove them from current location
content = content.replace(blocksToMove, '');

// Also find error block
const errorRegex = /(<!-- ══════════ ERROR VIEW ══════════ -->.*?<\/div>\s*<\/div>)/s; // Error view is a bit fuzzy, let's just find <div id="error"...</div>
const errorMatch = content.match(/(\s*<div id="error".*?<\/div>)/s);
let errorBlock = '';
if (errorMatch) {
    // We must ensure we get the full div. error block is small.
    // Looking at index.html, error block is:
    // <div id="error" class="error-section" style="display: none;">
    //     <h2><i data-lucide="alert-triangle" class="btn-icon"></i> Có lỗi xảy ra</h2>
    //     <p id="errorMessage"></p>
    //     <button onclick="location.reload()" class="btn-secondary-action"><i data-lucide="refresh-cw" class="btn-icon"></i> Thử Lại</button>
    // </div>
    const exactErrorRegex = /(\s*<div id="error" class="error-section".*?<\/div>)/s;
    const exactMatch = content.match(exactErrorRegex);
    if (exactMatch) {
        errorBlock = exactMatch[1];
        content = content.replace(exactErrorRegex, '');
    }
}

// Combine blocks
const blocksToInsert = '\n' + blocksToMove + errorBlock + '\n';

// Insert before the closing </div> of create-video-tab
content = content.replace(targetRegex, blocksToInsert + '                    </div>\n\n                <!-- ══════════ TAB 4: AI IMAGE GENERATOR (ẩn trong menu) ══════════ -->');

fs.writeFileSync(htmlPath, content, 'utf8');
console.log("Successfully moved blocks into create-video-tab.");
