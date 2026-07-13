from sqlalchemy import Column, Integer, String
from app.database.db import Base

class Inspection(Base):
    __tablename__ = "inspection"

    id = Column(Integer, primary_key=True, index=True)
    call_date = Column(String, nullable=False)
    firm = Column(String, nullable=True)
    warehouse_name = Column(String, nullable=True)
    trade = Column(String, nullable=True)
    set_type = Column(String, nullable=True)
    inspection_passed = Column(String, nullable=False)
    inspection_no = Column(String, nullable=False)
    ins_passed_date = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)