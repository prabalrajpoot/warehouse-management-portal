import psycopg2
import json

conn = psycopg2.connect('postgresql://postgres:12345@localhost/warehouse_db')
cur = conn.cursor()

# 1. Drop existing warehouses table and recreate it with correct detailed fields
cur.execute("DROP TABLE IF EXISTS warehouses CASCADE;")
cur.execute("""
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    vendor_name VARCHAR DEFAULT 'Pragyawan Technologies Private Limited',
    gst_no VARCHAR,
    state VARCHAR,
    district VARCHAR,
    pincode VARCHAR,
    address_line_1 VARCHAR,
    address_line_2 VARCHAR,
    contact_name VARCHAR,
    contact_no VARCHAR,
    email_id VARCHAR,
    zone VARCHAR
);
""")

# 2. Recreate warehouse_district_mappings table
cur.execute("DROP TABLE IF EXISTS warehouse_district_mappings CASCADE;")
cur.execute("""
CREATE TABLE warehouse_district_mappings (
    id SERIAL PRIMARY KEY,
    zone VARCHAR,
    state VARCHAR,
    district VARCHAR,
    trade VARCHAR DEFAULT 'Barbers (Naai)',
    type VARCHAR,
    mapped_warehouse VARCHAR
);
""")

conn.commit()

# Seed warehouses list (matching NSIC portal screenshots exactly)
warehouses_seed = [
    ("Jaipur Warehouse", "RAJASTHAN", "JAIPUR", "West Zone", "9310648852"),
    ("New Jaipur Warehouse", "RAJASTHAN", "JAIPUR", "West Zone", "9310648852"),
    ("Ahmedabad Warehouse", "GUJARAT", "Bijnor", "West Zone", "9310648852"),
    ("Noida Warehouse", "UTTAR PRADESH", "Gautam Buddha Nagar", "North Zone", "9310648852"),
    ("Keonjhar Warehouse", "ODISHA", "KENDUJHAR", "East Zone", "9310648852"),
    ("Bhubaneswar", "ODISHA", "Sehore", "East Zone", "9310648852"),
    ("New Bhubaneswar", "ODISHA", "Sehore", "East Zone", "9310648852"),
    ("New Ahmedabad Warehouse", "GUJARAT", "AHMADABAD", "West Zone", "9310648852"),
    ("Bangalore Warehouse", "KARNATAKA", "BENGALURU URBAN", "South Zone", "9310648852"),
    ("Guwahati - Addl", "ASSAM", "Tehri Garhwal", "East Zone", "9310648852"),
    ("Chennai Warehouse", "TAMIL NADU", "CHENNAI", "South Zone", "9310648852"),
    ("Guwahati", "ASSAM", "KAMRUP METRO", "East Zone", "9310648852"),
    ("Hapur - Master Warehouse", "UTTAR PRADESH", "Hapur", "North Zone", "9310648852")
]

for name, state, district, zone, contact_no in warehouses_seed:
    cur.execute("""
        INSERT INTO warehouses (name, state, district, zone, contact_no, vendor_name, gst_no, pincode, address_line_1, contact_name, email_id)
        VALUES (%s, %s, %s, %s, %s, 'Pragyawan Technologies Private Limited', '29AAAAA1111A1Z1', '560001', 'Sector 4, Phase II', 'Admin Officer', 'warehouse@pragyawan.com');
    """, (name, state, district, zone, contact_no))

conn.commit()

# 3. Pull unique states and districts from UploadData rows to generate dynamic mappings
cur.execute("SELECT row_data FROM upload_data;")
rows = cur.fetchall()

unique_locations = set()
for r in rows:
    row_dict = r[0]
    if isinstance(row_dict, str):
        try:
            row_dict = json.loads(row_dict)
        except:
            continue
    
    district_val = ""
    state_val = ""
    for k, v in row_dict.items():
        kl = k.lower()
        if "district" in kl and v:
            district_val = str(v).strip().upper()
        if "state" in kl and v:
            state_val = str(v).strip().upper()
    if district_val and state_val:
        unique_locations.add((state_val, district_val))

# Mapping strategy to assign a warehouse name to each state/district
def assign_wh_name(state, district):
    s = state.lower()
    d = district.lower()
    if "karnataka" in s:
        return "Bangalore Warehouse"
    if "tamil" in s:
        return "Chennai Warehouse"
    if "assam" in s:
        if "barpeta" in d or "nalbari" in d or "bongaigaon" in d:
            return "Guwahati - Addl"
        return "Guwahati"
    if "gujarat" in s:
        if "ahmedabad" in d:
            return "New Ahmedabad Warehouse"
        return "Ahmedabad Warehouse"
    if "rajasthan" in s:
        if "new" in d:
            return "New Jaipur Warehouse"
        return "Jaipur Warehouse"
    if "odisha" in s:
        if "kendujhar" in d:
            return "Keonjhar Warehouse"
        if "new" in d:
            return "New Bhubaneswar"
        return "Bhubaneswar"
    if "uttar" in s:
        if "hapur" in d:
            return "Hapur - Master Warehouse"
        return "Noida Warehouse"
    # Fallback default
    return "Bangalore Warehouse"

def get_zone_by_state(state):
    s = state.lower()
    if s in ["karnataka", "tamil nadu", "kerala", "andhra pradesh", "telangana"]:
        return "South Zone"
    if s in ["assam", "odisha", "west bengal", "bihar", "jharkhand"]:
        return "East Zone"
    if s in ["gujarat", "rajasthan", "maharashtra", "goa"]:
        return "West Zone"
    return "North Zone"

# Generate mappings
for state, district in sorted(unique_locations):
    zone = get_zone_by_state(state)
    wh = assign_wh_name(state, district)
    
    # Insert SET A mapping
    cur.execute("""
        INSERT INTO warehouse_district_mappings (zone, state, district, trade, type, mapped_warehouse)
        VALUES (%s, %s, %s, 'Barbers (Naai)', 'SET A', %s);
    """, (zone, state, district, wh))
    
    # Insert SET B mapping
    cur.execute("""
        INSERT INTO warehouse_district_mappings (zone, state, district, trade, type, mapped_warehouse)
        VALUES (%s, %s, %s, 'Barbers (Naai)', 'SET B', %s);
    """, (zone, state, district, wh))

conn.commit()

# If no unique locations were found from database, seed default ones
cur.execute("SELECT COUNT(*) FROM warehouse_district_mappings;")
mappings_count = cur.fetchone()[0]  # type: ignore

if mappings_count == 0:
    default_mappings = [
        ("South Zone", "KARNATAKA", "DAKSHINA KANNADA", "Bangalore Warehouse"),
        ("South Zone", "KARNATAKA", "RAMANAGARA", "Bangalore Warehouse"),
        ("South Zone", "KARNATAKA", "MYSURU", "Bangalore Warehouse"),
        ("East Zone", "ASSAM", "KAMRUP METRO", "Guwahati"),
        ("East Zone", "ASSAM", "BARPETA", "Guwahati - Addl"),
        ("North Zone", "UTTAR PRADESH", "Gautam Buddha Nagar", "Noida Warehouse"),
        ("North Zone", "UTTAR PRADESH", "Hapur", "Hapur - Master Warehouse")
    ]
    for zone, state, district, wh in default_mappings:
        cur.execute("""
            INSERT INTO warehouse_district_mappings (zone, state, district, trade, type, mapped_warehouse)
            VALUES (%s, %s, %s, 'Barbers (Naai)', 'SET A', %s);
        """, (zone, state, district, wh))
        cur.execute("""
            INSERT INTO warehouse_district_mappings (zone, state, district, trade, type, mapped_warehouse)
            VALUES (%s, %s, %s, 'Barbers (Naai)', 'SET B', %s);
        """, (zone, state, district, wh))
    conn.commit()
    print("Seeded default mappings successfully!")

cur.close()
conn.close()
print("Detailed Warehouse & District Mapping tables migrated and populated successfully!")
