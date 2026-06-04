/**
 * Lyric Technique Visualizer - Logic
 */

// テクニックの初期定義
let techniques = {
    vibrato: { char: '~', label: 'ビブラート', type: 'range', color: '#e3f2fd' },
    whisper: { char: '-', label: 'ウィスパー', type: 'range', color: '#f3e5f5' },
    falsetto: { char: '^', label: '裏声', type: 'range', color: '#fff3e0' },
    edge: { char: ':', label: 'エッジボイス', type: 'range', color: '#ffebee' },
    shakuri: { char: "'", label: 'しゃくり', type: 'single', symbol: '⤴', position: 'above' },
    fall: { char: '"', label: 'フォール', type: 'single', symbol: '⤵', position: 'above' }
};

const editor = document.getElementById('main-editor');
const preview = document.getElementById('preview-area');
const techList = document.getElementById('tech-list');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const songTitleInput = document.getElementById('song-title');

// モーダル関連
const addTechBtn = document.getElementById('add-tech-btn');
const techModal = document.getElementById('tech-modal');
const cancelTechBtn = document.getElementById('cancel-tech-btn');
const saveTechBtn = document.getElementById('save-tech-btn');
const newTechType = document.getElementById('new-tech-type');
const newTechExtra = document.getElementById('new-tech-extra-fields');
const newTechPosField = document.getElementById('new-tech-position-field');
const newTechPos = document.getElementById('new-tech-position');

// 初期化
function init() {
    updateDynamicStyles();
    renderSettings();
    setupEventListeners();
}

// 動的スタイルの生成
function updateDynamicStyles() {
    let styleTag = document.getElementById('dynamic-tech-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-tech-styles';
        document.head.appendChild(styleTag);
    }

    let css = '';
    Object.entries(techniques).forEach(([key, tech]) => {
        if (tech.type === 'range') {
            css += `.tech-${key} { background-color: ${tech.color}; border-radius: 2px; padding: 2px 0; }\n`;
        } else if (tech.type === 'single') {
            css += `.tech-${key} { position: relative; display: inline-block; }\n`;
            if (tech.position === 'above') {
                css += `.tech-${key}::before { content: "${tech.symbol}"; position: absolute; top: -1.2em; left: 50%; transform: translateX(-50%); font-size: 0.7em; color: #666; }\n`;
            } else {
                // 文字の横（間）に表示
                css += `.tech-${key}::after { content: "${tech.symbol}"; font-size: 0.8em; color: #888; margin-left: 2px; vertical-align: middle; }\n`;
            }
        }
    });
    styleTag.textContent = css;
}

// 設定パネルの生成
function renderSettings() {
    techList.innerHTML = '';
    Object.entries(techniques).forEach(([key, tech]) => {
        const item = document.createElement('div');
        item.className = 'tech-setting-item';
        
        let extraInput = '';
        if (tech.type === 'range') {
            extraInput = `<input type="color" data-key="${key}" value="${rgbToHex(tech.color)}">`;
        } else {
            extraInput = `<input type="text" data-key="${key}" value="${tech.symbol}" style="width: 30px; text-align: center;">`;
        }

        item.innerHTML = `
            <label>${tech.label} (${tech.char})</label>
            ${extraInput}
            <button class="btn-small btn-delete" data-key="${key}">×</button>
        `;
        techList.appendChild(item);
    });

    // 値変更イベント
    techList.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const key = e.target.dataset.key;
            if (techniques[key].type === 'range') {
                techniques[key].color = e.target.value;
            } else {
                techniques[key].symbol = e.target.value;
            }
            updateDynamicStyles();
            updatePreview();
        });
    });

    // 削除イベント
    techList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            delete techniques[key];
            renderSettings();
            updateDynamicStyles();
            updatePreview();
        });
    });
}

// イベントリスナー
function setupEventListeners() {
    editor.addEventListener('input', updatePreview);
    exportBtn.addEventListener('click', exportToFile);
    importInput.addEventListener('change', importFromFile);

    // モーダル操作
    addTechBtn.addEventListener('click', () => {
        techModal.style.display = 'flex';
        updateNewTechFields();
    });
    cancelTechBtn.addEventListener('click', () => { techModal.style.display = 'none'; });
    newTechType.addEventListener('change', updateNewTechFields);
    saveTechBtn.addEventListener('click', saveNewTechnique);
}

function updateNewTechFields() {
    const type = newTechType.value;
    if (type === 'range') {
        newTechPosField.style.display = 'none';
        newTechExtra.innerHTML = `
            <div class="form-group">
                <label>デフォルト色:</label>
                <input type="color" id="new-tech-color" value="#e3f2fd">
            </div>
        `;
    } else {
        newTechPosField.style.display = 'block';
        newTechExtra.innerHTML = `
            <div class="form-group">
                <label>表示記号 (例: ⤴, v, (b)):</label>
                <input type="text" id="new-tech-symbol" placeholder="記号">
            </div>
        `;
    }
}

function saveNewTechnique() {
    const label = document.getElementById('new-tech-label').value;
    const char = document.getElementById('new-tech-char').value;
    const type = newTechType.value;
    
    if (!label || !char) return alert('名前と記号を入力してください');
    
    const key = `custom_${Date.now()}`;
    const newTech = { label, char, type };
    
    if (type === 'range') {
        newTech.color = document.getElementById('new-tech-color').value;
    } else {
        newTech.symbol = document.getElementById('new-tech-symbol').value;
        newTech.position = newTechPos.value;
    }

    techniques[key] = newTech;
    
    techModal.style.display = 'none';
    renderSettings();
    updateDynamicStyles();
    updatePreview();
    
    // フォームリセット
    document.getElementById('new-tech-label').value = '';
    document.getElementById('new-tech-char').value = '';
}

/**
 * プレビューの更新
 */
function updatePreview() {
    let content = editor.value;
    const lines = content.split('\n');
    
    const processedLines = lines.map(line => {
        let processedLine = line;

        // 記号のパース（内部表現への一時変換）
        // techniquesの順序で置換すると干渉する可能性があるため、一旦キーベースのタグにする
        Object.entries(techniques).forEach(([key, tech]) => {
            const escapedChar = escapeRegExp(tech.char);
            if (tech.type === 'range') {
                const regex = new RegExp(`${escapedChar}([^${escapedChar}]+)${escapedChar}`, 'g');
                processedLine = processedLine.replace(regex, `|${key}:$1|`);
            } else if (tech.type === 'single') {
                const regex = new RegExp(`(.)[${escapedChar}]`, 'g');
                processedLine = processedLine.replace(regex, `|${key}:$1|`);
            }
        });

        return processedLine;
    });

    const htmlLines = processedLines.map(line => {
        let html = line;
        const internalRegex = /\|([^:]+):([^|]+)\|/g;
        html = html.replace(internalRegex, (match, key, text) => {
            const tech = techniques[key];
            if (tech) {
                return `<span class="tech-${key}">${text}</span>`;
            }
            return text;
        });
        return html || ' ';
    });

    preview.innerHTML = htmlLines.join('\n');
}

// ファイルへのエクスポート
function exportToFile() {
    const title = songTitleInput.value.trim() || 'untitled';
    const content = editor.value;
    
    const metadata = {
        title: title,
        techniques: techniques,
        exportedAt: new Date().toISOString()
    };

    const fileContent = `---METADATA---
${JSON.stringify(metadata)}
---CONTENT---
${content}`;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ファイルからのインポート
function importFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const fullContent = event.target.result;
        
        if (fullContent.startsWith('---METADATA---')) {
            try {
                const metadataMatch = fullContent.match(/^---METADATA---\n([\s\S]*?)\n---CONTENT---\n([\s\S]*)$/);
                
                if (metadataMatch) {
                    const metadata = JSON.parse(metadataMatch[1]);
                    const lyrics = metadataMatch[2];

                    if (metadata.title) songTitleInput.value = metadata.title;
                    
                    if (metadata.techniques) {
                        techniques = metadata.techniques;
                        updateDynamicStyles();
                        renderSettings();
                    }

                    editor.value = lyrics;
                }
            } catch (err) {
                console.error('Import error:', err);
                editor.value = fullContent;
            }
        } else {
            editor.value = fullContent;
        }
        updatePreview();
    };
    reader.readAsText(file);
    e.target.value = '';
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#ffffff';
    function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

init();
