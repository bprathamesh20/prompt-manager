from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class PromptCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    tag: str | None = Field(default=None, min_length=1, max_length=64)
    metadata: dict[str, Any] | None = None


class PromptLookupQuery(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    tag: str | None = Field(default=None, min_length=1, max_length=64)


class PromptUpdateRequest(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    tag: str | None = Field(default=None, min_length=1, max_length=64)

    @model_validator(mode="after")
    def validate_at_least_one_field(self) -> "PromptUpdateRequest":
        if "content" in self.model_fields_set and self.content is None:
            raise ValueError("content cannot be null when provided.")
        if "content" not in self.model_fields_set and "tag" not in self.model_fields_set:
            raise ValueError("At least one field (content or tag) must be provided.")
        return self


class PromptVersionResponse(BaseModel):
    id: int
    prompt_id: int
    name: str
    content: str
    version: int
    tag: str | None
    created_at: datetime
    updated_at: datetime
