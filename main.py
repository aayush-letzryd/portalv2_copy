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

# ─────────────────────────────────────────────────────────
# Connection Pool
# ─────────────────────────────────────────────────────────
try:
    postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20,
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASS", r"8S5]U3@L^Xz)\FH}"),
        host=os.environ.get("DB_HOST", "35.200.196.113"),
        port=os.environ.get("DB_PORT", "5432"),
        database=os.environ.get("DB_NAME", "postgres")
    )
    if postgreSQL_pool:
        print("[OK] Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("[ERROR] Error connecting to PostgreSQL:", error)


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
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

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
            "status VARCHAR(50)"
        ]:
            cur.execute(f"ALTER TABLE partner_adjustment ADD COLUMN IF NOT EXISTS {col};")
        
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
            cur.execute("SELECT id, name FROM cities ORDER BY id;")
            city_map = {n: i for i, n in cur.fetchall()}
            
            w_sql = """
                INSERT INTO walkins (visitor_type, event_date, city, person_name, person_number, dl_number, visiting_reason, joined_status, executive_name, executive_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;
            """
            cur.execute(w_sql, ("Partner", "2026-06-24", "Mumbai", "Deepak Mehta", "+91 98001 55667", "MH01 20100098765", "Enquiry", "Not Interested", "Neha Sharma", 18))
            cur.execute(w_sql, ("Driver", "2026-06-25", "Bangalore", "Ravi Shankar", "+91 91000 44556", "KA03 20210056789", "Onboarding", "Pending", "Sandeep", 7))
            cur.execute(w_sql, ("Driver", "2026-06-26", "Hyderabad", "Ajay Deshmukh", "+91 99888 33221", "TS02 20200765432", "Support", "Joined", "SHAIK ABDULLA", 5))
            cur.execute(w_sql, ("Partner", "2026-06-26", "Hyderabad", "Kavitha Nair", "+91 90123 45678", "TS06 20181234567", "Enquiry", "Onboarded", "Ayush Mahendru", 13))

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
                        dl_number, pan_number, aadhaar_number, pan_aadhaar_linked, vendor_name, vendor_id, father_name
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
                """, item)
                onb_id = cur.fetchone()[0]
                
                # Link this onboarding record to a walkin if the name matches
                cur.execute("SELECT id FROM walkins WHERE LOWER(person_name) = LOWER(%s) LIMIT 1;", (item[0],))
                walkin_row = cur.fetchone()
                if walkin_row:
                    walkin_id = walkin_row[0]
                    cur.execute("INSERT INTO walkin_form_links (walkin_id, onboarding_id) VALUES (%s, %s);", (walkin_id, onb_id))
                    cur.execute("UPDATE walkins SET joined_status = 'Onboarded' WHERE id = %s;", (walkin_id,))
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

        # ── app_users (login accounts) ───────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_users (
                id           SERIAL PRIMARY KEY,
                username     VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                executive_id INTEGER REFERENCES users(id),
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_sessions (
                token        VARCHAR(255) PRIMARY KEY,
                user_id      INTEGER REFERENCES app_users(id),
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)

        # Seed login accounts — only if app_users is empty
        cur.execute("SELECT COUNT(*) FROM app_users;")
        if cur.fetchone()[0] == 0:
            cur.execute("SELECT id, name FROM users ORDER BY id;")
            exec_rows = cur.fetchall()
            exec_map = {name: uid for uid, name in exec_rows}

            default_password = pwd_context.hash("letzryd123")
            login_accounts = [
                ("dshiva",       default_password, exec_map.get("D Shiva")),
                ("arshadkhan",   default_password, exec_map.get("Arshad Khan")),
                ("priyasharma",  default_password, exec_map.get("Priya Sharma")),
                ("rohanverma",   default_password, exec_map.get("Rohan Verma")),
                ("snehareddy",   default_password, exec_map.get("Sneha Reddy")),
            ]
            cur.executemany(
                "INSERT INTO app_users (username, password_hash, executive_id) VALUES (%s,%s,%s);",
                login_accounts
            )
            print("[OK] Login accounts seeded (password: letzryd123)")

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
    """Validate Bearer token and return (app_user_id, executive_id, name, role, username)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT au.id, au.executive_id, u.name, COALESCE(u.role,'Executive'), au.username
            FROM app_sessions s
            JOIN app_users au ON au.id = s.user_id
            LEFT JOIN users u ON u.id = au.executive_id
            WHERE s.token = %s;
        """, (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        return {"user_id": row[0], "executive_id": row[1], "name": row[2], "role": row[3], "username": row[4]}
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

class AdjustmentData(BaseModel):
    partner_name: str
    partner_code: str
    driver_id: Optional[str] = None
    partner_number: str
    vehicle_number: Optional[str] = None
    city_name: str
    partner_type: str
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
            SELECT au.id, au.password_hash, au.executive_id, u.name, COALESCE(u.role,'Executive'), au.username
            FROM app_users au
            LEFT JOIN users u ON u.id = au.executive_id
            WHERE au.username = %s;
        """, (req.username.strip().lower(),))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        user_id, pw_hash, exec_id, name, role, username = row
        if not pwd_context.verify(req.password, pw_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        # Create session token
        token = secrets.token_urlsafe(32)
        cur.execute(
            "INSERT INTO app_sessions (token, user_id) VALUES (%s, %s);",
            (token, user_id)
        )
        conn.commit()
        return {
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "executive_id": exec_id,
                "name": name,
                "role": role,
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
# Cities
# ─────────────────────────────────────────────────────────
@app.get("/api/cities")
def get_all_cities():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM cities ORDER BY id;")
        return [{"value": r[0], "text": r[1]} for r in cur.fetchall()]
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
        cur.execute("SELECT COUNT(*) FROM walkins WHERE visitor_type='Driver';")
        drivers = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE visitor_type='Partner';")
        partners = cur.fetchone()[0]
        conversion = round(joined / total * 100, 1) if total > 0 else 0.0
        return {
            "total": total,
            "joined": joined,
            "pending": pending,
            "not_interested": not_interested,
            "drivers": drivers,
            "partners": partners,
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
                account_number, ifsc_code, upi_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
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
            data.account_number, data.ifsc_code, data.upi_id
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
                selfie_photo, dl_front, dl_back, pan_card_photo
            FROM form_onboarding
            WHERE id = %s;
        """, (id,))
        r = cur.fetchone()
        if r:
            return {
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
                "selfie_photo": r[25], "dl_front": r[26], "dl_back": r[27], "pan_card_photo": r[28]
            }
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
                partner_type, adjustment_type, adjustment_date, enter_amount, 
                remittance_towards, adjustment_related_to, remarks, first_level_approval_by, 
                finance_team_status, finance_team_remarks, final_level_approval_by, status, photo
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.partner_name, data.partner_code, data.driver_id, data.partner_number, data.vehicle_number, data.city_name,
            data.partner_type, data.adjustment_type, data.adjustment_date, data.enter_amount,
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
                partner_type=%s, adjustment_type=%s, adjustment_date=%s, enter_amount=%s, 
                remittance_towards=%s, adjustment_related_to=%s, remarks=%s, first_level_approval_by=%s, 
                finance_team_status=%s, finance_team_remarks=%s, final_level_approval_by=%s, status=%s, photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.partner_name, data.partner_code, data.driver_id, data.partner_number, data.vehicle_number, data.city_name,
            data.partner_type, data.adjustment_type, data.adjustment_date, data.enter_amount,
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
# Static files — must be last
# ─────────────────────────────────────────────────────────
app.mount("/", StaticFiles(directory="dist", html=True), name="static")
