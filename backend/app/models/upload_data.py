from sqlalchemy import Column, Integer, String, JSON
from app.database.db import Base

class UploadData(Base):
    __tablename__ = "upload_data"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    row_data = Column(
        JSON,
        nullable=False
    )

    status = Column(
        String,
        default="Kitting"
    )

class UploadMetadata(Base):
    __tablename__ = "upload_metadata"

    id = Column(
        Integer,
        primary_key=True
    )

    columns_json = Column(
        JSON,
        nullable=False
    )