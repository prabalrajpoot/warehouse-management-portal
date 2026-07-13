from sqlalchemy import Column, Integer, String
from app.database.db import Base

class Kit(Base):
    __tablename__ = "kits"

    id = Column(Integer, primary_key=True, index=True)
    call_date = Column(String, nullable=False)
    firm = Column(String, nullable=True)
    warehouse_name = Column(String, nullable=False)
    trade = Column(String, nullable=False)
    set_type = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)