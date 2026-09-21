"""
Unit tests for AI Project Memory Assistant extraction service.
Tests prompt loading, Pydantic validation, JSON repair, and extraction flows.
"""

import json
from pathlib import Path
import pytest
from pydantic import ValidationError

from extraction.extractor import (
    MemoryType,
    MemoryItem,
    ExtractionResult,
    ConversationExtractor,
    MockProvider,
    BaseLLMProvider,
    clean_json_text,
    parse_memories_json,
    load_extraction_prompt,
    get_prompt_path,
)


def test_prompt_file_exists_and_loads():
    """Verify that extraction_prompt.txt exists and loads correctly."""
    prompt_path = get_prompt_path()
    assert prompt_path.exists(), f"Prompt file not found at {prompt_path}"

    prompt_content = load_extraction_prompt()
    assert len(prompt_content) > 100
    assert "{{transcript}}" in prompt_content
    assert "decision" in prompt_content
    assert "problem" in prompt_content
    assert "solution" in prompt_content


def test_memory_item_pydantic_validation():
    """Verify MemoryItem model validation and alias handling."""
    valid_data = {
        "type": "decision",
        "title": "Use MongoDB Atlas Vector Search",
        "summary": "Decided to store embeddings in MongoDB Atlas M0 collection.",
        "reason": "Reduces infrastructure cost to $0.",
        "rawExcerpt": "Let's use Atlas Vector Search directly.",
        "relatedDecisions": ["Database Selection"],
        "constraints": ["Free tier 512MB limit"],
        "tags": ["mongodb", "vector-search", "database"],
    }

    item = MemoryItem.model_validate(valid_data)
    assert item.type == MemoryType.DECISION
    assert item.title == "Use MongoDB Atlas Vector Search"
    assert item.raw_excerpt == "Let's use Atlas Vector Search directly."
    assert "mongodb" in item.tags

    # Invalid type should raise ValidationError
    with pytest.raises(ValidationError):
        MemoryItem.model_validate({
            "type": "invalid_type",
            "title": "Bad Type",
            "summary": "Should fail",
        })


def test_clean_json_text_markdown_fences():
    """Test that markdown code fences and extraneous text are cleaned."""
    dirty_json = """
Here is the extracted information from your conversation:
```json
{
  "memories": [
    {
      "type": "problem",
      "title": "Memory limit exceeded",
      "summary": "M0 instance has 512MB RAM cap.",
      "tags": ["mongo", "memory",]
    }
  ]
}
```
Hope this helps!
"""
    cleaned = clean_json_text(dirty_json)
    parsed = json.loads(cleaned)
    assert "memories" in parsed
    assert parsed["memories"][0]["title"] == "Memory limit exceeded"


def test_parse_memories_json():
    """Test parsing and normalizing JSON list into MemoryItem models."""
    sample_payload = json.dumps({
        "memories": [
            {
                "type": "decision",
                "title": "Switch to GraphQL",
                "summary": "Replaced REST with GraphQL for flexible queries.",
                "rawExcerpt": "Let's migrate to GraphQL.",
                "tags": ["api", "graphql"],
            },
            {
                "type": "constraint",
                "title": "Free Tier Only",
                "summary": "All third-party services must be 100% free.",
                "tags": ["budget", "free-tier"],
            },
        ]
    })

    items = parse_memories_json(sample_payload)
    assert len(items) == 2
    assert items[0].type == MemoryType.DECISION
    assert items[1].type == MemoryType.CONSTRAINT


def test_mock_extractor_pipeline():
    """Test end-to-end extraction with mock provider."""
    transcript = """
Developer: We decided to switch from REST to GraphQL because our mobile client needed flexible field queries.
AI: That will help eliminate over-fetching data.
Developer: Render free tier puts our Node API to sleep after 15 minutes of idle time.
AI: We can set up a scheduled ping every 10 minutes to keep the instance warm before the viva.
"""
    extractor = ConversationExtractor(provider=MockProvider())
    result = extractor.extract(transcript)

    assert isinstance(result, ExtractionResult)
    assert result.provider == "mock"
    assert len(result.memories) >= 2

    types = {m.type for m in result.memories}
    assert MemoryType.DECISION in types
    assert MemoryType.PROBLEM in types or MemoryType.SOLUTION in types


def test_empty_transcript_handling():
    """Test extractor behavior with empty or blank input."""
    extractor = ConversationExtractor(provider=MockProvider())
    result = extractor.extract("   \n\t  ")
    assert len(result.memories) == 0


class DummyCustomProvider(BaseLLMProvider):
    name = "dummy"

    def complete(self, prompt: str) -> str:
        return json.dumps({
            "memories": [
                {
                    "type": "reason",
                    "title": "Why we chose Node.js",
                    "summary": "Unified language across frontend and backend simplifies development.",
                    "tags": ["nodejs", "javascript"],
                }
            ]
        })


def test_custom_provider_injection():
    """Test injecting a custom provider into ConversationExtractor."""
    extractor = ConversationExtractor(provider=DummyCustomProvider())
    result = extractor.extract("Sample dialogue")
    assert result.provider == "dummy"
    assert len(result.memories) == 1
    assert result.memories[0].type == MemoryType.REASON
    assert result.memories[0].title == "Why we chose Node.js"
