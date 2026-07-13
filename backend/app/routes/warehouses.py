from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database.db import get_db
from app.models.warehouse import Warehouse, WarehouseDistrictMapping
from app.models.kits import Kit
from app.models.inspection import Inspection
from app.models.dispatch import Dispatch
from app.models.upload_data import UploadData

router = APIRouter()

# Schema for Warehouses
class WarehouseCreate(BaseModel):
    name: str
    vendor_name: Optional[str] = "Pragyawan Technologies Private Limited"
    gst_no: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    contact_name: Optional[str] = None
    contact_no: Optional[str] = None
    email_id: Optional[str] = None
    zone: Optional[str] = None

# Schema for District Mappings
class MappingCreate(BaseModel):
    zone: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    trade: Optional[str] = "Barbers (Naai)"
    type: Optional[str] = "SET A"
    mapped_warehouse: Optional[str] = None

# --- WAREHOUSE ENDPOINTS ---

@router.post("/warehouses")
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Warehouse).filter(Warehouse.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse name already exists")
    
    new_wh = Warehouse(
        name=payload.name,
        vendor_name=payload.vendor_name,
        gst_no=payload.gst_no,
        state=payload.state,
        district=payload.district,
        pincode=payload.pincode,
        address_line_1=payload.address_line_1,
        address_line_2=payload.address_line_2,
        contact_name=payload.contact_name,
        contact_no=payload.contact_no,
        email_id=payload.email_id,
        zone=payload.zone
    )
    db.add(new_wh)
    db.commit()
    db.refresh(new_wh)
    return {
        "message": "Warehouse Created Successfully",
        "warehouse": new_wh
    }

@router.get("/warehouses")
def get_warehouses(
    db: Session = Depends(get_db)
):
    return db.query(Warehouse).order_by(Warehouse.id.asc()).all()

@router.put("/warehouses/{id}")
def update_warehouse(
    id: int,
    payload: WarehouseCreate,
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    if bool(wh.name != payload.name):  # type: ignore
        existing = db.query(Warehouse).filter(Warehouse.name == payload.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Warehouse name already exists")

    wh.name = payload.name  # type: ignore
    wh.vendor_name = payload.vendor_name  # type: ignore
    wh.gst_no = payload.gst_no  # type: ignore
    wh.state = payload.state  # type: ignore
    wh.district = payload.district  # type: ignore
    wh.pincode = payload.pincode  # type: ignore
    wh.address_line_1 = payload.address_line_1  # type: ignore
    wh.address_line_2 = payload.address_line_2  # type: ignore
    wh.contact_name = payload.contact_name  # type: ignore
    wh.contact_no = payload.contact_no  # type: ignore
    wh.email_id = payload.email_id  # type: ignore
    wh.zone = payload.zone  # type: ignore

    db.commit()
    db.refresh(wh)
    return {
        "message": "Warehouse Updated Successfully",
        "warehouse": wh
    }

@router.delete("/warehouses/{id}")
def delete_warehouse(
    id: int,
    db: Session = Depends(get_db)
):
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    db.delete(wh)
    db.commit()
    return {
        "message": "Warehouse Deleted Successfully"
    }

# --- DISTRICT MAPPING ENDPOINTS ---

@router.get("/warehouses/district-mappings")
def get_district_mappings(
    db: Session = Depends(get_db)
):
    return db.query(WarehouseDistrictMapping).order_by(WarehouseDistrictMapping.id.asc()).all()

@router.post("/warehouses/district-mappings")
def create_district_mapping(
    payload: MappingCreate,
    db: Session = Depends(get_db)
):
    new_mapping = WarehouseDistrictMapping(
        zone=payload.zone,
        state=payload.state,
        district=payload.district,
        trade=payload.trade,
        type=payload.type,
        mapped_warehouse=payload.mapped_warehouse
    )
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)
    return {
        "message": "District Mapping Created Successfully",
        "mapping": new_mapping
    }

@router.put("/warehouses/district-mappings/{id}")
def update_district_mapping(
    id: int,
    payload: MappingCreate,
    db: Session = Depends(get_db)
):
    mapping = db.query(WarehouseDistrictMapping).filter(WarehouseDistrictMapping.id == id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="District Mapping not found")

    mapping.zone = payload.zone  # type: ignore
    mapping.state = payload.state  # type: ignore
    mapping.district = payload.district  # type: ignore
    mapping.trade = payload.trade  # type: ignore
    mapping.type = payload.type  # type: ignore
    mapping.mapped_warehouse = payload.mapped_warehouse  # type: ignore

    db.commit()
    db.refresh(mapping)
    return {
        "message": "District Mapping Updated Successfully",
        "mapping": mapping
    }

@router.delete("/warehouses/district-mappings/{id}")
def delete_district_mapping(
    id: int,
    db: Session = Depends(get_db)
):
    mapping = db.query(WarehouseDistrictMapping).filter(WarehouseDistrictMapping.id == id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="District Mapping not found")

    db.delete(mapping)
    db.commit()
    return {
        "message": "District Mapping Deleted Successfully"
    }

# --- PIPELINE STATUS ENDPOINT (NSIC STYLE) ---

@router.get("/warehouses/pipeline-stats")
def get_warehouses_pipeline_stats(
    db: Session = Depends(get_db)
):
    warehouses = db.query(Warehouse).order_by(Warehouse.id.asc()).all()
    kits = db.query(Kit).all()
    inspections = db.query(Inspection).all()
    dispatches = db.query(Dispatch).all()
    upload_rows = db.query(UploadData.row_data).all()
    mappings = db.query(WarehouseDistrictMapping).all()

    # Pre-calculate counts/sums
    wh_stats = {}
    for wh in warehouses:
        wh_stats[wh.name] = {
            "id": wh.id,
            "name": wh.name,
            "state": wh.state,
            "available_set_a": 0,
            "available_set_b": 0,
            "demand_set_a": 0,
            "demand_set_b": 0,
            "under_inspection_set_a": 0,
            "under_inspection_set_b": 0,
            "passed_set_a": 0,
            "passed_set_b": 0,
            "dispatched_set_a": 0,
            "dispatched_set_b": 0
        }

    # Match artisans dynamically using the configured warehouse mappings
    # Map (state, district, type) -> mapped_warehouse
    mapping_dict = {}
    for m in mappings:
        if m.state and m.district and m.type and m.mapped_warehouse:  # type: ignore
            key = (m.state.strip().upper(), m.district.strip().upper(), m.type.strip().upper())  # type: ignore
            mapping_dict[key] = m.mapped_warehouse  # type: ignore

    # Calculate Demand per warehouse from UploadData (Artisans)
    for row in upload_rows:
        row_dict = row[0] or {}
        
        district_val = ""
        state_val = ""
        set_type = "SET A"  # Default
        
        for k, v in row_dict.items():
            kl = k.lower()
            if "district" in kl and v:
                district_val = str(v).strip().upper()
            if "state" in kl and v:
                state_val = str(v).strip().upper()
            if "set" in kl and v:
                set_type = str(v).strip().upper()

        if district_val and state_val:
            key = (state_val, district_val, set_type)
            wh_name = mapping_dict.get(key)
            if not wh_name:
                # Try generic matching (district + default Set A/B)
                key_generic = (state_val, district_val, "SET A" if "B" not in set_type else "SET B")
                wh_name = mapping_dict.get(key_generic)

            if wh_name and wh_name in wh_stats:
                if "B" in set_type:
                    wh_stats[wh_name]["demand_set_b"] += 1
                else:
                    wh_stats[wh_name]["demand_set_a"] += 1
            elif len(warehouses) > 0:
                # Assign to first warehouse as fallback
                default_wh = warehouses[0].name
                if "B" in set_type:
                    wh_stats[default_wh]["demand_set_b"] += 1
                else:
                    wh_stats[default_wh]["demand_set_a"] += 1

    # Calculate Available from Kits
    for k in kits:
        wh_name = k.warehouse_name.strip() if k.warehouse_name else ""  # type: ignore
        if wh_name in wh_stats:
            st = str(k.set_type).strip().upper() if k.set_type else ""  # type: ignore
            if "B" in st:
                wh_stats[wh_name]["available_set_b"] += k.quantity  # type: ignore
            else:
                wh_stats[wh_name]["available_set_a"] += k.quantity  # type: ignore

    # Calculate Inspections
    for i in inspections:
        wh_name = i.warehouse_name.strip() if i.warehouse_name else ""  # type: ignore
        if wh_name in wh_stats:
            st = str(i.set_type).strip().upper() if i.set_type else ""  # type: ignore
            res = str(i.inspection_passed).strip().lower() if i.inspection_passed else ""  # type: ignore
            
            if res == "pending":
                if "B" in st:
                    wh_stats[wh_name]["under_inspection_set_b"] += i.quantity  # type: ignore
                else:
                    wh_stats[wh_name]["under_inspection_set_a"] += i.quantity  # type: ignore
            elif res == "pass":
                if "B" in st:
                    wh_stats[wh_name]["passed_set_b"] += i.quantity  # type: ignore
                else:
                    wh_stats[wh_name]["passed_set_a"] += i.quantity  # type: ignore

    # Calculate Dispatched
    for d in dispatches:
        wh_name = d.warehouse_name.strip() if d.warehouse_name else ""  # type: ignore
        if wh_name in wh_stats:
            st = str(d.set_type).strip().upper() if d.set_type else ""  # type: ignore
            if "B" in st:
                wh_stats[wh_name]["dispatched_set_b"] += d.quantity  # type: ignore
            else:
                wh_stats[wh_name]["dispatched_set_a"] += d.quantity  # type: ignore

    return list(wh_stats.values())
