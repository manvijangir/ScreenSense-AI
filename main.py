from fastapi import FastAPI, UploadFile, Form
import pandas as pd
import io

app = FastAPI()

# Main endpoint: analyze CSV + goal
@app.post("/analyze")
async def analyze(file: UploadFile, goal: str = Form(...)):
    # Read CSV file
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    df['date'] = pd.to_datetime(df['date'])

    # Save file temporarily
    df.to_csv("data.csv", index=False)

    # Simple analysis: find top app
    app_usage = df.groupby('app')['usage_minutes'].sum()
    top_app = app_usage.idxmax()
    top_time = app_usage.max()

    # Beginner-friendly AI logic (rule-based)
    suggestion = (
        f"You spent {top_time} minutes on {top_app}. "
        f"Your goal is: {goal}. "
        f"Try reducing {top_app} by 30 minutes daily to free up time for your goal."
    )

    return {"insight": suggestion}


# Extra endpoints (optional for charts)
@app.get("/daily-patterns")
def daily_patterns():
    df = pd.read_csv("data.csv")
    daily = df.groupby(['date','app'])['usage_minutes'].sum().reset_index()
    return daily.to_dict(orient="records")

@app.get("/weekly-trends")
def weekly_trends():
    df = pd.read_csv("data.csv")
    df['week'] = df['date'].dt.isocalendar().week
    weekly = df.groupby('week')['usage_minutes'].sum().reset_index()
    return weekly.to_dict(orient="records")

@app.get("/top-apps")
def top_apps():
    df = pd.read_csv("data.csv")
    top = df.groupby('app')['usage_minutes'].sum().sort_values(ascending=False).head(5)
    return top.to_dict()
