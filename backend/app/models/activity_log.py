from sqlalchemy import Column, Integer, String, DateTime
from app.database.db import Base
import datetime


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    role = Column(String, index=True)
    action = Column(String, index=True)
    module = Column(String, index=True)
    details = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.now)
