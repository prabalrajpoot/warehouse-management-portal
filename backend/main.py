from fastapi import FastAPI

from app.database.db import engine, Base
from sqlalchemy import text
from app.models import *

from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.trade import router as trade_router
from app.routes.kits import router as kits_router
from app.routes.inspection import router as inspection_router
from app.routes.dispatch import router as dispatch_router
from app.routes.dispatch_return import router as dispatch_return_router
from app.routes.upload import router as upload_router
from app.routes.users import router as users_router
from app.routes.inventory_inward import router as inventory_inward_router
from app.routes.inventory_outward import router as inventory_outward_router
from app.routes.warehouses import router as warehouses_router
from app.routes.sample_inspection import router as sample_inspection_router
from app.routes.man_power import router as man_power_router
from app.routes.activity_log import router as activity_log_router

from app.models.upload_data import UploadData, UploadMetadata
from app.models.dispatch_return import DispatchReturn
from app.models.inventory_inward import InventoryInward
from app.models.inventory_outward import InventoryOutward
from app.models.sample_inspection import SampleInspection
from app.models.man_power import ManPower, ManPowerWorker

import os
from fastapi.middleware.cors import CORSMiddleware

# Ensure firm_name column exists in PostgreSQL tables
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE inventory_inward ADD COLUMN IF NOT EXISTS firm_name VARCHAR;"))
        conn.execute(text("ALTER TABLE inventory_outward ADD COLUMN IF NOT EXISTS firm_name VARCHAR;"))
        conn.commit()
except Exception as _e:
    print("Database column alteration note:", _e)

app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(trade_router)
app.include_router(kits_router)
app.include_router(inspection_router)
app.include_router(upload_router)
app.include_router(dispatch_router)
app.include_router(dispatch_return_router)
app.include_router(users_router)
app.include_router(inventory_inward_router)
app.include_router(inventory_outward_router)
app.include_router(warehouses_router)
app.include_router(sample_inspection_router)
app.include_router(man_power_router)
app.include_router(activity_log_router)


@app.get("/")
def home():
    return {"message": "Warehouse Portal API Running"}