from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Prompt(Base):
    __tablename__ = "prompts"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_prompts_owner_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    owner: Mapped["User"] = relationship(back_populates="prompts")
    versions: Mapped[list["PromptVersion"]] = relationship(back_populates="prompt")


class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    __table_args__ = (UniqueConstraint("prompt_id", "version", name="uq_prompt_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prompt_id: Mapped[int] = mapped_column(ForeignKey("prompts.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    prompt: Mapped[Prompt] = relationship(back_populates="versions")
    tags: Mapped[list["PromptTag"]] = relationship(back_populates="prompt_version")


class PromptTag(Base):
    __tablename__ = "prompt_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prompt_version_id: Mapped[int] = mapped_column(
        ForeignKey("prompt_versions.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    prompt_version: Mapped[PromptVersion] = relationship(back_populates="tags")
