from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_files():
    # Placeholder for file management endpoints
    return {"files": []}
