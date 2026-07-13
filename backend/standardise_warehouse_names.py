"""
Migration: Standardise warehouse names and update references across all database tables.
"""
import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "dbname": "warehouse_db",
    "user": "postgres",
    "password": "12345"
}

def map_fuzzy_warehouse_name(raw_name: str) -> str:
    if not raw_name:
        return "Greater Noida"
    
    text = str(raw_name).strip().lower()
    
    # 1. Bangalore
    if "bangalore" in text or "bengaluru" in text:
        if "fmt" in text:
            return "Bangalore (FMT)"
        return "Bangalore (Stock Area)"
        
    # 2. Ahmedabad
    if "ahmedabad" in text or "ahmadabad" in text:
        if "fmt" in text or "new" in text:
            return "Ahmedabad (FMT)"
        return "Ahmedabad (Stock Area)"
        
    # 3. Jaipur
    if "jaipur" in text:
        if "new" in text:
            return "New Jaipur"
        return "Jaipur"
        
    # 4. Noida / Greater Noida
    if "noida" in text:
        return "Greater Noida"
        
    # 5. Bhubneshwar / Bhubaneswar
    if "bhub" in text:
        if "new" in text:
            return "New Bhubneshwar"
        return "Bhubneshwar"
        
    # 6. Keonjhar
    if "keonjhar" in text or "kendujhar" in text:
        return "Keonjhar"
        
    # 7. Guwahati
    if "guwahati" in text:
        return "Guwahati (Stock Area)"
        
    # 8. Hapur
    if "hapur" in text:
        return "Hapur"
        
    # 9. Raipur
    if "raipur" in text:
        return "Raipur (FMT)"
        
    # 10. Dadri
    if "dadri" in text:
        return "Dadri (Stock Area)"
        
    # 11. Chennai
    if "chennai" in text:
        return "Chennai"
        
    targets = [
        "Jaipur", "New Jaipur", "Ahmedabad (Stock Area)", "Ahmedabad (FMT)",
        "Bangalore (Stock Area)", "Bangalore (FMT)", "Raipur (FMT)", "Dadri (Stock Area)",
        "Hapur", "Bhubneshwar", "New Bhubneshwar", "Keonjhar", "Guwahati (Stock Area)",
        "Greater Noida", "Chennai"
    ]
    for target in targets:
        if text == target.lower():
            return target
            
    for target in targets:
        if target.lower() in text or text in target.lower():
            return target
            
    return raw_name.title()

def migrate():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # 1. Truncate warehouses and seed standardized list
    print("Seeding standard warehouses...")
    cur.execute("TRUNCATE TABLE warehouses CASCADE;")
    
    warehouses_seed = [
        ("Jaipur", "RAJASTHAN", "JAIPUR", "West Zone", "9310648852"),
        ("New Jaipur", "RAJASTHAN", "JAIPUR", "West Zone", "9310648852"),
        ("Ahmedabad (Stock Area)", "GUJARAT", "AHMADABAD", "West Zone", "9310648852"),
        ("Ahmedabad (FMT)", "GUJARAT", "AHMADABAD", "West Zone", "9310648852"),
        ("Bangalore (Stock Area)", "KARNATAKA", "BENGALURU URBAN", "South Zone", "9310648852"),
        ("Bangalore (FMT)", "KARNATAKA", "BENGALURU URBAN", "South Zone", "9310648852"),
        ("Raipur (FMT)", "CHHATTISGARH", "RAIPUR", "East Zone", "9310648852"),
        ("Dadri (Stock Area)", "UTTAR PRADESH", "GAUTAM BUDDHA NAGAR", "North Zone", "9310648852"),
        ("Hapur", "UTTAR PRADESH", "HAPUR", "North Zone", "9310648852"),
        ("Bhubneshwar", "ODISHA", "KHORDHA", "East Zone", "9310648852"),
        ("New Bhubneshwar", "ODISHA", "KHORDHA", "East Zone", "9310648852"),
        ("Keonjhar", "ODISHA", "KENDUJHAR", "East Zone", "9310648852"),
        ("Guwahati (Stock Area)", "ASSAM", "KAMRUP METRO", "East Zone", "9310648852"),
        ("Greater Noida", "UTTAR PRADESH", "GAUTAM BUDDHA NAGAR", "North Zone", "9310648852"),
        ("Chennai", "TAMIL NADU", "CHENNAI", "South Zone", "9310648852")
    ]
    
    for name, state, district, zone, contact_no in warehouses_seed:
        cur.execute("""
            INSERT INTO warehouses (name, state, district, zone, contact_no, vendor_name, gst_no, pincode, address_line_1, contact_name, email_id)
            VALUES (%s, %s, %s, %s, %s, 'Pragyawan Technologies Private Limited', '29AAAAA1111A1Z1', '560001', 'Sector 4, Phase II', 'Admin Officer', 'warehouse@pragyawan.com');
        """, (name, state, district, zone, contact_no))
        
    conn.commit()
    print("Warehouses table re-seeded successfully.")
    
    # Helper to fetch and update table
    def update_table_column(table_name, column_name):
        print(f"Updating {table_name}.{column_name}...")
        cur.execute(f"SELECT id, {column_name} FROM {table_name} WHERE {column_name} IS NOT NULL;")
        rows = cur.fetchall()
        for row_id, old_val in rows:
            new_val = map_fuzzy_warehouse_name(old_val)
            if new_val != old_val:
                cur.execute(f"UPDATE {table_name} SET {column_name} = %s WHERE id = %s;", (new_val, row_id))
        conn.commit()

    update_table_column("warehouse_district_mappings", "mapped_warehouse")
    update_table_column("kits", "warehouse_name")
    update_table_column("inspection", "warehouse_name")
    update_table_column("dispatch", "warehouse_name")
    update_table_column("dispatch_return", "warehouse_name")
    update_table_column("man_power", "warehouse_location")
    update_table_column("users", "warehouse_name")
    update_table_column("inventory_outward", "warehouse_from")
    update_table_column("inventory_outward", "warehouse_to")
    update_table_column("sample_inspections", "warehouse_name")
    
    print("Database values successfully standardized!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    migrate()
