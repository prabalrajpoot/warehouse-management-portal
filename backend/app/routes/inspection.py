from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.inspection import Inspection
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity
from app.utils.cache import clear_dashboard_cache

router = APIRouter()


class InspectionCreate(BaseModel):
    call_date: str
    firm: Optional[str] = None
    warehouse_name: Optional[str] = None
    trade: Optional[str] = None
    set_type: Optional[str] = None
    inspection_passed: str
    inspection_no: str
    ins_passed_date: Optional[str] = None
    quantity: int


@router.post("/inspection")
def create_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.routes.dispatch import map_fuzzy_trade_and_set_type, map_fuzzy_warehouse_name
    mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(payload.trade)
    trade_val = mapped_trade if mapped_trade else payload.trade
    set_type_val = mapped_set if mapped_set else payload.set_type
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name)

    new_inspection = Inspection(
        call_date=payload.call_date,
        firm=payload.firm,
        warehouse_name=wh_val,
        trade=trade_val,
        set_type=set_type_val,
        inspection_passed=payload.inspection_passed,
        inspection_no=payload.inspection_no,
        ins_passed_date=payload.ins_passed_date,
        quantity=payload.quantity
    )
    db.add(new_inspection)
    db.commit()
    clear_dashboard_cache()
    db.refresh(new_inspection)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Inspection",
        details=f"Added new Inspection request: {payload.quantity} units of '{trade_val}' for warehouse '{wh_val}' (Status: '{payload.inspection_passed}', Inspection No: '{payload.inspection_no}')"
    )
    
    return {
        "message": "Inspection Created Successfully",
        "inspection": new_inspection
    }


@router.get("/inspection")
def get_inspection(
    db: Session = Depends(get_db)
):
    return db.query(Inspection).order_by(Inspection.id.asc()).all()


@router.put("/inspection/{id}")
def update_inspection(
    id: int,
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    from app.routes.dispatch import map_fuzzy_trade_and_set_type, map_fuzzy_warehouse_name
    mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(payload.trade)
    trade_val = mapped_trade if mapped_trade else payload.trade
    set_type_val = mapped_set if mapped_set else payload.set_type
    wh_val = map_fuzzy_warehouse_name(payload.warehouse_name)

    old_status = inspection.inspection_passed
    old_qty = inspection.quantity

    inspection.call_date = payload.call_date  # type: ignore
    inspection.firm = payload.firm  # type: ignore
    inspection.warehouse_name = wh_val  # type: ignore
    inspection.trade = trade_val  # type: ignore
    inspection.set_type = set_type_val  # type: ignore
    inspection.inspection_passed = payload.inspection_passed  # type: ignore
    inspection.inspection_no = payload.inspection_no  # type: ignore
    inspection.ins_passed_date = payload.ins_passed_date  # type: ignore
    inspection.quantity = payload.quantity  # type: ignore

    db.commit()
    clear_dashboard_cache()
    db.refresh(inspection)
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Inspection",
        details=f"Modified Inspection record (ID #{id}): Changed Qty from {old_qty} to {payload.quantity}, Status from '{old_status}' to '{payload.inspection_passed}' (Inspection No: '{payload.inspection_no}')"
    )
    
    return {
        "message": "Inspection Updated Successfully",
        "inspection": inspection
    }


@router.delete("/inspection/{id}")
def delete_inspection(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    db.delete(inspection)
    db.commit()
    clear_dashboard_cache()
    
    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Inspection",
        details=f"Deleted Inspection record (ID #{id}): Removed {inspection.quantity} units of '{inspection.trade}' (Status: '{inspection.inspection_passed}', Inspection No: '{inspection.inspection_no}')"
    )
    
    return {
        "message": "Inspection Deleted Successfully"
    }


@router.post("/inspection/bulk")
def create_inspections_bulk(
    payload: list[InspectionCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.routes.dispatch import map_fuzzy_trade_and_set_type, map_fuzzy_warehouse_name
    try:
        new_inspections = []
        for entry in payload:
            mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(entry.trade)
            trade_val = mapped_trade if mapped_trade else entry.trade
            set_type_val = mapped_set if mapped_set else entry.set_type
            wh_val = map_fuzzy_warehouse_name(entry.warehouse_name)
            
            new_inspections.append(
                Inspection(
                    call_date=entry.call_date,
                    firm=entry.firm,
                    warehouse_name=wh_val,
                    trade=trade_val,
                    set_type=set_type_val,
                    inspection_passed=entry.inspection_passed,
                    inspection_no=entry.inspection_no,
                    ins_passed_date=entry.ins_passed_date,
                    quantity=entry.quantity
                )
            )
        db.add_all(new_inspections)
        db.commit()
        clear_dashboard_cache()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="ADD (Bulk)",
            module="Inspection",
            details=f"Bulk Created/Offered {len(new_inspections)} records for inspection"
        )
        
        return {"message": f"Successfully imported {len(new_inspections)} inspection records"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class InspectionUpdateResultBulk(BaseModel):
    ids: list[int]
    result: str
    ins_passed_date: Optional[str] = None


@router.post("/inspection/update-result-bulk")
def update_inspections_result_bulk(
    payload: InspectionUpdateResultBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        update_data = {Inspection.inspection_passed: payload.result}
        if payload.ins_passed_date:
            update_data[Inspection.ins_passed_date] = payload.ins_passed_date
        db.query(Inspection).filter(Inspection.id.in_(payload.ids)).update(
            update_data,
            synchronize_session=False
        )
        db.commit()
        clear_dashboard_cache()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="UPDATE (Bulk)",
            module="Inspection",
            details=f"Bulk Updated {len(payload.ids)} inspection results to '{payload.result}' (Passed Date: '{payload.ins_passed_date or 'N/A'}')"
        )
        
        return {"message": "Selected inspections updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


class InspectionDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/inspection/delete-bulk")
def delete_inspections_bulk(
    payload: InspectionDeleteBulk,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        db.query(Inspection).filter(Inspection.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        clear_dashboard_cache()
        
        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Inspection",
            details=f"Bulk Deleted {len(payload.ids)} inspection records"
        )
        
        return {"message": "Selected inspections deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))