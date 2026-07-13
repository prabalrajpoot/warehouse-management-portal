from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.trade import Trade
from app.schemas.trade_schema import TradeCreate

from app.utils.role_checker import role_required
from app.utils.jwt_handler import get_current_user

router=APIRouter()


@router.post("/trade")
def create_trade(

trade:TradeCreate,

db:Session=Depends(get_db),

current_user=Depends(
get_current_user
)

):

    role_required(

        current_user,

        ["Admin"]

    )

    new_trade=Trade(

        trade_name=trade.trade_name,

        description=trade.description
    )

    db.add(new_trade)

    db.commit()

    db.refresh(new_trade)

    return {

        "message":"Trade Created",

        "data":new_trade.trade_name
    }


@router.get("/trade")

def get_trades(
    db:Session=Depends(get_db)
):

    return db.query(
        Trade
    ).all()