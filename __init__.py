from .invert_image_node import InvertImageNode
from .color_palette_node import ColorPaletteExtractor

NODE_CLASS_MAPPINGS = {
    "Invert Image Node Sample": InvertImageNode,
    "Color Palette Extractor": ColorPaletteExtractor
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "WEB_DIRECTORY"]