from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.db import Base


class ManPower(Base):
    __tablename__ = "man_power"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    date = Column(
        String,
        nullable=False
    )

    day = Column(
        String,
        nullable=False
    )

    month = Column(
        String,
        nullable=False
    )

    warehouse_location = Column(
        String,
        nullable=False
    )

    permanent_manpower = Column(
        Integer,
        nullable=True,
        default=0
    )

    additional_manpower = Column(
        Integer,
        nullable=True,
        default=0
    )

    supervisor = Column(
        Integer,
        nullable=True,
        default=0
    )

    overtime_hours = Column(
        Float,
        nullable=True,
        default=0.0
    )

    remarks = Column(
        String,
        nullable=True
    )

    workers = relationship("ManPowerWorker", back_populates="man_power", cascade="all, delete-orphan")


class ManPowerWorker(Base):
    __tablename__ = "man_power_worker"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    man_power_id = Column(
        Integer,
        ForeignKey("man_power.id", ondelete="CASCADE"),
        nullable=False
    )

    govt_id = Column(
        String,
        nullable=True
    )

    name = Column(
        String,
        nullable=True
    )

    role = Column(
        String,
        nullable=False
    )

    man_power = relationship("ManPower", back_populates="workers")
