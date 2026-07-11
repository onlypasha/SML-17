from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import os
import sys
import shutil

router = APIRouter()

def get_shared_dir() -> Path:
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle (.exe)
        base_dir = Path(sys.executable).parent
    else:
        # Running from source
        base_dir = Path(__file__).parent.parent
    
    shared = base_dir / "shared_files"
    shared.mkdir(exist_ok=True)
    return shared

SHARED_DIR = get_shared_dir()


@router.get("/")
async def list_files():
    """List all files in the shared directory."""
    files = []
    if SHARED_DIR.exists():
        for f in SHARED_DIR.iterdir():
            if f.is_file():
                stat = f.stat()
                files.append({
                    "name": f.name,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                })
    return {"files": files}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file to the shared directory."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    
    # Sanitize filename
    safe_name = Path(file.filename).name
    dest = SHARED_DIR / safe_name
    
    try:
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    stat = dest.stat()
    return {
        "message": f"File '{safe_name}' uploaded successfully.",
        "file": {
            "name": safe_name,
            "size": stat.st_size,
            "modified": stat.st_mtime,
        }
    }


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download a file from the shared directory."""
    safe_name = Path(filename).name
    filepath = SHARED_DIR / safe_name
    
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail=f"File '{safe_name}' not found.")
    
    return FileResponse(
        path=filepath,
        filename=safe_name,
        media_type="application/octet-stream"
    )


@router.delete("/{filename}")
async def delete_file(filename: str):
    """Delete a file from the shared directory."""
    safe_name = Path(filename).name
    filepath = SHARED_DIR / safe_name
    
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail=f"File '{safe_name}' not found.")
    
    try:
        filepath.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    return {"message": f"File '{safe_name}' deleted."}
