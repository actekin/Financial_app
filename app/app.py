from flask import Flask
import os

app = Flask(__name__)


@app.get("/")
def index():
    app_name = os.getenv("APP_NAME", "Financial App (Test)")
    app_env = os.getenv("APP_ENV", "development")
    return (
        "<h1>" + app_name + "</h1>"
        "<p>Your test environment is running.</p>"
        "<p>Environment: " + app_env + "</p>"
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
