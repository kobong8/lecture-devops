from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="DevOps Lecture Server")

# 정적 파일 서빙 (이미지, lecture_note 등)
app.mount("/images", StaticFiles(directory="images"), name="images")
app.mount("/lecture_note", StaticFiles(directory="lecture_note"), name="lecture_note")

@app.get("/")
async def root():
    """메인 페이지 반환"""
    return FileResponse("index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)