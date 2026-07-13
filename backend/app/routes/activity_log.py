from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.activity_log import ActivityLog
from app.utils.jwt_handler import get_current_user

router = APIRouter()


@router.get("/activity-logs")
def get_activity_logs(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    role = str(user.get("role", "")).lower().strip()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view activity logs")
        
    return db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).all()
