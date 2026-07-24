from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db
from app.models.kits import Kit
from app.models.inspection import Inspection
from app.models.dispatch import Dispatch
from app.models.dispatch_return import DispatchReturn
from app.models.inventory_inward import InventoryInward
from app.models.inventory_outward import InventoryOutward
import datetime
from app.utils.cache import DASHBOARD_CACHE, clear_dashboard_cache

router = APIRouter()


def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(date_str.strip(), fmt)
        except Exception:
            pass
    return None


@router.get("/dashboard")
def dashboard(
    warehouse: Optional[str] = None,
    trade: Optional[str] = None,
    month: Optional[str] = None,
    year: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cache_key = ("dashboard", warehouse, trade, month, year)
    if cache_key in DASHBOARD_CACHE and "kits_ptl" in DASHBOARD_CACHE[cache_key]:
        return DASHBOARD_CACHE[cache_key]

    # Fetch all unique warehouses, trades, and years dynamically for dropdowns
    wh_set = set()
    for row in db.query(Kit.warehouse_name).distinct():
        if row.warehouse_name:
            wh_set.add(row.warehouse_name.strip())
    for row in db.query(Dispatch.warehouse_name).distinct():
        if row.warehouse_name:
            wh_set.add(row.warehouse_name.strip())
    for row in db.query(Inspection.warehouse_name).distinct():
        if row.warehouse_name:
            wh_set.add(row.warehouse_name.strip())
    all_warehouses = sorted(list(wh_set))

    trade_set = set()
    for row in db.query(Kit.trade).distinct():
        if row.trade:
            trade_set.add(row.trade.strip())
    for row in db.query(Dispatch.trade).distinct():
        if row.trade:
            trade_set.add(row.trade.strip())
    for row in db.query(Inspection.trade).distinct():
        if row.trade:
            trade_set.add(row.trade.strip())
    all_trades = sorted(list(trade_set))

    years_set = set()
    for row in db.query(Kit.call_date).distinct():
        dt = parse_date(row.call_date)
        if dt:
            years_set.add(str(dt.year))
    for row in db.query(Dispatch.call_date).distinct():
        dt = parse_date(row.call_date)
        if dt:
            years_set.add(str(dt.year))
    for row in db.query(Inspection.call_date).distinct():
        dt = parse_date(row.call_date)
        if dt:
            years_set.add(str(dt.year))
    all_years = sorted(list(years_set))

    kits = db.query(Kit).all()
    dispatches = db.query(Dispatch).all()
    inspections = db.query(Inspection).all()

    # Apply filters in python
    if warehouse and warehouse.lower() != "all":
        kits = [k for k in kits if k.warehouse_name and k.warehouse_name.strip().lower() == warehouse.lower()]
        dispatches = [d for d in dispatches if d.warehouse_name and d.warehouse_name.strip().lower() == warehouse.lower()]
        inspections = [i for i in inspections if i.warehouse_name and i.warehouse_name.strip().lower() == warehouse.lower()]
    if trade and trade.lower() != "all":
        kits = [k for k in kits if k.trade and k.trade.strip().lower() == trade.lower()]
        dispatches = [d for d in dispatches if d.trade and d.trade.strip().lower() == trade.lower()]
        inspections = [i for i in inspections if i.trade and i.trade.strip().lower() == trade.lower()]
    if month and month.lower() != "all":
        try:
            m_int = int(month)
            kits = [k for k in kits if parse_date(k.call_date) and parse_date(k.call_date).month == m_int]
            dispatches = [d for d in dispatches if parse_date(d.call_date) and parse_date(d.call_date).month == m_int]
            inspections = [i for i in inspections if parse_date(i.call_date) and parse_date(i.call_date).month == m_int]
        except ValueError:
            pass
    if year and year.lower() != "all":
        try:
            y_int = int(year)
            kits = [k for k in kits if parse_date(k.call_date) and parse_date(k.call_date).year == y_int]
            dispatches = [d for d in dispatches if parse_date(d.call_date) and parse_date(d.call_date).year == y_int]
            inspections = [i for i in inspections if parse_date(i.call_date) and parse_date(i.call_date).year == y_int]
        except ValueError:
            pass

    # 1. KPI Quantities stats
    total_kits = sum(k.quantity for k in kits)
    kits_ptl = sum(k.quantity for k in kits if k.firm and k.firm.strip().upper() == "PTL")
    kits_vtl = sum(k.quantity for k in kits if k.firm and k.firm.strip().upper() == "VTL")
    kits_iti = sum(k.quantity for k in kits if k.firm and k.firm.strip().upper() == "ITI")
    total_dispatched = sum(d.quantity for d in dispatches)
    total_inspected = sum(i.quantity for i in inspections)

    # Pass/Fail/Pending breakdown
    inspected_passed = sum(i.quantity for i in inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "pass")  # type: ignore
    inspected_failed = sum(i.quantity for i in inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "fail")  # type: ignore
    inspected_pending = sum(i.quantity for i in inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "pending")  # type: ignore

    # Dispatched details
    dispatch_pending_mark = sum(d.quantity for d in dispatches if not d.packaging_status or d.packaging_status.strip().lower() == "pending for mark")  # type: ignore
    dispatch_in_transit = sum(d.quantity for d in dispatches if d.packaging_status and d.packaging_status.strip().lower() == "already in transit")  # type: ignore
    dispatch_dispatched = sum(d.quantity for d in dispatches if d.packaging_status and d.packaging_status.strip().lower() == "dispatched")  # type: ignore

    # Returned kits count & sum quantity
    returns = db.query(DispatchReturn).all()
    if warehouse and warehouse.lower() != "all":
        returns = [r for r in returns if r.warehouse_name and r.warehouse_name.strip().lower() == warehouse.lower()]
    if trade and trade.lower() != "all":
        returns = [r for r in returns if r.trade and r.trade.strip().lower() == trade.lower()]
    if month and month.lower() != "all":
        try:
            m_int = int(month)
            returns = [r for r in returns if parse_date(r.dispatched_date) and parse_date(r.dispatched_date).month == m_int]
        except ValueError:
            pass
    if year and year.lower() != "all":
        try:
            y_int = int(year)
            returns = [r for r in returns if parse_date(r.dispatched_date) and parse_date(r.dispatched_date).year == y_int]
        except ValueError:
            pass
    total_returned = len(returns)
    total_returned_qty = sum(r.quantity for r in returns if r.quantity)  # type: ignore

    # 2. Monthly Summary Chart
    monthly_data = {}
    
    for k in kits:
        dt = parse_date(k.call_date)
        m_key = dt.strftime("%Y-%m") if dt else "Unknown"
        monthly_data.setdefault(m_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Kits Made"] += k.quantity
        
    for d in dispatches:
        dt = parse_date(d.call_date)
        m_key = dt.strftime("%Y-%m") if dt else "Unknown"
        monthly_data.setdefault(m_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Dispatched"] += d.quantity
        
    for i in inspections:
        dt = parse_date(i.call_date)
        m_key = dt.strftime("%Y-%m") if dt else "Unknown"
        monthly_data.setdefault(m_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Inspected"] += i.quantity

    monthly_summary = [
        {"name": m, **vals}
        for m, vals in sorted(monthly_data.items())
        if m != "Unknown"
    ]

    # 3. Weekly Summary Chart
    weekly_data = {}
    
    for k in kits:
        dt = parse_date(k.call_date)
        w_key = f"{dt.year}-W{dt.isocalendar()[1]:02d}" if dt else "Unknown"
        weekly_data.setdefault(w_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Kits Made"] += k.quantity
        
    for d in dispatches:
        dt = parse_date(d.call_date)
        w_key = f"{dt.year}-W{dt.isocalendar()[1]:02d}" if dt else "Unknown"
        weekly_data.setdefault(w_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Dispatched"] += d.quantity
        
    for i in inspections:
        dt = parse_date(i.call_date)
        w_key = f"{dt.year}-W{dt.isocalendar()[1]:02d}" if dt else "Unknown"
        weekly_data.setdefault(w_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Inspected"] += i.quantity

    weekly_summary = [
        {"name": w, **vals}
        for w, vals in sorted(weekly_data.items())
        if w != "Unknown"
    ]

    # 4. Location Summary Chart (Kits Made vs Dispatched per Warehouse/Location)
    location_data = {}
    
    for k in kits:
        loc = k.warehouse_name.strip() if k.warehouse_name else ""  # type: ignore
        if loc:
            location_data.setdefault(loc, {"Kits Made": 0, "Dispatched": 0})["Kits Made"] += k.quantity
            
    for d in dispatches:
        loc = d.warehouse_name.strip() if d.warehouse_name else ""  # type: ignore
        if loc:
            location_data.setdefault(loc, {"Kits Made": 0, "Dispatched": 0})["Dispatched"] += d.quantity

    location_summary = [
        {"name": loc, **vals}
        for loc, vals in sorted(location_data.items())
    ]

    # 5. TradeName Summary Chart (Kits Made vs Dispatched per Trade Category)
    trade_data = {}
    
    for k in kits:
        t = k.trade.strip() if k.trade else ""  # type: ignore
        if t:
            trade_data.setdefault(t, {"Kits Made": 0, "Dispatched": 0})["Kits Made"] += k.quantity
            
    for d in dispatches:
        t = d.trade.strip() if d.trade else ""  # type: ignore
        if t:
            trade_data.setdefault(t, {"Kits Made": 0, "Dispatched": 0})["Dispatched"] += d.quantity

    trade_summary = [
        {"name": t, **vals}
        for t, vals in sorted(trade_data.items())
    ]

    # 6. Recent 5 Entries for Kits, Inspections, Dispatches
    recent_kits = db.query(Kit).order_by(Kit.id.desc()).limit(5).all()
    recent_inspections = db.query(Inspection).order_by(Inspection.id.desc()).limit(5).all()
    recent_dispatches = db.query(Dispatch).order_by(Dispatch.id.desc()).limit(5).all()

    recent_kits_list = [
        {
            "id": k.id,
            "call_date": k.call_date,
            "firm": k.firm,
            "warehouse_name": k.warehouse_name,
            "trade": k.trade,
            "quantity": k.quantity
        }
        for k in recent_kits
    ]

    recent_inspections_list = [
        {
            "id": i.id,
            "call_date": i.call_date,
            "firm": i.firm,
            "inspection_passed": i.inspection_passed,
            "inspection_no": i.inspection_no,
            "ins_passed_date": i.ins_passed_date,
            "quantity": i.quantity
        }
        for i in recent_inspections
    ]

    recent_dispatches_list = [
        {
            "id": d.id,
            "call_date": d.call_date,
            "firm": d.firm,
            "warehouse_name": d.warehouse_name,
            "trade": d.trade,
            "quantity": d.quantity
        }
        for d in recent_dispatches
    ]

    # 7. Low Stock Alerts (Stock < 50)
    inwards = db.query(InventoryInward).all()
    outwards = db.query(InventoryOutward).all()
    
    stock_levels = {}
    for item in inwards:
        if item.item_name:  # type: ignore
            name = item.item_name.strip()  # type: ignore
            qty = item.received_qty or 0
            stock_levels[name] = stock_levels.get(name, 0) + qty
            
    for item in outwards:
        if item.item_name:  # type: ignore
            name = item.item_name.strip()  # type: ignore
            qty = item.qty or 0
            stock_levels[name] = stock_levels.get(name, 0) - qty
            
    low_stock_items = [
        {"item_name": name, "stock": qty}
        for name, qty in sorted(stock_levels.items())
        if qty < 50
    ]

    # 8. Toolkit Delivery Pipeline Metrics (NSIC style)
    from app.models.upload_data import UploadData
    total_demand = db.query(UploadData).count()
    
    total_inspected_qty = sum(i.quantity for i in inspections)
    pending_offer_qaa = total_kits - total_inspected_qty
    under_inspection = sum(i.quantity for i in inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "pending")  # type: ignore
    passed_qty_pipeline = sum(i.quantity for i in inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "pass")  # type: ignore
    rejected_qty_pipeline = sum(i.quantity for i in inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "fail")  # type: ignore

    ready_for_pickup = sum(d.quantity for d in dispatches if not d.packaging_status or d.packaging_status.strip().lower() != "dispatched")  # type: ignore
    already_dispatched = sum(d.quantity for d in dispatches if d.packaging_status and d.packaging_status.strip().lower() == "dispatched")  # type: ignore

    pipeline = {
        "toolkits_available": total_kits,
        "total_demand": total_demand,
        "pending_offer_qaa": pending_offer_qaa,
        "under_inspection": under_inspection,
        "passed": passed_qty_pipeline,
        "rejected": rejected_qty_pipeline,
        "ready_for_pickup": ready_for_pickup,
        "already_dispatched": already_dispatched
    }

    # 9. Yearly Summary Chart (Quantity vs Year)
    yearly_data = {}
    for k in kits:
        dt = parse_date(k.call_date)
        y_key = str(dt.year) if dt else "Unknown"
        yearly_data.setdefault(y_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Kits Made"] += k.quantity
    for d in dispatches:
        dt = parse_date(d.call_date)
        y_key = str(dt.year) if dt else "Unknown"
        yearly_data.setdefault(y_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Dispatched"] += d.quantity
    for i in inspections:
        dt = parse_date(i.call_date)
        y_key = str(dt.year) if dt else "Unknown"
        yearly_data.setdefault(y_key, {"Kits Made": 0, "Dispatched": 0, "Inspected": 0})["Inspected"] += i.quantity
    yearly_summary = [
        {"name": y, **vals}
        for y, vals in sorted(yearly_data.items())
        if y != "Unknown"
    ]

    res = {
        "total_kits": total_kits,
        "kits_ptl": kits_ptl,
        "kits_vtl": kits_vtl,
        "kits_iti": kits_iti,
        "total_dispatched": total_dispatched,
        "total_inspected": total_inspected,
        "inspected_passed": inspected_passed,
        "inspected_failed": inspected_failed,
        "inspected_pending": inspected_pending,
        "dispatch_pending_mark": dispatch_pending_mark,
        "dispatch_in_transit": dispatch_in_transit,
        "dispatch_dispatched": dispatch_dispatched,
        "total_returned": total_returned,
        "total_returned_qty": total_returned_qty,
        "monthly_summary": monthly_summary,
        "weekly_summary": weekly_summary,
        "location_summary": location_summary,
        "trade_summary": trade_summary,
        "yearly_summary": yearly_summary,
        "recent_kits": recent_kits_list,
        "recent_inspections": recent_inspections_list,
        "recent_dispatches": recent_dispatches_list,
        "low_stock_items": low_stock_items,
        "pipeline": pipeline,
        "warehouses": all_warehouses,
        "trades": all_trades,
        "years": all_years
    }
    DASHBOARD_CACHE[cache_key] = res
    return res


def get_month_key(date_obj):
    if not date_obj:
        return None
    months_abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    m_abbr = months_abbr[date_obj.month - 1]
    y_str = str(date_obj.year)[2:]
    return f"{m_abbr}'{y_str}"


def match_row(company, trade, set_type, target_co, target_tr, target_set):
    if not company or not trade:
        return False
    co_clean = str(company).strip().upper()
    target_co_clean = str(target_co).strip().upper()
    if co_clean != target_co_clean:
        return False

    tr_clean = str(trade).strip().lower()
    target_tr_clean = str(target_tr).strip().lower()
    
    if tr_clean == target_tr_clean:
        tr_match = True
    else:
        def clean_text(s):
            return s.replace(" ", "").replace("/", "").replace("(", "").replace(")", "").replace("-", "").lower()
        tr_match = clean_text(tr_clean) == clean_text(target_tr_clean)
        if not tr_match:
            if "boat" in tr_clean and "boat" in target_tr_clean:
                tr_match = True
            elif "barber" in tr_clean and "barber" in target_tr_clean:
                tr_match = True
            elif "naai" in tr_clean and "naai" in target_tr_clean:
                tr_match = True
            elif "potter" in tr_clean and "potter" in target_tr_clean:
                tr_match = True
            elif "washer" in tr_clean and "washer" in target_tr_clean:
                tr_match = True

    if not tr_match:
        return False

    set_clean = str(set_type).strip().upper() if set_type else "SET A"
    if not set_clean or set_clean == "NONE" or set_clean == "NULL":
        set_clean = "SET A"
    target_set_clean = str(target_set).strip().upper()
    return set_clean == target_set_clean


class DeliveryOverridePayload(BaseModel):
    company: str
    trade: str
    set_type: str
    delivery_qty: int


@router.post("/dashboard/reports/delivery-override")
def update_delivery_override(
    payload: DeliveryOverridePayload,
    db: Session = Depends(get_db)
):
    from app.models.delivery_override import DeliveryOverride
    entry = db.query(DeliveryOverride).filter(
        DeliveryOverride.company == payload.company,
        DeliveryOverride.trade == payload.trade,
        DeliveryOverride.set_type == payload.set_type
    ).first()
    
    if entry:
        entry.delivery_qty = payload.delivery_qty
    else:
        entry = DeliveryOverride(
            company=payload.company,
            trade=payload.trade,
            set_type=payload.set_type,
            delivery_qty=payload.delivery_qty
        )
        db.add(entry)
    db.commit()
    clear_dashboard_cache()
    return {"message": "Delivery updated successfully"}


@router.get("/dashboard/reports")
def get_dashboard_reports(
    selected_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cache_key = ("reports", selected_date)
    if cache_key in DASHBOARD_CACHE:
        return DASHBOARD_CACHE[cache_key]

    # Parse target selected date
    target_dt = parse_date(selected_date) if selected_date else datetime.datetime.now()
    if not target_dt:
        target_dt = datetime.datetime.now()

    def is_same_day(date_str, target):
        dt = parse_date(date_str)
        return dt and dt.year == target.year and dt.month == target.month and dt.day == target.day
    kits = db.query(Kit).all()
    dispatches = db.query(Dispatch).all()
    inspections = db.query(Inspection).all()
    returns = db.query(DispatchReturn).all()

    from app.models.delivery_override import DeliveryOverride
    overrides = db.query(DeliveryOverride).all()
    override_map = {
        (o.company, o.trade, o.set_type): o.delivery_qty
        for o in overrides
    }

    report_rows = [
        ("PTL", "Metal Smith / Metal Caster", "SET A", "Metalsmith"),
        ("PTL", "Sculptor (Moortikar)/Stone Carver/Stone Breaker", "SET A", "Sculptor"),
        ("PTL", "Fishing Net Maker", "SET A", "Fishingnet"),
        ("PTL", "Hammer and ToolKit Maker", "SET A", "HT Maker"),
        ("PTL", "Armourer", "SET A", "Armourer"),
        ("PTL", "Boat Maker", "SET A", "Boatmaker A"),
        ("PTL", "Boat Maker", "SET B", "Boatmaker B"),
        ("PTL", "Barber (Naai)", "SET A", "Barber Set-A"),
        ("PTL", "Barber (Naai)", "SET B", "Barber Set-B"),
        ("ITI", "Barber (Naai)", "SET A", "Barber Set-A"),
        ("ITI", "Barber (Naai)", "SET B", "Barber Set-B"),
        ("ITI", "Washerman (Dhobi)", "SET A", "Washerman"),
        ("ITI", "Potter (Kumhar)", "SET A", "Potter"),
        ("VTL", "Washerman (Dhobi)", "SET A", "Washerman"),
        ("VTL", "Potter (Kumhar)", "SET A", "Potter")
    ]

    po_advice_data = {
        ("PTL", "Metal Smith / Metal Caster", "SET A"): (93750, 93751),
        ("PTL", "Sculptor (Moortikar)/Stone Carver/Stone Breaker", "SET A"): (93750, 82303),
        ("PTL", "Fishing Net Maker", "SET A"): (102830, 83890),
        ("PTL", "Hammer and ToolKit Maker", "SET A"): (93750, 88010),
        ("PTL", "Armourer", "SET A"): (9452, 5472),
        ("PTL", "Boat Maker", "SET A"): (9596, 3965),
        ("PTL", "Boat Maker", "SET B"): (2399, 991),
        ("PTL", "Barber (Naai)", "SET A"): (25200, 17700),
        ("PTL", "Barber (Naai)", "SET B"): (12300, 12300),
        ("ITI", "Barber (Naai)", "SET A"): (50715, 41959),
        ("ITI", "Barber (Naai)", "SET B"): (36785, 28028),
        ("ITI", "Washerman (Dhobi)", "SET A"): (28125, 28086),
        ("ITI", "Potter (Kumhar)", "SET A"): (34029, 29322),
        ("VTL", "Washerman (Dhobi)", "SET A"): (65625, 65587),
        ("VTL", "Potter (Kumhar)", "SET A"): (79402, 68430)
    }

    sale_rates = {
        ("PTL", "Metal Smith / Metal Caster", "SET A"): 19766,
        ("PTL", "Sculptor (Moortikar)/Stone Carver/Stone Breaker", "SET A"): 20946,
        ("PTL", "Fishing Net Maker", "SET A"): 15459,
        ("PTL", "Hammer and ToolKit Maker", "SET A"): 17406,
        ("PTL", "Armourer", "SET A"): 19705,
        ("PTL", "Boat Maker", "SET A"): 13630,
        ("PTL", "Boat Maker", "SET B"): 13630,
        ("PTL", "Barber (Naai)", "SET A"): 10488,
        ("PTL", "Barber (Naai)", "SET B"): 10488,
        ("ITI", "Barber (Naai)", "SET A"): 7341,
        ("ITI", "Barber (Naai)", "SET B"): 7341,
        ("ITI", "Washerman (Dhobi)", "SET A"): 8177,
        ("ITI", "Potter (Kumhar)", "SET A"): 10227,
        ("VTL", "Washerman (Dhobi)", "SET A"): 11682,
        ("VTL", "Potter (Kumhar)", "SET A"): 14610
    }

    # Dynamic months_list generation based on actual transaction dates in database
    unique_months = set()
    for row in db.query(Inspection.call_date).distinct():
        dt = parse_date(row.call_date)
        if dt:
            unique_months.add(datetime.datetime(dt.year, dt.month, 1))
    
    sorted_months = sorted(list(unique_months))
    months_list = []
    for dt in sorted_months:
        m_key = get_month_key(dt)
        if m_key and m_key not in months_list:
            months_list.append(m_key)

    if not months_list:
        months_list = ["Jan'25", "Jan'26", "Feb'26", "Mar'26", "Apr'26", "May'26", "Jun'26", "Jul'26", "Aug'26"]

    offering_report = []
    summary_report = []

    for company, trade_cat, set_t, display_name in report_rows:
        row_kits = [k for k in kits if match_row(k.firm, k.trade, k.set_type, company, trade_cat, set_t)]
        row_inspections = [i for i in inspections if match_row(i.firm, i.trade, i.set_type, company, trade_cat, set_t)]
        row_dispatches = [d for d in dispatches if match_row(d.firm, d.trade, d.set_type, company, trade_cat, set_t)]
        row_returns = [r for r in returns if match_row(r.firm, r.trade, r.set_type, company, trade_cat, set_t)]

        po_qty, advice_qty = po_advice_data.get((company, trade_cat, set_t), (0, 0))
        sale_rate = sale_rates.get((company, trade_cat, set_t), 0)

        total_kitting = sum(k.quantity for k in row_kits)
        total_offered = sum(i.quantity for i in row_inspections)
        total_cleared = sum(i.quantity for i in row_inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "pass")
        total_dispatch = sum(d.quantity for d in row_dispatches)

        # Dynamic selected date kpi calculations
        today_kitting = sum(k.quantity for k in row_kits if is_same_day(k.call_date, target_dt))
        today_offering = sum(i.quantity for i in row_inspections if is_same_day(i.call_date, target_dt))
        today_cleared = sum(i.quantity for i in row_inspections if i.inspection_passed and i.inspection_passed.strip().lower() == "pass" and is_same_day(i.call_date, target_dt))
        today_dispatch = sum(d.quantity for d in row_dispatches if is_same_day(d.call_date, target_dt))

        overridden_delivery = override_map.get((company, trade_cat, set_t))
        if overridden_delivery is not None:
            delivery = overridden_delivery
        else:
            delivery = sum(d.quantity for d in row_dispatches if d.packaging_status and d.packaging_status.strip().lower() == "dispatched")
        return_qty = sum(r.quantity for r in row_returns if r.quantity)

        pending_dispatch = max(0, total_cleared - total_dispatch)
        pending_delivery = max(0, total_dispatch - delivery - return_qty)

        month_vals = {m: 0 for m in months_list}
        for i in row_inspections:
            dt = parse_date(i.call_date)
            m_key = get_month_key(dt)
            if m_key in month_vals:
                month_vals[m_key] += i.quantity

        pending_demand = max(0, advice_qty - total_offered)

        offering_report.append({
            "trade": display_name,
            "company": company,
            "po_qty": po_qty,
            "advice_qty": advice_qty,
            "total_offered": total_offered,
            "pending_demand": pending_demand,
            **month_vals
        })

        summary_report.append({
            "trade": display_name,
            "company": company,
            "trade_cat": trade_cat,
            "set_type": set_t,
            "total_kitting": total_kitting,
            "today_kitting": today_kitting,
            "total_offering": total_offered,
            "today_offering": today_offering,
            "total_inspection_cleared": total_cleared,
            "today_inspection_cleared": today_cleared,
            "total_dispatch": total_dispatch,
            "today_dispatch": today_dispatch,
            "delivery": delivery,
            "pending_dispatch": pending_dispatch,
            "return_qty": return_qty,
            "pending_delivery": pending_delivery,
            "sale_rate": sale_rate,
            "payment_delivered": delivery * sale_rate,
            "pending_dispatch_val": pending_dispatch * sale_rate * 0.70,
            "pending_delivery_val": pending_delivery * sale_rate * 0.70,
            "return_val": return_qty * sale_rate,
            "total_value": total_kitting * sale_rate
        })


    # Post-processing to group/merge Set A and Set B delivery, pending dispatch, and pending delivery fields
    groupings = [
        ("PTL", "Barber Set-A", "Barber Set-B"),
        ("ITI", "Barber Set-A", "Barber Set-B"),
        ("PTL", "Boatmaker A", "Boatmaker B")
    ]

    for co, a_trade, b_trade in groupings:
        row_a = next((r for r in summary_report if r["company"] == co and r["trade"] == a_trade), None)
        row_b = next((r for r in summary_report if r["company"] == co and r["trade"] == b_trade), None)
        
        if row_a and row_b:
            has_override = (row_a["company"], row_a["trade_cat"], row_a["set_type"]) in override_map
            if not has_override:
                row_a["delivery"] += row_b["delivery"]
            
            row_a["pending_dispatch"] += row_b["pending_dispatch"]
            
            # Merge today values
            row_a["today_kitting"] += row_b["today_kitting"]
            row_a["today_offering"] += row_b["today_offering"]
            row_a["today_inspection_cleared"] += row_b["today_inspection_cleared"]
            row_a["today_dispatch"] += row_b["today_dispatch"]

            tot_return = row_a["return_qty"] + row_b["return_qty"]
            tot_dispatch = row_a["total_dispatch"] + row_b["total_dispatch"]
            row_a["pending_delivery"] = max(0, tot_dispatch - row_a["delivery"] - tot_return)
            
            # Recalculate payment values
            row_a["payment_delivered"] = row_a["delivery"] * row_a["sale_rate"]
            row_a["pending_dispatch_val"] = row_a["pending_dispatch"] * row_a["sale_rate"] * 0.70
            row_a["pending_delivery_val"] = row_a["pending_delivery"] * row_a["sale_rate"] * 0.70
            
            # Zero out row_b fields
            row_b["delivery"] = 0
            row_b["pending_dispatch"] = 0
            row_b["pending_delivery"] = 0
            row_b["payment_delivered"] = 0
            row_b["pending_dispatch_val"] = 0
            row_b["pending_delivery_val"] = 0
            row_b["today_kitting"] = 0
            row_b["today_offering"] = 0
            row_b["today_inspection_cleared"] = 0
            row_b["today_dispatch"] = 0

    res = {
        "months": months_list,
        "offering_report": offering_report,
        "summary_report": summary_report
    }
    DASHBOARD_CACHE[cache_key] = res
    return res
