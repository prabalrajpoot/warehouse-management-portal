from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.db import get_db
from app.models.activity_log import ActivityLog
from app.utils.jwt_handler import get_current_user
import datetime

router = APIRouter()


@router.get("/activity-logs")
def get_activity_logs(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    role = str(user.get("role", "")).lower().strip()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view activity logs")
        
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).all()
    for log in logs:
        if log.timestamp and log.timestamp.tzinfo is None:
            log.timestamp = log.timestamp.replace(tzinfo=datetime.timezone.utc)
    return logs


class ActivityLogDeleteBulk(BaseModel):
    ids: list[int]


@router.delete("/activity-logs/{id}")
def delete_activity_log(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    role = str(user.get("role", "")).lower().strip()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete activity logs")

    log_entry = db.query(ActivityLog).filter(ActivityLog.id == id).first()
    if not log_entry:
        raise HTTPException(status_code=404, detail="Activity log entry not found")

    db.delete(log_entry)
    db.commit()
    return {"message": "Activity log entry deleted successfully"}


@router.post("/activity-logs/delete-bulk")
def delete_activity_logs_bulk(
    payload: ActivityLogDeleteBulk,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    role = str(user.get("role", "")).lower().strip()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete activity logs")

    try:
        db.query(ActivityLog).filter(ActivityLog.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully deleted {len(payload.ids)} activity log records"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/activity-logs/clear-all")
def clear_all_activity_logs(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    role = str(user.get("role", "")).lower().strip()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can clear all activity logs")

    try:
        db.query(ActivityLog).delete(synchronize_session=False)
        db.commit()
        return {"message": "All activity logs cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
