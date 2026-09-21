"""
Conversation Extractor for AI Project Memory Assistant.

Extracts structured technical memories (decisions, reasons, problems,
solutions, constraints) from developer <-> AI conversation transcripts
and validates them against the project MongoDB schema.
"""

from __future__ import annotations

import json
import os
import re
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, ValidationError

# Load environment variables
load_dotenv()


class MemoryType(str, Enum):
    DECISION = "decision"
    PROBLEM = "problem"
    SOLUTION = "solution"
    CONSTRAINT = "constraint"
    REASON = "reason"


class MemoryItem(BaseModel):
    """Structured memory entity matching the MongoDB schema."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    type: MemoryType = Field(
        description="Category of the technical memory"
    )
    title: str = Field(
        description="Concise, descriptive title for the memory"
    )
    summary: str = Field(
        description="LLM-generated explanation of the memory and context"
    )
    reason: Optional[str] = Field(
        default=None,
        description="Underlying rationale or justification",
    )
    raw_excerpt: str = Field(
        default="",
        alias="rawExcerpt",
        description="Verbatim snippet from the original conversation",
    )
    related_decisions: List[str] = Field(
        default_factory=list,
        alias="relatedDecisions",
        description="References to related decisions, features, or components",
    )
    constraints: List[str] = Field(
        default_factory=list,
        description="Technical, financial, or environment constraints noted",
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Keywords or technology tags",
    )


class ExtractionResult(BaseModel):
    """Container for memories extracted from a conversation."""

    memories: List[MemoryItem] = Field(default_factory=list)
    provider: str = "unknown"
    model: Optional[str] = None
    raw_response: Optional[str] = None


def get_prompt_path() -> Path:
    """Returns absolute path to extraction_prompt.txt."""
    current_dir = Path(__file__).resolve().parent
    return current_dir.parent / "prompts" / "extraction_prompt.txt"


def load_extraction_prompt() -> str:
    """Loads extraction prompt template from file or falls back to built-in template."""
    prompt_path = get_prompt_path()
    if prompt_path.exists():
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    
    # Built-in fallback template
    return (
        "Extract technical memories (decision, problem, solution, constraint, reason) "
        "from this conversation in JSON format with key 'memories':\n\n{{transcript}}"
    )


def clean_json_text(raw_text: str) -> str:
    """Strips markdown code blocks, backticks, and extra commentary from LLM output."""
    text = raw_text.strip()

    # Match ```json ... ``` or ``` ... ```
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if code_block_match:
        text = code_block_match.group(1).strip()

    # If text still contains non-JSON prefix or suffix, isolate first { or [ to matching end
    start_brace = text.find("{")
    start_bracket = text.find("[")

    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        end_brace = text.rfind("}")
        if end_brace != -1:
            text = text[start_brace : end_brace + 1]
    elif start_bracket != -1:
        end_bracket = text.rfind("]")
        if end_bracket != -1:
            text = text[start_bracket : end_bracket + 1]

    # Clean up trailing commas before } or ]
    text = re.sub(r",\s*(\}|\])", r"\1", text)
    return text


def parse_memories_json(raw_text: str) -> List[MemoryItem]:
    """Parses and validates LLM output into a list of MemoryItem objects."""
    cleaned = clean_json_text(raw_text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ValueError(f"Failed to parse LLM response as JSON: {err}\nRaw text: {raw_text[:300]}") from err

    raw_items: List[Dict[str, Any]] = []
    if isinstance(data, dict):
        # Support {"memories": [...]}
        raw_items = data.get("memories", [])
        if not raw_items and "items" in data:
            raw_items = data.get("items", [])
    elif isinstance(data, list):
        raw_items = data

    validated_items: List[MemoryItem] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        try:
            # Normalize type string (lowercase and strip)
            if "type" in item and isinstance(item["type"], str):
                item["type"] = item["type"].strip().lower()
            validated = MemoryItem.model_validate(item)
            validated_items.append(validated)
        except ValidationError:
            # Skip or fix malformed individual items rather than dropping the whole payload
            continue

    return validated_items


class BaseLLMProvider:
    """Base interface for LLM extraction providers."""

    name: str = "base"

    def complete(self, prompt: str) -> str:
        raise NotImplementedError


class GeminiProvider(BaseLLMProvider):
    """Google Gemini API provider (generous free tier)."""

    name = "gemini"

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
        self.model = model
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def complete(self, prompt: str) -> str:
        url = f"{self.base_url}?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }
        with httpx.Client(timeout=45.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]


class GroqProvider(BaseLLMProvider):
    """Groq API provider (ultra-fast inference, free tier)."""

    name = "groq"

    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set.")
        self.model = model
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def complete(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a technical project memory extractor. Return valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }
        with httpx.Client(timeout=45.0) as client:
            response = client.post(self.endpoint, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]


class MockProvider(BaseLLMProvider):
    """Offline heuristic extractor for local dev and testing without API keys."""

    name = "mock"

    def complete(self, prompt: str) -> str:
        # Extract the transcript section
        marker = "### Conversation Transcript to Analyze:"
        transcript = prompt.split(marker)[-1] if marker in prompt else prompt
        transcript_lower = transcript.lower()

        memories = []

        # Detect decisions
        if "decided to" in transcript_lower or "switch from" in transcript_lower or "use" in transcript_lower:
            if "graphql" in transcript_lower and "rest" in transcript_lower:
                memories.append({
                    "type": "decision",
                    "title": "Migrate from REST to GraphQL API",
                    "summary": "Team decided to switch backend APIs from REST to GraphQL to reduce over-fetching and improve mobile client query efficiency.",
                    "reason": "REST endpoints required multiple roundtrips and returned bloated payloads for dashboard screens.",
                    "rawExcerpt": "We decided to switch from REST to GraphQL because our mobile client needed flexible field queries.",
                    "relatedDecisions": ["API Architecture", "Mobile Optimization"],
                    "constraints": ["Must support backward-compatible client versions"],
                    "tags": ["api", "graphql", "rest", "architecture"],
                })

            if "mongodb" in transcript_lower or "vector search" in transcript_lower:
                memories.append({
                    "type": "decision",
                    "title": "Adopt MongoDB Atlas Vector Search",
                    "summary": "Use MongoDB Atlas built-in Vector Search rather than a standalone vector database like Pinecone.",
                    "reason": "Atlas M0 tier includes vector indexing for free (512MB), keeping the stack unified and free-tier friendly.",
                    "rawExcerpt": "Let's use Atlas Vector Search directly so we don't need to spin up a separate Pinecone instance.",
                    "relatedDecisions": ["Database Selection", "RAG Pipeline"],
                    "constraints": ["Stay within 512MB free M0 tier"],
                    "tags": ["mongodb", "atlas", "vector-search", "database", "rag"],
                })

        # Detect problems and solutions
        if "cold start" in transcript_lower or "timeout" in transcript_lower or "sleep" in transcript_lower:
            memories.append({
                "type": "problem",
                "title": "Render Free-Tier Cold Start Delays",
                "summary": "Backend instance on Render sleeps after 15 minutes of inactivity, resulting in initial response latency of 30-50 seconds.",
                "reason": None,
                "rawExcerpt": "Render free tier puts our Node API to sleep after 15 minutes of idle time.",
                "relatedDecisions": ["Hosting Infrastructure"],
                "constraints": ["No paid hosting budget"],
                "tags": ["render", "hosting", "cold-start", "performance"],
            })
            memories.append({
                "type": "solution",
                "title": "Ping Cron Job to Keep Backend Warm",
                "summary": "Implement a periodic 10-minute ping using a lightweight cron job or GitHub Action to prevent Render instance sleep during demo periods.",
                "reason": "Eliminates embarrassing cold starts during project viva/presentations at zero cost.",
                "rawExcerpt": "We can set up a scheduled ping every 10 minutes to keep the instance warm before the viva.",
                "relatedDecisions": ["Hosting Infrastructure"],
                "constraints": ["Free tier only"],
                "tags": ["cron", "render", "uptime", "deployment"],
            })

        return json.dumps({"memories": memories}, indent=2)


class ConversationExtractor:
    """Main extractor coordinating prompt formatting, provider execution, and validation."""

    def __init__(
        self,
        provider: Optional[BaseLLMProvider] = None,
        provider_name: Optional[str] = None,
    ):
        if provider:
            self.provider = provider
        else:
            self.provider = self._resolve_provider(provider_name)
        self.prompt_template = load_extraction_prompt()

    @staticmethod
    def _resolve_provider(provider_name: Optional[str] = None) -> BaseLLMProvider:
        name = (provider_name or os.getenv("LLM_PROVIDER", "")).lower()

        if name == "gemini" or (not name and os.getenv("GEMINI_API_KEY")):
            try:
                return GeminiProvider()
            except Exception:
                pass

        if name == "groq" or (not name and os.getenv("GROQ_API_KEY")):
            try:
                return GroqProvider()
            except Exception:
                pass

        # Default fallback to mock for deterministic dev/testing
        return MockProvider()

    def format_prompt(self, transcript: str) -> str:
        """Interpolates conversation transcript into prompt template."""
        if "{{transcript}}" in self.prompt_template:
            return self.prompt_template.replace("{{transcript}}", transcript)
        return f"{self.prompt_template}\n\nTranscript:\n{transcript}"

    def extract(self, transcript: str) -> ExtractionResult:
        """Extracts structured memories from a conversation transcript."""
        if not transcript or not transcript.strip():
            return ExtractionResult(
                memories=[],
                provider=self.provider.name,
                raw_response="",
            )

        prompt = self.format_prompt(transcript)
        raw_response = self.provider.complete(prompt)
        memories = parse_memories_json(raw_response)

        return ExtractionResult(
            memories=memories,
            provider=self.provider.name,
            model=getattr(self.provider, "model", None),
            raw_response=raw_response,
        )


def extract_memories(
    transcript: str,
    provider: Optional[BaseLLMProvider] = None,
    provider_name: Optional[str] = None,
) -> ExtractionResult:
    """Convenience functional interface for extraction."""
    extractor = ConversationExtractor(provider=provider, provider_name=provider_name)
    return extractor.extract(transcript)


if __name__ == "__main__":
    # Quick standalone test with a sample developer conversation
    sample_dialogue = """
Developer: Hey, we need to decide on our vector search database for our final year project. Should we use Pinecone or MongoDB Atlas Vector Search?
AI: Pinecone is dedicated and fast, but MongoDB Atlas M0 free tier now includes vector search directly on collections. That means you don't need a separate vector DB service, and it stays 100% free under the 512MB limit.
Developer: That is awesome. Let's use Atlas Vector Search directly so we don't need to spin up a separate Pinecone instance.
Developer: Also, we noticed Render free tier puts our Node API to sleep after 15 minutes of idle time. It takes 40 seconds to wake up!
AI: You can set up a scheduled ping every 10 minutes to keep the instance warm before the viva.
Developer: Great idea, we'll write a lightweight cron job for that.
"""
    print("=" * 60)
    print("AI Project Memory Assistant — Standalone Extraction Demo")
    print("=" * 60)

    extractor = ConversationExtractor(provider=MockProvider())
    result = extractor.extract(sample_dialogue)

    print(f"Extracted {len(result.memories)} memories using provider: '{result.provider}'\n")
    for i, mem in enumerate(result.memories, 1):
        print(f"[{i}] {mem.type.upper()}: {mem.title}")
        print(f"    Summary: {mem.summary}")
        if mem.reason:
            print(f"    Reason:  {mem.reason}")
        print(f"    Excerpt: \"{mem.raw_excerpt}\"")
        print(f"    Tags:    {mem.tags}")
        print()
