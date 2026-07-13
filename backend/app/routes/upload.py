from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy import String
from app.database.db import get_db
from app.models.upload_data import UploadData, UploadMetadata
import pandas as pd
from typing import Optional

router = APIRouter()


def map_row_data_fuzzy(row_data, db, meta=None):
    if not row_data:
        return row_data
        
    trade_key = None
    set_type_key = None
    for k in row_data.keys():
        if "trade" in k.lower():
            trade_key = k
            break
            
    if trade_key:
        for k in row_data.keys():
            k_lower = k.lower()
            if "trade" not in k_lower and ("set" in k_lower or "type" in k_lower):
                set_type_key = k
                break
                
        from app.routes.dispatch import map_fuzzy_trade_and_set_type
        mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(row_data[trade_key])
        if mapped_trade:
            row_data[trade_key] = mapped_trade
        if mapped_set:
            dest_key = set_type_key if set_type_key else "Set Type"
            row_data[dest_key] = mapped_set
            
            # If meta exists, ensure dest_key is in meta.columns_json
            if meta and dest_key not in meta.columns_json:
                cols = list(meta.columns_json)
                cols.append(dest_key)
                meta.columns_json = cols
                db.commit()
                
    return row_data



@router.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        df = pd.read_excel(file.file)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid Excel file format. Please upload a valid .xlsx or .xls file."
        )

    # Clean file columns
    columns = [col.strip() for col in df.columns]  # type: ignore
    
    if len(columns) == 0:
        raise HTTPException(
            status_code=400,
            detail="Excel sheet has no columns."
        )

    # Detect trade and set type columns
    trade_col = None
    set_type_col = None
    for col in columns:
        if "trade" in col.lower():
            trade_col = col
            break
            
    if trade_col:
        for col in columns:
            col_lower = col.lower()
            if "trade" not in col_lower and ("set" in col_lower or "type" in col_lower):
                set_type_col = col
                break
        
        # Proactively check if we need to add a "Set Type" column
        if not set_type_col:
            from app.routes.dispatch import map_fuzzy_trade_and_set_type
            has_mapped_set = False
            for val in df[trade_col].dropna():
                _, mapped_set = map_fuzzy_trade_and_set_type(str(val))
                if mapped_set:
                    has_mapped_set = True
                    break
            if has_mapped_set:
                set_type_col = "Set Type"
                columns.append(set_type_col)

    # 1. Clear old metadata and data records
    db.query(UploadMetadata).delete()
    db.query(UploadData).delete()
    db.commit()

    # 2. Save the new columns list
    meta = UploadMetadata(columns_json=columns)
    db.add(meta)
    db.commit()

    # 3. Parse every row into a list of dicts for bulk insert
    objects_to_insert = []
    
    for index, row in df.iterrows():
        try:
            row_dict = {}
            has_valid_data = False
            
            for col in df.columns:
                val = row[col]
                # Clean null or nan values
                if bool(pd.isna(val)):
                    row_dict[col] = None
                else:
                    has_valid_data = True
                    if isinstance(val, (int, float)):
                        if hasattr(val, 'is_integer') and val.is_integer():
                            row_dict[col] = int(val)
                        else:
                            row_dict[col] = float(val)
                    else:
                        row_dict[col] = str(val).strip()

            # Skip fully blank rows
            if not has_valid_data:
                continue

            # Apply fuzzy trade mapping
            if trade_col and row_dict.get(trade_col):
                from app.routes.dispatch import map_fuzzy_trade_and_set_type
                mapped_trade, mapped_set = map_fuzzy_trade_and_set_type(row_dict[trade_col])
                if mapped_trade:
                    row_dict[trade_col] = mapped_trade
                if mapped_set:
                    dest_col = set_type_col if set_type_col else "Set Type"
                    row_dict[dest_col] = mapped_set
                elif set_type_col:
                    if set_type_col not in row_dict:
                        row_dict[set_type_col] = None

            objects_to_insert.append({
                "row_data": row_dict,
                "status": "Kitting"
            })

        except Exception as e:
            db.rollback()
            excel_row_num = int(index) + 2  # type: ignore
            raise HTTPException(
                status_code=400,
                detail=f"Row {excel_row_num}: Failed to parse row. Error: {str(e)}"
            )

    # 4. Perform bulk insert in batches of 10,000 for high efficiency
    batch_size = 10000
    for i in range(0, len(objects_to_insert), batch_size):
        batch = objects_to_insert[i:i + batch_size]
        db.bulk_insert_mappings(UploadData, batch)
        db.commit()

    return {
        "message": "Upload successful",
        "rows_saved": len(objects_to_insert),
        "columns": columns
    }


@router.get("/upload-data")
def get_upload_data(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Fetch active metadata columns
    meta = db.query(UploadMetadata).first()
    if meta:
        columns = meta.columns_json
    else:
        columns = ["Kit_Number", "Qty", "Trade", "Location", "Firm"]

    # Base query
    query = db.query(UploadData)
    if search and search.strip():
        s = search.strip()
        query = query.filter(UploadData.row_data.cast(String).ilike(f"%{s}%"))

    # Get total count
    total_rows = query.count()

    # Get paginated slice
    offset = (page - 1) * page_size
    rows = query.order_by(UploadData.id.asc()).offset(offset).limit(page_size).all()
    
    return {
        "columns": columns,
        "total_rows": total_rows,
        "rows": [
            {
                "id": r.id,
                "row_data": r.row_data,
                "status": r.status
            }
            for r in rows
        ]
    }


@router.get("/upload-stats")
def get_upload_stats(
    db: Session = Depends(get_db)
):
    """Returns aggregated stats per column for the Upload Dashboard charts using lightweight ORM selection."""
    meta = db.query(UploadMetadata).first()
    if not meta:
        return {"columns": [], "stats": {}, "total_rows": 0, "status_counts": {}}

    columns = meta.columns_json
    
    # Query only necessary columns bypassing full hydration
    rows = db.query(UploadData.row_data, UploadData.status).all()
    total_rows = len(rows)

    # Count status distribution
    status_counts = {}
    for row_data, status in rows:
        s = status or "Unknown"
        status_counts[s] = status_counts.get(s, 0) + 1

    # Build per-column aggregations
    stats = {}
    for col in columns:
        values = []
        for row_data, status in rows:
            if row_data and col in row_data and row_data[col] is not None:  # type: ignore
                values.append(row_data[col])  # type: ignore

        # Check if numeric
        numeric_vals = []
        text_counts = {}
        is_numeric = True
        for v in values:
            if isinstance(v, (int, float)):
                numeric_vals.append(v)
            else:
                is_numeric = False
                sv = str(v).strip()
                text_counts[sv] = text_counts.get(sv, 0) + 1

        if is_numeric and numeric_vals:
            stats[col] = {
                "type": "numeric",
                "sum": round(sum(numeric_vals), 2),
                "avg": round(sum(numeric_vals) / len(numeric_vals), 2),
                "min": min(numeric_vals),
                "max": max(numeric_vals),
                "count": len(numeric_vals)
            }
        else:
            # Top 15 categorical counts sorted descending
            sorted_counts = dict(
                sorted(text_counts.items(), key=lambda x: x[1], reverse=True)[:15]
            )
            stats[col] = {
                "type": "categorical",
                "counts": sorted_counts,
                "unique": len(text_counts)
            }

    return {
        "columns": columns,
        "stats": stats,
        "total_rows": total_rows,
        "status_counts": status_counts
    }


@router.post("/upload-data")
def create_manual_row(
    payload: dict,
    db: Session = Depends(get_db)
):
    row_data = payload.get("row_data", {})
    status = payload.get("status", "Kitting")
    
    meta = db.query(UploadMetadata).first()
    
    # Apply fuzzy mapping
    row_data = map_row_data_fuzzy(row_data, db, meta)
    
    # Save the columns to metadata if it's the first record and metadata is missing
    if not meta and row_data:
        columns = list(row_data.keys())
        meta = UploadMetadata(columns_json=columns)
        db.add(meta)
        db.commit()

    item = UploadData(
        row_data=row_data,
        status=status
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    return item


# Update manual row (both status and custom fields)
@router.put("/upload-data/{id}")
def update_upload(
    id: int,
    payload: dict,
    db: Session = Depends(get_db)
):
    item = db.query(UploadData).filter(UploadData.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data record not found")

    meta = db.query(UploadMetadata).first()
    row_data = payload.get("row_data", item.row_data)
    row_data = map_row_data_fuzzy(row_data, db, meta)

    item.row_data = row_data
    item.status = payload.get("status", item.status)
    
    db.commit()
    db.refresh(item)
    
    return item


@router.patch("/upload-status/{id}")
def update_status(
    id: int,
    status: str,
    db: Session = Depends(get_db)
):
    item = db.query(UploadData).filter(UploadData.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data record not found")

    item.status = status  # type: ignore
    db.commit()
    db.refresh(item)

    return item


@router.delete("/upload-data/{id}")
def delete_upload(
    id: int,
    db: Session = Depends(get_db)
):
    item = db.query(UploadData).filter(UploadData.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data record not found")

    db.delete(item)
    db.commit()

    return {
        "message": "Deleted Successfully"
    }


class UploadDeleteBulk(BaseModel):
    ids: list[int]


@router.post("/upload-data/delete-bulk")
def delete_upload_bulk(
    payload: UploadDeleteBulk,
    db: Session = Depends(get_db)
):
    try:
        db.query(UploadData).filter(UploadData.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        return {"message": "Selected upload records deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))