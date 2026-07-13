from pydantic import BaseModel


class TradeCreate(BaseModel):

    trade_name:str

    description:str