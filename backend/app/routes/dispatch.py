from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.dispatch import Dispatch
import pandas as pd
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity

router = APIRouter()


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


def map_fuzzy_trade_and_set_type(raw_trade):
    if not raw_trade:
        return "", ""
    text = str(raw_trade).strip().lower()
    
    trade = ""
    set_type = ""
    
    # 1. Resolve Set Type if present in the trade string
    if "set b" in text or text.endswith(" b") or text.endswith("b"):
        set_type = "SET B"
    elif "set a" in text or text.endswith(" a") or text.endswith("a"):
        set_type = "SET A"
        
    # 2. Resolve Trade
    if "boat" in text or "boatmaker" in text:
        trade = "Boat Maker"
    elif "baber" in text or "barber" in text or "naai" in text:
        trade = "Barber (Naai)"
    elif "ht maker" in text or "hammer" in text or "toolkit" in text:
        trade = "Hammer and ToolKit Maker"
        set_type = "SET A"
    elif "fishing" in text or "fishingnet" in text:
        trade = "Fishing Net Maker"
        set_type = "SET A"
    elif "sculptor" in text or "moortikar" in text:
        trade = "Sculptor (Moortikar)/Stone Carver/Stone Breaker"
        set_type = "SET A"
    elif "metal" in text or "metalsmith" in text:
        trade = "Metal Smith / Metal Caster"
        set_type = "SET A"
    elif "potter" in text or "kumhar" in text:
        trade = "Potter (Kumhar)"
        set_type = "SET A"
    elif "washer" in text or "washerman" in text or "dhobi" in text:
        trade = "Washerman (Dhobi)"
        set_type = "SET A"
    elif "armourer" in text:
        trade = "Armourer"
        set_type = "SET A"
        
    return trade, set_type


class DispatchCreate(BaseModel):
    call_date: str
    firm: Optional[str] = None
    warehouse_name: str
    trade: str
    set_type: Optional[str] = None
    quantity: int
    ms_barcode: Optional[str] = None
    packaging_status: Optional[str] = "Pending For Mark"


@router.post("/dispatch")
def create_dispatch(
    payload: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(payload.trade)
    trade_val = mapped_trade if mapped_trade else payload.trade
    set_type_val = mapped_set if mapped_set else payload.set_type
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name)

    new_dispatch = Dispatch(
        call_date=payload.call_date,
        firm=payload.firm,
        warehouse_name=wh_val,
        trade=trade_val,
        set_type=set_type_val,
        quantity=payload.quantity,
        ms_barcode=payload.ms_barcode,
        packaging_status=payload.packaging_status
    )
    db.add(new_dispatch)
    db.commit()
    db.refresh(new_dispatch)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Dispatch",
        details=f"Added new Dispatch record: {payload.quantity} units of '{trade_val}' for warehouse '{wh_val}' (Status: '{payload.packaging_status}', Barcode/MS No: '{payload.ms_barcode or 'N/A'}')"
    )
    
    return {
        "message": "Dispatch Created Successfully",
        "dispatch": new_dispatch
    }


@router.get("/dispatch")
def get_dispatch(
    db: Session = Depends(get_db)
):
    return db.query(Dispatch).order_by(Dispatch.id.asc()).all()


@router.put("/dispatch/{id}")
def update_dispatch(
    id: int,
    payload: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    dispatch = db.query(Dispatch).filter(Dispatch.id == id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(payload.trade)
    trade_val = mapped_trade if mapped_trade else payload.trade
    set_type_val = mapped_set if mapped_set else payload.set_type
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name)

    old_qty = dispatch.quantity
    old_status = dispatch.packaging_status

    dispatch.call_date = payload.call_date  # type: ignore
    dispatch.firm = payload.firm  # type: ignore
    dispatch.warehouse_name = wh_val  # type: ignore
    dispatch.trade = trade_val  # type: ignore
    dispatch.set_type = set_type_val  # type: ignore
    dispatch.quantity = payload.quantity  # type: ignore
    dispatch.ms_barcode = payload.ms_barcode  # type: ignore
    dispatch.packaging_status = payload.packaging_status  # type: ignore

    db.commit()
    db.refresh(dispatch)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Dispatch",
        details=f"Modified Dispatch record (ID #{id}): Changed Qty from {old_qty} to {payload.quantity}, Status from '{old_status}' to '{payload.packaging_status}', Barcode to '{payload.ms_barcode or 'N/A'}'"
    )
    
    return {
        "message": "Dispatch Updated Successfully",
        "dispatch": dispatch
    }


@router.delete("/dispatch/{id}")
def delete_dispatch(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    dispatch = db.query(Dispatch).filter(Dispatch.id == id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    db.delete(dispatch)
    db.commit()
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Dispatch",
        details=f"Deleted Dispatch record (ID #{id}): Removed {dispatch.quantity} units of '{dispatch.trade}' for warehouse '{dispatch.warehouse_name}' (Status: '{dispatch.packaging_status}', Barcode: '{dispatch.ms_barcode or 'N/A'}')"
    )
    
    return {
        "message": "Dispatch Deleted Successfully"
    }


@router.post("/dispatch/bulk")
def create_dispatches_bulk(
    payload: list[DispatchCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        new_dispatches = []
        for entry in payload:
            mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(entry.trade)
            trade_val = mapped_trade if mapped_trade else entry.trade
            set_type_val = mapped_set if mapped_set else entry.set_type
            wh_val = map_fuzzy_warehouse_name(entry.warehouse_name)

            new_dispatches.append(
                Dispatch(
                    call_date=entry.call_date,
                    firm=entry.firm,
                    warehouse_name=wh_val,
                    trade=trade_val,
                    set_type=set_type_val,
                    quantity=entry.quantity,
                    ms_barcode=entry.ms_barcode,
                    packaging_status=entry.packaging_status
                )
            )
        db.add_all(new_dispatches)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="ADD (Bulk)",
            module="Dispatch",
            details=f"Bulk Queued/Created {len(new_dispatches)} entries for dispatch"
        )
        
        return {"message": f"Successfully queued {len(new_dispatches)} entries for dispatch"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class DispatchUpdateStatusBulk(BaseModel):
    ids: list[int]
    status: str


@router.post("/dispatch/update-status-bulk")
def update_dispatches_status_bulk(
    payload: DispatchUpdateStatusBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(Dispatch).filter(Dispatch.id.in_(payload.ids)).update(
            {Dispatch.packaging_status: payload.status},
            synchronize_session=False
        )
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="UPDATE (Bulk)",
            module="Dispatch",
            details=f"Bulk Updated packaging status of {len(payload.ids)} dispatches to '{payload.status}'"
        )
        
        return {"message": "Selected dispatches updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class DispatchDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/dispatch/delete-bulk")
def delete_dispatches_bulk(
    payload: DispatchDeleteBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(Dispatch).filter(Dispatch.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Dispatch",
            details=f"Bulk Deleted {len(payload.ids)} dispatch records"
        )
        
        return {"message": "Selected dispatches deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dispatch/upload")
async def upload_dispatch_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        df = pd.read_excel(file.file)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid Excel file format. Please upload a valid .xlsx or .xls file."
        )

    # Let's normalize the columns matching
    def get_col_val(row, aliases):
        for alias in aliases:
            norm_alias = alias.strip().lower().replace("_", "").replace(" ", "").replace(".", "").replace("/", "").replace("-", "")
            for c in df.columns:
                norm_c = str(c).strip().lower().replace("_", "").replace(" ", "").replace(".", "").replace("/", "").replace("-", "")
                if norm_c == norm_alias:
                    val = row[c]
                    if not pd.isna(val):
                        return val
        return None

    objects_to_insert = []

    for index, row in df.iterrows():
        try:
            # 1. Dispatched Date (call_date)
            val_date = get_col_val(row, ["Dispatch Dates", "Dispatched Date", "Date"])
            # 2. Firm (firm)
            val_firm = get_col_val(row, ["Vendor Name", "Firm"])
            # 3. Warehouse Name (warehouse_name)
            val_wh = get_col_val(row, ["Pickup Location", "Warehouse Name", "Warehouse", "Location", "Site"])
            # 4. Trade (trade)
            val_trade = get_col_val(row, ["Trade Name", "Trade"])
            # 5. Set Type (set_type)
            val_set = get_col_val(row, ["Type Name", "Set Type", "Set"])
            # 6. Quantity (quantity)
            val_qty = get_col_val(row, ["Dispatched as per payment sheet", "Quantity", "Qty", "Dispatched", "Dispatched Quantity", "DispatchedQuantity"])
            # 7. Pkg Status (packaging_status)
            val_status = get_col_val(row, ["Dispatch Status", "Pkg Status", "Status"])

            # 8. MS No./Barcode (ms_barcode) - Combine label numbers 1, 2, 3 if they exist
            barcode_parts = []
            for lbl in ["Label Number 1", "Label Number 2", "Label number 3", "Label Number 3", "MS No./Barcode", "Barcode", "MS No", "MS No. / Barcode"]:
                lbl_val = get_col_val(row, [lbl])
                if lbl_val is not None:
                    part_str = str(lbl_val).strip()
                    if part_str and part_str not in barcode_parts:
                        barcode_parts.append(part_str)
            val_barcode = "/".join(barcode_parts) if barcode_parts else None

            # Skip rows that don't have basic fields to filter headers/noise
            if val_wh is None and val_trade is None and val_qty is None:  # type: ignore
                continue

            # Format Date
            if val_date is None:
                val_date = pd.Timestamp.now()

            date_str = ""
            if isinstance(val_date, pd.Timestamp):
                date_str = val_date.strftime("%d/%m/%Y")
            else:
                date_str = str(val_date).strip()
                if "-" in date_str and len(date_str) >= 10:
                    parts = date_str.split(" ")[0].split("-")
                    if len(parts) == 3 and len(parts[0]) == 4:
                        date_str = f"{parts[2]}/{parts[1]}/{parts[0]}"

            # Defaults
            wh_str = map_fuzzy_warehouse_name(val_wh)
            
            # Map fuzzy trade and set type
            mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(val_trade)
            trade_str = mapped_trade if mapped_trade else (str(val_trade).strip() if val_trade else "Barber (Naai)")
            
            set_type_str = None
            if mapped_set:
                set_type_str = mapped_set
            elif val_set:
                set_type_str = str(val_set).strip().upper()

            status_str = str(val_status).strip() if val_status else "Pending For Mark"  # type: ignore

            # Parse quantity
            qty_int = 0
            if val_qty is not None:
                try:
                    qty_int = int(float(str(val_qty).strip()))  # type: ignore
                except Exception:
                    pass

            objects_to_insert.append({
                "call_date": date_str,
                "firm": str(val_firm).strip() if val_firm else None,  # type: ignore
                "warehouse_name": wh_str,
                "trade": trade_str,
                "set_type": set_type_str,
                "quantity": qty_int,
                "ms_barcode": val_barcode,
                "packaging_status": status_str
            })

        except Exception as e:
            excel_row_num = int(index) + 2  # type: ignore
            raise HTTPException(
                status_code=400,
                detail=f"Row {excel_row_num}: Failed to parse row. Error: {str(e)}"
            )

    # Perform bulk insert in batches of 10,000
    batch_size = 10000
    for i in range(0, len(objects_to_insert), batch_size):
        batch = objects_to_insert[i:i + batch_size]
        db.bulk_insert_mappings(Dispatch, batch)
        db.commit()

    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPLOAD",
        module="Dispatch",
        details=f"Bulk Imported {len(objects_to_insert)} dispatch records from Excel upload"
    )

    return {
        "message": "Bulk Dispatch upload successful",
        "rows_saved": len(objects_to_insert)
    }