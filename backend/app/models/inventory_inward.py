from sqlalchemy import Column, Integer, String
from app.database.db import Base


class InventoryInward(Base):
    __tablename__ = "inventory_inward"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    received_date = Column(
        String,
        nullable=False
    )

    received_qty = Column(
        Integer,
        nullable=True
    )

    invoice_date = Column(
        String,
        nullable=True
    )

    invoice_no = Column(
        String,
        nullable=True
    )

    invoice_qty = Column(
        Integer,
        nullable=True
    )

    short_damage_qty = Column(
        Integer,
        nullable=True
    )

    item_name = Column(
        String,
        nullable=True
    )

    brand_description = Column(
        String,
        nullable=True
    )

    trade_name = Column(
        String,
        nullable=True
    )
