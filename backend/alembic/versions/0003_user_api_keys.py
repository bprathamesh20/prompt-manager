"""Add user_api_keys table.

Revision ID: 0003_user_api_keys
Revises: 0002_auth_and_prompt_ownership
Create Date: 2026-02-14 01:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_user_api_keys"
down_revision: Union[str, None] = "0002_auth_and_prompt_ownership"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_api_keys",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("prefix", sa.String(length=24), nullable=False),
        sa.Column("key_hash", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id", "name", name="uq_user_api_keys_user_name"),
    )
    op.create_index("ix_user_api_keys_id", "user_api_keys", ["id"])
    op.create_index("ix_user_api_keys_user_id", "user_api_keys", ["user_id"])
    op.create_index("ix_user_api_keys_key_hash", "user_api_keys", ["key_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_user_api_keys_key_hash", table_name="user_api_keys")
    op.drop_index("ix_user_api_keys_user_id", table_name="user_api_keys")
    op.drop_index("ix_user_api_keys_id", table_name="user_api_keys")
    op.drop_table("user_api_keys")
