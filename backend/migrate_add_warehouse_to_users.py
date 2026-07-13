"""
Migration: Add warehouse_name column to users table (PostgreSQL).
Safe to run multiple times -- checks if column already exists.
"""
import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "dbname": "warehouse_db",
    "user": "postgres",
    "password": "12345"
}

def migrate():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'warehouse_name'
    """)
    exists = cursor.fetchone()

    if not exists:
        cursor.execute("ALTER TABLE users ADD COLUMN warehouse_name VARCHAR")
        print("Added 'warehouse_name' column to users table.")
    else:
        print("Column 'warehouse_name' already exists -- skipping.")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    migrate()
