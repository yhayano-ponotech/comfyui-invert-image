import torch
from server import PromptServer

class InvertImageNode:
    # カテゴリ名。UIの「Add Node」メニューでの配置先。
    CATEGORY = "example"

    # プレビュー機能を有効にするために、OUTPUT_NODEをTrueに設定
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_in": ("IMAGE", {})
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"  # ノードの一意なIDを取得するために必要
            }
        }

    # 出力はIMAGE型を1つ返す
    RETURN_TYPES = ("IMAGE", )
    RETURN_NAMES = ("image_out", )  # 出力スロットに付けるラベル(省略可)
    FUNCTION = "invert"

    def invert(self, image_in, unique_id):
        # image_inはtorch.Tensor ([B,H,W,C]) で来る
        # 0~1で正規化されているので、1 - values でピクセル反転可能
        image_out = 1.0 - image_in

        # プレビュー用のメタデータをフロントエンドに送信
        # 画像データの形状と実データを含める
        preview_data = {
            "image_out": {
                "shape": list(image_out.shape),
                "data": image_out.detach().cpu().numpy().tolist()
            }
        }
        
        # WebSocket経由でプレビューデータを送信
        PromptServer.instance.send_sync(
            "invert_preview",
            {
                "node_id": unique_id,
                "preview_data": preview_data
            }
        )

        return (image_out,)