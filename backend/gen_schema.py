"""Generate PostgreSQL DDL from SQLAlchemy models (no DB connection needed)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import ForeignKeyConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

from app import models  # noqa: F401 — register all models
from app.database import Base

dialect = postgresql.dialect()
for table in Base.metadata.sorted_tables:
    # Ensure foreign key constraints have names (psqldef requires them).
    # Use Postgres's default naming convention so names match existing DBs.
    for constraint in table.constraints:
        if isinstance(constraint, ForeignKeyConstraint) and constraint.name is None:
            cols = "_".join(col.name for col in constraint.columns)
            constraint.name = f"{table.name}_{cols}_fkey"
    print(str(CreateTable(table).compile(dialect=dialect)).strip() + ";")
    for index in table.indexes:
        print(str(CreateIndex(index).compile(dialect=dialect)).strip() + ";")
