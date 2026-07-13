from sqlalchemy import Column, Integer, String
from app.database.db import Base

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    vendor_name = Column(String, nullable=True, default="Pragyawan Technologies Private Limited")
    gst_no = Column(String, nullable=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    address_line_1 = Column(String, nullable=True)
    address_line_2 = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_no = Column(String, nullable=True)
    email_id = Column(String, nullable=True)
    zone = Column(String, nullable=True)

class WarehouseDistrictMapping(Base):
    __tablename__ = "warehouse_district_mappings"

    id = Column(Integer, primary_key=True, index=True)
    zone = Column(String, nullable=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    trade = Column(String, nullable=True, default="Barbers (Naai)")
    type = Column(String, nullable=True)  # SET A or SET B
    mapped_warehouse = Column(String, nullable=True)  # Matches name in warehouses table
