from pydantic import BaseModel


class DispatchCreate(BaseModel):

    kit_id:int

    ms_number:str

    barcode:str

    dispatch_qty:int