"""Initial prompt manager schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-02-14 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prompts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_prompts_id", "prompts", ["id"])
    op.create_index("ix_prompts_name", "prompts", ["name"], unique=True)

    op.create_table(
        "prompt_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("prompt_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["prompt_id"], ["prompts.id"]),
        sa.UniqueConstraint("prompt_id", "version", name="uq_prompt_version"),
    )
    op.create_index("ix_prompt_versions_id", "prompt_versions", ["id"])
    op.create_index("ix_prompt_versions_prompt_id", "prompt_versions", ["prompt_id"])

    op.create_table(
        "prompt_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("prompt_version_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["prompt_version_id"], ["prompt_versions.id"]),
    )
    op.create_index("ix_prompt_tags_id", "prompt_tags", ["id"])
    op.create_index("ix_prompt_tags_name", "prompt_tags", ["name"])
    op.create_index("ix_prompt_tags_prompt_version_id", "prompt_tags", ["prompt_version_id"])


def downgrade() -> None:
    op.drop_index("ix_prompt_tags_prompt_version_id", table_name="prompt_tags")
    op.drop_index("ix_prompt_tags_name", table_name="prompt_tags")
    op.drop_index("ix_prompt_tags_id", table_name="prompt_tags")
    op.drop_table("prompt_tags")

    op.drop_index("ix_prompt_versions_prompt_id", table_name="prompt_versions")
    op.drop_index("ix_prompt_versions_id", table_name="prompt_versions")
    op.drop_table("prompt_versions")

    op.drop_index("ix_prompts_name", table_name="prompts")
    op.drop_index("ix_prompts_id", table_name="prompts")
    op.drop_table("prompts")
