import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// プレビューコンポーネントの実装
const InvertPreview = () => {
    const [previewUrl, setPreviewUrl] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);

    // プレビュー画像を更新する関数
    const updatePreview = React.useCallback((nodeId, imageData) => {
        if (!imageData) {
            setPreviewUrl(null);
            return;
        }
        setIsLoading(true);

        // 画像データをBase64エンコードしてプレビュー表示
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imageWidth = imageData[0].shape[2];
        const imageHeight = imageData[0].shape[1];
        
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        
        const imageDataArray = new Uint8ClampedArray(imageWidth * imageHeight * 4);
        
        for (let i = 0; i < imageHeight; i++) {
            for (let j = 0; j < imageWidth; j++) {
                const pixelIndex = (i * imageWidth + j) * 4;
                imageDataArray[pixelIndex] = imageData[0].data[i][j][0] * 255;     // R
                imageDataArray[pixelIndex + 1] = imageData[0].data[i][j][1] * 255; // G
                imageDataArray[pixelIndex + 2] = imageData[0].data[i][j][2] * 255; // B
                imageDataArray[pixelIndex + 3] = 255; // Alpha
            }
        }
        
        const imgData = new ImageData(imageDataArray, imageWidth, imageHeight);
        ctx.putImageData(imgData, 0, 0);
        
        setPreviewUrl(canvas.toDataURL());
        setIsLoading(false);
    }, []);

    return (
        <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
            {isLoading ? (
                <div>Loading...</div>
            ) : previewUrl ? (
                <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain"
                />
            ) : (
                <div className="text-gray-400">No preview available</div>
            )}
        </div>
    );
};

// ComfyUIに拡張機能を登録
app.registerExtension({
    name: "Comfy.InvertImagePreview",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // InvertImageノードの場合のみ処理を行う
        if (nodeType.comfyClass !== "InvertImage") return;

        // プレビューコンポーネントをノードに追加
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);
            
            // プレビューコンポーネントをマウント
            this.previewElement = document.createElement("div");
            this.previewElement.style.width = "200px";
            this.previewElement.style.height = "160px";
            this.previewElement.style.padding = "10px";
            this.widget.element.appendChild(this.previewElement);

            // Reactコンポーネントをレンダリング
            this.previewComponent = React.createElement(InvertPreview);
            ReactDOM.render(this.previewComponent, this.previewElement);

            return result;
        };

        // 実行完了時のイベントハンドラを追加
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function(message) {
            const result = onExecuted?.apply(this, arguments);
            
            // 出力画像データがある場合、プレビューを更新
            if (message?.output?.image_out) {
                this.previewElement._reactRootContainer._internalRoot.current.child.updatePreview(
                    this.id,
                    message.output.image_out
                );
            }

            return result;
        };
    }
});