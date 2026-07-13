from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm

from app.database.db import get_db
from app.models.user import User
from app.utils.jwt_handler import create_access_token

from pydantic import BaseModel

router=APIRouter()

pwd_context=CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


class UserCreate(BaseModel):

    name:str
    email:str
    password:str
    role:str="worker"


@router.post("/register")
def register(

    user:UserCreate,
    db:Session=Depends(get_db)

):

    existing_user=db.query(
        User
    ).filter(
        User.email==user.email
    ).first()

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    hashed_password=pwd_context.hash(
        user.password
    )

    new_user=User(

        name=user.name,

        email=user.email,

        password=hashed_password,

        role=user.role.lower()  # always store lowercase

    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return {

        "message":"User Registered",
        "role":new_user.role

    }


@router.post("/login")
def login(

form_data:OAuth2PasswordRequestForm=Depends(),

db:Session=Depends(get_db)

):

    username_clean = form_data.username.strip().lower()
    user=db.query(
        User
    ).filter(
        User.email.ilike(username_clean)
    ).first()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid Email"
        )

    valid_password=pwd_context.verify(

        form_data.password,
        user.password

    )

    if not valid_password:

        raise HTTPException(
            status_code=401,
            detail="Invalid Password"
        )

    token=create_access_token(

        data={

            "sub":user.email,
            "role":user.role,
            "warehouse_name": user.warehouse_name or ""

        }

    )

    return{

        "access_token":token,
        "token_type":"bearer",
        "role":user.role,
        "warehouse_name": user.warehouse_name or ""

    }