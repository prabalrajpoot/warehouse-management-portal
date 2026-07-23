# Warehouse Management Portal

A full-stack Warehouse Management System built with **FastAPI**, **React (Vite)**, and **PostgreSQL** to manage warehouse operations including user management, inventory tracking, kit management, inspections, dispatch, returns, manpower, and activity logs.

---

## Live Demo

### Frontend

https://warehouse-management-portal.vercel.app

---
# Features

* User Authentication & Role-based Access
* Dashboard Analytics
* Trade Management
* Kit Management
* Inventory Inward
* Inventory Outward
* Warehouse Management
* Inspection Module
* Sample Inspection
* Dispatch Management
* Dispatch Return
* Upload Excel Data
* Manpower Management
* Activity Logging
* Responsive UI
* JWT Authentication

---

# Tech Stack

## Frontend

* React
* Vite
* Axios
* React Router
* HTML
* CSS

## Backend

* FastAPI
* SQLAlchemy
* PostgreSQL
* JWT Authentication
* Pydantic

## Database

* PostgreSQL
* Neon Database (Cloud)

## Deployment

Frontend : Vercel

Backend : Render

Database : Neon PostgreSQL

---

# Project Structure

warehouse-management-portal/

frontend/

backend/

README.md

.env.example

requirements.txt

---

# Installation

## Clone Repository

git clone https://github.com/your-username/warehouse-management-portal.git

cd warehouse-management-portal

---

## Backend Setup

cd backend

python -m venv venv

### Windows

venv\Scripts\activate

### Linux/Mac

source venv/bin/activate

pip install -r requirements.txt

---

## Frontend Setup

cd frontend

npm install

npm run dev

---

# Environment Variables

Create a .env file using the values provided in .env.example

---

# Production Build

Frontend

npm run build

Backend

uvicorn main:app --host 0.0.0.0 --port 8000

---

# API Documentation

Swagger

/docs

ReDoc

/redoc

---

# Screenshots

(Add screenshots here)

* Login Page
* Dashboard
* Upload Module
* Inventory
* Dispatch
* Reports

---

# Future Improvements

* Docker Support
* CI/CD using GitHub Actions
* Unit Testing
* Integration Testing
* Email Notifications
* Audit Reports
* Redis Caching
* Monitoring & Logging
* Kubernetes Deployment

---

# License

MIT License

---

# Author

Prabal Pratap Singh

GitHub:
https://github.com/prabalrajpoot
