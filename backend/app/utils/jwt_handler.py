import os
from jose import jwt
from datetime import datetime,timedelta
from fastapi import Depends,HTTPException
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY=os.getenv("SECRET_KEY", "mysecretkey")

ALGORITHM="HS256"

oauth2_scheme=OAuth2PasswordBearer(
    tokenUrl="login"
)


def create_access_token(data:dict):

    to_encode=data.copy()

    expire=datetime.utcnow()+timedelta(
        hours=24
    )

    to_encode.update(
        {"exp":expire}
    )

    token=jwt.encode(

        to_encode,

        SECRET_KEY,

        algorithm=ALGORITHM

    )

    return token


def get_current_user(

token:str=Depends(
oauth2_scheme
)

):

    try:

        payload=jwt.decode(

            token,

            SECRET_KEY,

            algorithms=[ALGORITHM]

        )

        return payload

    except:

        raise HTTPException(

            status_code=401,

            detail="Invalid Token"

        )