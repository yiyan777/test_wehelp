let currentPage = 0;
let nextPage = 1;
let isLoading = false;

async function getMrtList() {
    let response = await fetch("http://18.177.65.105:8000/api/mrts");
    let result = await response.json();
    // console.log(result.data);
    let mrtList = document.querySelector(".mrts")
    result.data.forEach((item) => {
        // console.log(item);
        let mrt = document.createElement("div");
        mrt.classList.add("each-mrt");
        mrt.textContent = item;
        mrt.addEventListener("click", () => handleMrtClick(item)); //點擊事件
        mrtList.appendChild(mrt);
    });

}
// 取得景點資料
async function getData(page, keyword = "") {
    if (isLoading || page === null) return; // 避免重複請求
    isLoading = true;
    try {
        let url = `http://18.177.65.105:8000/api/attractions?page=${page}`;
        if (keyword){
            url += `&keyword=${encodeURIComponent(keyword)}`;
        }
        let response = await fetch(url);
        let result = await response.json();
        const container = document.getElementById("attraction-container");

        if (page === 0){
            container.innerHTML = ""; // 若是新搜尋，清空現有內容
        }

        result.data.forEach((item) => {
            let card = document.createElement("div");
            card.classList.add("attraction-frame");
            
            let imgBox = document.createElement("div");
            imgBox.classList.add("attraction-box");
            imgBox.style.backgroundImage = `url('${item.images[0]}')`;
            
            let name = document.createElement("div");
            name.classList.add("attraction-name");
            name.textContent = item.name;
            imgBox.appendChild(name);
            
            let mrtCategory = document.createElement("div");
            mrtCategory.classList.add("mrt-and-category");
            
            let mrt = document.createElement("div");
            mrt.classList.add("mrt");
            mrt.textContent = item.mrt || "無捷運站";
            
            let category = document.createElement("div");
            category.classList.add("category");
            category.textContent = item.category;
            
            mrtCategory.appendChild(mrt);
            mrtCategory.appendChild(category);
            
            card.appendChild(imgBox);
            card.appendChild(mrtCategory);

            // 加上點擊事件，點擊景點時導向 attraction.html
            card.addEventListener("click", () =>{
                window.location.href = `attraction/${item.id}`;
            });
            
            container.appendChild(card);
        });

        // 更新下一頁頁碼
        nextPage = result.nextPage;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading = false;
    }
}

// 處理 MRT 點擊
function handleMrtClick(mrtName){
    let searchInput = document.querySelector(".slogan-search-form input");
    searchInput.value = mrtName; // 將捷運站名填入輸入框
    currentPage = 0; //重置頁碼
    nextPage = null; // 讓 getData 重新獲取正確的 nextPage
    getData(currentPage, mrtName); //重新搜尋
}

// 監聽搜尋按鈕
const searchBtn = document.querySelector(".search-btn");
searchBtn.addEventListener("click", (e) => {
    e.preventDefault(); // 防止提交表單刷新頁面
    let keyword = document.querySelector(".slogan-search-form input").value.trim();
    currentPage = 0; //重置頁碼
    nextPage = null; // 讓 getData 重新獲取正確的 nextPage
    getData(currentPage, keyword);
});

// 滾動偵測，自動載入下一頁
function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && nextPage !== null) {
        let keyword = document.querySelector(".slogan-search-form input").value.trim();
        getData(nextPage, keyword);
    }
}

window.addEventListener('scroll', handleScroll);

// 捷運列表左右滾動
const leftArrow = document.querySelector(".left-arrow");
const rightArrow = document.querySelector(".right-arrow");
const mrtList = document.querySelector(".mrts");
const scrollAmount = 100; //每次移動的距離100

leftArrow.addEventListener("click", () => {
    mrtList.scrollBy({ left: -scrollAmount, behavior: "smooth" });
});

rightArrow.addEventListener("click", () => {
    mrtList.scrollBy({ left: scrollAmount, behavior: "smooth" });
});

// 初始加載第0頁數據
getData(currentPage);
getMrtList();

// 開啟 popup（點右上角「登入/註冊」）
const loginTrigger = document.getElementById("login-trigger");
const popupOverlay = document.getElementById("user-pop");
const closeBtn = document.querySelector(".popup-close");
const popupBox = document.querySelector(".popup-box");  // 新增彈窗動畫

loginTrigger.addEventListener("click", () => {
    popupOverlay.style.display = "flex";
    // 新增登入/註冊彈窗動畫
    setTimeout(() => {
        popupBox.classList.add("active");
    }, 10);
});

// 關閉 popup（點 ×）
closeBtn.addEventListener("click", () => {
    popupBox.classList.remove("active");
    popupOverlay.style.display = "none";
});


// 登入 <-> 註冊 表單切換
const loginForm = document.querySelector(".popup-login");
const signupForm = document.querySelector(".popup-signup");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

// 點「點此註冊」→ 顯示註冊表單
showSignup.addEventListener("click", () => {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    document.getElementById("signup-msg").style.display = "none";
});

// 點「點此登入」→ 顯示登入表單
showLogin.addEventListener("click", () => {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
    document.getElementById("login-msg").style.display = "none";
});


// 註冊功能：串接 POST /api/user

const signupBtn = document.getElementById("signup-btn");
const signupMsg = document.getElementById("signup-msg");

signupBtn.addEventListener("click", async () => {
    // 取得使用者輸入
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    // 簡單檢查欄位
    if (!name || !email || !password) {
        signupMsg.textContent = "請填寫所有欄位";
        signupMsg.style.color = "red";
        signupMsg.style.display = "block";
        return;
    }

    try {
        const response = await fetch("http://18.177.65.105:8000/api/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (response.ok) {
            signupMsg.textContent = "註冊成功！請重新登入";
            signupMsg.style.color = "green";
            signupMsg.style.display = "block";

            // 清空欄位
            document.getElementById("signup-name").value = "";
            document.getElementById("signup-email").value = "";
            document.getElementById("signup-password").value = "";

            // 過 2 秒切回登入表單
            setTimeout(() => {
                signupForm.style.display = "none";
                loginForm.style.display = "block";
                signupMsg.textContent = "";
                signupMsg.style.display = "none";
            }, 2000);
        } else {
            signupMsg.textContent = result.message || "註冊失敗";
            signupMsg.style.color = "red";
            signupMsg.style.display = "block";
        }
    } catch (error) {
        signupMsg.textContent = "伺服器連線失敗";
        signupMsg.style.color = "red";
        signupMsg.style.display = "block";
        console.error("Signup error:", error);
    }
});

// 登入功能：串接 PUT /api/user/auth
const loginBtn = document.getElementById("login-btn");
const loginMsg = document.getElementById("login-msg");

loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    // 檢查欄位
    if (!email || !password) {
        loginMsg.textContent = "請輸入帳號和密碼";
        loginMsg.style.color = "red";
        loginMsg.style.display = "block";
        return;
    }

    try {
        const response = await fetch("http://18.177.65.105:8000/api/user/auth", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            // 成功登入，儲存 token
            localStorage.setItem("token", result.token);

            // 清空欄位 + 顯示訊息
            document.getElementById("login-email").value = "";
            document.getElementById("login-password").value = "";

            loginMsg.textContent = "登入成功！重新整理畫面...";
            loginMsg.style.color = "green";
            loginMsg.style.display = "block";

            // 過一秒重新整理頁面
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            // 失敗：顯示錯誤訊息
            loginMsg.textContent = result.message || "登入失敗";
            loginMsg.style.color = "red";
            loginMsg.style.display = "block";
        }
    } catch (error) {
        loginMsg.textContent = "無法連線伺服器";
        loginMsg.style.color = "red";
        loginMsg.style.display = "block";
        console.error("Login error:", error);
    }
});


// 登入狀態判斷
window.addEventListener("DOMContentLoaded", async () => {
    const loginTrigger = document.getElementById("login-trigger");
    const token = localStorage.getItem("token");

    if (!token) {
        // 沒 token → 顯示登入/註冊
        loginTrigger.textContent = "登入 / 註冊";
        return;
    }

    try {
        const response = await fetch("http://18.177.65.105:8000/api/user/auth", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.data) {
            // 有登入 → 顯示登出系統
            loginTrigger.textContent = "登出系統";

            // 點擊登出時，移除 token 並刷新頁面
            loginTrigger.addEventListener("click", () => {
                localStorage.removeItem("token");
                window.location.reload();
            });
        } else {
            // Token 無效 → 顯示登入/註冊
            loginTrigger.textContent = "登入 / 註冊";
        }
    } catch (error) {
        console.error("登入狀態檢查失敗：", error);
        loginTrigger.textContent = "登入 / 註冊";
    }
});