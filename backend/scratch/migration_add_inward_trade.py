import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database.db import engine

def migrate():
    try:
        # For SQLAlchemy 2.0+ engine.begin() or engine.connect() is preferred
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE inventory_inward ADD COLUMN IF NOT EXISTS trade_name VARCHAR;"))
            # In SQLAlchemy 2.0, connection requires commit for DDL in some backends, or we use connection.begin()
            try:
                conn.commit()
            except Exception:
                pass
        print("Successfully updated inventory_inward table with trade_name column using SQLAlchemy engine.")
    except Exception as e:
        print("Migration failed:", e)

if __name__ == "__main__":
    migrate()
