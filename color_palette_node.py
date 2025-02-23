import torch
import numpy as np
from server import PromptServer

class ColorPaletteExtractor:
    """画像から代表的な色を抽出し、UIにパレットとして表示するノード"""
    
    CATEGORY = "image/analysis"

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE", ),  # 入力画像
                "num_colors": (
                    ["3", "5", "7"],  # 抽出する色の数をドロップダウンで選択
                    {"default": "5"}
                ),
            },
        }

    RETURN_TYPES = ("IMAGE",)  # 入力画像をそのまま返す
    FUNCTION = "extract_palette"

    def extract_palette(self, image, num_colors):
        # バッチの最初の画像だけを使用
        img = image[0]
        
        # 画像データを[H*W, 3]の形状に変形
        pixels = img.reshape(-1, 3)
        
        # ピクセル数を減らしてk-meansを高速化
        num_samples = 1000
        if pixels.shape[0] > num_samples:
            indices = np.random.choice(pixels.shape[0], num_samples, replace=False)
            pixel_samples = pixels[indices]
        else:
            pixel_samples = pixels

        # k-meansでクラスタリング
        num_colors = int(num_colors)  # str -> int
        clusters = self.kmeans_cluster(pixel_samples, num_colors)
        
        # クラスタの中心を代表色として使用
        palette = clusters.round(3).tolist()  # RGB値を3桁に丸める

        # フロントエンドにパレット情報を送信
        PromptServer.instance.send_sync(
            "color.palette.update",
            {
                "colors": palette,
                "message": f"Extracted {num_colors} colors from image"
            }
        )
        
        return (image,)  # 入力画像をそのまま返す

    def kmeans_cluster(self, pixels, k, max_iters=20):
        """Simple k-means clustering implementation"""
        # ランダムに初期クラスタ中心を選択
        centroids = pixels[np.random.choice(len(pixels), k, replace=False)]
        
        for _ in range(max_iters):
            # 各ピクセルを最も近いクラスタに割り当て
            distances = torch.cdist(torch.tensor(pixels), torch.tensor(centroids))
            labels = torch.argmin(distances, dim=1)
            
            # クラスタ中心を更新
            new_centroids = torch.zeros_like(torch.tensor(centroids))
            for i in range(k):
                mask = (labels == i)
                if mask.any():
                    new_centroids[i] = pixels[mask].mean(dim=0)
                else:
                    new_centroids[i] = centroids[i]
            
            # 収束チェック
            if torch.allclose(torch.tensor(centroids), new_centroids):
                break
                
            centroids = new_centroids.numpy()
        
        return centroids