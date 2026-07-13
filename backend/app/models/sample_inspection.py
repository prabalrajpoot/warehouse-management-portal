from sqlalchemy import Column, Integer, String
from app.database.db import Base


class SampleInspection(Base):
    __tablename__ = "sample_inspections"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    date = Column(
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

    sample_name = Column(
        String,
        nullable=True
    )

    quantity = Column(
        Integer,
        nullable=True
    )

    status = Column(
        String,
        nullable=True
    )  # Pending, Approved, Rejected

    remarks = Column(
        String,
        nullable=True
    )

    sample_type = Column(
        String,
        nullable=False
    )  # factory, approved
