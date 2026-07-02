import psycopg2
from psycopg2 import pool
from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Union, Any
from passlib.context import CryptContext
import os
import secrets

app = FastAPI(title="LetzRyd Walk-In Registry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Load local .env file if it exists
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

# ─────────────────────────────────────────────────────────
# Connection Pool
# ─────────────────────────────────────────────────────────
postgreSQL_pool = None

try:
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(1, 20, dsn=db_url)
    else:
        postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASS"),
            host=os.environ.get("DB_HOST"),
            port=os.environ.get("DB_PORT", "5432"),
            database=os.environ.get("DB_NAME")
        )
    if postgreSQL_pool:
        print("[OK] Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("[ERROR] Error connecting to PostgreSQL:", error)
    if not postgreSQL_pool:
        raise RuntimeError("Failed to initialize PostgreSQL connection pool") from error


# ─────────────────────────────────────────────────────────
# Startup — Tables + Seed Data
# ─────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        # ── cities ──────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cities (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            );
        """)
        cur.execute("SELECT COUNT(*) FROM cities;")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO cities (name) VALUES
                ('Hyderabad'), ('Bangalore'), ('Mumbai'), ('Chennai'), ('Delhi')
                ON CONFLICT (name) DO NOTHING;
            """)
            print("[OK] Cities seeded")

        # ── users (executives) ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            );
        """)
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'Executive';")

        cur.execute("SELECT COUNT(*) FROM users;")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO users (name, role) VALUES
                ('D Shiva',      'Driver Relations Manager'),
                ('Arshad Khan',  'Onboarding Specialist'),
                ('Priya Sharma', 'Partner Onboarding Lead'),
                ('Rohan Verma',  'Executive Assistant'),
                ('Sneha Reddy',  'Regional Operations Manager');
            """)
            print("[OK] Executives seeded")

        # ── walkins ──────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS walkins (
                id             SERIAL PRIMARY KEY,
                visitor_type   VARCHAR(50),
                event_date     VARCHAR(20),
                city           VARCHAR(255),
                executive_id   INTEGER REFERENCES users(id),
                person_name    VARCHAR(255),
                person_number  VARCHAR(50),
                aadhaar_number VARCHAR(20),
                dl_number      VARCHAR(100),
                aadhaar_image  TEXT,
                dl_image       TEXT,
                visiting_reason VARCHAR(255),
                joined_status  VARCHAR(50),
                remarks        TEXT,
                created_at     TIMESTAMP DEFAULT NOW()
            );
        """)
        for col in [
            "aadhaar_number VARCHAR(20)",
            "aadhaar_image  TEXT",
            "dl_image       TEXT",
            "created_at     TIMESTAMP DEFAULT NOW()",
        ]:
            cur.execute(f"ALTER TABLE walkins ADD COLUMN IF NOT EXISTS {col};")

        # ── driver_onboarding ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS driver_onboarding (
                id SERIAL PRIMARY KEY,
                driver_name VARCHAR(255),
                phone_number VARCHAR(50),
                whatsapp_number VARCHAR(50),
                dob VARCHAR(20),
                city VARCHAR(100),
                present_address TEXT,
                emergency_name VARCHAR(255),
                emergency_phone VARCHAR(50),
                dl_number VARCHAR(100),
                dl_expiry_date VARCHAR(20),
                driver_plan VARCHAR(50),
                lead_source VARCHAR(100),
                pan_number VARCHAR(50),
                aadhaar_number VARCHAR(50),
                pan_aadhaar_linked VARCHAR(50),
                selfie_photo TEXT,
                dl_front TEXT,
                dl_back TEXT,
                pan_card_photo TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── walkin_onboarding_links ──────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS walkin_onboarding_links (
                id SERIAL PRIMARY KEY,
                walkin_id INTEGER REFERENCES walkins(id),
                onboarding_id INTEGER REFERENCES driver_onboarding(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── form_onboarding ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS form_onboarding (
                id SERIAL PRIMARY KEY,
                vendor_type VARCHAR(50),
                driver_id VARCHAR(50),
                driver_name VARCHAR(255),
                phone_number VARCHAR(50),
                whatsapp_number VARCHAR(50),
                dob VARCHAR(20),
                city VARCHAR(100),
                operating_place VARCHAR(255),
                present_address TEXT,
                permanent_address TEXT,
                emergency_name VARCHAR(255),
                emergency_phone VARCHAR(50),
                dl_number VARCHAR(100),
                dl_expiry_date VARCHAR(20),
                lead_source VARCHAR(100),
                pan_number VARCHAR(50),
                aadhaar_number VARCHAR(50),
                pan_aadhaar_linked VARCHAR(50),
                selfie_photo TEXT,
                dl_front TEXT,
                dl_back TEXT,
                pan_card_photo TEXT,
                vendor_name VARCHAR(255),
                vendor_id VARCHAR(50),
                aadhaar_card_photo TEXT,
                father_name VARCHAR(255),
                bank_name VARCHAR(255),
                other_bank_name VARCHAR(255),
                account_number VARCHAR(100),
                ifsc_code VARCHAR(50),
                upi_id VARCHAR(100),
                custom_rent_amount VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # Add columns if migrating an existing table
        for col in ["vendor_type VARCHAR(50)", "driver_id VARCHAR(50)", "custom_rent_amount VARCHAR(50)"]:
            cur.execute(f"ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS {col};")

        # ── rents ───────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rents (
                id SERIAL PRIMARY KEY,
                level VARCHAR(50) DEFAULT 'model',
                vehicle_model VARCHAR(100),
                vehicle_number VARCHAR(100),
                vehicle_age VARCHAR(50),
                vendor_id VARCHAR(50),
                driver_id VARCHAR(50),
                rent_amount INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("ALTER TABLE rents ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'model';")
        cur.execute("ALTER TABLE rents ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);")

        # ── walkin_form_links ──────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS walkin_form_links (
                id SERIAL PRIMARY KEY,
                walkin_id INTEGER REFERENCES walkins(id),
                onboarding_id INTEGER REFERENCES form_onboarding(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # Add operating_place & vendor & aadhaar photo fields gracefully
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS operating_place VARCHAR(255);")
        cur.execute("ALTER TABLE walkins ADD COLUMN IF NOT EXISTS operating_place VARCHAR(255);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(50);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS aadhaar_card_photo TEXT;")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS other_bank_name VARCHAR(255);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);")
        cur.execute("ALTER TABLE form_onboarding ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);")

        # ── partner_adjustment ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS partner_adjustment (
                id SERIAL PRIMARY KEY,
                partner_name VARCHAR(255),
                partner_code VARCHAR(100),
                driver_id VARCHAR(50),
                partner_number VARCHAR(50),
                vehicle_number VARCHAR(100),
                city_name VARCHAR(100),
                partner_type VARCHAR(50),
                adjustment_type VARCHAR(50),
                adjustment_date VARCHAR(50),
                enter_amount VARCHAR(50),
                remittance_towards TEXT,
                adjustment_related_to TEXT,
                remarks TEXT,
                first_level_approval_by VARCHAR(255),
                finance_team_status VARCHAR(50),
                finance_team_remarks TEXT,
                final_level_approval_by VARCHAR(255),
                status VARCHAR(50),
                photo TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Run migrations for partner_adjustment table columns
        for col in [
            "driver_id VARCHAR(50)",
            "vehicle_number VARCHAR(100)",
            "photo TEXT",
            "first_level_approval_by VARCHAR(255)",
            "finance_team_status VARCHAR(50)",
            "finance_team_remarks TEXT",
            "final_level_approval_by VARCHAR(255)",
            "status VARCHAR(50)",
            "adjustment_level VARCHAR(50)",
            "adjustment_nature VARCHAR(50)",
            "time_duration VARCHAR(50)"
        ]:
            cur.execute(f"ALTER TABLE partner_adjustment ADD COLUMN IF NOT EXISTS {col};")

        cur.execute("ALTER TABLE rents ADD COLUMN IF NOT EXISTS vehicle_manufacturer VARCHAR(100);")

        cur.execute("SELECT COUNT(*) FROM partner_adjustment;")
        if cur.fetchone()[0] == 0:
            adj_sql = """
                INSERT INTO partner_adjustment (
                    partner_name, partner_code, driver_id, partner_number, vehicle_number, city_name, 
                    partner_type, adjustment_type, adjustment_date, enter_amount, 
                    remittance_towards, adjustment_related_to, remarks, first_level_approval_by, 
                    finance_team_status, finance_team_remarks, final_level_approval_by, status
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            adj_records = [
                ("Vijay Mallya", "P-1001", "1", "9000000001", "TS09 EA 1111", "Hyderabad", "Individual", "Credit", "2026-06-25", "5000", "Rent Deposit refund", "Rentals", "Refunding security deposit", "Finance Desk", "Approved", "Verified", "Ops Manager", "Completed"),
                ("Sachin Tendulkar", "P-1002", "2", "9000000002", "MH01 AB 2222", "Mumbai", "Fleet", "Debit", "2026-06-26", "2500", "Vehicle Damage", "Maintenance", "Charging for side mirror repair", "Finance Desk", "Approved", "Charged", "Ops Manager", "Completed"),
                ("Rahul Dravid", "P-1003", None, "9000000003", None, "Bangalore", "Rental", "Waiver", "2026-06-27", "1000", "Late fee waiver", "Penalty", "Waived late fee due to health issue", "Finance Desk", "Approved", "Waived", "Ops Manager", "Completed"),
                ("Sourav Ganguly", "P-1004", "3", "9000000004", "WB02 CD 4444", "Chennai", "Individual", "Credit", "2026-06-27", "1500", "Referral bonus", "Referral", "Successful onboarding referral", "Finance Desk", "Approved", "Credited", "Ops Manager", "Completed"),
                ("MS Dhoni", "P-1005", "4", "9000000005", "JH01 EF 5555", "Chennai", "Individual", "Debit", "2026-06-28", "800", "Challan reimbursement deduction", "Challan", "Speeding ticket penalty offset", "Finance Desk", "Approved", "Deducted", "Ops Manager", "Completed"),
                ("Virat Kohli", "P-1006", "5", "9000000006", "DL01 GH 6666", "Delhi", "Fleet", "Credit", "2026-06-29", "12000", "Incentive bonus", "Incentives", "Completed 150 rides milestone", "Finance Desk", "Approved", "Milestone reached", "Ops Manager", "Completed"),
                ("Rohit Sharma", "P-1007", "6", "9000000007", "MH02 IJ 7777", "Mumbai", "Individual", "Debit", "2026-06-29", "450", "Toll charges adjustment", "Tolls", "Sea link toll duplicate entry", "Finance Desk", "Approved", "Adjusted", "Ops Manager", "Completed"),
                ("Jasprit Bumrah", "P-1008", "7", "9000000008", "GJ01 KL 8888", "Hyderabad", "Rental", "Waiver", "2026-06-30", "600", "Device deposit discount", "Deposit", "Waiving device deposit partially", "Finance Desk", "Approved", "Discounted", "Ops Manager", "Completed"),
                ("Hardik Pandya", "P-1009", "8", "9000000009", "GJ03 MN 9999", "Bangalore", "Fleet", "Credit", "2026-06-30", "4500", "Battery swap compensation", "Fuel", "Electric swap cost offset", "Finance Desk", "Approved", "Compensated", "Ops Manager", "Completed"),
                ("KL Rahul", "P-1010", None, "9000000010", None, "Bangalore", "Rental", "Debit", "2026-06-30", "1500", "Excess mileage fee", "Rental Fee", "150km beyond weekly limit", "Finance Desk", "Approved", "Charged excess", "Ops Manager", "Completed")
            ]
            for r in adj_records:
                cur.execute(adj_sql, r)
            print("[OK] Partner adjustments seeded")

        # ── vehicle_allocation ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_allocation (
                id SERIAL PRIMARY KEY,
                allocation_date VARCHAR(50),
                allocation_type VARCHAR(50),
                city_name VARCHAR(100),
                driver_id VARCHAR(50),
                driver_name VARCHAR(255),
                driver_phone VARCHAR(50),
                driver_plan VARCHAR(100),
                type_of_plan VARCHAR(100),
                car_model VARCHAR(100),
                vehicle_number VARCHAR(100),
                old_vehicle_number VARCHAR(100),
                dropoff_odometer VARCHAR(50),
                dropoff_remarks TEXT,
                dropoff_photo TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Run migrations for vehicle_allocation table columns
        for col in [
            "driver_plan VARCHAR(100)",
            "type_of_plan VARCHAR(100)",
            "car_model VARCHAR(100)",
            "old_vehicle_number VARCHAR(100)",
            "dropoff_odometer VARCHAR(50)",
            "dropoff_remarks TEXT",
            "dropoff_photo TEXT"
        ]:
            cur.execute(f"ALTER TABLE vehicle_allocation ADD COLUMN IF NOT EXISTS {col};")

        cur.execute("SELECT COUNT(*) FROM vehicle_allocation;")
        if cur.fetchone()[0] == 0:
            alloc_sql = """
                INSERT INTO vehicle_allocation (
                    allocation_date, allocation_type, city_name, driver_id, driver_name, 
                    driver_phone, driver_plan, type_of_plan, car_model, vehicle_number, 
                    old_vehicle_number, dropoff_odometer, dropoff_remarks
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            alloc_records = [
                ("2026-06-25", "New Allocation", "Hyderabad", "D-5001", "Amit Kumar", "9848022338", "Subscription", "Bronze", "Tata Nexon EV", "TS09 EA 4444", None, None, None),
                ("2026-06-26", "Car Swap", "Mumbai", "D-5002", "Rajesh Patel", "9820098200", "Lease", "Silver", "MG ZS EV", "MH01 AB 5555", "MH01 AB 2222", "45000", "Returned with clean battery state"),
                ("2026-06-27", "Reallocation", "Bangalore", "D-5003", "Karthik Raja", "9900990099", "Lease", "Gold", "Hyundai Kona", "KA03 CD 6666", "KA03 CD 1111", "62000", "Scratches on rear left bumper"),
                ("2026-06-27", "New Allocation", "Chennai", "D-5004", "Senthil Kumar", "9444094440", "Subscription", "Bronze", "BYD Atto 3", "TN07 EF 7777", None, None, None),
                ("2026-06-28", "Car Swap", "Delhi", "D-5005", "Harpreet Singh", "9810098100", "Subscription", "Silver", "Tata Tigor EV", "DL01 GH 8888", "DL01 GH 3333", "28000", "No issues reported on swap"),
                ("2026-06-29", "New Allocation", "Hyderabad", "D-5006", "Vikram Reddy", "9000190001", "Lease", "Gold", "Tata Nexon EV", "TS09 EA 9999", None, None, None),
                ("2026-06-29", "Reallocation", "Mumbai", "D-5007", "Sunil Gavaskar", "9821098210", "Lease", "Silver", "MG ZS EV", "MH02 IJ 1234", "MH02 IJ 7777", "18000", "Dropoff clean"),
                ("2026-06-30", "New Allocation", "Bangalore", "D-5008", "Anil Kumble", "9845098450", "Subscription", "Bronze", "Hyundai Kona", "KA03 CD 5555", None, None, None),
                ("2026-06-30", "Car Swap", "Hyderabad", "D-5009", "Suresh Raina", "9989099890", "Subscription", "Gold", "BYD Atto 3", "TS09 EA 6666", "TS09 EA 1111", "34500", "Minor dent on front door"),
                ("2026-06-30", "New Allocation", "Delhi", "D-5010", "Kapil Dev", "9811098110", "Lease", "Gold", "Tata Tigor EV", "DL02 IJ 7777", None, None, None)
            ]
            for r in alloc_records:
                cur.execute(alloc_sql, r)
            print("[OK] Vehicle allocations seeded")

        # ── partner_expenses ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS partner_expenses (
                id SERIAL PRIMARY KEY,
                expense_date VARCHAR(50),
                driver_name VARCHAR(255),
                phone_number VARCHAR(50),
                vehicle_number VARCHAR(100),
                expenses_type VARCHAR(100),
                amount_paid VARCHAR(50),
                reference_photo TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Run migrations for partner_expenses table columns
        for col in [
            "expense_date VARCHAR(50)",
            "driver_name VARCHAR(255)",
            "phone_number VARCHAR(50)",
            "vehicle_number VARCHAR(100)",
            "expenses_type VARCHAR(100)",
            "amount_paid VARCHAR(50)",
            "reference_photo TEXT"
        ]:
            cur.execute(f"ALTER TABLE partner_expenses ADD COLUMN IF NOT EXISTS {col};")

        cur.execute("SELECT COUNT(*) FROM partner_expenses;")
        if cur.fetchone()[0] == 0:
            exp_sql = """
                INSERT INTO partner_expenses (
                    expense_date, driver_name, phone_number, vehicle_number, 
                    expenses_type, amount_paid, reference_photo
                ) VALUES (%s,%s,%s,%s,%s,%s,%s);
            """
            exp_records = [
                ("2026-06-25", "Amit Kumar", "9848022338", "TS09 EA 4444", "CNG", "1200", None),
                ("2026-06-26", "Rajesh Patel", "9820098200", "MH01 AB 5555", "Toll", "350", None),
                ("2026-06-27", "Karthik Raja", "9900990099", "KA03 CD 6666", "OLA - CL Balance", "850", None),
                ("2026-06-27", "Senthil Kumar", "9444094440", "TN07 EF 7777", "Paid to Company", "5000", None),
                ("2026-06-28", "Harpreet Singh", "9810098100", "DL01 GH 8888", "CNG", "950", None),
                ("2026-06-29", "Vikram Reddy", "9000190001", "TS09 EA 9999", "Toll", "120", None),
                ("2026-06-29", "Sunil Gavaskar", "9821098210", "MH02 IJ 1234", "Paid to Company", "4500", None),
                ("2026-06-30", "Anil Kumble", "9845098450", "KA03 CD 5555", "CNG", "1100", None),
                ("2026-06-30", "Suresh Raina", "9989099890", "TS09 EA 6666", "Toll", "280", None),
                ("2026-06-30", "Kapil Dev", "9811098110", "DL02 IJ 7777", "OLA - CL Balance", "600", None)
            ]
            for r in exp_records:
                cur.execute(exp_sql, r)
            print("[OK] Partner expenses seeded")


        # Seed walk-ins if empty
        cur.execute("SELECT COUNT(*) FROM walkins;")
        if cur.fetchone()[0] == 0:

            # Seed sample Operator and Drivers
            cur.execute("""
                INSERT INTO form_onboarding (
                    driver_name, phone_number, dob, city, operating_place, 
                    present_address, permanent_address, emergency_name, emergency_phone, 
                    dl_number, pan_number, aadhaar_number, pan_aadhaar_linked, 
                    vendor_name, vendor_id, father_name, vendor_type, custom_rent_amount
                ) VALUES ('Ganesh Fleet Travels', '9876541230', '1985-01-01', 'Hyderabad', 'Banjara Hills',
                          '123 Street, Hyderabad', '123 Street, Hyderabad', 'N/A', '0000000000',
                          'N/A', 'PANOP7788P', '987654321098', 'Yes', 'Ganesh Fleet Travels', 'OP-7788', 'N/A', 'Operator', '1000') RETURNING id;
            """)
            op_id = cur.fetchone()[0]

            # Seed drivers under OP-7788
            cur.execute("""
                INSERT INTO form_onboarding (
                    driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                    vendor_name, vendor_id, vendor_type,
                    whatsapp_number, dob, city, present_address, permanent_address, 
                    emergency_name, emergency_phone, pan_number, aadhaar_number, father_name
                ) VALUES ('Suresh Kumar', '9900112233', 'TS0920200012345', '850', 'DR-9001',
                          'Ganesh Fleet Travels', 'OP-7788', 'Operator',
                          '9900112233', '1992-05-15', 'Hyderabad', '123 Street, Hyderabad', '123 Street, Hyderabad',
                          'Ramesh Kumar', '9876543210', 'ABCDE9876A', '987654321098', 'Ramesh Kumar');
            """)
            
            cur.execute("""
                INSERT INTO form_onboarding (
                    driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                    vendor_name, vendor_id, vendor_type,
                    whatsapp_number, dob, city, present_address, permanent_address, 
                    emergency_name, emergency_phone, pan_number, aadhaar_number, father_name
                ) VALUES ('Mahesh Babu', '9900112244', 'TS0920200012346', '900', 'DR-9002',
                          'Ganesh Fleet Travels', 'OP-7788', 'Operator',
                          '9900112244', '1994-08-22', 'Hyderabad', '123 Street, Hyderabad', '123 Street, Hyderabad',
                          'Satish Babu', '9876543211', 'ABCDE9876B', '987654321099', 'Satish Babu');
            """)

            cur.execute("SELECT id, name FROM cities ORDER BY id;")
            city_map = {n: i for i, n in cur.fetchall()}
            
            w_sql = """
                INSERT INTO walkins (visitor_type, event_date, city, person_name, person_number, dl_number, visiting_reason, joined_status, executive_name, executive_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;
            """
            cur.execute(w_sql, ("Operator", "2026-06-24", "Mumbai", "Deepak Mehta", "+91 98001 55667", "MH01 20100098765", "Enquiry", "Not Interested", "Neha Sharma", 18))
            cur.execute(w_sql, ("Individual", "2026-06-25", "Bangalore", "Ravi Shankar", "+91 91000 44556", "KA03 20210056789", "Onboarding", "Pending", "Sandeep", 7))
            cur.execute(w_sql, ("Individual", "2026-06-26", "Hyderabad", "Ajay Deshmukh", "+91 99888 33221", "TS02 20200765432", "Support", "Joined", "SHAIK ABDULLA", 5))
            cur.execute(w_sql, ("Operator", "2026-06-26", "Hyderabad", "Kavitha Nair", "+91 90123 45678", "TS06 20181234567", "Enquiry", "Onboarded", "Ayush Mahendru", 13))

        # Clean seed 10 onboarding records if empty or < 5
        cur.execute("SELECT COUNT(*) FROM form_onboarding;")
        if cur.fetchone()[0] < 5:
            cur.execute("DELETE FROM walkin_form_links;")
            cur.execute("DELETE FROM form_onboarding;")
            
            onboarding_records = [
                ("Kavitha Nair", "9012345678", "1992-05-15", "Hyderabad", "Banjara Hills", "123 Street, Hyderabad", "123 Street, Hyderabad", "Rahul Nair", "9876543210", "TS0620181234567", "ABCDE1234F", "123456789012", "Yes", "FastFleet Logistics", "V-9901", "Gopal Nair"),
                ("Ravi Shankar", "9100044556", "1994-08-22", "Bangalore", "Indiranagar", "456 Avenue, Bangalore", "456 Avenue, Bangalore", "Saraswathi", "9900088220", "KA0320210056789", "BCDEF2345G", "234567890123", "Yes", "FastFleet Logistics", "V-9901", "Shiva Shankar"),
                ("Ajay Deshmukh", "9988833221", "1990-12-05", "Hyderabad", "Gachibowli", "789 Lane, Hyderabad", "789 Lane, Hyderabad", "Seema Deshmukh", "9988833200", "TS0220200765432", "CDEFG3456H", "345678901234", "Yes", "Self-Employed", "", "Anand Deshmukh"),
                ("Deepak Mehta", "9800155667", "1988-03-30", "Mumbai", "Bandra", "101 Sea Road, Mumbai", "101 Sea Road, Mumbai", "Karan Mehta", "9800155660", "MH0120100098765", "DEFGH4567I", "456789012345", "Yes", "Alpha Cabs", "V-8802", "Suresh Mehta"),
                ("Amit Patel", "9876543210", "1991-07-14", "Mumbai", "Andheri", "202 Park Plaza, Mumbai", "202 Park Plaza, Mumbai", "Jaya Patel", "9876543200", "MH0220150012345", "EFGHI5678J", "567890123456", "No", "Alpha Cabs", "V-8802", "Dinesh Patel"),
                ("Priya Sharma", "9911223344", "1995-11-20", "Hyderabad", "Begumpet", "505 Metro Heights, Hyderabad", "505 Metro Heights, Hyderabad", "Vijay Sharma", "9911223340", "TS0920190012345", "FGHIJ6789K", "678901234567", "Yes", "Self-Employed", "", "Rajendra Sharma"),
                ("Rajesh Kumar", "9811223344", "1989-02-18", "Bangalore", "Koramangala", "303 Block B, Bangalore", "303 Block B, Bangalore", "Sunita Kumar", "9811223340", "KA0120180098765", "GHIJK7890L", "789012345678", "Yes", "FastFleet Logistics", "V-9901", "Ramesh Kumar"),
                ("Sunita Rao", "9711223344", "1993-06-25", "Hyderabad", "Madhapur", "404 Cyber Towers, Hyderabad", "404 Cyber Towers, Hyderabad", "Krishna Rao", "9711223340", "TS0520211234567", "HIJKL8901M", "890123456789", "No", "Self-Employed", "", "Hanumantha Rao"),
                ("Vinod Khanna", "9611223344", "1992-09-02", "Mumbai", "Thane", "707 West End, Mumbai", "707 West End, Mumbai", "Asha Khanna", "9611223340", "MH0420160054321", "IJKLM9012N", "901234567890", "Yes", "Alpha Cabs", "V-8802", "Prem Khanna"),
                ("Meera Sen", "9511223344", "1994-04-10", "Bangalore", "Whitefield", "808 Silicon Valley, Bangalore", "808 Silicon Valley, Bangalore", "Anoop Sen", "9511223340", "KA0420220011223", "JKLMN0123O", "012345678901", "Yes", "Direct Partner", "", "Bimal Sen")
            ]
            
            for item in onboarding_records:
                cur.execute("""
                    INSERT INTO form_onboarding (
                        driver_name, phone_number, dob, city, operating_place, 
                        present_address, permanent_address, emergency_name, emergency_phone, 
                        dl_number, pan_number, aadhaar_number, pan_aadhaar_linked, vendor_name, vendor_id, father_name, vendor_type
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Individual') RETURNING id;
                """, item)
                onb_id = cur.fetchone()[0]
                
                # Link this onboarding record to a walkin if the name matches
                cur.execute("SELECT id FROM walkins WHERE LOWER(person_name) = LOWER(%s) LIMIT 1;", (item[0],))
                walkin_row = cur.fetchone()
                if walkin_row:
                    walkin_id = walkin_row[0]
                    cur.execute("INSERT INTO walkin_form_links (walkin_id, onboarding_id) VALUES (%s, %s);", (walkin_id, onb_id))
                    cur.execute("UPDATE walkins SET joined_status = 'Onboarded' WHERE id = %s;", (walkin_id,))

            # Seed sample Operator and Drivers
            cur.execute("""
                INSERT INTO form_onboarding (
                    driver_name, phone_number, dob, city, operating_place, 
                    present_address, permanent_address, emergency_name, emergency_phone, 
                    dl_number, pan_number, aadhaar_number, pan_aadhaar_linked, 
                    vendor_name, vendor_id, father_name, vendor_type, custom_rent_amount
                ) VALUES ('Ganesh Fleet Travels', '9876541230', '1985-01-01', 'Hyderabad', 'Banjara Hills',
                          '123 Street, Hyderabad', '123 Street, Hyderabad', 'N/A', '0000000000',
                          'N/A', 'PANOP7788P', '987654321098', 'Yes', 'Ganesh Fleet Travels', 'OP-7788', 'N/A', 'Operator', '1000') RETURNING id;
            """)
            op_id = cur.fetchone()[0]

            # Seed drivers under OP-7788
            cur.execute("""
                INSERT INTO form_onboarding (
                    driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                    vendor_name, vendor_id, vendor_type,
                    whatsapp_number, dob, city, present_address, permanent_address, 
                    emergency_name, emergency_phone, pan_number, aadhaar_number, father_name
                ) VALUES ('Suresh Kumar', '9900112233', 'TS0920200012345', '850', 'DR-9001',
                          'Ganesh Fleet Travels', 'OP-7788', 'Operator',
                          '9900112233', '1992-05-15', 'Hyderabad', '123 Street, Hyderabad', '123 Street, Hyderabad',
                          'Ramesh Kumar', '9876543210', 'ABCDE9876A', '987654321098', 'Ramesh Kumar');
            """)
            
            cur.execute("""
                INSERT INTO form_onboarding (
                    driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                    vendor_name, vendor_id, vendor_type,
                    whatsapp_number, dob, city, present_address, permanent_address, 
                    emergency_name, emergency_phone, pan_number, aadhaar_number, father_name
                ) VALUES ('Mahesh Babu', '9900112244', 'TS0920200012346', '900', 'DR-9002',
                          'Ganesh Fleet Travels', 'OP-7788', 'Operator',
                          '9900112244', '1994-08-22', 'Hyderabad', '123 Street, Hyderabad', '123 Street, Hyderabad',
                          'Satish Babu', '9876543211', 'ABCDE9876B', '987654321099', 'Satish Babu');
            """)

            cur.execute("SELECT id, name FROM cities ORDER BY id;")
            city_map = {n: i for i, n in cur.fetchall()}

            cur.execute("SELECT id, name FROM users ORDER BY id;")
            user_map = {n: i for i, n in cur.fetchall()}

            hyd = str(city_map.get("Hyderabad", 1))
            blr = str(city_map.get("Bangalore", 2))
            mum = str(city_map.get("Mumbai", 3))
            chn = str(city_map.get("Chennai", 4))
            del_ = str(city_map.get("Delhi", 5))

            shiva  = user_map.get("D Shiva", 1)
            arshad = user_map.get("Arshad Khan", 2)
            priya  = user_map.get("Priya Sharma", 3)
            rohan  = user_map.get("Rohan Verma", 4)
            sneha  = user_map.get("Sneha Reddy", 5)

            records = [
                ("Driver",  "2026-06-10", hyd,  shiva,  "K Ramesh Kumar",   "+91 98480 22338", "1234 5678 9012", "TS09 20210045612", "Onboarding",  "Joined",         "Completed documentation. Verified Aadhaar and DL. Assigned Citroen EC3."),
                ("Driver",  "2026-06-11", blr,  arshad, "Sandeep Hegde",    "+91 99000 88221", "2345 6789 0123", "KA03 20198894101", "Onboarding",  "Joined",         "WagonR onboarding done. App installed and first ride completed."),
                ("Partner", "2026-06-12", mum,  priya,  "Milind Salunkhe",  "+91 98200 44556", "3456 7890 1234", "MH01 20150993811", "Enquiry",     "Pending",        "Interested in fleet model (5 cars). Revenue sharing terms requested."),
                ("Driver",  "2026-06-13", hyd,  shiva,  "Mohammad Fareed",  "+91 90001 23456", "4567 8901 2345", "TS11 20220938112", "Support",     "Joined",         "App login issue resolved. Password reset done."),
                ("Driver",  "2026-06-14", hyd,  rohan,  "Anil Konda",       "+91 88866 55443", "5678 9012 3456", "TS08 20183384910", "Onboarding",  "Not Interested", "Left due to minimum daily drive hour requirement."),
                ("Partner", "2026-06-15", blr,  priya,  "Rajesh Patel",     "+91 98765 43210", "6789 0123 4567", "GJ01 20190012345", "Enquiry",     "Joined",         "Fleet partner confirmed. 3 vehicles registered and active."),
                ("Driver",  "2026-06-17", hyd,  arshad, "Suresh Kumar",     "+91 91234 56789", "7890 1234 5678", "TS05 20211234567", "Onboarding",  "Pending",        "Background check in progress. Documents under review."),
                ("Driver",  "2026-06-19", del_, sneha,  "Vikram Singh",     "+91 98888 77766", "8901 2345 6789", "DL01 20178901234", "Onboarding",  "Joined",         "Delhi onboarding complete. Dzire assigned."),
                ("Partner", "2026-06-21", hyd,  priya,  "Anita Reddy",      "+91 99111 22233", "9012 3456 7890", "TS03 20200987654", "Enquiry",     "Pending",        "Follow-up call scheduled for next week."),
                ("Driver",  "2026-06-22", hyd,  shiva,  "Bhaskar Rao",      "+91 90909 08080", "0123 4567 8901", "TS07 20220123456", "Support",     "Joined",         "Payment settlement resolved. All dues cleared."),
                ("Driver",  "2026-06-23", chn,  sneha,  "Pawan Krishnan",   "+91 97777 11122", "1122 3344 5566", "TN22 20191234567", "Onboarding",  "Joined",         "Chennai pilot batch. Hyundai Xcent assigned."),
                ("Partner", "2026-06-24", mum,  rohan,  "Deepak Mehta",     "+91 98001 55667", "7788 9900 1122", "MH04 20160098765", "Enquiry",     "Not Interested", "Concerned about lock-in period. Did not proceed."),
                ("Driver",  "2026-06-25", blr,  arshad, "Ravi Shankar",     "+91 91000 44556", "3344 5566 7788", "KA05 20210056789", "Onboarding",  "Pending",        "Documents submitted. Waiting for police verification."),
                ("Driver",  "2026-06-26", hyd,  shiva,  "Ajay Deshmukh",    "+91 99888 33221", "5566 7788 9900", "TS02 20200765432", "Support",     "Joined",         "Rider rating issue investigated and resolved."),
                ("Partner", "2026-06-26", hyd,  priya,  "Kavitha Nair",     "+91 90123 45678", "6677 8899 0011", "TS06 20181234567", "Enquiry",     "Joined",         "Signed partner agreement. 2 vehicles onboarded."),
            ]

            cur.executemany("""
                INSERT INTO walkins
                  (visitor_type, event_date, city, executive_id, person_name,
                   person_number, aadhaar_number, dl_number, visiting_reason,
                   joined_status, remarks)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """, records)
            print(f"[OK] Walk-in records seeded ({len(records)} records)")

        # ── roles and permissions ────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_role_permissions (
                role_id INTEGER REFERENCES app_roles(id) ON DELETE CASCADE,
                permission_id INTEGER REFERENCES app_permissions(id) ON DELETE CASCADE,
                PRIMARY KEY (role_id, permission_id)
            );
        """)

        # ── app_users (login accounts) ───────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_users (
                id           SERIAL PRIMARY KEY,
                username     VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                executive_id INTEGER REFERENCES users(id),
                role_id      INTEGER REFERENCES app_roles(id),
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS raw_password VARCHAR(255);")
        cur.execute("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES app_roles(id);")
        cur.execute("UPDATE app_users SET raw_password = 'letzryd123' WHERE raw_password IS NULL;")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_sessions (
                token        VARCHAR(255) PRIMARY KEY,
                user_id      INTEGER REFERENCES app_users(id),
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)

        # Seed roles
        cur.execute("SELECT COUNT(*) FROM app_roles;")
        if cur.fetchone()[0] == 0:
            cur.execute("INSERT INTO app_roles (name, description) VALUES ('Admin', 'Full Access'), ('Viewer', 'Read Only') RETURNING id;")
            admin_role_id = cur.fetchone()[0]
        else:
            cur.execute("SELECT id FROM app_roles WHERE name = 'Admin';")
            r = cur.fetchone()
            admin_role_id = r[0] if r else None

        # Seed login accounts — only if app_users is empty
        cur.execute("SELECT COUNT(*) FROM app_users;")
        if cur.fetchone()[0] == 0:
            cur.execute("SELECT id, name FROM users ORDER BY id;")
            exec_rows = cur.fetchall()
            exec_map = {name: uid for uid, name in exec_rows}

            default_password_hash = pwd_context.hash("letzryd123")
            login_accounts = [
                ("dshiva",       default_password_hash, exec_map.get("D Shiva"), 'letzryd123', admin_role_id),
                ("arshadkhan",   default_password_hash, exec_map.get("Arshad Khan"), 'letzryd123', admin_role_id),
                ("priyasharma",  default_password_hash, exec_map.get("Priya Sharma"), 'letzryd123', admin_role_id),
                ("rohanverma",   default_password_hash, exec_map.get("Rohan Verma"), 'letzryd123', admin_role_id),
                ("snehareddy",   default_password_hash, exec_map.get("Sneha Reddy"), 'letzryd123', admin_role_id),
            ]
            cur.executemany(
                "INSERT INTO app_users (username, password_hash, executive_id, raw_password, role_id) VALUES (%s,%s,%s,%s,%s);",
                login_accounts
            )
            print("[OK] Login accounts seeded (password: letzryd123)")

        # ── vehicle_models ─────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_models (
                id         SERIAL PRIMARY KEY,
                brand      VARCHAR(255) NOT NULL,
                model_name VARCHAR(255) NOT NULL,
                variant    VARCHAR(100) NOT NULL,
                fuel_type  VARCHAR(100) NOT NULL,
                make_year  INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Seed vehicle models if table is empty
        cur.execute("SELECT COUNT(*) FROM vehicle_models;")
        if cur.fetchone()[0] == 0:
            models_to_seed = [
                ("Maruti Suzuki", "WagonR", "VXI", "CNG", 2023),
                ("Maruti Suzuki", "Ertiga", "ZXI", "CNG", 2022),
                ("Hyundai", "Aura", "S", "CNG", 2023),
                ("Tata", "Tigor", "XM", "EV", 2024),
                ("Tata", "Nexon", "XZ+", "EV", 2023),
                ("Hyundai", "Grand i10", "Sportz", "Petrol", 2022)
            ]
            cur.executemany(
                "INSERT INTO vehicle_models (brand, model_name, variant, fuel_type, make_year) VALUES (%s,%s,%s,%s,%s);",
                models_to_seed
            )
            print("[OK] Vehicle models seeded")

        # ── operating_cities ───────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS operating_cities (
                id         SERIAL PRIMARY KEY,
                name       VARCHAR(255) UNIQUE NOT NULL,
                state      VARCHAR(255) NOT NULL,
                status     VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # Seed cities if table is empty
        cur.execute("SELECT COUNT(*) FROM operating_cities;")
        if cur.fetchone()[0] == 0:
            cities_to_seed = [
                ("Hyderabad", "Telangana", "Active"),
                ("Bangalore", "Karnataka", "Active"),
                ("Mumbai", "Maharashtra", "Active")
            ]
            cur.executemany(
                "INSERT INTO operating_cities (name, state, status) VALUES (%s,%s,%s);",
                cities_to_seed
            )
            print("[OK] Operating cities seeded")

        # ── tickets ───────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                source VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Open',
                created_by_name VARCHAR(255),
                assigned_to INTEGER REFERENCES app_users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP,
                resolution_notes TEXT
            );
        """)

        # ── Drop existing tables for demo schema changes ──────
        cur.execute("DROP TABLE IF EXISTS vehicle_onboarding CASCADE;")
        cur.execute("DROP TABLE IF EXISTS workshop_vendors CASCADE;")
        cur.execute("DROP TABLE IF EXISTS hubs_parking CASCADE;")

        # ── vehicle_onboarding ─────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS vehicle_onboarding (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                letzryd_unique_no VARCHAR(100),
                city_name VARCHAR(100),
                model VARCHAR(255),
                received_allocated VARCHAR(50),
                delivery_month VARCHAR(50),
                registration_date VARCHAR(50),
                rto_tax_validity VARCHAR(50),
                permit_validity VARCHAR(50),
                fitness_validity VARCHAR(50),
                pollution_validity VARCHAR(50),
                insurance_validity VARCHAR(50),
                authorization_certificate VARCHAR(255),
                insurance_mapping VARCHAR(255),
                kms_reading VARCHAR(50),
                tracking_device_vendor VARCHAR(100),
                tracking_device_type VARCHAR(100),
                cng_installed VARCHAR(50),
                cng_plate VARCHAR(100),
                cng_installation_date VARCHAR(50),
                jack VARCHAR(50),
                jack_rod VARCHAR(50),
                spanner VARCHAR(50),
                parking_triangle VARCHAR(50),
                fire_extinguishers VARCHAR(50),
                seat_cover VARCHAR(50),
                floor_carpet VARCHAR(50),
                image_front TEXT,
                image_lh TEXT,
                image_back TEXT,
                image_rh TEXT,
                engine_chasis_no_img TEXT,
                battery_sl_no_img TEXT,
                engine_compartment_img TEXT,
                fast_tag_img TEXT,
                music_system_img TEXT,
                key_quantity INTEGER,
                rc_document TEXT,
                insurance_document TEXT,
                authorization_certificate_doc TEXT,
                rto_tax_receipt TEXT,
                rh_fr_tyre_img TEXT,
                lh_fr_tyre_img TEXT,
                rh_rear_tyre_img TEXT,
                lh_rear_tyre_img TEXT,
                spare_wheel_img TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("SELECT COUNT(*) FROM vehicle_onboarding;")
        if cur.fetchone()[0] == 0:
            v_sql = """
                INSERT INTO vehicle_onboarding (
                    vehicle_number, letzryd_unique_no, city_name, model, received_allocated, delivery_month,
                    registration_date, rto_tax_validity, permit_validity, fitness_validity, pollution_validity, insurance_validity,
                    kms_reading, tracking_device_vendor, tracking_device_type, cng_installed, jack, jack_rod, spanner,
                    parking_triangle, fire_extinguishers, seat_cover, floor_carpet, key_quantity
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            v_records = [
                ("TS09 EA 1234", "LR-EV-001", "Hyderabad", "Tata Nexon EV", "Receiving", "2026-05", "2026-05-10", "2027-05-10", "2027-05-10", "2028-05-10", "2027-05-10", "2027-05-10", "120", "Roadcast", "AIS", "No", "Available", "Available", "Available", "Available", "Available", "Available", "Available", 2),
                ("KA03 CD 5678", "LR-CNG-042", "Bangalore", "Maruti Dzire CNG", "Allocation", "2026-06", "2026-06-15", "2027-06-15", "2027-06-15", "2028-06-15", "2027-06-15", "2027-06-15", "1450", "Trakon", "OBD", "Yes", "Available", "Available", "Missing", "Available", "Available", "Available", "Available", 2),
                ("MH01 EF 9988", "LR-EV-009", "Mumbai", "Citroen eC3", "Receiving", "2026-06", "2026-06-20", "2027-06-20", "2027-06-20", "2028-06-20", "2027-06-20", "2027-06-20", "85", "Roadcast", "AIS", "No", "Available", "Missing", "Available", "Available", "Missing", "Available", "Available", 2)
            ]
            for r in v_records:
                cur.execute(v_sql, r)
            print("[OK] Vehicles onboarding seeded")

        # ── workshop_vendors ───────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS workshop_vendors (
                id SERIAL PRIMARY KEY,
                vendor_name VARCHAR(255),
                workshop_type VARCHAR(100),
                city_name VARCHAR(100),
                address TEXT,
                gst_number VARCHAR(50),
                contact_person VARCHAR(255),
                mobile_number VARCHAR(50),
                email_id VARCHAR(255),
                pan_card VARCHAR(50),
                bank_name VARCHAR(255),
                account_number VARCHAR(100),
                ifsc_code VARCHAR(50),
                workshop_status VARCHAR(50),
                workshop_photo TEXT,
                contact_person_2 VARCHAR(255),
                alternate_mobile VARCHAR(50),
                telephone VARCHAR(50),
                owner_name VARCHAR(255),
                upi_id VARCHAR(100),
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("SELECT COUNT(*) FROM workshop_vendors;")
        if cur.fetchone()[0] == 0:
            ws_sql = """
                INSERT INTO workshop_vendors (
                    vendor_name, workshop_type, city_name, address, gst_number,
                    contact_person, mobile_number, email_id, pan_card, bank_name,
                    account_number, ifsc_code, workshop_status, contact_person_2,
                    alternate_mobile, telephone, owner_name, upi_id
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            ws_records = [
                ("Express Auto Care", "Multi-brand Garage", "Hyderabad", "Banjara Hills, Road No 12", "36AAAAA1111A1Z1", "Rahul Sharma", "9848022338", "rahul@expressauto.com", "ABCDE1234F", "HDFC Bank", "1234567890", "HDFC0000123", "Active", "Kishore Kumar", "9848022339", "040-23456789", "Dinesh Karthik", "expressauto@upi"),
                ("EV Electra Tech", "EV Specialist", "Bangalore", "Indiranagar 100ft Road", "29BBBBB2222B2Z2", "Arun Varma", "9900990099", "contact@electratech.com", "BCDEF2345G", "ICICI Bank", "9876543210", "ICIC0000456", "Active", "Sandeep Hegde", "9900990088", "080-9876543", "Vijay Mallya", "electratech@ybl"),
                ("Bandra Bodyworks", "Body Repair Specialist", "Mumbai", "SVT Road, Bandra West", "27CCCCC3333C3Z3", "Milind Salunkhe", "9820044556", "milind@bandrabody.com", "CDEFG3456H", "Axis Bank", "1122334455", "UTIB0000789", "Onboarding", None, None, None, "Sachin Tendulkar", "bandrabody@okaxis")
            ]
            for r in ws_records:
                cur.execute(ws_sql, r)
            print("[OK] Workshop vendors seeded")

        # ── hubs_parking ──────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS hubs_parking (
                id SERIAL PRIMARY KEY,
                hub_name VARCHAR(255),
                city_name VARCHAR(100),
                address TEXT,
                pincode VARCHAR(20),
                facility_type VARCHAR(100),
                total_capacity VARCHAR(50),
                ev_charging VARCHAR(10),
                security_cctv VARCHAR(10),
                hub_manager VARCHAR(255),
                manager_phone VARCHAR(50),
                operating_hours VARCHAR(100),
                hub_photo TEXT,
                contact_person VARCHAR(255),
                designation VARCHAR(255),
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("SELECT COUNT(*) FROM hubs_parking;")
        if cur.fetchone()[0] == 0:
            hub_sql = """
                INSERT INTO hubs_parking (
                    hub_name, city_name, address, pincode, facility_type,
                    total_capacity, ev_charging, security_cctv, hub_manager,
                    manager_phone, operating_hours, contact_person, designation
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            hub_records = [
                ("Koramangala Parking Hub", "Bangalore", "Block 4, Koramangala", "560034", "Open Parking", "45", "Yes", "Yes", "Manjunath Gowda", "9900088220", "24/7", "Manjunath Gowda", "Hub Manager"),
                ("Bandra East EV Hub", "Mumbai", "Near Bandra Terminus", "400051", "Charging Station", "20", "Yes", "Yes", "Vikram Sawant", "9820098200", "24/7", "Amit Shah", "Security Supervisor"),
                ("Hitech City Hub", "Hyderabad", "Madhapur Main Road", "500081", "Maintenance Hub", "30", "Yes", "No", "K Ramesh", "9848022338", "12 Hours", "K Ramesh", "Assistant Manager")
            ]
            for r in hub_records:
                cur.execute(hub_sql, r)
            print("[OK] Hubs and parking seeded")

        # ── Seed operator onboarding records ─────────────
        cur.execute("SELECT COUNT(*) FROM form_onboarding WHERE vendor_type = 'Operator';")
        if cur.fetchone()[0] == 0:
            op_sql = """
                INSERT INTO form_onboarding (
                    driver_name, phone_number, whatsapp_number, dob, city, operating_place,
                    present_address, permanent_address, emergency_name, emergency_phone,
                    pan_number, aadhaar_number, vendor_name, vendor_id, vendor_type,
                    father_name, custom_rent_amount, bank_name, account_number, ifsc_code, upi_id
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            op_records = [
                ("Hyderabad Fleet Services", "9876543210", "9876543210", "1970-01-01", "Hyderabad", "Jubilee Hub",
                 "Plot 45, HITEC City, Hyderabad - 500081", "Plot 45, HITEC City, Hyderabad - 500081",
                 "N/A", "0000000000", "AABCH5432E", "432156789012",
                 "Hyderabad Fleet Services", "VND-HYD-001", "Operator",
                 "N/A", "1200", "HDFC Bank", "50100123456789", "HDFC0001234", "hfs@hdfcbank"),
                ("Bangalore Cabs Network", "8765432190", "8765432190", "1970-01-01", "Bangalore", "Koramangala Hub",
                 "3rd Floor, Tech Park, Whitefield, Bangalore - 560066", "3rd Floor, Tech Park, Whitefield, Bangalore - 560066",
                 "N/A", "0000000000", "BNKCA1234C", "567890123456",
                 "Bangalore Cabs Network", "VND-BLR-001", "Operator",
                 "N/A", "1350", "ICICI Bank", "123456789012", "ICIC0001234", "bcn@icicibank"),
                ("Delhi Drive Fleet", "7654321098", "7654321098", "1970-01-01", "Delhi", "Connaught Place Hub",
                 "12 Barakhamba Road, New Delhi - 110001", "12 Barakhamba Road, New Delhi - 110001",
                 "N/A", "0000000000", "DDFLT3210B", "678901234567",
                 "Delhi Drive Fleet", "VND-DEL-001", "Operator",
                 "N/A", "1100", "State Bank of India", "36987412365", "SBIN0001234", "ddf@sbi"),
            ]
            for r in op_records:
                cur.execute(op_sql, r)
            print("[OK] Operator onboarding records seeded")

        # ── Seed rent plans ──────────────────────────────
        cur.execute("SELECT COUNT(*) FROM rents;")
        if cur.fetchone()[0] == 0:
            rent_sql = """
                INSERT INTO rents (level, vehicle_model, vehicle_number, vehicle_age, vendor_id, driver_id, rent_amount)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """
            rent_records = [
                # Model-level baseline rates
                ("model", "WagonR",  None, "0-2 Years", None, None, 900),
                ("model", "WagonR",  None, "3-5 Years", None, None, 800),
                ("model", "WagonR",  None, ">5 Years",  None, None, 700),
                ("model", "Swift",   None, "0-2 Years", None, None, 950),
                ("model", "Swift",   None, "3-5 Years", None, None, 850),
                ("model", "Ertiga",  None, "0-2 Years", None, None, 1200),
                ("model", "Innova",  None, "0-2 Years", None, None, 1500),
                ("model", "Alto",    None, "0-2 Years", None, None, 750),
                # Vehicle-level specific
                ("vehicle", "WagonR", "TS09 EA 1001", None, None, None, 870),
                ("vehicle", "Swift",  "KA01 AB 2002", None, None, None, 920),
                # Operator-level overrides
                ("operator", None, None, None, "VND-HYD-001", None, 1200),
                ("operator", None, None, None, "VND-BLR-001", None, 1350),
                ("operator", None, None, None, "VND-DEL-001", None, 1100),
                # Driver-level overrides
                ("driver", None, None, None, None, "DR-HYD-001", 1100),
                ("driver", None, None, None, None, "DR-HYD-002", 1150),
                ("driver", None, None, None, None, "DR-BLR-001", 1250),
            ]
            for r in rent_records:
                cur.execute(rent_sql, r)
            print("[OK] Rent plans seeded")

        # ── accidents_registry ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS accidents_registry (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                vendor_id VARCHAR(100),
                vendor_name VARCHAR(255),
                city_name VARCHAR(100),
                date_of_accident VARCHAR(50),
                time_of_accident VARCHAR(50),
                place_of_accident TEXT,
                vehicle_status VARCHAR(100),
                driver_id VARCHAR(100),
                driver_name VARCHAR(255),
                no_of_persons VARCHAR(50),
                third_party_involvement VARCHAR(50),
                fir_filed VARCHAR(50),
                accident_reason TEXT,
                accident_inspection TEXT,
                insurance_status VARCHAR(100),
                repair_cost VARCHAR(50),
                toeing_cost VARCHAR(50),
                challan_amount VARCHAR(50),
                fine_amount VARCHAR(50),
                comments TEXT,
                front_vehicle_photo TEXT,
                back_vehicle_photo TEXT,
                right_vehicle_photo TEXT,
                left_vehicle_photo TEXT,
                fir_document_copy TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Seed 5 records if empty
        cur.execute("SELECT COUNT(*) FROM accidents_registry;")
        if cur.fetchone()[0] == 0:
            acc_sql = """
                INSERT INTO accidents_registry (
                    vehicle_number, vendor_id, vendor_name, city_name, date_of_accident, time_of_accident, place_of_accident, vehicle_status,
                    driver_id, driver_name, no_of_persons, third_party_involvement, fir_filed,
                    accident_reason, accident_inspection, insurance_status, repair_cost, toeing_cost, challan_amount, fine_amount, comments
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            acc_records = [
                ("TS09 EA 1111", "VND-HYD-001", "Hyderabad Fleet Services", "Hyderabad", "2026-06-30", "14:30", "Koramangala, BLR", "Needs Towing", "DR-HYD-001", "Anil Kumble", "2", "No", "No", "Rear-ended by auto", "Rear bumper dented, boot door not locking", "Pending", "14500", "2000", "0", "0", "Awaiting survey"),
                ("MH02 IJ 1234", "VND-MUM-002", "IAC Transport", "Mumbai", "2026-06-29", "09:15", "Andheri West, MUM", "Drivable", "DR-MUM-001", "Sunil Gavaskar", "1", "No", "No", "Minor side scrape", "Left side mirror cracked", "N/A", "2000", "0", "0", "0", "No major damage"),
                ("DL02 IJ 7777", "VND-DEL-001", "Delhi Drive Fleet", "Delhi", "2026-06-28", "23:45", "Connaught Place, DEL", "Impounded by Police", "DR-DEL-001", "Kapil Dev", "3", "Yes", "Yes", "Hit pedestrian", "Front glass shattered, police impounded", "Claimed", "45000", "0", "5000", "10000", "FIR lodged. Driver released on bail."),
                ("TN07 EF 7777", "VND-CHN-001", "BLEND Logistics", "Chennai", "2026-06-25", "18:20", "T-Nagar, CHN", "Drivable", "DR-CHN-001", "Senthil Kumar", "1", "No", "No", "Minor scratch", "Right rear door paint scratch", "N/A", "500", "0", "0", "0", "Buffing will resolve"),
                ("TS09 EA 9999", "VND-HYD-001", "Hyderabad Fleet Services", "Hyderabad", "2026-06-20", "07:00", "Hitech City, HYD", "Needs Towing", "DR-HYD-002", "Vikram Reddy", "2", "No", "No", "Hit divider", "Right suspension damaged", "Pending", "12000", "1500", "0", "0", "Towed to workshop")
            ]
            for r in acc_records:
                cur.execute(acc_sql, r)
            print("[OK] Accident records seeded")

        # ── inspections ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS inspections (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                inspection_date VARCHAR(50),
                odometer_reading VARCHAR(50),
                jack VARCHAR(50),
                jack_rod VARCHAR(50),
                spanner VARCHAR(50),
                parking_triangle VARCHAR(50),
                fire_extinguishers VARCHAR(50),
                seat_cover VARCHAR(50),
                floor_carpet VARCHAR(50),
                photo_front TEXT,
                photo_back TEXT,
                photo_lh TEXT,
                photo_rh TEXT,
                photo_engine_chassis TEXT,
                photo_battery TEXT,
                photo_engine_compartment TEXT,
                photo_fast_tag TEXT,
                photo_music_system TEXT,
                key_quantity INTEGER,
                photo_tyre_rh_fr TEXT,
                photo_tyre_lh_fr TEXT,
                photo_tyre_rh_re TEXT,
                photo_tyre_lh_re TEXT,
                photo_tyre_spare TEXT,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Apply ALTER TABLE migrations for safety in existing tables
        new_cols = [
            "photo_lh", "photo_rh", "photo_engine_chassis", "photo_battery", 
            "photo_engine_compartment", "photo_fast_tag", "photo_music_system", 
            "key_quantity", "photo_tyre_rh_fr", "photo_tyre_lh_fr", 
            "photo_tyre_rh_re", "photo_tyre_lh_re", "photo_tyre_spare"
        ]
        for col in new_cols:
            try:
                cur.execute(f"ALTER TABLE inspections ADD COLUMN IF NOT EXISTS {col} TEXT;")
            except Exception as e:
                print(f"[Migration Warning] Failed to alter inspections column {col}: {e}")

        cur.execute("SELECT COUNT(*) FROM inspections;")
        if cur.fetchone()[0] == 0:
            insp_sql = """
                INSERT INTO inspections (
                    vehicle_number, inspection_date, odometer_reading, jack, jack_rod, spanner, 
                    parking_triangle, fire_extinguishers, seat_cover, floor_carpet, remarks
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """
            insp_records = [
                ("TS09 EA 1111", "2026-06-25", "12500", "Available", "Available", "Available", "Available", "Available", "Available", "Available", "All items present. Vehicle in good condition."),
                ("MH02 IJ 1234", "2026-06-26", "8400", "Available", "Available", "Not Available", "Available", "Available", "Available", "Available", "Spanner is missing. Advised to vendor."),
                ("DL02 IJ 7777", "2026-06-27", "18200", "Available", "Available", "Available", "Available", "Available", "Available", "Available", "Ready for dispatch. Handed over key."),
                ("TS09 EA 9999", "2026-06-20", "22400", "Available", "Available", "Available", "Available", "Available", "Available", "Available", "Initial onboarding inspection.")
            ]
            for r in insp_records:
                cur.execute(insp_sql, r)
            print("[OK] Inspections seeded")

        conn.commit()
        cur.close()
        print("[OK] Database setup complete")

    except Exception as e:
        print(f"[ERROR] Startup error: {e}")
        conn.rollback()
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)):
    """Validate Bearer token and return (app_user_id, executive_id, name, role, username, role_id, permissions)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT au.id, au.executive_id, u.name, COALESCE(ar.name, u.role, 'Executive'), au.username, au.role_id
            FROM app_sessions s
            JOIN app_users au ON au.id = s.user_id
            LEFT JOIN users u ON u.id = au.executive_id
            LEFT JOIN app_roles ar ON ar.id = au.role_id
            WHERE s.token = %s;
        """, (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        user_id, exec_id, name, role, username, role_id = row
        
        permissions = []
        if role_id:
            cur.execute("""
                SELECT p.name 
                FROM app_role_permissions arp
                JOIN app_permissions p ON p.id = arp.permission_id
                WHERE arp.role_id = %s;
            """, (role_id,))
            permissions = [r[0] for r in cur.fetchall()]

        return {
            "user_id": user_id, 
            "executive_id": exec_id, 
            "name": name, 
            "role": role, 
            "username": username,
            "role_id": role_id,
            "permissions": permissions
        }
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class WalkinData(BaseModel):
    visitor_type:    Optional[str] = None
    event_date:      Optional[str] = None
    city:            Union[str, int, None] = None
    operating_place: Optional[str] = None
    executive_id:    Union[str, int, None] = None
    person_name:     Optional[str] = None
    person_number:   Union[str, int, None] = None
    aadhaar_number:  Optional[str] = None
    dl_number:       Union[str, int, None] = None
    aadhaar_image:   Optional[Any] = None
    dl_image:        Optional[Any] = None
    visiting_reason: Optional[str] = None
    joined_status:   Optional[str] = None
    remarks:         Optional[str] = None

class OnboardingData(BaseModel):
    driver_name: str
    phone_number: str
    whatsapp_number: Optional[str] = None
    dob: str
    city: str
    operating_place: Optional[str] = None
    present_address: str
    permanent_address: str
    emergency_name: str
    emergency_phone: str
    dl_number: Optional[str] = None
    dl_expiry_date: Optional[str] = None
    lead_source: Optional[str] = None
    pan_number: str
    aadhaar_number: str
    pan_aadhaar_linked: Optional[str] = None
    selfie_photo: Optional[Any] = None
    dl_front: Optional[Any] = None
    dl_back: Optional[Any] = None
    pan_card_photo: Optional[Any] = None
    walkin_id: Optional[int] = None
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    aadhaar_card_photo: Optional[Any] = None
    father_name: str
    bank_name: Optional[str] = None
    other_bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    vendor_type: Optional[str] = "Individual"
    driver_id: Optional[str] = None
    custom_rent_amount: Optional[str] = None
    operator_drivers: Optional[list[dict]] = None

class AdjustmentData(BaseModel):
    partner_name: Optional[str] = None
    partner_code: Optional[str] = None
    driver_id: Optional[str] = None
    partner_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    city_name: Optional[str] = None
    partner_type: Optional[str] = None
    adjustment_level: Optional[str] = None
    adjustment_nature: Optional[str] = None
    time_duration: Optional[str] = None
    adjustment_type: str
    adjustment_date: str
    enter_amount: str
    remittance_towards: Optional[str] = None
    adjustment_related_to: Optional[str] = None
    remarks: Optional[str] = None
    first_level_approval_by: Optional[str] = None
    finance_team_status: str
    finance_team_remarks: Optional[str] = None
    final_level_approval_by: Optional[str] = None
    status: str
    photo: Optional[Any] = None

class AllocationData(BaseModel):
    allocation_date: str
    allocation_type: str
    city_name: str
    driver_id: str
    driver_name: str
    driver_phone: str
    driver_plan: Optional[str] = None
    type_of_plan: Optional[str] = None
    car_model: Optional[str] = None
    vehicle_number: str
    old_vehicle_number: Optional[str] = None
    dropoff_odometer: Optional[str] = None
    dropoff_remarks: Optional[str] = None
    dropoff_photo: Optional[Any] = None


class ExpenseData(BaseModel):
    expense_date: str
    driver_name: str
    phone_number: str
    vehicle_number: str
    expenses_type: str
    amount_paid: str
    reference_photo: Optional[Any] = None


class VehicleOnboardingData(BaseModel):
    vehicle_number: str
    letzryd_unique_no: Optional[str] = None
    city_name: str
    model: str
    received_allocated: str
    delivery_month: Optional[str] = None
    registration_date: str
    rto_tax_validity: Optional[str] = None
    permit_validity: Optional[str] = None
    fitness_validity: str
    pollution_validity: Optional[str] = None
    insurance_validity: str
    authorization_certificate: Optional[str] = None
    insurance_mapping: Optional[str] = None
    kms_reading: str
    tracking_device_vendor: Optional[str] = None
    tracking_device_type: Optional[str] = None
    cng_installed: str
    cng_plate: Optional[str] = None
    cng_installation_date: Optional[str] = None
    jack: Optional[str] = None
    jack_rod: Optional[str] = None
    spanner: Optional[str] = None
    parking_triangle: Optional[str] = None
    fire_extinguishers: Optional[str] = None
    seat_cover: Optional[str] = None
    floor_carpet: Optional[str] = None
    image_front: Optional[Any] = None
    image_lh: Optional[Any] = None
    image_back: Optional[Any] = None
    image_rh: Optional[Any] = None
    engine_chasis_no_img: Optional[Any] = None
    battery_sl_no_img: Optional[Any] = None
    engine_compartment_img: Optional[Any] = None
    fast_tag_img: Optional[Any] = None
    music_system_img: Optional[Any] = None
    key_quantity: Optional[int] = None
    rh_fr_tyre_img: Optional[Any] = None
    lh_fr_tyre_img: Optional[Any] = None
    rh_rear_tyre_img: Optional[Any] = None
    lh_rear_tyre_img: Optional[Any] = None
    spare_wheel_img: Optional[Any] = None


class WorkshopData(BaseModel):
    vendor_name: str
    workshop_type: str
    city_name: str
    address: str
    gst_number: str
    contact_person: str
    mobile_number: str
    email_id: str
    pan_card: str
    bank_name: str
    account_number: str
    ifsc_code: str
    workshop_status: str
    workshop_photo: Optional[Any] = None
    contact_person_2: Optional[str] = None
    alternate_mobile: Optional[str] = None
    telephone: Optional[str] = None
    owner_name: Optional[str] = None
    upi_id: Optional[str] = None


class HubData(BaseModel):
    hub_name: str
    city_name: str
    address: str
    pincode: str
    facility_type: str
    total_capacity: str
    ev_charging: Optional[str] = None
    security_cctv: Optional[str] = None
    hub_manager: Optional[str] = None
    manager_phone: Optional[str] = None
    operating_hours: Optional[str] = None
    hub_photo: Optional[Any] = None
    contact_person: Optional[str] = None
    designation: Optional[str] = None

class RentData(BaseModel):
    level: str = "model"  # model | vehicle | driver | operator
    vehicle_manufacturer: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_age: Optional[str] = None
    vendor_id: Optional[str] = None
    driver_id: Optional[str] = None
    rent_amount: int

class AccidentData(BaseModel):
    vehicle_number: str
    vendor_id: Optional[str] = None
    vendor_name: str
    city_name: str
    date_of_accident: str
    time_of_accident: str
    place_of_accident: str
    vehicle_status: str
    driver_id: str
    driver_name: str
    no_of_persons: str
    third_party_involvement: str
    fir_filed: str
    accident_reason: str
    accident_inspection: str
    insurance_status: str
    repair_cost: Optional[str] = None
    toeing_cost: Optional[str] = None
    challan_amount: Optional[str] = None
    fine_amount: Optional[str] = None
    comments: Optional[str] = None
    front_vehicle_photo: Optional[Any] = None
    back_vehicle_photo: Optional[Any] = None
    right_vehicle_photo: Optional[Any] = None
    left_vehicle_photo: Optional[Any] = None
    fir_document_copy: Optional[Any] = None

class InspectionData(BaseModel):
    vehicle_number: str
    inspection_date: str
    odometer_reading: str
    jack: str
    jack_rod: str
    spanner: str
    parking_triangle: str
    fire_extinguishers: str
    seat_cover: str
    floor_carpet: str
    photo_front: Optional[Any] = None
    photo_back: Optional[Any] = None
    photo_lh: Optional[Any] = None
    photo_rh: Optional[Any] = None
    photo_engine_chassis: Optional[Any] = None
    photo_battery: Optional[Any] = None
    photo_engine_compartment: Optional[Any] = None
    photo_fast_tag: Optional[Any] = None
    photo_music_system: Optional[Any] = None
    key_quantity: Optional[int] = None
    photo_tyre_rh_fr: Optional[Any] = None
    photo_tyre_lh_fr: Optional[Any] = None
    photo_tyre_rh_re: Optional[Any] = None
    photo_tyre_lh_re: Optional[Any] = None
    photo_tyre_spare: Optional[Any] = None
    remarks: Optional[str] = None








def extract_image(val: Any) -> Optional[str]:
    """Pull base64 content from SurveyJS file-question format."""
    if val is None:
        return None
    if isinstance(val, list) and len(val) > 0:
        first = val[0]
        return first.get("content") if isinstance(first, dict) else str(first)
    if isinstance(val, str) and val.startswith("data:"):
        return val
    return None


# ─────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT au.id, au.password_hash, au.executive_id, u.name, COALESCE(ar.name, u.role, 'Executive'), au.username, au.role_id
            FROM app_users au
            LEFT JOIN users u ON u.id = au.executive_id
            LEFT JOIN app_roles ar ON ar.id = au.role_id
            WHERE au.username = %s;
        """, (req.username.strip().lower(),))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        user_id, pw_hash, exec_id, name, role, username, role_id = row
        if not pwd_context.verify(req.password, pw_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Create session token
        token = secrets.token_urlsafe(32)
        cur.execute(
            "INSERT INTO app_sessions (token, user_id) VALUES (%s, %s);",
            (token, user_id)
        )
        
        permissions = []
        if role_id:
            cur.execute("""
                SELECT p.name 
                FROM app_role_permissions arp
                JOIN app_permissions p ON p.id = arp.permission_id
                WHERE arp.role_id = %s;
            """, (role_id,))
            permissions = [r[0] for r in cur.fetchall()]
            
        conn.commit()
        return {
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "executive_id": exec_id,
                "name": name,
                "role": role,
                "role_id": role_id,
                "permissions": permissions
            }
        }
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    # Get executive id from users table for display
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s;", (user["executive_id"],))
        row = cur.fetchone()
        exec_display_id = row[0] if row else None
        return {
            "user_id": user["user_id"],
            "username": user["username"],
            "executive_id": exec_display_id,
            "name": user["name"],
            "role": user["role"],
            "role_id": user["role_id"],
            "permissions": user["permissions"]
        }
    finally:
        postgreSQL_pool.putconn(conn)


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        conn = postgreSQL_pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM app_sessions WHERE token = %s;", (token,))
            conn.commit()
        finally:
            postgreSQL_pool.putconn(conn)
    return {"success": True}


class AppUserData(BaseModel):
    name: str
    role: str
    username: str
    password: str
    role_id: Optional[int] = None

class AppUserUpdateData(BaseModel):
    name: str
    role: str
    username: str
    password: Optional[str] = None
    role_id: Optional[int] = None

@app.get("/api/users")
def list_app_users(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT au.id, au.username, u.name, u.role, au.created_at, au.raw_password, au.role_id, ar.name
            FROM app_users au
            JOIN users u ON u.id = au.executive_id
            LEFT JOIN app_roles ar ON ar.id = au.role_id
            ORDER BY au.id DESC;
        """)
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "username": r[1],
                "name": r[2],
                "role": r[3],
                "created_at": r[4].isoformat() if r[4] else None,
                "raw_password": r[5] or "letzryd123",
                "role_id": r[6],
                "role_name": r[7]
            })
        return result
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/users")
def create_app_user(req: AppUserData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    username_cleaned = req.username.strip().lower()
    if not req.password:
         raise HTTPException(status_code=400, detail="Password is required")
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM app_users WHERE username = %s;", (username_cleaned,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
        
        cur.execute(
            "INSERT INTO users (name, role) VALUES (%s, %s) RETURNING id;",
            (req.name.strip(), req.role.strip())
        )
        executive_id = cur.fetchone()[0]
        
        hashed_password = pwd_context.hash(req.password)
        cur.execute(
            "INSERT INTO app_users (username, password_hash, executive_id, raw_password, role_id) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
            (username_cleaned, hashed_password, executive_id, req.password, req.role_id)
        )
        user_id = cur.fetchone()[0]
        
        conn.commit()
        return {"success": True, "user_id": user_id, "executive_id": executive_id}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/users/{id}")
def update_app_user(id: int, req: AppUserUpdateData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    username_cleaned = req.username.strip().lower()
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT executive_id FROM app_users WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        exec_id = row[0]
        
        # Check username conflicts
        cur.execute("SELECT id FROM app_users WHERE username = %s AND id != %s;", (username_cleaned, id))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
            
        # Update users table (name, role)
        cur.execute(
            "UPDATE users SET name = %s, role = %s WHERE id = %s;",
            (req.name.strip(), req.role.strip(), exec_id)
        )
        
        # Update app_users table (username, role_id)
        if req.password:
            hashed_password = pwd_context.hash(req.password)
            cur.execute(
                "UPDATE app_users SET username = %s, password_hash = %s, raw_password = %s, role_id = %s WHERE id = %s;",
                (username_cleaned, hashed_password, req.password, req.role_id, id)
            )
        else:
            cur.execute(
                "UPDATE app_users SET username = %s, role_id = %s WHERE id = %s;",
                (username_cleaned, req.role_id, id)
            )
            
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/users/{id}")
def delete_app_user(id: int, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user["user_id"] == id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT executive_id FROM app_users WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        exec_id = row[0]
        
        cur.execute("DELETE FROM app_sessions WHERE user_id = %s;", (id,))
        cur.execute("DELETE FROM app_users WHERE id = %s;", (id,))
        
        try:
            cur.execute("DELETE FROM users WHERE id = %s;", (exec_id,))
        except Exception:
            conn.rollback()
            cur = conn.cursor()
            cur.execute("DELETE FROM app_sessions WHERE user_id = %s;", (id,))
            cur.execute("DELETE FROM app_users WHERE id = %s;", (id,))
            
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


class VehicleModelData(BaseModel):
    brand: str
    model_name: str
    variant: str
    fuel_type: str
    make_year: int

@app.get("/api/vehicle-models")
def list_vehicle_models(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, brand, model_name, variant, fuel_type, make_year, created_at
            FROM vehicle_models
            ORDER BY brand, model_name, variant, make_year DESC;
        """)
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "brand": r[1],
                "model_name": r[2],
                "variant": r[3],
                "fuel_type": r[4],
                "make_year": r[5],
                "created_at": r[6].isoformat() if r[6] else None
            })
        return result
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/vehicle-models")
def create_vehicle_model(req: VehicleModelData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO vehicle_models (brand, model_name, variant, fuel_type, make_year) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
            (req.brand.strip(), req.model_name.strip(), req.variant.strip(), req.fuel_type.strip(), req.make_year)
        )
        model_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": model_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/vehicle-models/{id}")
def delete_vehicle_model(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM vehicle_models WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Vehicle model not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Executives
# ─────────────────────────────────────────────────────────
@app.get("/api/executives")
def get_all_executives():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, COALESCE(role,'Executive') FROM users ORDER BY id;")
        rows = cur.fetchall()
        return [{"value": r[0], "text": f"{r[1]}  (ID {r[0]})"} for r in rows]
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/executives/{user_id}")
def get_executive(user_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT name, COALESCE(role,'Executive') FROM users WHERE id=%s;", (user_id,))
        r = cur.fetchone()
        if r:
            return {"id": user_id, "name": r[0], "role": r[1]}
        raise HTTPException(status_code=404, detail="Executive not found")
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
class CityData(BaseModel):
    name: str

@app.get("/api/cities")
def get_all_cities():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM cities ORDER BY id;")
        return [{"value": r[1], "text": r[1], "id": r[0]} for r in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/cities")
def create_city(req: CityData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    name_cleaned = req.name.strip()
    if not name_cleaned:
        raise HTTPException(status_code=400, detail="City name is required")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM cities WHERE name = %s;", (name_cleaned,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="City already exists")
            
        cur.execute("INSERT INTO cities (name) VALUES (%s) RETURNING id;", (name_cleaned,))
        city_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": city_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/cities/{id}")
def delete_city(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM cities WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="City not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM walkins;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE joined_status='Joined';")
        joined = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE joined_status='Pending';")
        pending = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE joined_status='Not Interested';")
        not_interested = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE visitor_type='Individual';")
        individuals = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE visitor_type='Operator';")
        operators = cur.fetchone()[0]
        conversion = round(joined / total * 100, 1) if total > 0 else 0.0
        return {
            "total": total,
            "joined": joined,
            "pending": pending,
            "not_interested": not_interested,
            "individuals": individuals,
            "operators": operators,
            "conversion_rate": conversion,
        }
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — List
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins")
def get_all_walkins(
    search: Optional[str] = None,
    city: Optional[str] = "all",
    visitor_type: Optional[str] = "all",
    status: Optional[str] = "all",
    limit: Optional[int] = 10
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        base_query = """
            SELECT
                w.id,
                w.visitor_type,
                w.event_date,
                COALESCE(c.name, w.city)   AS city_name,
                w.executive_id,
                COALESCE(u.name, '—')      AS executive_name,
                w.person_name,
                w.person_number,
                w.aadhaar_number,
                w.dl_number,
                w.visiting_reason,
                w.joined_status,
                w.remarks,
                w.created_at
            FROM walkins w
            LEFT JOIN cities c ON c.id::text = w.city::text
            LEFT JOIN users  u ON u.id = w.executive_id
            WHERE 1=1
        """
        
        params = []
        
        if search:
            base_query += """
                AND (
                    w.person_name ILIKE %s
                    OR w.person_number ILIKE %s
                    OR w.dl_number ILIKE %s
                    OR w.aadhaar_number ILIKE %s
                    OR w.id::text ILIKE %s
                )
            """
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 5)
            # When searching, we want more results
            limit = max(limit, 50)
            
        if city and city != "all":
            base_query += " AND COALESCE(c.name, w.city) = %s"
            params.append(city)
            
        if visitor_type and visitor_type != "all":
            base_query += " AND w.visitor_type = %s"
            params.append(visitor_type)
            
        if status and status != "all":
            base_query += " AND w.joined_status = %s"
            params.append(status)
            
        base_query += " ORDER BY w.id DESC LIMIT %s;"
        params.append(limit)
        
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        result = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            if d.get("created_at"):
                d["created_at"] = str(d["created_at"])
            result.append(d)
        return result
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Search for Linking
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins/search")
def search_walkins(q: str):
    """Search for walk-ins by ID, phone, or DL to prepopulate Onboarding."""
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        search_pattern = f"%{q}%"
        cur.execute("""
            SELECT id, person_name, person_number, city, dl_number, aadhaar_number
            FROM walkins
            WHERE id::text = %s OR person_number ILIKE %s OR dl_number ILIKE %s
            ORDER BY id DESC LIMIT 5;
        """, (q, search_pattern, search_pattern))
        
        cols = [d[0] for d in cur.description]
        result = [dict(zip(cols, row)) for row in cur.fetchall()]
        return result
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Single
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins/{walkin_id}")
def get_walkin(walkin_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                w.visitor_type, w.event_date, w.city, w.operating_place, w.executive_id,
                w.person_name, w.person_number, w.aadhaar_number, w.dl_number,
                w.visiting_reason, w.joined_status, w.remarks,
                COALESCE(u.name, '') AS executive_name
            FROM walkins w
            LEFT JOIN users u ON u.id = w.executive_id
            WHERE w.id = %s;
        """, (walkin_id,))
        r = cur.fetchone()
        if r:
            return {
                "visitor_type": r[0], "event_date": r[1], "city": r[2], "operating_place": r[3],
                "executive_id": r[4], "person_name": r[5], "person_number": r[6],
                "aadhaar_number": r[7], "dl_number": r[8],
                "visiting_reason": r[9], "joined_status": r[10], "remarks": r[11],
                "executive_name": r[12],
            }
        raise HTTPException(status_code=404, detail="Walkin not found")
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Create
# ─────────────────────────────────────────────────────────
@app.post("/api/walkins")
def create_walkin(data: WalkinData, authorization: Optional[str] = Header(None)):
    # Get executive_id from session if available
    exec_id_from_session = None
    if authorization and authorization.startswith("Bearer "):
        try:
            user = get_current_user(authorization)
            exec_id_from_session = user.get("executive_id")
        except Exception:
            pass

    final_exec_id = exec_id_from_session or (int(data.executive_id) if data.executive_id else None)

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO walkins
              (visitor_type, event_date, city, operating_place, executive_id, person_name,
               person_number, aadhaar_number, dl_number, aadhaar_image,
               dl_image, visiting_reason, joined_status, remarks)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.visitor_type,
            data.event_date,
            str(data.city) if data.city is not None else None,
            data.operating_place,
            final_exec_id,
            data.person_name,
            str(data.person_number) if data.person_number else None,
            data.aadhaar_number,
            str(data.dl_number) if data.dl_number else None,
            extract_image(data.aadhaar_image),
            extract_image(data.dl_image),
            data.visiting_reason,
            data.joined_status,
            data.remarks,
        ))
        walkin_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "walkin_id": walkin_id}
    finally:
        postgreSQL_pool.putconn(conn)





# ─────────────────────────────────────────────────────────
# Walk-ins — Update
# ─────────────────────────────────────────────────────────
@app.put("/api/walkins/{walkin_id}")
def update_walkin(walkin_id: int, data: WalkinData, authorization: Optional[str] = Header(None)):
    exec_id_from_session = None
    if authorization and authorization.startswith("Bearer "):
        try:
            user = get_current_user(authorization)
            exec_id_from_session = user.get("executive_id")
        except Exception:
            pass

    final_exec_id = exec_id_from_session or (int(data.executive_id) if data.executive_id else None)

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        # Update images only when new ones are provided
        new_aadhaar = extract_image(data.aadhaar_image)
        new_dl      = extract_image(data.dl_image)
        if new_aadhaar:
            cur.execute("UPDATE walkins SET aadhaar_image=%s WHERE id=%s;", (new_aadhaar, walkin_id))
        if new_dl:
            cur.execute("UPDATE walkins SET dl_image=%s WHERE id=%s;", (new_dl, walkin_id))

        cur.execute("""
            UPDATE walkins SET
                visitor_type=%s, event_date=%s, city=%s, operating_place=%s, executive_id=%s,
                person_name=%s, person_number=%s, aadhaar_number=%s, dl_number=%s,
                visiting_reason=%s, joined_status=%s, remarks=%s
            WHERE id=%s;
        """, (
            data.visitor_type,
            data.event_date,
            str(data.city) if data.city is not None else None,
            data.operating_place,
            final_exec_id,
            data.person_name,
            str(data.person_number) if data.person_number else None,
            data.aadhaar_number,
            str(data.dl_number) if data.dl_number else None,
            data.visiting_reason,
            data.joined_status,
            data.remarks,
            walkin_id,
        ))
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Delete
# ─────────────────────────────────────────────────────────
@app.delete("/api/walkins/{walkin_id}")
def delete_walkin(walkin_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM walkins WHERE id = %s RETURNING id;", (walkin_id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Walkin not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Onboarding API
# ─────────────────────────────────────────────────────────
@app.get("/api/onboarding")
def get_all_onboarding(search: Optional[str] = None, city: Optional[str] = None, limit: Optional[int] = 10):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM form_onboarding WHERE 1=1"
        params = []
        if search:
            base_query += """
                AND (
                    driver_name ILIKE %s OR phone_number ILIKE %s 
                    OR dl_number ILIKE %s OR aadhaar_number ILIKE %s
                )
            """
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 4)
            limit = max(limit, 50)
            
        if city and city != "all":
            base_query += " AND city = %s"
            params.append(city)
            
        base_query += " ORDER BY id DESC LIMIT %s;"
        params.append(limit)
        
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/onboarding")
def create_onboarding(data: OnboardingData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO form_onboarding (
                driver_name, phone_number, whatsapp_number, dob, city, operating_place,
                present_address, permanent_address, emergency_name, emergency_phone, 
                dl_number, dl_expiry_date, lead_source, 
                pan_number, aadhaar_number, pan_aadhaar_linked, 
                selfie_photo, dl_front, dl_back, pan_card_photo,
                vendor_name, vendor_id, aadhaar_card_photo,
                father_name, bank_name, other_bank_name,
                account_number, ifsc_code, upi_id,
                vendor_type, driver_id, custom_rent_amount
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.driver_name, data.phone_number, data.whatsapp_number, data.dob, data.city, data.operating_place,
            data.present_address, data.permanent_address, data.emergency_name, data.emergency_phone,
            data.dl_number, data.dl_expiry_date, data.lead_source,
            data.pan_number, data.aadhaar_number, data.pan_aadhaar_linked,
            extract_image(data.selfie_photo), extract_image(data.dl_front), 
            extract_image(data.dl_back), extract_image(data.pan_card_photo),
            data.vendor_name, data.vendor_id, extract_image(data.aadhaar_card_photo),
            data.father_name, data.bank_name, data.other_bank_name,
            data.account_number, data.ifsc_code, data.upi_id,
            data.vendor_type, data.driver_id, data.custom_rent_amount
        ))
        new_id = cur.fetchone()[0]
        
        # Link to walk-in if provided
        if data.walkin_id:
            cur.execute("""
                INSERT INTO walkin_form_links (walkin_id, onboarding_id)
                VALUES (%s, %s);
            """, (data.walkin_id, new_id))
            
            cur.execute("""
                UPDATE walkins SET joined_status = 'Onboarded' WHERE id = %s;
            """, (data.walkin_id,))

        # Add operator drivers if present
        if data.vendor_type == "Operator" and data.operator_drivers:
            for drv in data.operator_drivers:
                cur.execute("""
                    INSERT INTO form_onboarding (
                        driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                        vendor_name, vendor_id, vendor_type,
                        whatsapp_number, dob, city, present_address, permanent_address, 
                        emergency_name, emergency_phone, pan_number, aadhaar_number, father_name
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    drv.get('driver_name', ''), drv.get('phone_number', ''), drv.get('dl_number', ''), 
                    drv.get('custom_rent_amount', ''), drv.get('driver_id', ''),
                    data.vendor_name, data.vendor_id, "Operator",
                    data.whatsapp_number, data.dob, data.city, data.present_address, data.permanent_address,
                    data.emergency_name, data.emergency_phone, data.pan_number, data.aadhaar_number, data.father_name
                ))

        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/onboarding/{id}")
def get_onboarding(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                driver_name, phone_number, whatsapp_number, dob, city, operating_place,
                present_address, permanent_address, emergency_name, emergency_phone,
                dl_number, dl_expiry_date, lead_source,
                pan_number, aadhaar_number, pan_aadhaar_linked,
                vendor_name, vendor_id, aadhaar_card_photo,
                father_name, bank_name, other_bank_name,
                account_number, ifsc_code, upi_id,
                selfie_photo, dl_front, dl_back, pan_card_photo,
                vendor_type, driver_id, custom_rent_amount
            FROM form_onboarding
            WHERE id = %s;
        """, (id,))
        r = cur.fetchone()
        if r:
            res = {
                "id": id, "driver_name": r[0], "phone_number": r[1],
                "whatsapp_number": r[2], "dob": r[3], "city": r[4], "operating_place": r[5],
                "present_address": r[6], "permanent_address": r[7],
                "emergency_name": r[8], "emergency_phone": r[9],
                "dl_number": r[10], "dl_expiry_date": r[11],
                "lead_source": r[12], "pan_number": r[13],
                "aadhaar_number": r[14], "pan_aadhaar_linked": r[15],
                "vendor_name": r[16], "vendor_id": r[17],
                "aadhaar_card_photo": r[18],
                "father_name": r[19], "bank_name": r[20], "other_bank_name": r[21],
                "account_number": r[22], "ifsc_code": r[23], "upi_id": r[24],
                "selfie_photo": r[25], "dl_front": r[26], "dl_back": r[27], "pan_card_photo": r[28],
                "vendor_type": r[29], "driver_id": r[30], "custom_rent_amount": r[31]
            }
            if r[29] == "Operator" and r[17]:
                cur.execute("""
                    SELECT 
                        driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                        whatsapp_number, dob, present_address, permanent_address, 
                        emergency_name, emergency_phone, pan_number, aadhaar_number, father_name,
                        selfie_photo, dl_front, dl_back, pan_card_photo, aadhaar_card_photo
                    FROM form_onboarding
                    WHERE vendor_id = %s AND vendor_type = 'Operator' AND driver_id IS NOT NULL;
                """, (r[17],))
                drivers_rows = cur.fetchall()
                res["operator_drivers"] = [
                    {
                        "driver_name": d[0], "phone_number": d[1], "dl_number": d[2], "custom_rent_amount": d[3], "driver_id": d[4],
                        "whatsapp_number": d[5], "dob": d[6], "present_address": d[7], "permanent_address": d[8],
                        "emergency_name": d[9], "emergency_phone": d[10], "pan_number": d[11], "aadhaar_number": d[12], "father_name": d[13],
                        "selfie_photo": d[14], "dl_front": d[15], "dl_back": d[16], "pan_card_photo": d[17], "aadhaar_card_photo": d[18]
                    } for d in drivers_rows
                ]
            else:
                res["operator_drivers"] = []
            return res
        raise HTTPException(status_code=404, detail="Onboarding record not found")
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/onboarding/{id}")
def update_onboarding(id: int, data: OnboardingData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM form_onboarding WHERE id = %s;", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Onboarding record not found")
            
        cur.execute("""
            UPDATE form_onboarding SET
                driver_name=%s, phone_number=%s, whatsapp_number=%s, dob=%s, city=%s, operating_place=%s,
                present_address=%s, permanent_address=%s, emergency_name=%s, emergency_phone=%s, 
                dl_number=%s, dl_expiry_date=%s, lead_source=%s, 
                pan_number=%s, aadhaar_number=%s, pan_aadhaar_linked=%s,
                vendor_name=%s, vendor_id=%s,
                father_name=%s, bank_name=%s, other_bank_name=%s,
                account_number=%s, ifsc_code=%s, upi_id=%s
            WHERE id=%s;
        """, (
            data.driver_name, data.phone_number, data.whatsapp_number, data.dob, data.city, data.operating_place,
            data.present_address, data.permanent_address, data.emergency_name, data.emergency_phone,
            data.dl_number, data.dl_expiry_date, data.lead_source,
            data.pan_number, data.aadhaar_number, data.pan_aadhaar_linked,
            data.vendor_name, data.vendor_id,
            data.father_name, data.bank_name, data.other_bank_name,
            data.account_number, data.ifsc_code, data.upi_id,
            id
        ))
        
        # Update images conditionally
        new_selfie = extract_image(data.selfie_photo)
        new_dl_front = extract_image(data.dl_front)
        new_dl_back = extract_image(data.dl_back)
        new_pan = extract_image(data.pan_card_photo)
        new_aadhaar_img = extract_image(data.aadhaar_card_photo)
        
        if new_selfie:
            cur.execute("UPDATE form_onboarding SET selfie_photo=%s WHERE id=%s;", (new_selfie, id))
        if new_dl_front:
            cur.execute("UPDATE form_onboarding SET dl_front=%s WHERE id=%s;", (new_dl_front, id))
        if new_dl_back:
            cur.execute("UPDATE form_onboarding SET dl_back=%s WHERE id=%s;", (new_dl_back, id))
        if new_pan:
            cur.execute("UPDATE form_onboarding SET pan_card_photo=%s WHERE id=%s;", (new_pan, id))
        if new_aadhaar_img:
            cur.execute("UPDATE form_onboarding SET aadhaar_card_photo=%s WHERE id=%s;", (new_aadhaar_img, id))
            
        if data.walkin_id:
            cur.execute("DELETE FROM walkin_form_links WHERE onboarding_id = %s;", (id,))
            cur.execute("INSERT INTO walkin_form_links (walkin_id, onboarding_id) VALUES (%s, %s);", (data.walkin_id, id))
            cur.execute("UPDATE walkins SET joined_status = 'Onboarded' WHERE id = %s;", (data.walkin_id,))
            
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/stats/onboarding")
def get_onboarding_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM form_onboarding;")
        total_onboarded = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(DISTINCT vendor_id) FROM form_onboarding WHERE vendor_id IS NOT NULL AND vendor_id <> '';")
        vendor_count = cur.fetchone()[0]
        
        cur.execute("SELECT MAX(created_at) FROM form_onboarding;")
        latest_time = cur.fetchone()[0]
        if latest_time:
            latest_str = latest_time.strftime("%d-%m-%Y")
        else:
            latest_str = "-"
            
        cur.execute("SELECT COUNT(*) FROM form_onboarding WHERE created_at >= NOW() - INTERVAL '7 days';")
        last_7_days_count = cur.fetchone()[0]
            
        return {
            "total_onboarded": total_onboarded,
            "vendor_count": vendor_count,
            "latest_onboarding": latest_str,
            "last_7_days_count": last_7_days_count
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/onboarding/{id}")
def delete_onboarding(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM form_onboarding WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Partner Adjustment Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/adjustment")
def get_adjustments(
    query: Optional[str] = None,
    city: Optional[str] = None,
    adj_type: Optional[str] = None,
    status: Optional[str] = None
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM partner_adjustment WHERE 1=1"
        params = []
        
        if query:
            base_query += """ AND (
                LOWER(partner_name) LIKE %s OR 
                LOWER(partner_code) LIKE %s OR 
                LOWER(driver_id) LIKE %s OR 
                partner_number LIKE %s OR 
                LOWER(vehicle_number) LIKE %s
            )"""
            q = f"%{query.lower()}%"
            params.extend([q, q, q, q, q])
            
        if city and city != "all":
            base_query += " AND city_name = %s"
            params.append(city)
            
        if adj_type and adj_type != "all":
            base_query += " AND adjustment_type = %s"
            params.append(adj_type)
            
        if status and status != "all":
            base_query += " AND status = %s"
            params.append(status)
            
        base_query += " ORDER BY id DESC"
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/adjustment/stats")
def get_adjustment_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # Total count
        cur.execute("SELECT COUNT(*) FROM partner_adjustment;")
        total = cur.fetchone()[0]
        
        # Total Amount (sum of casted float)
        cur.execute("""
            SELECT COALESCE(SUM(CASE 
                WHEN enter_amount ~ '^[0-9]+(\\.[0-9]+)?$' THEN CAST(enter_amount AS DOUBLE PRECISION)
                ELSE 0 
            END), 0) FROM partner_adjustment;
        """)
        total_amount = cur.fetchone()[0]
        
        # Approved count
        cur.execute("SELECT COUNT(*) FROM partner_adjustment WHERE finance_team_status = 'Approved';")
        approved = cur.fetchone()[0]
        
        # Completed count
        cur.execute("SELECT COUNT(*) FROM partner_adjustment WHERE status = 'Completed';")
        completed = cur.fetchone()[0]
        
        return {
            "total_adjustments": total,
            "total_amount": round(total_amount, 2),
            "approved_count": approved,
            "completed_count": completed
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/adjustment/{id}")
def get_adjustment(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM partner_adjustment WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Adjustment record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, r))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/adjustment")
def create_adjustment(data: AdjustmentData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO partner_adjustment (
                partner_name, partner_code, driver_id, partner_number, vehicle_number, city_name, 
                partner_type, adjustment_level, adjustment_nature, time_duration, adjustment_type, adjustment_date, enter_amount, 
                remittance_towards, adjustment_related_to, remarks, first_level_approval_by, 
                finance_team_status, finance_team_remarks, final_level_approval_by, status, photo
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.partner_name, data.partner_code, data.driver_id, data.partner_number, data.vehicle_number, data.city_name,
            data.partner_type, data.adjustment_level, data.adjustment_nature, data.time_duration, data.adjustment_type, data.adjustment_date, data.enter_amount,
            data.remittance_towards, data.adjustment_related_to, data.remarks, data.first_level_approval_by,
            data.finance_team_status, data.finance_team_remarks, data.final_level_approval_by, data.status,
            extract_image(data.photo)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/adjustment/{id}")
def update_adjustment(id: int, data: AdjustmentData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE partner_adjustment SET
                partner_name=%s, partner_code=%s, driver_id=%s, partner_number=%s, vehicle_number=%s, city_name=%s, 
                partner_type=%s, adjustment_level=%s, adjustment_nature=%s, time_duration=%s, adjustment_type=%s, adjustment_date=%s, enter_amount=%s, 
                remittance_towards=%s, adjustment_related_to=%s, remarks=%s, first_level_approval_by=%s, 
                finance_team_status=%s, finance_team_remarks=%s, final_level_approval_by=%s, status=%s, photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.partner_name, data.partner_code, data.driver_id, data.partner_number, data.vehicle_number, data.city_name,
            data.partner_type, data.adjustment_level, data.adjustment_nature, data.time_duration, data.adjustment_type, data.adjustment_date, data.enter_amount,
            data.remittance_towards, data.adjustment_related_to, data.remarks, data.first_level_approval_by,
            data.finance_team_status, data.finance_team_remarks, data.final_level_approval_by, data.status,
            extract_image(data.photo),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Adjustment record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/adjustment/{id}")
def delete_adjustment(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM partner_adjustment WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Adjustment record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Vehicle Allocation Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/allocation")
def get_allocations(
    query: Optional[str] = None,
    city: Optional[str] = None,
    alloc_type: Optional[str] = None
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM vehicle_allocation WHERE 1=1"
        params = []
        
        if query:
            base_query += """ AND (
                LOWER(driver_name) LIKE %s OR 
                LOWER(driver_id) LIKE %s OR 
                driver_phone LIKE %s OR 
                LOWER(vehicle_number) LIKE %s OR 
                LOWER(old_vehicle_number) LIKE %s
            )"""
            q = f"%{query.lower()}%"
            params.extend([q, q, q, q, q])
            
        if city and city != "all":
            base_query += " AND city_name = %s"
            params.append(city)
            
        if alloc_type and alloc_type != "all":
            base_query += " AND allocation_type = %s"
            params.append(alloc_type)
            
        base_query += " ORDER BY id DESC"
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/allocation/stats")
def get_allocation_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # Total
        cur.execute("SELECT COUNT(*) FROM vehicle_allocation;")
        total = cur.fetchone()[0]
        
        # New Allocation
        cur.execute("SELECT COUNT(*) FROM vehicle_allocation WHERE allocation_type = 'New Allocation';")
        new_alloc = cur.fetchone()[0]
        
        # Car Swap
        cur.execute("SELECT COUNT(*) FROM vehicle_allocation WHERE allocation_type = 'Car Swap';")
        swap_alloc = cur.fetchone()[0]
        
        # Reallocation
        cur.execute("SELECT COUNT(*) FROM vehicle_allocation WHERE allocation_type = 'Reallocation';")
        realloc = cur.fetchone()[0]
        
        return {
            "total_allocations": total,
            "new_allocations": new_alloc,
            "car_swaps": swap_alloc,
            "reallocations": realloc
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/allocation/{id}")
def get_allocation_record(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM vehicle_allocation WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Allocation record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, r))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/allocation")
def create_allocation_record(data: AllocationData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO vehicle_allocation (
                allocation_date, allocation_type, city_name, driver_id, driver_name, 
                driver_phone, driver_plan, type_of_plan, car_model, vehicle_number, 
                old_vehicle_number, dropoff_odometer, dropoff_remarks, dropoff_photo
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.allocation_date, data.allocation_type, data.city_name, data.driver_id, data.driver_name,
            data.driver_phone, data.driver_plan, data.type_of_plan, data.car_model, data.vehicle_number,
            data.old_vehicle_number, data.dropoff_odometer, data.dropoff_remarks,
            extract_image(data.dropoff_photo)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/allocation/{id}")
def update_allocation_record(id: int, data: AllocationData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE vehicle_allocation SET
                allocation_date=%s, allocation_type=%s, city_name=%s, driver_id=%s, driver_name=%s, 
                driver_phone=%s, driver_plan=%s, type_of_plan=%s, car_model=%s, vehicle_number=%s, 
                old_vehicle_number=%s, dropoff_odometer=%s, dropoff_remarks=%s, dropoff_photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.allocation_date, data.allocation_type, data.city_name, data.driver_id, data.driver_name,
            data.driver_phone, data.driver_plan, data.type_of_plan, data.car_model, data.vehicle_number,
            data.old_vehicle_number, data.dropoff_odometer, data.dropoff_remarks,
            extract_image(data.dropoff_photo),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Allocation record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/allocation/{id}")
def delete_allocation_record(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM vehicle_allocation WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Allocation record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Partner Expenses Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/expense")
def get_expenses(
    query: Optional[str] = None,
    exp_type: Optional[str] = None
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM partner_expenses WHERE 1=1"
        params = []
        
        if query:
            base_query += """ AND (
                LOWER(driver_name) LIKE %s OR 
                phone_number LIKE %s OR 
                LOWER(vehicle_number) LIKE %s
            )"""
            q = f"%{query.lower()}%"
            params.extend([q, q, q])
            
        if exp_type and exp_type != "all":
            base_query += " AND expenses_type = %s"
            params.append(exp_type)
            
        base_query += " ORDER BY id DESC"
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/expense/stats")
def get_expense_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # Total overall expenses
        cur.execute("SELECT amount_paid FROM partner_expenses;")
        total = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        # CNG
        cur.execute("SELECT amount_paid FROM partner_expenses WHERE expenses_type = 'CNG';")
        cng = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        # Toll
        cur.execute("SELECT amount_paid FROM partner_expenses WHERE expenses_type = 'Toll';")
        toll = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        # Other (OLA + Paid to Company)
        cur.execute("SELECT amount_paid FROM partner_expenses WHERE expenses_type IN ('OLA - CL Balance', 'Paid to Company');")
        other = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        return {
            "total_expenses": total,
            "cng_total": cng,
            "toll_total": toll,
            "other_total": other
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/expense/{id}")
def get_expense_record(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM partner_expenses WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Expense record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, r))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/expense")
def create_expense_record(data: ExpenseData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO partner_expenses (
                expense_date, driver_name, phone_number, vehicle_number, 
                expenses_type, amount_paid, reference_photo
            ) VALUES (%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.expense_date, data.driver_name, data.phone_number, data.vehicle_number,
            data.expenses_type, data.amount_paid, extract_image(data.reference_photo)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/expense/{id}")
def update_expense_record(id: int, data: ExpenseData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE partner_expenses SET
                expense_date=%s, driver_name=%s, phone_number=%s, vehicle_number=%s, 
                expenses_type=%s, amount_paid=%s, reference_photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.expense_date, data.driver_name, data.phone_number, data.vehicle_number,
            data.expenses_type, data.amount_paid, extract_image(data.reference_photo),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Expense record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/expense/{id}")
def delete_expense_record(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM partner_expenses WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Expense record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Vehicle Onboarding Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/vehicle")
def get_all_vehicles(search: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM vehicle_onboarding WHERE 1=1"
        params = []
        if search:
            query += " AND (vehicle_number ILIKE %s OR model ILIKE %s OR letzryd_unique_no ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if type and type != "all":
            query += " AND received_allocated = %s"
            params.append(type)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/vehicle/stats")
def get_vehicle_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM vehicle_onboarding;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM vehicle_onboarding WHERE received_allocated = 'Receiving';")
        receiving = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM vehicle_onboarding WHERE received_allocated = 'Allocation';")
        allocation = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM vehicle_onboarding WHERE cng_installed = 'Yes';")
        cng = cur.fetchone()[0]
        return {
            "total_fleet": total,
            "receiving_count": receiving,
            "allocation_count": allocation,
            "cng_count": cng
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/vehicle/{id}")
def get_single_vehicle(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM vehicle_onboarding WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vehicle record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/vehicle")
def create_vehicle_record(data: VehicleOnboardingData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO vehicle_onboarding (
                vehicle_number, letzryd_unique_no, city_name, model, received_allocated, delivery_month,
                registration_date, rto_tax_validity, permit_validity, fitness_validity, pollution_validity, insurance_validity, authorization_certificate, insurance_mapping,
                kms_reading, tracking_device_vendor, tracking_device_type, cng_installed, cng_plate, cng_installation_date, jack, jack_rod, spanner, parking_triangle, fire_extinguishers, seat_cover, floor_carpet, key_quantity,
                image_front, image_lh, image_back, image_rh, engine_chasis_no_img, battery_sl_no_img, engine_compartment_img, fast_tag_img, music_system_img, rh_fr_tyre_img, lh_fr_tyre_img, rh_rear_tyre_img, lh_rear_tyre_img, spare_wheel_img
            ) VALUES (
                %s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            ) RETURNING id;
        """, (
            data.vehicle_number, data.letzryd_unique_no, data.city_name, data.model, data.received_allocated, data.delivery_month,
            data.registration_date, data.rto_tax_validity, data.permit_validity, data.fitness_validity, data.pollution_validity, data.insurance_validity, data.authorization_certificate, data.insurance_mapping,
            data.kms_reading, data.tracking_device_vendor, data.tracking_device_type, data.cng_installed, data.cng_plate, data.cng_installation_date, data.jack, data.jack_rod, data.spanner, data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.key_quantity,
            extract_image(data.image_front), extract_image(data.image_lh), extract_image(data.image_back), extract_image(data.image_rh),
            extract_image(data.engine_chasis_no_img), extract_image(data.battery_sl_no_img), extract_image(data.engine_compartment_img), extract_image(data.fast_tag_img),
            extract_image(data.music_system_img), extract_image(data.rh_fr_tyre_img), extract_image(data.lh_fr_tyre_img),
            extract_image(data.rh_rear_tyre_img), extract_image(data.lh_rear_tyre_img), extract_image(data.spare_wheel_img)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/vehicle/{id}")
def update_vehicle_record(id: int, data: VehicleOnboardingData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE vehicle_onboarding SET
                vehicle_number=%s, letzryd_unique_no=%s, city_name=%s, model=%s, received_allocated=%s, delivery_month=%s,
                registration_date=%s, rto_tax_validity=%s, permit_validity=%s, fitness_validity=%s, pollution_validity=%s, insurance_validity=%s, authorization_certificate=%s, insurance_mapping=%s,
                kms_reading=%s, tracking_device_vendor=%s, tracking_device_type=%s, cng_installed=%s, cng_plate=%s, cng_installation_date=%s, jack=%s, jack_rod=%s, spanner=%s, parking_triangle=%s, fire_extinguishers=%s, seat_cover=%s, floor_carpet=%s, key_quantity=%s,
                image_front=%s, image_lh=%s, image_back=%s, image_rh=%s, engine_chasis_no_img=%s, battery_sl_no_img=%s, engine_compartment_img=%s, fast_tag_img=%s, music_system_img=%s, rh_fr_tyre_img=%s, lh_fr_tyre_img=%s, rh_rear_tyre_img=%s, lh_rear_tyre_img=%s, spare_wheel_img=%s
            WHERE id=%s RETURNING id;
        """, (
            data.vehicle_number, data.letzryd_unique_no, data.city_name, data.model, data.received_allocated, data.delivery_month,
            data.registration_date, data.rto_tax_validity, data.permit_validity, data.fitness_validity, data.pollution_validity, data.insurance_validity, data.authorization_certificate, data.insurance_mapping,
            data.kms_reading, data.tracking_device_vendor, data.tracking_device_type, data.cng_installed, data.cng_plate, data.cng_installation_date, data.jack, data.jack_rod, data.spanner, data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.key_quantity,
            extract_image(data.image_front), extract_image(data.image_lh), extract_image(data.image_back), extract_image(data.image_rh),
            extract_image(data.engine_chasis_no_img), extract_image(data.battery_sl_no_img), extract_image(data.engine_compartment_img), extract_image(data.fast_tag_img),
            extract_image(data.music_system_img), extract_image(data.rh_fr_tyre_img), extract_image(data.lh_fr_tyre_img),
            extract_image(data.rh_rear_tyre_img), extract_image(data.lh_rear_tyre_img), extract_image(data.spare_wheel_img),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vehicle record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/vehicle/{id}")
def delete_vehicle_record(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM vehicle_onboarding WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Vehicle record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Workshop Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/workshop")
def get_all_workshops(search: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM workshop_vendors WHERE 1=1"
        params = []
        if search:
            query += " AND (vendor_name ILIKE %s OR contact_person ILIKE %s OR owner_name ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if type and type != "all":
            query += " AND workshop_type = %s"
            params.append(type)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/workshop/stats")
def get_workshop_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM workshop_vendors;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM workshop_vendors WHERE workshop_status = 'Active';")
        active = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM workshop_vendors WHERE workshop_type = 'EV Specialist';")
        ev_specialist = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM workshop_vendors WHERE workshop_status = 'Onboarding';")
        onboarding = cur.fetchone()[0]
        return {
            "total_workshops": total,
            "active_count": active,
            "ev_specialist_count": ev_specialist,
            "onboarding_count": onboarding
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/workshop/{id}")
def get_single_workshop(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM workshop_vendors WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workshop vendor not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/workshop")
def create_workshop_record(data: WorkshopData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO workshop_vendors (
                vendor_name, workshop_type, city_name, address, gst_number,
                contact_person, mobile_number, email_id, pan_card, bank_name,
                account_number, ifsc_code, workshop_status, workshop_photo,
                contact_person_2, alternate_mobile, telephone, owner_name, upi_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (
            data.vendor_name, data.workshop_type, data.city_name, data.address, data.gst_number,
            data.contact_person, data.mobile_number, data.email_id, data.pan_card, data.bank_name,
            data.account_number, data.ifsc_code, data.workshop_status, extract_image(data.workshop_photo),
            data.contact_person_2, data.alternate_mobile, data.telephone, data.owner_name, data.upi_id
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/workshop/{id}")
def update_workshop_record(id: int, data: WorkshopData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE workshop_vendors SET
                vendor_name=%s, workshop_type=%s, city_name=%s, address=%s, gst_number=%s,
                contact_person=%s, mobile_number=%s, email_id=%s, pan_card=%s, bank_name=%s,
                account_number=%s, ifsc_code=%s, workshop_status=%s, workshop_photo=%s,
                contact_person_2=%s, alternate_mobile=%s, telephone=%s, owner_name=%s, upi_id=%s
            WHERE id=%s RETURNING id;
        """, (
            data.vendor_name, data.workshop_type, data.city_name, data.address, data.gst_number,
            data.contact_person, data.mobile_number, data.email_id, data.pan_card, data.bank_name,
            data.account_number, data.ifsc_code, data.workshop_status, extract_image(data.workshop_photo),
            data.contact_person_2, data.alternate_mobile, data.telephone, data.owner_name, data.upi_id,
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workshop vendor not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/workshop/{id}")
def delete_workshop_record(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM workshop_vendors WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Workshop vendor not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Hubs & Parking Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/hub")
def get_all_hubs(search: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM hubs_parking WHERE 1=1"
        params = []
        if search:
            query += " AND (hub_name ILIKE %s OR address ILIKE %s OR hub_manager ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if type and type != "all":
            query += " AND facility_type = %s"
            params.append(type)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/hub/stats")
def get_hub_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM hubs_parking;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(SUM(CAST(NULLIF(total_capacity, '') AS INTEGER)), 0) FROM hubs_parking;")
        capacity = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM hubs_parking WHERE ev_charging = 'Yes';")
        ev = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM hubs_parking WHERE security_cctv = 'Yes';")
        cctv = cur.fetchone()[0]
        return {
            "total_hubs": total,
            "total_capacity": capacity,
            "ev_charging_count": ev,
            "cctv_secured_count": cctv
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/hub/{id}")
def get_single_hub(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM hubs_parking WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hub record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/hub")
def create_hub_record(data: HubData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO hubs_parking (
                hub_name, city_name, address, pincode, facility_type,
                total_capacity, ev_charging, security_cctv, hub_manager,
                manager_phone, operating_hours, hub_photo, contact_person, designation
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (
            data.hub_name, data.city_name, data.address, data.pincode, data.facility_type,
            data.total_capacity, data.ev_charging, data.security_cctv, data.hub_manager,
            data.manager_phone, data.operating_hours, extract_image(data.hub_photo),
            data.contact_person, data.designation
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/hub/{id}")
def update_hub_record(id: int, data: HubData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE hubs_parking SET
                hub_name=%s, city_name=%s, address=%s, pincode=%s, facility_type=%s,
                total_capacity=%s, ev_charging=%s, security_cctv=%s, hub_manager=%s,
                manager_phone=%s, operating_hours=%s, hub_photo=%s, contact_person=%s, designation=%s
            WHERE id=%s RETURNING id;
        """, (
            data.hub_name, data.city_name, data.address, data.pincode, data.facility_type,
            data.total_capacity, data.ev_charging, data.security_cctv, data.hub_manager,
            data.manager_phone, data.operating_hours, extract_image(data.hub_photo),
            data.contact_person, data.designation,
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hub record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/hub/{id}")
def delete_hub_record(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM hubs_parking WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Hub record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Rents
# ─────────────────────────────────────────────────────────
@app.get("/api/rents")
def get_rents(
    search: Optional[str] = None,
    level: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM rents WHERE 1=1"
        params = []
        if search:
            query += " AND (vehicle_model ILIKE %s OR vehicle_number ILIKE %s OR vendor_id ILIKE %s OR driver_id ILIKE %s)"
            s = f"%{search}%"
            params.extend([s, s, s, s])
        if level:
            query += " AND level = %s"
            params.append(level)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/rents")
def create_rent(data: RentData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO rents (level, vehicle_manufacturer, vehicle_model, vehicle_number, vehicle_age, vendor_id, driver_id, rent_amount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;
        """, (data.level, data.vehicle_manufacturer, data.vehicle_model, data.vehicle_number, data.vehicle_age, data.vendor_id, data.driver_id, data.rent_amount))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/rents/{id}")
def update_rent(id: int, data: RentData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE rents SET level=%s, vehicle_manufacturer=%s, vehicle_model=%s, vehicle_number=%s, vehicle_age=%s, vendor_id=%s, driver_id=%s, rent_amount=%s
            WHERE id=%s RETURNING id;
        """, (data.level, data.vehicle_manufacturer, data.vehicle_model, data.vehicle_number, data.vehicle_age, data.vendor_id, data.driver_id, data.rent_amount, id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rent record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/rents/{id}")
def delete_rent(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM rents WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Rent record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Accidents
# ─────────────────────────────────────────────────────────
@app.get("/api/accident")
def get_accidents(
    search: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, vehicle_number, vendor_name, city_name, date_of_accident, 
                   time_of_accident, driver_name, vehicle_status, repair_cost, created_at 
            FROM accidents_registry WHERE 1=1
        """
        params = []
        if search:
            query += " AND (vehicle_number ILIKE %s OR vendor_name ILIKE %s OR driver_name ILIKE %s OR driver_id ILIKE %s)"
            s = f"%{search}%"
            params.extend([s, s, s, s])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if status and status != "all":
            query += " AND vehicle_status = %s"
            params.append(status)
            
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/accident/stats")
def get_accident_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), COALESCE(SUM(CAST(NULLIF(repair_cost, '') AS NUMERIC)), 0) FROM accidents_registry;")
        total, total_cost = cur.fetchone()
        
        cur.execute("SELECT COUNT(*) FROM accidents_registry WHERE vehicle_status = 'Drivable';")
        drivable = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM accidents_registry WHERE vehicle_status = 'Needs Towing';")
        needs_towing = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM accidents_registry WHERE vehicle_status = 'Impounded by Police';")
        impounded = cur.fetchone()[0]
        
        return {
            "total_accidents": total,
            "total_repair_cost": int(total_cost),
            "drivable_count": drivable,
            "needs_towing_count": needs_towing,
            "impounded_count": impounded
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/accident/{id}")
def get_accident(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM accidents_registry WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Accident record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/accident")
def create_accident(data: AccidentData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO accidents_registry (
                vehicle_number, vendor_id, vendor_name, city_name, date_of_accident, time_of_accident, place_of_accident, vehicle_status,
                driver_id, driver_name, no_of_persons, third_party_involvement, fir_filed,
                accident_reason, accident_inspection, insurance_status, repair_cost, toeing_cost, challan_amount, fine_amount, comments,
                front_vehicle_photo, back_vehicle_photo, right_vehicle_photo, left_vehicle_photo, fir_document_copy
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s
            ) RETURNING id;
        """, (
            data.vehicle_number, data.vendor_id, data.vendor_name, data.city_name, data.date_of_accident, data.time_of_accident, data.place_of_accident, data.vehicle_status,
            data.driver_id, data.driver_name, data.no_of_persons, data.third_party_involvement, data.fir_filed,
            data.accident_reason, data.accident_inspection, data.insurance_status, data.repair_cost, data.toeing_cost, data.challan_amount, data.fine_amount, data.comments,
            extract_image(data.front_vehicle_photo), extract_image(data.back_vehicle_photo), extract_image(data.right_vehicle_photo), extract_image(data.left_vehicle_photo), extract_image(data.fir_document_copy)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/accident/{id}")
def update_accident(id: int, data: AccidentData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE accidents_registry SET 
                vehicle_number=%s, vendor_id=%s, vendor_name=%s, city_name=%s, date_of_accident=%s, time_of_accident=%s, place_of_accident=%s, vehicle_status=%s,
                driver_id=%s, driver_name=%s, no_of_persons=%s, third_party_involvement=%s, fir_filed=%s,
                accident_reason=%s, accident_inspection=%s, insurance_status=%s, repair_cost=%s, toeing_cost=%s, challan_amount=%s, fine_amount=%s, comments=%s,
                front_vehicle_photo=%s, back_vehicle_photo=%s, right_vehicle_photo=%s, left_vehicle_photo=%s, fir_document_copy=%s
            WHERE id = %s RETURNING id;
        """, (
            data.vehicle_number, data.vendor_id, data.vendor_name, data.city_name, data.date_of_accident, data.time_of_accident, data.place_of_accident, data.vehicle_status,
            data.driver_id, data.driver_name, data.no_of_persons, data.third_party_involvement, data.fir_filed,
            data.accident_reason, data.accident_inspection, data.insurance_status, data.repair_cost, data.toeing_cost, data.challan_amount, data.fine_amount, data.comments,
            extract_image(data.front_vehicle_photo), extract_image(data.back_vehicle_photo), extract_image(data.right_vehicle_photo), extract_image(data.left_vehicle_photo), extract_image(data.fir_document_copy),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Accident record not found")
        conn.commit()
        return {"success": True, "id": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/accident/{id}")
def delete_accident(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM accidents_registry WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Accident record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Inspections
# ─────────────────────────────────────────────────────────
@app.get("/api/inspection")
def get_inspections(
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM inspections WHERE 1=1"
        params = []
        if search:
            query += " AND (vehicle_number ILIKE %s OR remarks ILIKE %s)"
            s = f"%{search}%"
            params.extend([s, s])
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/inspection/stats")
def get_inspection_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), COUNT(DISTINCT vehicle_number) FROM inspections;")
        total, unique_vehicles = cur.fetchone()
        return {
            "total_inspections": total,
            "unique_vehicles": unique_vehicles
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/inspection/last/{vehicle_number}")
def get_last_inspection(vehicle_number: str, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM inspections WHERE vehicle_number ILIKE %s ORDER BY id DESC LIMIT 1;", (vehicle_number.strip(),))
        row = cur.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/inspection/{id}")
def get_inspection(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM inspections WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Inspection record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/inspection")
def create_inspection(data: InspectionData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO inspections (
                vehicle_number, inspection_date, odometer_reading, jack, jack_rod, spanner, 
                parking_triangle, fire_extinguishers, seat_cover, floor_carpet, key_quantity,
                photo_front, photo_back, photo_lh, photo_rh, photo_engine_chassis, photo_battery, 
                photo_engine_compartment, photo_fast_tag, photo_music_system, 
                photo_tyre_rh_fr, photo_tyre_lh_fr, photo_tyre_rh_re, photo_tyre_lh_re, photo_tyre_spare, 
                remarks
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (
            data.vehicle_number, data.inspection_date, data.odometer_reading, data.jack, data.jack_rod, data.spanner,
            data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.key_quantity,
            extract_image(data.photo_front), extract_image(data.photo_back), extract_image(data.photo_lh), extract_image(data.photo_rh),
            extract_image(data.photo_engine_chassis), extract_image(data.photo_battery), extract_image(data.photo_engine_compartment),
            extract_image(data.photo_fast_tag), extract_image(data.photo_music_system), 
            extract_image(data.photo_tyre_rh_fr), extract_image(data.photo_tyre_lh_fr), extract_image(data.photo_tyre_rh_re),
            extract_image(data.photo_tyre_lh_re), extract_image(data.photo_tyre_spare),
            data.remarks
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/inspection/{id}")
def update_inspection(id: int, data: InspectionData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE inspections SET 
                vehicle_number=%s, inspection_date=%s, odometer_reading=%s, jack=%s, jack_rod=%s, spanner=%s, 
                parking_triangle=%s, fire_extinguishers=%s, seat_cover=%s, floor_carpet=%s, key_quantity=%s,
                photo_front=%s, photo_back=%s, photo_lh=%s, photo_rh=%s, photo_engine_chassis=%s, photo_battery=%s, 
                photo_engine_compartment=%s, photo_fast_tag=%s, photo_music_system=%s, 
                photo_tyre_rh_fr=%s, photo_tyre_lh_fr=%s, photo_tyre_rh_re=%s, photo_tyre_lh_re=%s, photo_tyre_spare=%s, 
                remarks=%s
            WHERE id=%s RETURNING id;
        """, (
            data.vehicle_number, data.inspection_date, data.odometer_reading, data.jack, data.jack_rod, data.spanner,
            data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.key_quantity,
            extract_image(data.photo_front), extract_image(data.photo_back), extract_image(data.photo_lh), extract_image(data.photo_rh),
            extract_image(data.photo_engine_chassis), extract_image(data.photo_battery), extract_image(data.photo_engine_compartment),
            extract_image(data.photo_fast_tag), extract_image(data.photo_music_system), 
            extract_image(data.photo_tyre_rh_fr), extract_image(data.photo_tyre_lh_fr), extract_image(data.photo_tyre_rh_re),
            extract_image(data.photo_tyre_lh_re), extract_image(data.photo_tyre_spare),
            data.remarks, id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Inspection record not found")
        conn.commit()
        return {"success": True, "id": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/inspection/{id}")
def delete_inspection(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM inspections WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Inspection record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Roles & Permissions
# ─────────────────────────────────────────────────────────

class RoleData(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

@app.get("/api/roles")
def get_roles(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, description FROM app_roles ORDER BY id;")
        roles = []
        for r in cur.fetchall():
            cur.execute("""
                SELECT p.name FROM app_role_permissions arp
                JOIN app_permissions p ON p.id = arp.permission_id
                WHERE arp.role_id = %s;
            """, (r[0],))
            permissions = [p[0] for p in cur.fetchall()]
            roles.append({"id": r[0], "name": r[1], "description": r[2], "permissions": permissions})
        return roles
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/roles")
def create_or_update_role(req: RoleData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # Upsert Role
        cur.execute("SELECT id FROM app_roles WHERE name = %s;", (req.name,))
        row = cur.fetchone()
        if row:
            role_id = row[0]
            cur.execute("UPDATE app_roles SET description = %s WHERE id = %s;", (req.description, role_id))
        else:
            cur.execute("INSERT INTO app_roles (name, description) VALUES (%s, %s) RETURNING id;", (req.name, req.description))
            role_id = cur.fetchone()[0]
            
        # Update Permissions
        cur.execute("DELETE FROM app_role_permissions WHERE role_id = %s;", (role_id,))
        for perm in req.permissions:
            # Ensure permission exists
            cur.execute("INSERT INTO app_permissions (name) VALUES (%s) ON CONFLICT (name) DO NOTHING;", (perm,))
            cur.execute("SELECT id FROM app_permissions WHERE name = %s;", (perm,))
            perm_id = cur.fetchone()[0]
            cur.execute("INSERT INTO app_role_permissions (role_id, permission_id) VALUES (%s, %s);", (role_id, perm_id))
            
        conn.commit()
        return {"success": True, "role_id": role_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/roles/{id}")
def delete_role(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM app_roles WHERE id = %s RETURNING id;", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Role not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)

# ─────────────────────────────────────────────────────────
# Tickets
# ─────────────────────────────────────────────────────────

class TicketData(BaseModel):
    title: str
    description: str
    source: str
    status: Optional[str] = "Open"
    assigned_to: Optional[int] = None

@app.get("/api/tickets")
def get_tickets(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT t.id, t.title, t.description, t.source, t.status, 
                   t.created_by_name, t.assigned_to, u.name as assignee_name, 
                   t.created_at, t.resolved_at, t.resolution_notes
            FROM tickets t
            LEFT JOIN app_users au ON au.id = t.assigned_to
            LEFT JOIN users u ON u.id = au.executive_id
            ORDER BY t.created_at DESC;
        """)
        keys = ["id", "title", "description", "source", "status", "created_by_name", "assigned_to", "assignee_name", "created_at", "resolved_at", "resolution_notes"]
        return [dict(zip(keys, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/tickets")
def create_ticket(req: TicketData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO tickets (title, description, source, status, created_by_name, assigned_to)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
        """, (req.title, req.description, req.source, req.status, user["name"], req.assigned_to))
        ticket_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": ticket_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/tickets/{id}/resolve")
def resolve_ticket(id: int, data: dict, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    notes = data.get("resolution_notes", "")
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE tickets 
            SET status = 'Resolved', resolved_at = NOW(), resolution_notes = %s 
            WHERE id = %s RETURNING id;
        """, (notes, id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Ticket not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

# ─────────────────────────────────────────────────────────
# Static files — must be last
# ─────────────────────────────────────────────────────────
app.mount("/", StaticFiles(directory="dist", html=True), name="static")


