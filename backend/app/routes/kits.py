from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.kits import Kit
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity

router = APIRouter()


class KitCreate(BaseModel):
    call_date: str
    firm: Optional[str] = None
    warehouse_name: str
    trade: str
    set_type: Optional[str] = None
    quantity: int


@router.post("/kits")
def create_kit(
    payload: KitCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.routes.dispatch import map_fuzzy_trade_and_set_type, map_fuzzy_warehouse_name
    mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(payload.trade)
    trade_val = mapped_trade if mapped_trade else payload.trade
    set_type_val = mapped_set if mapped_set else payload.set_type
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name)

    new_kit = Kit(
        call_date=payload.call_date,
        firm=payload.firm,
        warehouse_name=wh_val,
        trade=trade_val,
        set_type=set_type_val,
        quantity=payload.quantity
    )
    db.add(new_kit)
    db.commit()
    db.refresh(new_kit)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Kits",
        details=f"Added new Kit entry: {payload.quantity} units of '{trade_val}' for warehouse '{wh_val}' (Firm: '{payload.firm or 'N/A'}', Set: '{set_type_val or 'N/A'}')"
    )
    
    return {
        "message": "Kit Created Successfully",
        "kit": new_kit
    }


@router.get("/kits")
def get_kits(
    db: Session = Depends(get_db)
):
    return db.query(Kit).order_by(Kit.id.asc()).all()


@router.put("/kits/{id}")
def update_kit(
    id: int,
    payload: KitCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    kit = db.query(Kit).filter(Kit.id == id).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit not found")

    from app.routes.dispatch import map_fuzzy_trade_and_set_type, map_fuzzy_warehouse_name
    mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(payload.trade)
    trade_val = mapped_trade if mapped_trade else payload.trade
    set_type_val = mapped_set if mapped_set else payload.set_type
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name)

    old_qty = kit.quantity
    old_wh = kit.warehouse_name
    old_trade = kit.trade

    kit.call_date = payload.call_date  # type: ignore
    kit.firm = payload.firm  # type: ignore
    kit.warehouse_name = wh_val  # type: ignore
    kit.trade = trade_val  # type: ignore
    kit.set_type = set_type_val  # type: ignore
    kit.quantity = payload.quantity  # type: ignore

    db.commit()
    db.refresh(kit)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Kits",
        details=f"Modified Kit entry (ID #{id}): Changed Qty from {old_qty} to {payload.quantity}, Warehouse from '{old_wh}' to '{wh_val}', Trade from '{old_trade}' to '{trade_val}'"
    )
    
    return {
        "message": "Kit Updated Successfully",
        "kit": kit
    }


@router.delete("/kits/{id}")
def delete_kit(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    kit = db.query(Kit).filter(Kit.id == id).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit not found")

    db.delete(kit)
    db.commit()
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Kits",
        details=f"Deleted Kit entry (ID #{id}): Removed {kit.quantity} units of '{kit.trade}' for warehouse '{kit.warehouse_name}' (Firm: '{kit.firm or 'N/A'}', Set: '{kit.set_type or 'N/A'}')"
    )
    
    return {
        "message": "Kit Deleted Successfully"
    }


@router.post("/kits/bulk")
def create_kits_bulk(
    payload: list[KitCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.routes.dispatch import map_fuzzy_trade_and_set_type, map_fuzzy_warehouse_name
    try:
        new_kits = []
        for entry in payload:
            mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(entry.trade)
            trade_val = mapped_trade if mapped_trade else entry.trade
            set_type_val = mapped_set if mapped_set else entry.set_type
            wh_val = map_fuzzy_warehouse_name(entry.warehouse_name)
            
            new_kits.append(
                Kit(
                    call_date=entry.call_date,
                    firm=entry.firm,
                    warehouse_name=wh_val,
                    trade=trade_val,
                    set_type=set_type_val,
                    quantity=entry.quantity
                )
            )
        db.add_all(new_kits)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="ADD (Bulk)",
            module="Kits",
            details=f"Bulk Imported {len(new_kits)} Kit entries via Excel upload"
        )
        
        return {"message": f"Successfully imported {len(new_kits)} kit records"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class KitDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/kits/delete-bulk")
def delete_kits_bulk(
    payload: KitDeleteBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(Kit).filter(Kit.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Kits",
            details=f"Bulk Deleted {len(payload.ids)} Kit entries"
        )
        
        return {"message": "Selected kits deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))