import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.db import engine, Base
# Import all models to register them
from app.models.sample_inspection import SampleInspection
from app.models.man_power import ManPower
from app.models.inventory_inward import InventoryInward
from app.models.inventory_outward import InventoryOutward
from app.models.dispatch import Dispatch
from app.models.dispatch_return import DispatchReturn
from app.models.kits import Kit
from app.models.trade import Trade
from app.models.user import User
from app.models.warehouse import Warehouse, WarehouseDistrictMapping

def create():
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    create()
