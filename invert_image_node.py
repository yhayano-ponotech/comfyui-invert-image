import torch
import numpy as np
from PIL import Image
import json
import random
import os
import folder_paths
from PIL.PngImagePlugin import PngInfo

class InvertImageNode:
    """画像を反転させるノードクラス
    
    このノードは入力画像の色を反転（ネガポジ反転）させます。
    また、ComfyUIの標準的なプレビュー機能を実装しています。
    """
    
    # ノードの基本設定
    CATEGORY = "example"  # UIメニューでの表示カテゴリ
    OUTPUT_NODE = True    # このノードが出力を持つことを示すフラグ（プレビュー機能に必要）

    @classmethod
    def INPUT_TYPES(cls):
        """ノードの入力定義
        
        Returns:
            dict: 必須入力とhidden入力を含む入力定義
        """
        return {
            "required": {
                "image_in": ("IMAGE", {
                    "tooltip": "入力画像です。この画像が反転されます。"
                })
            },
            # プロンプト情報とメタデータ用のhidden入力
            "hidden": {
                "prompt": "PROMPT",           # 生成時のプロンプト情報
                "extra_pnginfo": "EXTRA_PNGINFO"  # 追加のメタデータ
            }
        }

    # 出力の定義
    RETURN_TYPES = ("IMAGE",)     # 出力型の定義（画像型）
    RETURN_NAMES = ("image_out",) # 出力スロットのラベル名
    FUNCTION = "invert"           # 実行時に呼び出される関数名

    def __init__(self):
        """初期化メソッド
        
        一時ファイル保存用の設定を初期化します。
        """
        # 一時ファイル保存先ディレクトリの設定
        self.output_dir = folder_paths.get_temp_directory()
        self.type = "temp"  # ファイルタイプを一時ファイルとして指定
        
        # 一時ファイル名の重複を防ぐためのランダムな接尾辞を生成
        self.prefix_append = "_temp_" + ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for x in range(5))
        
        # PNG圧縮レベル（1=最速、9=最高圧縮）
        self.compress_level = 1  # プレビュー用なので高速化優先

    def invert(self, image_in, prompt=None, extra_pnginfo=None):
        """画像反転処理の主関数
        
        Args:
            image_in (torch.Tensor): 入力画像テンソル [B,H,W,C]
            prompt (dict, optional): 生成プロンプト情報
            extra_pnginfo (dict, optional): 追加のメタデータ
        
        Returns:
            dict: UI更新情報と処理結果を含む辞書
        """
        # 画像の反転処理（1から引くことで色を反転）
        image_out = 1.0 - image_in
        
        # プレビュー用の一時ファイル保存処理の開始
        results = []  # 保存した画像の情報を格納するリスト
        filename_prefix = "inverted"  # 基本ファイル名
        filename_prefix += self.prefix_append  # ランダムな接尾辞を追加
        
        # 保存先のパス情報を取得
        full_output_folder, filename, counter, subfolder, filename_prefix = folder_paths.get_save_image_path(
            filename_prefix,
            self.output_dir,
            image_out.shape[1],  # 画像の幅
            image_out.shape[0]   # 画像の高さ
        )

        # バッチ内の各画像を処理
        for batch_number, image in enumerate(image_out):
            # PyTorchテンソルをPIL Imageに変換
            i = 255. * image.cpu().numpy()  # 0-1の値を0-255にスケーリング
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            # メタデータの設定（プロンプトや追加情報）
            metadata = None
            if prompt is not None or extra_pnginfo is not None:
                metadata = PngInfo()
                if prompt is not None:
                    metadata.add_text("prompt", json.dumps(prompt))
                if extra_pnginfo is not None:
                    for x in extra_pnginfo:
                        metadata.add_text(x, json.dumps(extra_pnginfo[x]))

            # ファイル名を生成して画像を保存
            filename_with_batch = filename.replace("%batch_num%", str(batch_number))
            file = f"{filename_with_batch}_{counter:05}_.png"
            img.save(
                os.path.join(full_output_folder, file),
                pnginfo=metadata,
                compress_level=self.compress_level
            )
            
            # 保存した画像の情報を記録
            results.append({
                "filename": file,       # ファイル名
                "subfolder": subfolder, # サブフォルダ名
                "type": self.type       # ファイルタイプ（temp）
            })
            counter += 1

        # 処理結果を返す
        return {
            "ui": {"images": results},  # UI更新用の画像情報
            "result": (image_out,)      # ノードの出力値（次のノードへの入力として使用）
        }