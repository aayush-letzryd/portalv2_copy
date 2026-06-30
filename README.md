# LetzRyd Walk-In Registry

Built using HTML, CSS, JavaScript (SurveyJS), FastAPI (Python), and PostgreSQL.
**Repository**: [https://github.com/aayush-letzryd/walkin](https://github.com/aayush-letzryd/walkin)
**Website**: [https://walkin-32fc.onrender.com/](https://walkin-32fc.onrender.com/)

## Project Structure
- **index.html & index.css** – UI layout and styling.
- **script.js** – SurveyJS form fields, validation, and frontend logic.
- **main.py** – FastAPI backend that connects to PostgreSQL using environment variables.

## Creating New Forms
- Modify the frontend files to add new form fields and configure their layout.
- Update the CSS file to change the visual styling of the new fields.
- Update the backend files if the new fields require database changes.

## Deploying on Render
- Upload the codebase to a GitHub repository.
- Create a new Web Service on Render and connect your GitHub repository.
- Configure the runtime environment to Python.
- Set the appropriate commands in Render to install dependencies and start the server.
- Add the necessary database environment variables in the Render dashboard.
