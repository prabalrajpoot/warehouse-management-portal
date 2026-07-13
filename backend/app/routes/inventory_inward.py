from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.inventory_inward import InventoryInward
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity

router = APIRouter()


class InwardCreate(BaseModel):
    received_date: str
    received_qty: Optional[int] = None
    invoice_date: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_qty: Optional[int] = None
    short_damage_qty: Optional[int] = None
    item_name: Optional[str] = None
    brand_description: Optional[str] = None
    trade_name: Optional[str] = None


@router.post("/inventory-inward")
def create_inward(
    payload: InwardCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    new_entry = InventoryInward(
        received_date=payload.received_date,
        received_qty=payload.received_qty,
        invoice_date=payload.invoice_date,
        invoice_no=payload.invoice_no,
        invoice_qty=payload.invoice_qty,
        short_damage_qty=payload.short_damage_qty,
        item_name=payload.item_name,
        brand_description=payload.brand_description,
        trade_name=payload.trade_name
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Inventory Inward",
        details=f"Added new Inward Inventory: {payload.received_qty} units of '{payload.item_name or 'N/A'}' (Brand: '{payload.brand_description or 'N/A'}', Invoice No: '{payload.invoice_no or 'N/A'}')"
    )
    
    return {
        "message": "Inward Entry Created Successfully",
        "entry": new_entry
    }


@router.get("/inventory-inward")
def get_inward(
    db: Session = Depends(get_db)
):
    return db.query(InventoryInward).order_by(InventoryInward.id.asc()).all()


@router.put("/inventory-inward/{id}")
def update_inward(
    id: int,
    payload: InwardCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(InventoryInward).filter(InventoryInward.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Inward entry not found")

    old_qty = entry.received_qty
    old_item = entry.item_name

    entry.received_date = payload.received_date  # type: ignore
    entry.received_qty = payload.received_qty  # type: ignore
    entry.invoice_date = payload.invoice_date  # type: ignore
    entry.invoice_no = payload.invoice_no  # type: ignore
    entry.invoice_qty = payload.invoice_qty  # type: ignore
    entry.short_damage_qty = payload.short_damage_qty  # type: ignore
    entry.item_name = payload.item_name  # type: ignore
    entry.brand_description = payload.brand_description  # type: ignore
    entry.trade_name = payload.trade_name  # type: ignore

    db.commit()
    db.refresh(entry)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Inventory Inward",
        details=f"Modified Inward Inventory (ID #{id}): Changed Qty from {old_qty} to {payload.received_qty}, Item from '{old_item or 'N/A'}' to '{payload.item_name or 'N/A'}' (Invoice No: '{payload.invoice_no or 'N/A'}')"
    )
    
    return {
        "message": "Inward Entry Updated Successfully",
        "entry": entry
    }


@router.delete("/inventory-inward/{id}")
def delete_inward(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(InventoryInward).filter(InventoryInward.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Inward entry not found")

    db.delete(entry)
    db.commit()
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Inventory Inward",
        details=f"Deleted Inward Inventory (ID #{id}): Removed {entry.received_qty} units of '{entry.item_name or 'N/A'}' (Invoice No: '{entry.invoice_no or 'N/A'}')"
    )
    
    return {
        "message": "Inward Entry Deleted Successfully"
    }


class InwardDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/inventory-inward/delete-bulk")
def delete_inward_bulk(
    payload: InwardDeleteBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(InventoryInward).filter(InventoryInward.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Inventory Inward",
            details=f"Bulk Deleted {len(payload.ids)} Inward Inventory records"
        )
        
        return {"message": "Selected inward entries deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
