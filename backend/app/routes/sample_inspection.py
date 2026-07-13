from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.sample_inspection import SampleInspection

router = APIRouter()


class SampleInspectionCreate(BaseModel):
    date: str
    firm: Optional[str] = None
    warehouse_name: Optional[str] = None
    trade: Optional[str] = None
    sample_name: Optional[str] = None
    quantity: Optional[int] = 1
    status: Optional[str] = "Pending"
    remarks: Optional[str] = None
    sample_type: str  # factory, approved


@router.post("/sample-inspections")
def create_sample_inspection(
    payload: SampleInspectionCreate,
    db: Session = Depends(get_db)
):
    new_entry = SampleInspection(
        date=payload.date,
        firm=payload.firm,
        warehouse_name=payload.warehouse_name,
        trade=payload.trade,
        sample_name=payload.sample_name,
        quantity=payload.quantity,
        status=payload.status,
        remarks=payload.remarks,
        sample_type=payload.sample_type
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return {
        "message": "Sample Inspection Entry Created Successfully",
        "entry": new_entry
    }


@router.get("/sample-inspections")
def get_sample_inspections(
    db: Session = Depends(get_db)
):
    return db.query(SampleInspection).order_by(SampleInspection.id.asc()).all()


@router.put("/sample-inspections/{id}")
def update_sample_inspection(
    id: int,
    payload: SampleInspectionCreate,
    db: Session = Depends(get_db)
):
    entry = db.query(SampleInspection).filter(SampleInspection.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sample Inspection entry not found")

    entry.date = payload.date  # type: ignore
    entry.firm = payload.firm  # type: ignore
    entry.warehouse_name = payload.warehouse_name  # type: ignore
    entry.trade = payload.trade  # type: ignore
    entry.sample_name = payload.sample_name  # type: ignore
    entry.quantity = payload.quantity  # type: ignore
    entry.status = payload.status  # type: ignore
    entry.remarks = payload.remarks  # type: ignore
    entry.sample_type = payload.sample_type  # type: ignore

    db.commit()
    db.refresh(entry)
    return {
        "message": "Sample Inspection Entry Updated Successfully",
        "entry": entry
    }


@router.delete("/sample-inspections/{id}")
def delete_sample_inspection(
    id: int,
    db: Session = Depends(get_db)
):
    entry = db.query(SampleInspection).filter(SampleInspection.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sample Inspection entry not found")

    db.delete(entry)
    db.commit()
    return {
        "message": "Sample Inspection Entry Deleted Successfully"
    }
