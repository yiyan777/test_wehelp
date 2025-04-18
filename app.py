import requests
from fastapi.responses import FileResponse
import json
import mysql.connector
from fastapi import FastAPI, Query, Path, Request, HTTPException
from fastapi.responses import JSONResponse
from collections import Counter
import traceback
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import bcrypt
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
import datetime
from datetime import datetime, timezone, timedelta

app=FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
	return FileResponse("./static/index.html", media_type="text/html")
@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
	return FileResponse("./static/thankyou.html", media_type="text/html")


DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "123456"
DB_NAME = "taipei_attractions"  # 要建立的資料庫名稱

if False:
    print("現在要測試API，以下插入資料進資料庫的程式碼先註解掉")

    con = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = con.cursor()

    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    print(f"資料庫 {DB_NAME} 建立完成")

    con.database = DB_NAME  # 設定使用的資料庫
    # 建立 attractions 資料表
    cursor.execute("""
                CREATE TABLE IF NOT EXISTS attractions(
                id INT PRIMARY KEY, 
                name VARCHAR(255) NOT NULL, 
                category VARCHAR(50), 
                description TEXT, 
                address VARCHAR(255), 
                transport TEXT, 
                mrt VARCHAR(50), 
                lat DECIMAL(10, 6), 
                lng DECIMAL(10, 6)
                )
            """)

    # 建立 attraction_images 資料表 (存放圖片網址)
    cursor.execute("""
                CREATE TABLE IF NOT EXISTS attraction_images(
                id INT PRIMARY KEY AUTO_INCREMENT, 
                attraction_id INT,
                img_url TEXT, 
                FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
                )
                """)

    with open("taipei-day-trip/data/taipei-attractions.json", "r", encoding="utf-8") as file:
        data = json.load(file)

    for item in data["result"]["results"]:
        id = item["_id"]
        name = item["name"]
        category = item["CAT"]
        description = item["description"]
        address = item["address"]
        transport = item["direction"]
        mrt = item["MRT"]
        lat = float(item["latitude"]) # 確保為數字
        lng = float(item["longitude"]) # 確保為數字

        # 插入景點資料
        cursor.execute("""
            INSERT INTO attractions (id, name, category, description, address, transport, mrt, lat, lng) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) 
        """, (id, name, category, description, address, transport, mrt, lat, lng))


        # 過濾有效圖片網址(只保留 .jpg 或 .png 結尾的)
        image_urls = item["file"].split("https://")[1:]  # 解析圖片網址
        # print(image_urls)
        image_urls = ["https://" + url for url in image_urls if url.lower().endswith((".jpg", ".png"))]

        for url in image_urls:
            cursor.execute("""
                INSERT INTO attraction_images (attraction_id, img_url)
                VALUES (%s, %s)
            """, (id, url))
    con.commit()
    cursor.close()
    con.close()
    print("所有景點資料與圖片網址已成功存入 taipei_attractions 資料庫")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允許所有來源 (測試用，正式環境應該改成特定 domain)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MySQL 連線設定
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456",
    "database": "taipei_attractions"
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@app.get("/api/attractions")
async def get_attractions(
    page: int = Query(..., ge=0, description="分頁從 0 開始，每頁有 12 筆資料"), 
    keyword: str = Query(None, description="關鍵字篩選，完全比對捷運站名稱或模糊比對景點名稱，沒有給定則不做篩選")
):
    try:
        con = get_db_connection()
        cursor = con.cursor(dictionary=True)

        limit = 12
        offset = page * limit
        params = []

        sql = """
            SELECT 
                attractions.id, 
                attractions.name, 
                attractions.category, 
                attractions.description, 
                attractions.address, 
                attractions.transport, 
                attractions.mrt, 
                attractions.lat, 
                attractions.lng,
                GROUP_CONCAT(attraction_images.img_url) AS images
            FROM attractions
            LEFT JOIN attraction_images ON attractions.id = attraction_images.attraction_id
        """

        if keyword:
            sql += " WHERE attractions.name LIKE %s OR attractions.mrt = %s"
            params.extend([f"%{keyword}%", keyword])

        sql += " GROUP BY attractions.id LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(sql, params)
        attractions = cursor.fetchall()
        # print(attractions)

        for attraction in attractions:
            attraction["images"] = attraction["images"].split(",") if attraction["images"] else []
            # print(attraction)

         # 計算符合篩選條件的所有資料總筆數 (不受分頁影響)
        count_sql = """
            SELECT COUNT(DISTINCT attractions.id) 
            FROM attractions
            LEFT JOIN attraction_images ON attractions.id = attraction_images.attraction_id
        """
        params = []  # 確保每次查詢時 params 都重新初始化
        if keyword:
            count_sql += " WHERE attractions.name LIKE %s OR attractions.mrt = %s"
            params = [f"%{keyword}%", keyword]
        cursor.execute(count_sql, params)  # 使用 count_sql 查詢總數
        total_count = cursor.fetchone()["COUNT(DISTINCT attractions.id)"]

        next_page = page + 1 if offset + limit < total_count else None

        cursor.close()
        con.close()

        return {
            "nextPage": next_page,
            "data": attractions
        }

    except Exception:
        return JSONResponse(
            status_code=500,
            content={"error": True, "message": "伺服器內部錯誤，請稍後再試"}
        )
    
@app.get("/api/attraction/{attractionId}")
async def get_attraction(
    attractionId: int = Path(..., ge=1, description="景點編號")
):
    try:
        con = get_db_connection()
        cursor = con.cursor(dictionary=True)
        
        # 查詢單一景點資料及其圖片
        cursor.execute("""
            SELECT 
                attractions.id, 
                attractions.name, 
                attractions.category, 
                attractions.description, 
                attractions.address, 
                attractions.transport, 
                attractions.mrt, 
                attractions.lat, 
                attractions.lng,
                GROUP_CONCAT(attraction_images.img_url) AS images
            FROM attractions
            LEFT JOIN attraction_images ON attractions.id = attraction_images.attraction_id
            WHERE attractions.id = %s
            GROUP BY attractions.id
        """, (attractionId,))
        attraction = cursor.fetchone()
        if attraction:
            attraction["images"] = attraction["images"].split(",") if attraction["images"] else []


        # 如果找不到該景點
        if not attraction:
            cursor.close()
            con.close()
            return JSONResponse(
                content={"error": True, "message": "景點編號不正確"},
                status_code=400
            )

        cursor.close()
        con.close()

        return {
            "data": attraction
        }
    
    except Exception:
        return JSONResponse(
            content={"error": True, "message": "伺服器內部錯誤，請稍後再試"},
            status_code=500
        )

@app.get("/api/mrts")
async def get_mrts():
    try:
        con = get_db_connection()
        cursor = con.cursor()

        # 查詢所有mrt欄位，過濾掉 NULL 或空字串
        cursor.execute("SELECT mrt FROM attractions WHERE mrt IS NOT NULL AND mrt != '' ")
        mrt_list = [row[0] for row in cursor.fetchall()]

        cursor.close()
        con.close()
        
        mrt_counts = Counter(mrt_list)  # 計算 MRT 出現次數，並依照次數排序

        # mrt_counts.most_common()會形成列表，且由大到小 EX:[(新北投, 6), (劍潭, 4) ... ]
        sorted_mrts = [mrt for mrt, _ in mrt_counts.most_common()] if mrt_list else []

        return {
            "data": sorted_mrts
        }
    except Exception:
        return JSONResponse(
            content={"error": True, "message": "伺服器內部錯誤，請稍後再試"},
            status_code=500
        )


@app.post("/api/user")
async def register_user(request: Request):
    try:
        # 取得請求的 JSON 資料
        data = await request.json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        # 檢查必要欄位
        if not name or not email or not password:
            return JSONResponse(status_code=400, content={"error": True, "message": "缺少必要欄位"})

        # 開始連接 MySQL
        con = get_db_connection()
        cursor = con.cursor(dictionary=True)

        # 檢查 Email 是否已存在
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            con.close()
            return JSONResponse(status_code=400, content={"error": True, "message": "Email 已被註冊"})

        # 加密密碼
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # 插入新使用者資料
        cursor.execute("""
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
        """, (name, email, hashed_password))
        con.commit()

        # 關閉資料庫連線
        cursor.close()
        con.close()

        # 返回成功訊息，並明確設置為 JSON 格式
        return JSONResponse(status_code=200, content={"ok": True})

    except Exception as e:
        # 如果有錯誤，返回伺服器錯誤訊息
        return JSONResponse(status_code=500, content={"error": True, "message": "伺服器內部錯誤"})


# User API：取得登入狀態（/api/user/auth）
# 前端在請求此 API 時，須在 Authorization header 中帶入 Bearer Token

# JWT 設定
SECRET_KEY = "MY_SECRET_KEY" 
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 2

@app.get("/api/user/auth")
async def get_user_auth(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"data": None}
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # 取得存放在 token 中的使用者資訊
        user = {
            "id": payload.get("id"),
            "name": payload.get("name"),
            "email": payload.get("email")
        }
        return {"data": user}
    except (InvalidTokenError, ExpiredSignatureError):
        return {"data": None}

# 登入會員帳戶的API
@app.put("/api/user/auth")
async def login_user(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return JSONResponse(status_code=400, content={"error": True, "message": "請提供 Email 和密碼"})

        con = get_db_connection()
        cursor = con.cursor(dictionary=True)

        # 查詢使用者
        cursor.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        cursor.close()
        con.close()

        # 若查無此帳號，或密碼錯誤
        if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            return JSONResponse(status_code=400, content={"error": True, "message": "帳號或密碼錯誤"})

        # 登入成功 → 產生 JWT Token（有效期 7 天）
        payload = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }

        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

        return JSONResponse(status_code=200, content={"token": token})

    except Exception:
        return JSONResponse(status_code=500, content={"error": True, "message": "伺服器內部錯誤"})

@app.get("/api/booking")
async def get_booking(request: Request):
    # 從 headers 抓取 JWT Token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"})
    
    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
    except (ExpiredSignatureError, InvalidTokenError):
        return JSONResponse(status_code=403, content={"error": True, "message": "無效的登入資訊"})
    
    try:
        con = get_db_connection()
        cursor = con.cursor(dictionary=True)

        # 查詢該會員的最新一筆預約資料
        cursor.execute("""
            SELECT
                b.attraction_id, b.date, b.time, b.price,
                a.name, a.address,
                (SELECT img_url FROM attraction_images 
                WHERE attraction_id = b.attraction_id 
                LIMIT 1) AS image
            FROM bookings b
            JOIN attractions a ON b.attraction_id = a.id
            WHERE b.user_id = %s
            ORDER BY b.created_at DESC
            LIMIT 1
        """, (user_id,))
        booking = cursor.fetchone()

        cursor.close()
        con.close()

        if not booking:
            return {"data": None}
        
        return {
            "data": {
                "attraction": {
                    "id": booking["attraction_id"],
                    "name": booking["name"],
                    "address": booking["address"],
                    "image": booking["image"]
                },
                "date": booking["date"].isoformat(),  # 轉成字串
                "time": booking["time"],
                "price": booking["price"]
            }
        }
    
    except Exception as e:
        print(e)
        return JSONResponse(
            status_code=500, 
            content={"error": True, "message": "伺服器錯誤"}
        )

@app.post("/api/booking")
async def create_booking(request: Request):
    # 從headers中取得JWT Token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "未登入系統，拒絕存取"}
        )
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
    except (ExpiredSignatureError, InvalidTokenError):
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "無效的登入資訊"}
        )
    try:
        data = await request.json()
        attraction_id = data.get("attractionId")
        date = data.get("date")
        time = data.get("time")
        price = data.get("price")

        if not attraction_id or not date or not time or not price:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "缺少必要的預約資訊"}
            )
        con = get_db_connection()
        cursor = con.cursor()

        # 刪除舊的預約資料(每個會員只保留一筆預約)
        cursor.execute("DELETE FROM bookings WHERE user_id = %s", (user_id,))

        # 插入新資料
        cursor.execute("""
            INSERT INTO bookings (user_id, attraction_id, date, time, price)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, attraction_id, date, time, price))
        con.commit()

        cursor.close()
        con.close()

        return JSONResponse(
            status_code=200,
            content={"ok": True}
        )
    except Exception as e:
        print(e)
        return  JSONResponse(
            status_code=500,
            content={"error": True, "message": "伺服器錯誤"}
        )

@app.delete("/api/booking")
async def delete_booking(request: Request):
    # 從 headers 取得 JWT Token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "未登入系統，拒絕存取"}
        )

    token = auth_header.split(" ")[1]

    try:
        # 解碼 token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
    except (ExpiredSignatureError, InvalidTokenError):
        return JSONResponse(
            status_code=403,
            content={"error": True, "message": "無效的登入資訊"}
        )

    try:
        # 連線並刪除資料
        con = get_db_connection()
        cursor = con.cursor()
        cursor.execute("DELETE FROM bookings WHERE user_id = %s", (user_id,))
        con.commit()
        cursor.close()
        con.close()

        return JSONResponse(status_code=200, content={"ok": True})

    except Exception as e:
        print("刪除預約時發生錯誤：", e)
        return JSONResponse(
            status_code=500,
            content={"errsor": True, "message": "伺服器錯誤"}
        )
    
@app.post("/api/orders")
async def create_order(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"})

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
    except (ExpiredSignatureError, InvalidTokenError):
        return JSONResponse(status_code=403, content={"error": True, "message": "無效的登入資訊"})

    try:
        body = await request.json()
        prime = body.get("prime")
        order = body.get("order")

        if not prime or not order:
            return JSONResponse(status_code=400, content={"error": True, "message": "缺少付款資訊"})

        # 產生訂單編號（用時間組成）
        order_number = datetime.now().strftime("%Y%m%d%H%M%S")

        # 取得資料欄位
        price = order["price"]
        trip = order["trip"]
        attraction = trip["attraction"]
        contact = order["contact"]

        # 將訂單寫入資料庫
        con = get_db_connection()
        cursor = con.cursor()

        cursor.execute("""
            INSERT INTO orders (
                order_number, user_id, price,
                attraction_id, attraction_name, attraction_address, attraction_image,
                date, time,
                contact_name, contact_email, contact_phone,
                status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'UNPAID')
        """, (
            order_number, user_id, price,
            attraction["id"], attraction["name"], attraction["address"], attraction["image"],
            trip["date"], trip["time"],
            contact["name"], contact["email"], contact["phone"]
        ))

        con.commit()

        # 發送付款請求到 TapPay（sandbox）
        tappay_response = requests.post(
            "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime",
            headers={
                "Content-Type": "application/json",
                "x-api-key": "partner_yqxLmBXWI59FWU44tusUMcv0FW5YPsFQw3dRaTVvGmkT9FWmBSNFuXwP"  # Partner Key
            },
            json={
                "prime": prime,
                "partner_key": "partner_yqxLmBXWI59FWU44tusUMcv0FW5YPsFQw3dRaTVvGmkT9FWmBSNFuXwP",  # Partner Key
                "merchant_id": "yiyan777_CTBC",       # merchant ID
                "details": "台北一日遊行程預訂",
                "amount": price,
                "cardholder": {
                    "phone_number": contact["phone"],
                    "name": contact["name"],
                    "email": contact["email"]
                },
                "remember": False
            }
        )

        tappay_result = tappay_response.json()
        status = tappay_result.get("status")

        # 根據付款結果更新訂單狀態
        if status == 0:
            cursor.execute("UPDATE orders SET status = 'PAID' WHERE order_number = %s", (order_number,))
            cursor.execute("DELETE FROM bookings WHERE user_id = %s", (user_id,)) #付款後刪除原來的booking訂單(購物車)
            con.commit()

        cursor.close()
        con.close()

        return {
            "data": {
                "number": order_number,
                "payment": {
                    "status": status,
                    "message": "付款成功" if status == 0 else "付款失敗"
                }
            }
        }

    except Exception as e:
        print("建立訂單發生錯誤：", e)
        return JSONResponse(status_code=500, content={"error": True, "message": "伺服器錯誤"})
    

@app.get("/api/order/{order_number}")
async def get_order_by_number(order_number: str, request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"})

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
    except (ExpiredSignatureError, InvalidTokenError):
        return JSONResponse(status_code=403, content={"error": True, "message": "無效的登入資訊"})

    try:
        con = get_db_connection()
        cursor = con.cursor(dictionary=True)

        cursor.execute("""
            SELECT * FROM orders
            WHERE order_number = %s AND user_id = %s
        """, (order_number, user_id))

        order = cursor.fetchone()

        cursor.close()
        con.close()

        if not order:
            return {"data": None}

        return {
            "data": {
                "number": order["order_number"],
                "price": order["price"],
                "trip": {
                    "attraction": {
                        "id": order["attraction_id"],
                        "name": order["attraction_name"],
                        "address": order["attraction_address"],
                        "image": order["attraction_image"]
                    },
                    "date": order["date"].isoformat(),
                    "time": order["time"]
                },
                "contact": {
                    "name": order["contact_name"],
                    "email": order["contact_email"],
                    "phone": order["contact_phone"]
                },
                "status": 0 if order["status"] == "UNPAID" else 1
            }
        }

    except Exception as e:
        print("查詢訂單時發生錯誤：", e)
        return JSONResponse(status_code=500, content={"error": True, "message": "伺服器錯誤"})
