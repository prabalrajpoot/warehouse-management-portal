from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database.db import get_db
from app.models.man_power import ManPower, ManPowerWorker
from app.utils.jwt_handler import get_current_user
from app.utils.logging import log_activity

FIRST_NAMES = [
  "Rajesh", "Sanjay", "Ramesh", "Anil", "Sunil", "Dinesh", "Vijay", "Vinod", "Manoj", "Pramod",
  "Rakesh", "Suresh", "Naresh", "Harish", "Satish", "Ashok", "Sandeep", "Deepak", "Pradeep", "Ajay",
  "Vikram", "Rahul", "Amit", "Sumit", "Rohit", "Mohit", "Vikas", "Abhishek", "Alok", "Arvind",
  "Bhupendra", "Devendra", "Girish", "Hemant", "Jitendra", "Kailash", "Lalit", "Mahendra", "Narendra", "Pankaj",
  "Rajendra", "Ravindra", "Shailendra", "Surendra", "Umesh", "Yogendra", "Ashish", "Gaurav", "Saurabh", "Manish",
  "Aarti", "Pooja", "Jyoti", "Sunita", "Anita", "Geeta", "Kiran", "Rekha", "Babita", "Suman",
  "Neha", "Priya", "Anjali", "Ritu", "Preeti", "Deepa", "Shalini", "Seema", "Renu", "Kavita"
]

LAST_NAMES = [
  "Kumar", "Singh", "Sharma", "Verma", "Gupta", "Yadav", "Patel", "Joshi", "Mishra", "Pandey",
  "Tiwari", "Choudhary", "Prasad", "Sinha", "Rathore", "Saxena", "Dwivedi", "Tripathi", "Dubey", "Shukla",
  "Rawat", "Negi", "Bhatt", "Gairola", "Nautiyal", "Semwal", "Kothari", "Uniyal", "Bahuguna", "Dhyani",
  "Das", "Banerjee", "Mukherjee", "Chatterjee", "Sen", "Bose", "Dutta", "Roy", "Mitra", "Sarkar"
]

def generate_deterministic_worker(record_id: int, index: int, role_type: str):
    return {
        "govt_id": "",
        "name": "",
        "role": role_type
    }


router = APIRouter()


class WorkerDetail(BaseModel):
    id: Optional[int] = None
    name: str
    govt_id: str
    role: str


class ManPowerCreate(BaseModel):
    date: str
    day: str
    month: str
    warehouse_location: str
    permanent_manpower: Optional[int] = 0
    additional_manpower: Optional[int] = 0
    supervisor: Optional[int] = 0
    overtime_hours: Optional[float] = 0.0
    remarks: Optional[str] = None
    workers: Optional[List[WorkerDetail]] = []


@router.post("/man-power")
def create_man_power(
    payload: ManPowerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Validate Aadhar uniqueness among non-empty values in the payload
    govt_ids = [w.govt_id.strip() for w in payload.workers or [] if w.govt_id and w.govt_id.strip()]
    if len(govt_ids) != len(set(govt_ids)):
        raise HTTPException(status_code=400, detail="Duplicate Aadhar Number found in the submitted list.")

    # Validate Aadhar uniqueness against the database
    for govt_id in govt_ids:
        existing = db.query(ManPowerWorker).filter(ManPowerWorker.govt_id == govt_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Aadhar Number '{govt_id}' is already registered to another worker.")

    from app.routes.dispatch import map_fuzzy_warehouse_name
    wh_loc = map_fuzzy_warehouse_name(payload.warehouse_location)
    new_entry = ManPower(
        date=payload.date,
        day=payload.day,
        month=payload.month,
        warehouse_location=wh_loc,
        permanent_manpower=payload.permanent_manpower,
        additional_manpower=payload.additional_manpower,
        supervisor=payload.supervisor,
        overtime_hours=payload.overtime_hours,
        remarks=payload.remarks
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    # Save workers if provided, else generate blanks
    if payload.workers:
        for w_detail in payload.workers:
            db_worker = ManPowerWorker(
                man_power_id=new_entry.id,
                govt_id=w_detail.govt_id,
                name=w_detail.name,
                role=w_detail.role
            )
            db.add(db_worker)
    else:
        for role in ["permanent", "additional", "supervisor"]:
            count = 0
            if role == "permanent":
                count = payload.permanent_manpower or 0
            elif role == "additional":
                count = payload.additional_manpower or 0
            elif role == "supervisor":
                count = payload.supervisor or 0

            for i in range(count):
                db_worker = ManPowerWorker(
                    man_power_id=new_entry.id,
                    govt_id="",
                    name="",
                    role=role
                )
                db.add(db_worker)
    db.commit()

    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="ADD",
        module="Manpower",
        details=f"Added new Manpower record: Date {payload.date}, Day '{payload.day}', Month '{payload.month}' for warehouse '{wh_loc}' (Permanent: {payload.permanent_manpower}, Additional: {payload.additional_manpower}, Supervisor: {payload.supervisor})"
    )

    return {
        "message": "Man Power Entry Created Successfully",
        "entry": new_entry
    }


@router.post("/man-power/bulk")
def create_man_power_bulk(
    payload: list[ManPowerCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        new_entries = []
        from app.routes.dispatch import map_fuzzy_warehouse_name
        for entry in payload:
            wh_loc = map_fuzzy_warehouse_name(entry.warehouse_location)
            log = ManPower(
                date=entry.date,
                day=entry.day,
                month=entry.month,
                warehouse_location=wh_loc,
                permanent_manpower=entry.permanent_manpower,
                additional_manpower=entry.additional_manpower,
                supervisor=entry.supervisor,
                overtime_hours=entry.overtime_hours,
                remarks=entry.remarks or ""
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            new_entries.append(log)

            # Generate workers for this log
            for role in ["permanent", "additional", "supervisor"]:
                count = 0
                if role == "permanent":
                    count = entry.permanent_manpower or 0
                elif role == "additional":
                    count = entry.additional_manpower or 0
                elif role == "supervisor":
                    count = entry.supervisor or 0

                for i in range(count):
                    db_worker = ManPowerWorker(
                        man_power_id=log.id,
                        govt_id="",
                        name="",
                        role=role
                    )
                    db.add(db_worker)
        db.commit()

        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="ADD (Bulk)",
            module="Manpower",
            details=f"Bulk Imported {len(new_entries)} Manpower records via Excel upload"
        )

        return {"message": f"Successfully imported {len(new_entries)} records"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/man-power")
def get_man_powers(
    db: Session = Depends(get_db)
):
    logs = db.query(ManPower).order_by(ManPower.id.asc()).all()
    result = []
    for log in logs:
        workers_list = []
        for w in log.workers:
            workers_list.append({
                "id": w.id,
                "govt_id": w.govt_id or "",
                "name": w.name or "",
                "role": w.role
            })
        result.append({
            "id": log.id,
            "date": log.date,
            "day": log.day,
            "month": log.month,
            "warehouse_location": log.warehouse_location,
            "permanent_manpower": log.permanent_manpower,
            "additional_manpower": log.additional_manpower,
            "supervisor": log.supervisor,
            "overtime_hours": log.overtime_hours,
            "remarks": log.remarks,
            "workers": workers_list
        })
    return result


@router.put("/man-power/{id}")
def update_man_power(
    id: int,
    payload: ManPowerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(ManPower).filter(ManPower.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Man Power entry not found")

    # Validate Aadhar uniqueness among non-empty values in the payload
    govt_ids = [w.govt_id.strip() for w in payload.workers or [] if w.govt_id and w.govt_id.strip()]
    if len(govt_ids) != len(set(govt_ids)):
        raise HTTPException(status_code=400, detail="Duplicate Aadhar Number found in the submitted list.")

    # Validate Aadhar uniqueness against the database (excluding current log's own workers)
    for w_detail in payload.workers or []:
        gid = w_detail.govt_id.strip() if w_detail.govt_id else ""
        if gid:
            query = db.query(ManPowerWorker).filter(ManPowerWorker.govt_id == gid)
            if w_detail.id:
                query = query.filter(ManPowerWorker.id != w_detail.id)
            existing = query.first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Aadhar Number '{gid}' is already registered to another worker.")

    from app.routes.dispatch import map_fuzzy_warehouse_name
    wh_loc = map_fuzzy_warehouse_name(payload.warehouse_location)
    entry.date = payload.date
    entry.day = payload.day
    entry.month = payload.month
    entry.warehouse_location = wh_loc
    entry.permanent_manpower = payload.permanent_manpower
    entry.additional_manpower = payload.additional_manpower
    entry.supervisor = payload.supervisor
    entry.overtime_hours = payload.overtime_hours
    entry.remarks = payload.remarks

    # Now synchronize the workers list
    existing_workers = {w.id: w for w in entry.workers}
    payload_worker_ids = set()

    for w_detail in payload.workers or []:
        if w_detail.id and w_detail.id in existing_workers:
            db_worker = existing_workers[w_detail.id]
            db_worker.name = w_detail.name
            db_worker.govt_id = w_detail.govt_id
            db_worker.role = w_detail.role
            payload_worker_ids.add(w_detail.id)
        else:
            new_worker = ManPowerWorker(
                man_power_id=id,
                govt_id=w_detail.govt_id,
                name=w_detail.name,
                role=w_detail.role
            )
            db.add(new_worker)

    # Delete workers not present in the payload
    for w_id, w in existing_workers.items():
        if w_id not in payload_worker_ids:
            db.delete(w)

    db.commit()
    db.refresh(entry)

    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="UPDATE",
        module="Manpower",
        details=f"Modified Manpower record (ID #{id}): Set date to {payload.date}, warehouse to '{wh_loc}', permanent manpower to {payload.permanent_manpower}, additional manpower to {payload.additional_manpower}, supervisor to {payload.supervisor}"
    )

    return {
        "message": "Man Power Entry Updated Successfully",
        "entry": entry
    }


@router.delete("/man-power/all")
def delete_all_man_powers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        num_deleted = db.query(ManPower).delete()
        db.commit()

        log_activity(
            db=db,
            username=current_user.get("sub", "Unknown"),
            role=current_user.get("role", "worker"),
            action="DELETE (Bulk)",
            module="Manpower",
            details="Deleted all Manpower records from database (truncate/wipe)"
        )

        return {"message": f"Successfully deleted all {num_deleted} records"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/man-power/{id}")
def delete_man_power(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    entry = db.query(ManPower).filter(ManPower.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Man Power entry not found")

    db.delete(entry)
    db.commit()

    log_activity(
        db=db,
        username=current_user.get("sub", "Unknown"),
        role=current_user.get("role", "worker"),
        action="DELETE",
        module="Manpower",
        details=f"Deleted Manpower record (ID #{id}): Removed manpower log dated {entry.date} for warehouse '{entry.warehouse_location}'"
    )

    return {
        "message": "Man Power Entry Deleted Successfully"
    }


# Worker schemas
class WorkerUpdate(BaseModel):
    name: str
    govt_id: str


class WorkerCreate(BaseModel):
    name: str
    govt_id: str
    role: str
    date: str
    location: str


@router.post("/man-power/workers")
def add_worker(
    payload: WorkerCreate,
    db: Session = Depends(get_db)
):
    gid = payload.govt_id.strip() if payload.govt_id else ""
    if gid:
        existing = db.query(ManPowerWorker).filter(ManPowerWorker.govt_id == gid).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Aadhar Number '{gid}' is already registered to another worker.")

    from app.routes.dispatch import map_fuzzy_warehouse_name
    target_location = map_fuzzy_warehouse_name(payload.location)

    # Find or create matching ManPower log by date and location
    log = db.query(ManPower).filter(
        ManPower.date == payload.date,
        ManPower.warehouse_location == target_location
    ).first()

    if not log:
        # Calculate day and month from date
        from datetime import datetime
        try:
            date_obj = datetime.strptime(payload.date, "%d/%m/%Y")
            days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            day_name = days[(date_obj.weekday() + 1) % 7]
            month_name = months[date_obj.month - 1]
        except Exception:
            day_name = "Monday"
            month_name = "January"

        log = ManPower(
            date=payload.date,
            day=day_name,
            month=month_name,
            warehouse_location=target_location,
            permanent_manpower=0,
            additional_manpower=0,
            supervisor=0,
            overtime_hours=0.0
        )
        db.add(log)
        db.commit()
        db.refresh(log)

    # Increment headcount
    if payload.role == "permanent":
        log.permanent_manpower = (log.permanent_manpower or 0) + 1
    elif payload.role == "additional":
        log.additional_manpower = (log.additional_manpower or 0) + 1
    elif payload.role == "supervisor":
        log.supervisor = (log.supervisor or 0) + 1

    new_worker = ManPowerWorker(
        man_power_id=log.id,
        govt_id=payload.govt_id,
        name=payload.name,
        role=payload.role
    )
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)

    return {"message": "Worker added successfully", "worker": {
        "id": new_worker.id,
        "name": new_worker.name,
        "govt_id": new_worker.govt_id,
        "role": new_worker.role
    }}


@router.get("/man-power/workers")
def get_workers(
    role: str,
    location: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ManPower)
    if location:
        query = query.filter(ManPower.warehouse_location == location)
    if month:
        query = query.filter(ManPower.month == month)
    logs = query.all()

    for log in logs:
        expected_count = 0
        if role == "permanent":
            expected_count = log.permanent_manpower or 0
        elif role == "additional":
            expected_count = log.additional_manpower or 0
        elif role == "supervisor":
            expected_count = log.supervisor or 0

        existing_workers = db.query(ManPowerWorker).filter(
            ManPowerWorker.man_power_id == log.id,
            ManPowerWorker.role == role
        ).all()

        if len(existing_workers) < expected_count:
            for i in range(len(existing_workers), expected_count):
                db_worker = ManPowerWorker(
                    man_power_id=log.id,
                    govt_id="",
                    name="",
                    role=role
                )
                db.add(db_worker)
            db.commit()

    log_ids = [log.id for log in logs]
    if not log_ids:
        return []

    workers = db.query(ManPowerWorker).filter(
        ManPowerWorker.man_power_id.in_(log_ids),
        ManPowerWorker.role == role
    ).order_by(ManPowerWorker.id.asc()).all()

    result = []
    for w in workers:
        result.append({
            "id": w.id,
            "govt_id": w.govt_id,
            "name": w.name,
            "role": w.role,
            "man_power_id": w.man_power_id,
            "date": w.man_power.date,
            "location": w.man_power.warehouse_location
        })
    return result


@router.put("/man-power/workers/{id}")
def update_worker(
    id: int,
    payload: WorkerUpdate,
    db: Session = Depends(get_db)
):
    worker = db.query(ManPowerWorker).filter(ManPowerWorker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    gid = payload.govt_id.strip() if payload.govt_id else ""
    if gid:
        existing = db.query(ManPowerWorker).filter(
            ManPowerWorker.govt_id == gid,
            ManPowerWorker.id != id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Aadhar Number '{gid}' is already registered to another worker.")

    worker.name = payload.name
    worker.govt_id = payload.govt_id
    db.commit()
    return {"message": "Worker updated successfully", "worker": {
        "id": worker.id,
        "name": worker.name,
        "govt_id": worker.govt_id
    }}


@router.delete("/man-power/workers/all")
def delete_all_workers_filtered(
    role: str,
    location: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ManPower)
    if location:
        query = query.filter(ManPower.warehouse_location == location)
    if month:
        query = query.filter(ManPower.month == month)
    logs = query.all()

    log_ids = [log.id for log in logs]
    if not log_ids:
        return {"message": "No records found matching filters"}

    db.query(ManPowerWorker).filter(
        ManPowerWorker.man_power_id.in_(log_ids),
        ManPowerWorker.role == role
    ).delete(synchronize_session=False)

    for log in logs:
        if role == "permanent":
            log.permanent_manpower = 0
        elif role == "additional":
            log.additional_manpower = 0
        elif role == "supervisor":
            log.supervisor = 0

    db.commit()
    return {"message": f"Successfully cleared all {role} workers and updated headcounts for matching logs"}


@router.delete("/man-power/workers/{id}")
def delete_worker(
    id: int,
    db: Session = Depends(get_db)
):
    worker = db.query(ManPowerWorker).filter(ManPowerWorker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    parent_log = worker.man_power
    role = worker.role

    if role == "permanent":
        if parent_log.permanent_manpower and parent_log.permanent_manpower > 0:
            parent_log.permanent_manpower -= 1
    elif role == "additional":
        if parent_log.additional_manpower and parent_log.additional_manpower > 0:
            parent_log.additional_manpower -= 1
    elif role == "supervisor":
        if parent_log.supervisor and parent_log.supervisor > 0:
            parent_log.supervisor -= 1

    db.delete(worker)
    db.commit()
    return {"message": "Worker deleted successfully and headcount updated"}
