import psycopg2

conn = psycopg2.connect('postgresql://postgres:12345@localhost/warehouse_db')
cur = conn.cursor()

migrations = [
    "ALTER TABLE inspection ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR",
    "ALTER TABLE inspection ADD COLUMN IF NOT EXISTS trade VARCHAR",
    "ALTER TABLE inspection ADD COLUMN IF NOT EXISTS set_type VARCHAR",
    "ALTER TABLE kits ADD COLUMN IF NOT EXISTS set_type VARCHAR",
    "ALTER TABLE dispatch ADD COLUMN IF NOT EXISTS set_type VARCHAR",
    "ALTER TABLE dispatch ADD COLUMN IF NOT EXISTS packaging_status VARCHAR DEFAULT 'Pending For Mark'",
]

for sql in migrations:
    cur.execute(sql)
    print(f"OK: {sql[:70]}")

conn.commit()
cur.close()
conn.close()
print("All migrations done!")
