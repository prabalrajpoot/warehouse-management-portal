from pydantic import BaseModel


class KitCreate(BaseModel):

    kit_number:str

    trade_id:int

    warehouse:str

    quantity:int