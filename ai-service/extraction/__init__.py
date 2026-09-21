"""
Extraction package for AI Project Memory Assistant.
Extracts structured technical memories (decisions, problems, solutions, constraints, reasons)
from developer <-> AI conversations.
"""

from .extractor import (
    MemoryType,
    MemoryItem,
    ExtractionResult,
    ConversationExtractor,
    extract_memories,
)

__all__ = [
    "MemoryType",
    "MemoryItem",
    "ExtractionResult",
    "ConversationExtractor",
    "extract_memories",
]
