from sqlalchemy import Column, Integer, String
from app.database.db import Base


class DeliveryOverride(Base):
    __tablename__ = "delivery_overrides"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, index=True)
    trade = Column(String, index=True)
    set_type = Column(String, index=True)
    delivery_qty = Column(Integer, default=0)
