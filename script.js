/**
 * Lyric Technique Visualizer - Logic
 */

// テクニックの定義
const techniques = {
    vibrato: { char: '~', label: 'ビブラート', class: 'tech-vibrato', type: 'range', colorVar: '--color-vibrato' },
    whisper: { char: '-', label: 'ウィスパー', class: 'tech-whisper', type: 'range', colorVar: '--color-whisper' },
    falsetto: { char: '^', label: '裏声', class: 'tech-falsetto', type: 'range', colorVar: '--color-falsetto' },
    edge: { char: ':', label: 'エッジボイス', class: 'tech-edge', type: 'range', colorVar: '--color-edge' },
    shakuri: { char: "'", label: 'しゃくり', class: 'tech-shakuri', type: 'single' },
    fall: { char: '"', label: 'フォール', class: 'tech-fall', type: 'single' }
};

const editor = document.getElementById('main-editor');
const preview = document.getElementById('preview-area');
const techList = document.getElementById('tech-list');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const songTitleInput = document.getElementById('song-title');

// 初期化
function init() {
    renderSettings();
    setupEventListeners();
}

// 設定パネルの生成
function renderSettings() {
    techList.innerHTML = '';
    Object.entries(techniques).forEach(([key, tech]) => {
        if (tech.type === 'range') {
            const item = document.createElement('div');
            item.className = 'tech-setting-item';
            
            const initialColor = getComputedStyle(document.documentElement).getPropertyValue(tech.colorVar).trim();
            
            item.innerHTML = `
                <label>${tech.label} (${tech.char})</label>
                <input type="color" data-tech-key="${key}" data-var="${tech.colorVar}" value="${rgbToHex(initialColor)}">
            `;
            techList.appendChild(item);
        }
    });

    // 色変更イベント
    techList.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', (e) => {
            document.documentElement.style.setProperty(e.target.dataset.var, e.target.value);
        });
    });
}

// イベントリスナー
function setupEventListeners() {
    editor.addEventListener('input', () => {
        updatePreview();
    });

    exportBtn.addEventListener('click', exportToFile);
    importInput.addEventListener('change', importFromFile);
}

/**
 * プレビューの更新
 */
function updatePreview() {
    let content = editor.value;
    const lines = content.split('\n');
    
    const processedLines = lines.map(line => {
        let processedLine = line;

        // 範囲指定テクニック
        Object.entries(techniques).forEach(([key, tech]) => {
            if (tech.type === 'range') {
                const escapedChar = escapeRegExp(tech.char);
                const regex = new RegExp(`${escapedChar}([^${escapedChar}]+)${escapedChar}`, 'g');
                processedLine = processedLine.replace(regex, `|${key}:$1|`);
            }
        });

        // 単一文字テクニック
        Object.entries(techniques).forEach(([key, tech]) => {
            if (tech.type === 'single') {
                const escapedChar = escapeRegExp(tech.char);
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
                return `<span class="${tech.class}">${text}</span>`;
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
    
    // 現在のテクニック設定（色）を取得
    const settings = {};
    Object.entries(techniques).forEach(([key, tech]) => {
        if (tech.colorVar) {
            settings[key] = getComputedStyle(document.documentElement).getPropertyValue(tech.colorVar).trim();
        }
    });

    const metadata = {
        title: title,
        settings: settings,
        exportedAt: new Date().toISOString()
    };

    // メタデータをヘッダーとして追加したファイル内容
    const fileContent = `---METADATA---
${JSON.stringify(metadata)}
---CONTENT---
${content}`;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // ファイル名に曲名を反映
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
                // メタデータと歌詞本体を分離
                const metadataMatch = fullContent.match(/^---METADATA---\n([\s\S]*?)\n---CONTENT---\n([\s\S]*)$/);
                
                if (metadataMatch) {
                    const metadata = JSON.parse(metadataMatch[1]);
                    const lyrics = metadataMatch[2];

                    // 曲名を復元
                    if (metadata.title) {
                        songTitleInput.value = metadata.title;
                    }

                    // テクニック設定（色）を復元
                    if (metadata.settings) {
                        Object.entries(metadata.settings).forEach(([key, color]) => {
                            const tech = techniques[key];
                            if (tech && tech.colorVar) {
                                document.documentElement.style.setProperty(tech.colorVar, color);
                            }
                        });
                        // UI（カラーピッカー）を再描画して色を同期
                        renderSettings();
                    }

                    editor.value = lyrics;
                } else {
                    throw new Error("Invalid format");
                }
            } catch (err) {
                console.error('メタデータのパースに失敗しました。通常のテキストとして読み込みます。', err);
                editor.value = fullContent;
            }
        } else {
            // メタデータがない場合はそのまま読み込む
            editor.value = fullContent;
        }
        
        updatePreview();
    };
    reader.readAsText(file);
    // 同じファイルを再度選択できるようにリセット
    e.target.value = '';
}

// ヘルパー関数: 正規表現のエスケープ
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ヘルパー関数: RGBをHexに変換 (カラーピッカー用)
function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#ffffff';
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

// 実行
init();
