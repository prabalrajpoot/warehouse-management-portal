from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional

from app.database.db import get_db
from app.models.user import User
from app.utils.jwt_handler import get_current_user
from app.utils.role_checker import role_required

router = APIRouter()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

VALID_ROLES = ["superadmin", "admin", "warehouse_manager", "worker"]


# ── Pydantic schemas ──────────────────────────────────────
class AddUserSchema(BaseModel):
    name: str
    email: str
    password: str
    role: str = "worker"
    warehouse_name: Optional[str] = None


class ChangeRoleSchema(BaseModel):
    role: str
    warehouse_name: Optional[str] = None


# ── GET /users  →  list all users (admin + superadmin) ───
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role_required(current_user, ["admin", "superadmin"])

    users = db.query(User).all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "warehouse_name": u.warehouse_name or ""
        }
        for u in users
    ]


# ── POST /users  →  add new user (admin only) ────────────
@router.post("/users")
def add_user(
    user_data: AddUserSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role_required(current_user, ["admin"])

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    role_lower = user_data.role.lower()
    if role_lower not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role must be one of: {', '.join(VALID_ROLES)}"
        )

    # warehouse_manager must have a warehouse assigned
    if role_lower == "warehouse_manager" and not user_data.warehouse_name:
        raise HTTPException(
            status_code=400,
            detail="warehouse_name is required for warehouse_manager role"
        )

    hashed_password = pwd_context.hash(user_data.password)

    from app.routes.dispatch import map_fuzzy_warehouse_name
    wh_val = map_fuzzy_warehouse_name(user_data.warehouse_name) if user_data.warehouse_name else None

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=role_lower,
        warehouse_name=wh_val if role_lower == "warehouse_manager" else None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User added successfully",
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "warehouse_name": new_user.warehouse_name or ""
    }


# ── PATCH /users/{user_id}/role  →  change role (admin only) ──
@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    body: ChangeRoleSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role_required(current_user, ["admin"])

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    role_lower = body.role.lower()
    if role_lower not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role must be one of: {', '.join(VALID_ROLES)}"
        )

    if role_lower == "warehouse_manager" and not body.warehouse_name:
        raise HTTPException(
            status_code=400,
            detail="warehouse_name is required for warehouse_manager role"
        )

    from app.routes.dispatch import map_fuzzy_warehouse_name
    wh_val = map_fuzzy_warehouse_name(body.warehouse_name) if body.warehouse_name else None

    user.role = role_lower  # type: ignore
    user.warehouse_name = wh_val if role_lower == "warehouse_manager" else None  # type: ignore
    db.commit()

    return {"message": "Role updated", "id": user_id, "new_role": role_lower, "warehouse_name": user.warehouse_name or ""}


# ── DELETE /users/{user_id}  →  delete user (admin only) ──
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role_required(current_user, ["admin"])

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Prevent admin from deleting their own account
    if user.email == current_user["sub"]:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted"}
