from sqlalchemy import Column,Integer,String
from app.database.db import Base


class Trade(Base):

    __tablename__="trades"

    id=Column(
        Integer,
        primary_key=True,
        index=True
    )

    trade_name=Column(
        String,
        unique=True
    )

    description=Column(
        String
    )