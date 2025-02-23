import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// パレット表示用のカスタムウィジェットを定義
class ColorPaletteWidget {
    constructor() {
        // ウィジェットのHTMLコンテナを作成
        this.element = document.createElement("div");
        this.element.style.padding = "10px";
        this.element.style.backgroundColor = "#ffffff";
        this.element.style.borderRadius = "5px";
        this.element.style.margin = "10px";
        this.element.style.display = "none";  // 初期状態は非表示
        
        // タイトル
        this.title = document.createElement("div");
        this.title.style.marginBottom = "10px";
        this.title.style.fontWeight = "bold";
        this.element.appendChild(this.title);
        
        // カラーパレット表示エリア
        this.paletteArea = document.createElement("div");
        this.paletteArea.style.display = "flex";
        this.paletteArea.style.gap = "5px";
        this.element.appendChild(this.paletteArea);
        
        // ComfyUIのサイドパネルに追加
        const sidePanel = document.querySelector('.comfy-menu');
        if (sidePanel) {
            sidePanel.appendChild(this.element);
        }
    }
    
    // パレットを更新
    updatePalette(colors, message) {
        this.element.style.display = "block";  // 表示する
        this.title.textContent = message;
        
        // パレットエリアをクリア
        this.paletteArea.innerHTML = "";
        
        // 各色のスウォッチを作成
        colors.forEach(color => {
            const swatch = document.createElement("div");
            const rgb = color.map(v => Math.round(v * 255));
            
            // スウォッチのスタイル
            swatch.style.width = "40px";
            swatch.style.height = "40px";
            swatch.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
            swatch.style.border = "1px solid #ccc";
            swatch.style.borderRadius = "3px";
            swatch.style.cursor = "pointer";
            
            // RGBコードのツールチップ
            swatch.title = `RGB: ${rgb.join(", ")}`;
            
            // クリックでRGBコードをコピー
            swatch.onclick = () => {
                const text = `rgb(${rgb.join(", ")})`;
                navigator.clipboard.writeText(text);
                // コピー成功を視覚的にフィードバック
                swatch.style.transform = "scale(0.9)";
                setTimeout(() => swatch.style.transform = "", 200);
            };
            
            this.paletteArea.appendChild(swatch);
        });
    }
}

// 拡張を登録
app.registerExtension({
    name: "Comfy.ColorPalette",
    async setup() {
        // パレットウィジェットのインスタンスを作成
        const paletteWidget = new ColorPaletteWidget();
        
        // サーバーからのメッセージを受け取るリスナーを設定
        api.addEventListener("color.palette.update", (event) => {
            const { colors, message } = event.detail;
            paletteWidget.updatePalette(colors, message);
        });
    }
});