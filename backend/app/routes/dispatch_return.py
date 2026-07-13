from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.dispatch_return import DispatchReturn
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity

router = APIRouter()


class DispatchReturnCreate(BaseModel):
    dispatched_date: str
    firm: Optional[str] = None
    warehouse_name: Optional[str] = None
    trade: Optional[str] = None
    set_type: Optional[str] = None
    quantity: Optional[int] = 1
    ms_barcode: Optional[str] = None


@router.post("/dispatch-return")
def create_return(
    payload: DispatchReturnCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.routes.dispatch import map_fuzzy_warehouse_name
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name) if payload.warehouse_name else None
    new_return = DispatchReturn(
        dispatched_date=payload.dispatched_date,
        firm=payload.firm,
        warehouse_name=wh_val,
        trade=payload.trade,
        set_type=payload.set_type,
        quantity=payload.quantity,
        ms_barcode=payload.ms_barcode
    )
    db.add(new_return)
    db.commit()
    db.refresh(new_return)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Returns",
        details=f"Added new Return record: {payload.quantity} units of '{payload.trade or 'N/A'}' for warehouse '{wh_val or 'N/A'}' (Barcode/MS No: '{payload.ms_barcode or 'N/A'}')"
    )
    
    return {
        "message": "Return Entry Created Successfully",
        "return": new_return
    }


@router.get("/dispatch-return")
def get_returns(
    db: Session = Depends(get_db)
):
    return db.query(DispatchReturn).order_by(DispatchReturn.id.asc()).all()


@router.put("/dispatch-return/{id}")
def update_return(
    id: int,
    payload: DispatchReturnCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(DispatchReturn).filter(DispatchReturn.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Return entry not found")

    from app.routes.dispatch import map_fuzzy_warehouse_name
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name) if payload.warehouse_name else None
    
    old_qty = entry.quantity
    old_trade = entry.trade

    entry.dispatched_date = payload.dispatched_date  # type: ignore
    entry.firm = payload.firm  # type: ignore
    entry.warehouse_name = wh_val  # type: ignore
    entry.trade = payload.trade  # type: ignore
    entry.set_type = payload.set_type  # type: ignore
    entry.quantity = payload.quantity  # type: ignore
    entry.ms_barcode = payload.ms_barcode  # type: ignore

    db.commit()
    db.refresh(entry)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Returns",
        details=f"Modified Return record (ID #{id}): Changed Qty from {old_qty} to {payload.quantity}, Trade from '{old_trade or 'N/A'}' to '{payload.trade or 'N/A'}' (Warehouse: '{wh_val or 'N/A'}')"
    )
    
    return {
        "message": "Return Entry Updated Successfully",
        "return": entry
    }


@router.delete("/dispatch-return/{id}")
def delete_return(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(DispatchReturn).filter(DispatchReturn.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Return entry not found")

    db.delete(entry)
    db.commit()
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Returns",
        details=f"Deleted Return record (ID #{id}): Removed {entry.quantity} units of '{entry.trade or 'N/A'}' (Warehouse: '{entry.warehouse_name or 'N/A'}')"
    )
    
    return {
        "message": "Return Entry Deleted Successfully"
    }


@router.post("/dispatch-return/bulk")
def create_returns_bulk(
    payload: list[DispatchReturnCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        from app.routes.dispatch import map_fuzzy_warehouse_name
        new_returns = []
        for entry in payload:
            new_returns.append(
                DispatchReturn(
                    dispatched_date=entry.dispatched_date,
                    firm=entry.firm,
                    warehouse_name=map_fuzzy_warehouse_name(entry.warehouse_name) if entry.warehouse_name else None,
                    trade=entry.trade,
                    set_type=entry.set_type,
                    quantity=entry.quantity,
                    ms_barcode=entry.ms_barcode
                )
            )
        db.add_all(new_returns)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="ADD (Bulk)",
            module="Returns",
            details=f"Bulk Marked {len(new_returns)} entries as returned"
        )
        
        return {"message": f"Successfully marked {len(new_returns)} entries as returned"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class DispatchReturnDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/dispatch-return/delete-bulk")
def delete_returns_bulk(
    payload: DispatchReturnDeleteBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(DispatchReturn).filter(DispatchReturn.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Returns",
            details=f"Bulk Deleted {len(payload.ids)} return records"
        )
        
        return {"message": "Selected returns deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
