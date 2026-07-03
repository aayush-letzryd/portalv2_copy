# LetzRyd Operations Portal: Production Diagnostics & Logging Guide

This document describes the **Global Exception Catcher and Structured Logging** mechanism integrated into the LetzRyd backend (`main.py`). This feature allows developers and data scientists to easily debug production crashes, trace which user triggered an issue, and inspect exact variables at the time of failure.

---

## 1. How It Works

The diagnostic tracker acts like a **flight data recorder** for the API server. Whenever a database query, data conversion, or route execution fails:

1. **Interception**: The catcher intercepts the unhandled Python exception (which would normally result in a generic 500 error page).
2. **Identity Resolution**: It safely parses the incoming request's `Authorization` header, queries the session table, and resolves the logged-in **Username** and **User ID**.
3. **Structured Print**: It outputs a formatted diagnostic block containing the traceback, timestamp, endpoint, and user context.
4. **Google Cloud Sync**: In production, GCP automatically captures these terminal outputs and indexes them in **Google Cloud Logging**.

---

## 2. The Code

The implementation is located at the top of `main.py`:

```python
def get_user_for_log(request: Request) -> str:
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        return "Anonymous"
    token = auth.split(" ", 1)[1]
    conn = None
    try:
        conn = postgreSQL_pool.getconn()
        cur = conn.cursor()
        cur.execute(
            "SELECT au.username, au.id FROM app_sessions s JOIN app_users au ON au.id = s.user_id WHERE s.token = %s;", 
            (token,)
        )
        row = cur.fetchone()
        if row:
            return f"@{row[0]} (ID: {row[1]})"
    except Exception:
        pass
    finally:
        if conn:
            postgreSQL_pool.putconn(conn)
    return "Anonymous/Invalid Token"

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    user_info = get_user_for_log(request)
    error_traceback = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    timestamp = datetime.now().isoformat()
    
    print(f"\n================ [PRODUCTION CRASH] ================")
    print(f"Time: {timestamp}")
    print(f"Request: {request.method} {request.url.path}")
    print(f"User: {user_info}")
    print(f"Error: {str(exc)}")
    print(f"Traceback:\n{error_traceback}")
    print(f"====================================================\n")
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error. Diagnostic ID: {timestamp}"}
    )
```

---

## 3. How to Deploy

To push the diagnostic logger to your servers:

### A. Automatic Deploy (Git-based e.g., Render, Heroku)
Simply run the standard commands in your workspace:
```bash
git add main.py
git commit -m "Add global exception diagnostic logger"
git push origin main
```
The hosting platform will pick up the code and deploy it automatically.

### B. Google Cloud Run (Containerized)
If deploying via Docker / gcloud CLI:
```bash
# Build and submit the container to Google Artifact Registry
gcloud builds submit --tag gcr.io/letzryd-prod/portal-api:latest

# Deploy to Cloud Run
gcloud run deploy letzryd-portal-api \
    --image gcr.io/letzryd-prod/portal-api:latest \
    --platform managed \
    --region asia-south1
```

---

## 4. How to Use & View Logs

### A. Local Development
Watch the output in the terminal where you start the server:
```bash
python -m uvicorn main:app --port 8000
```
Any error will print directly in your PowerShell/Bash console window.

### B. Production (Google Cloud Console)
1. Navigate to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Search for **Log Explorer** or go to **Logging** ➔ **Log Explorer**.
3. Under the **Query** bar, filter by severity or keywords:
   - To find only crashes:
     ```text
     "PRODUCTION CRASH"
     ```
   - To find errors triggered by a specific username (e.g. `@shiva`):
     ```text
     "shiva"
     ```
   - To find errors on a specific route:
     ```text
     "/api/tickets"
     ```

---

## 5. What it Will Show (Example Log Output)

When a crash happens, you will see a structured diagnostic log entry like this:

```text
================ [PRODUCTION CRASH] ================
Time: 2026-07-03T14:30:15.123456
Request: POST /api/tickets
User: @priyasharma (ID: 12)
Error: psycopg2.errors.NotNullViolation: null value in column "title" violates not-null constraint
Traceback:
  File "C:\Users\anura\Downloads\surveyjs-demo\main.py", line 1618, in create_ticket
    cur.execute("INSERT INTO tickets (title, description) VALUES (%s, %s);", (title, desc))
psycopg2.errors.NotNullViolation: null value in column "title" violates not-null constraint
====================================================
```

*Note: The frontend will also display the unique **Diagnostic ID** (e.g. `2026-07-03T14:30:15.123456`) in the error alert box, so users can report it directly to developers to look up.*
