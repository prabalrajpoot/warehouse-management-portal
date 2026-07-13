from pydantic import BaseModel


class InspectionCreate(BaseModel):

    kit_id:int

    status:str

    remarks:str