from sqlalchemy import Column, Integer, String
from app.database.db import Base


class DispatchReturn(Base):
    __tablename__ = "dispatch_return"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    dispatched_date = Column(
        String,
        nullable=False
    )

    firm = Column(
        String,
        nullable=True
    )

    warehouse_name = Column(
        String,
        nullable=True
    )

    trade = Column(
        String,
        nullable=True
    )

    set_type = Column(
        String,
        nullable=True
    )

    quantity = Column(
        Integer,
        nullable=True,
        default=1
    )

    ms_barcode = Column(
        String,
        nullable=True
    )
