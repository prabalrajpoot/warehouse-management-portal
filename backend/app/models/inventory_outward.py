from sqlalchemy import Column, Integer, String
from app.database.db import Base


class InventoryOutward(Base):
    __tablename__ = "inventory_outward"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    transfer_date = Column(
        String,
        nullable=False
    )

    invoice_no = Column(
        String,
        nullable=True
    )

    item_name = Column(
        String,
        nullable=True
    )

    brand = Column(
        String,
        nullable=True
    )

    trade_name = Column(
        String,
        nullable=True
    )

    qty = Column(
        Integer,
        nullable=True
    )

    warehouse_from = Column(
        String,
        nullable=True
    )

    warehouse_to = Column(
        String,
        nullable=True
    )
