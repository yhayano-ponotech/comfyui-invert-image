from .invert_image_node import InvertImageNode

NODE_CLASS_MAPPINGS = {
    "Invert Image Node Sample": InvertImageNode
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "WEB_DIRECTORY"]