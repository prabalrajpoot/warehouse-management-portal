from fastapi import HTTPException


def role_required(current_user, allowed_roles):
    # Normalize to lowercase so "Admin", "ADMIN", "admin" all match "admin"
    user_role = current_user["role"].lower()

    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Access Denied"
        )