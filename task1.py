import json
import mysql.connector
from fastapi import FastAPI, Query, Path
from fastapi.responses import JSONResponse
from collections import Counter
import traceback

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

app = FastAPI()

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
            cursor.execute("SELECT img_url FROM attraction_images WHERE attraction_id = %s", (attraction["id"],))
            images = [img["img_url"] for img in cursor.fetchall()]
            attraction["images"] = images

         # 計算符合篩選條件的所有資料總筆數 (不受分頁影響)
        count_sql = "SELECT COUNT(*) FROM attractions"
        params = []  # 確保每次查詢時 params 都重新初始化
        if keyword:
            count_sql += " WHERE name LIKE %s OR mrt = %s"
            params = [f"%{keyword}%", keyword]
        cursor.execute(count_sql, params)  # 使用 count_sql 查詢總數
        total_count = cursor.fetchone()["COUNT(*)"]

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