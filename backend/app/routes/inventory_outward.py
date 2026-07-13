from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.inventory_outward import InventoryOutward
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity

router = APIRouter()


class OutwardCreate(BaseModel):
    transfer_date: str
    invoice_no: Optional[str] = None
    item_name: Optional[str] = None
    brand: Optional[str] = None
    trade_name: Optional[str] = None
    qty: Optional[int] = None
    warehouse_from: Optional[str] = None
    warehouse_to: Optional[str] = None


@router.post("/inventory-outward")
def create_outward(
    payload: OutwardCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    new_entry = InventoryOutward(
        transfer_date=payload.transfer_date,
        invoice_no=payload.invoice_no,
        item_name=payload.item_name,
        brand=payload.brand,
        trade_name=payload.trade_name,
        qty=payload.qty,
        warehouse_from=payload.warehouse_from,
        warehouse_to=payload.warehouse_to
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Inventory Outward",
        details=f"Added new Outward Inventory: {payload.qty} units of '{payload.item_name or 'N/A'}' transferred from '{payload.warehouse_from or 'N/A'}' to '{payload.warehouse_to or 'N/A'}' (Invoice No: '{payload.invoice_no or 'N/A'}')"
    )
    
    return {
        "message": "Outward Entry Created Successfully",
        "entry": new_entry
    }


@router.get("/inventory-outward")
def get_outward(
    db: Session = Depends(get_db)
):
    return db.query(InventoryOutward).order_by(InventoryOutward.id.asc()).all()


@router.put("/inventory-outward/{id}")
def update_outward(
    id: int,
    payload: OutwardCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(InventoryOutward).filter(InventoryOutward.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Outward entry not found")

    old_qty = entry.qty
    old_item = entry.item_name

    entry.transfer_date = payload.transfer_date  # type: ignore
    entry.invoice_no = payload.invoice_no  # type: ignore
    entry.item_name = payload.item_name  # type: ignore
    entry.brand = payload.brand  # type: ignore
    entry.trade_name = payload.trade_name  # type: ignore
    entry.qty = payload.qty  # type: ignore
    entry.warehouse_from = payload.warehouse_from  # type: ignore
    entry.warehouse_to = payload.warehouse_to  # type: ignore

    db.commit()
    db.refresh(entry)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Inventory Outward",
        details=f"Modified Outward Inventory (ID #{id}): Changed Qty from {old_qty} to {payload.qty}, Item from '{old_item or 'N/A'}' to '{payload.item_name or 'N/A'}' (Invoice No: '{payload.invoice_no or 'N/A'}')"
    )
    
    return {
        "message": "Outward Entry Updated Successfully",
        "entry": entry
    }


@router.delete("/inventory-outward/{id}")
def delete_outward(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(InventoryOutward).filter(InventoryOutward.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Outward entry not found")

    db.delete(entry)
    db.commit()
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Inventory Outward",
        details=f"Deleted Outward Inventory (ID #{id}): Removed transfer of {entry.qty} units of '{entry.item_name or 'N/A'}' from '{entry.warehouse_from or 'N/A'}' to '{entry.warehouse_to or 'N/A'}' (Invoice No: '{entry.invoice_no or 'N/A'}')"
    )
    
    return {
        "message": "Outward Entry Deleted Successfully"
    }


class OutwardDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/inventory-outward/delete-bulk")
def delete_outward_bulk(
    payload: OutwardDeleteBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(InventoryOutward).filter(InventoryOutward.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Inventory Outward",
            details=f"Bulk Deleted {len(payload.ids)} Outward Inventory records"
        )
        
        return {"message": "Selected outward entries deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
