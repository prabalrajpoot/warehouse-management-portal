from sqlalchemy import Column,Integer,String
from app.database.db import Base

class User(Base):

    __tablename__="users"

    id=Column(
        Integer,
        primary_key=True,
        index=True
    )

    name=Column(
        String
    )

    email=Column(
        String,
        unique=True
    )

    password=Column(
        String
    )

    role=Column(
        String,
        default="worker"
    )

    warehouse_name=Column(
        String,
        nullable=True
    )