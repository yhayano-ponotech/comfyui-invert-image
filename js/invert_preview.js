import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

/**
 * 画像反転ノードのプレビュー機能を実装する拡張機能
 */
app.registerExtension({
    name: "Comfy.InvertImagePreview",
    
    /**
     * ノード定義の登録前に呼び出される処理
     * @param {Object} nodeType - ノードの型定義
     * @param {Object} nodeData - ノードのデータ
     * @param {Object} app - ComfyUIのアプリケーションインスタンス
     */
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // InvertImageノードの場合のみ処理を行う
        if (nodeType.comfyClass !== "InvertImage") return;

        /**
         * プレビューホストを作成する関数
         * @param {Object} node - ノードインスタンス
         * @returns {Object} プレビューホストのインターフェース
         */
        function createPreviewHost(node) {
            // プレビュー用のコンテナ要素を作成
            const container = document.createElement("div");
            container.className = "comfy-img-preview";
            // コンテナのスタイル設定
            container.style.minHeight = "200px";
            container.style.minWidth = "100px";
            container.style.maxHeight = "300px";
            container.style.backgroundColor = "#1e1e1e";
            container.style.display = "flex";
            container.style.justifyContent = "center";
            container.style.alignItems = "center";
            container.style.marginTop = "10px";
            container.style.overflow = "hidden";

            // 現在表示中の画像の参照を保持
            let currentImages = null;
            let firstUpdate = true;

            /**
             * プレビュー画像のサイズを更新する関数
             * ノードのサイズに合わせて画像を適切にスケーリングします
             */
            function updatePreviewSize() {
                if (!currentImages) return;

                const nodeWidth = node.size[0];
                const containerHeight = container.clientHeight;

                // 最初の更新時は最小高さを設定
                if (firstUpdate) {
                    firstUpdate = false;
                    if (containerHeight < 200) {
                        container.style.minHeight = "200px";
                    }
                }

                // アスペクト比を保持しながら、プレビュー画像のサイズを計算
                const { naturalWidth, naturalHeight } = currentImages[0];
                const scale = Math.min(
                    (nodeWidth - 20) / naturalWidth,    // 横幅に合わせたスケール
                    containerHeight / naturalHeight,     // 高さに合わせたスケール
                    1                                   // 最大スケール（等倍）
                );

                // 計算したサイズを適用
                const width = Math.floor(naturalWidth * scale);
                const height = Math.floor(naturalHeight * scale);

                // バッチ内の全画像にサイズを適用
                currentImages.forEach(img => {
                    img.style.width = width + "px";
                    img.style.height = height + "px";
                    img.style.objectFit = "contain";  // アスペクト比を保持
                });
            }

            // プレビューホストのインターフェースを返す
            return {
                element: container,  // DOM要素
                
                /**
                 * プレビュー画像を更新する関数
                 * @param {Array<HTMLImageElement>} imgs - 新しい画像要素の配列
                 */
                updateImages(imgs) {
                    if (imgs !== currentImages) {
                        // 画像を更新
                        container.replaceChildren(...imgs);
                        currentImages = imgs;
                        // サイズ更新を次のフレームで実行
                        requestAnimationFrame(() => {
                            updatePreviewSize();
                        });
                        // ノードのリサイズイベントを発火
                        node.onResize?.(node.size);
                    }
                },
                
                // サイズ更新関数を外部に公開
                updateSize: updatePreviewSize
            };
        }

        // ノード作成時の処理をカスタマイズ
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);
            
            // プレビューホストを作成してノードに追加
            this.previewHost = createPreviewHost(this);
            // 最初のウィジェットの要素にプレビューを追加
            this.widgets?.length && this.widgets[0].element.appendChild(this.previewHost.element);

            return result;
        };

        // ノードのサイズ変更時の処理をカスタマイズ
        const onResize = nodeType.prototype.onResize;
        nodeType.prototype.onResize = function(size) {
            const result = onResize?.apply(this, arguments);
            // プレビューのサイズを更新
            this.previewHost?.updateSize();
            return result;
        };

        // ノードの実行完了時の処理をカスタマイズ
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = async function(message) {
            const result = onExecuted?.apply(this, arguments);
            
            // UIメッセージに画像情報が含まれている場合
            if (message?.ui?.images) {
                try {
                    // 全ての画像を非同期で読み込む
                    const images = await Promise.all(
                        message.ui.images.map(async (img) => {
                            // 画像URLを生成
                            const url = api.apiURL(`/view?filename=${encodeURIComponent(img.filename)}&type=${img.type}`);
                            const imgElement = new Image();
                            imgElement.src = url;
                            // 画像の読み込み完了を待つ
                            return new Promise((resolve, reject) => {
                                imgElement.onload = () => resolve(imgElement);
                                imgElement.onerror = reject;
                            });
                        })
                    );
                    // プレビューを更新
                    this.previewHost.updateImages(images);
                } catch (error) {
                    console.error("Failed to update preview:", error);
                }
            }

            return result;
        };
    }
});