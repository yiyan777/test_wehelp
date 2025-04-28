function getPrimeAsync() {
    return new Promise((resolve, reject) => {
        TPDirect.card.getPrime((result) => {
            if (result.status !== 0) {
                reject(result.msg);
            } else {
                resolve(result.card.prime);
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const bookingSection = document.getElementById("booking-detail");
    const noBookingSection = document.getElementById("no-booking");
    const loginTrigger = document.getElementById("login-trigger");
    const bookingTitle = document.querySelector(".booking-title");
    const showAllInfo = document.querySelector(".all-info");
    const userNameInput = document.querySelector("#user-name");
    const userEmailInput = document.querySelector("#user-email");
    const footer = document.querySelector(".footer");
    const loadingSpinner = document.getElementById("loading-spinner");

    // 沒登入就導回首頁
    if (!token){
        window.location.href = "/";
        return;
    }

    // 檢查登入狀態，顯示登入 / 登出
    try {
        const res = await fetch("/api/user/auth", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const result = await res.json();
        // console.log(result.data.name);

        if (result.data) {
            //顯示使用者名稱
            bookingTitle.textContent = `您好，${result.data.name}，待預訂的行程如下：`;
            
            userNameInput.value = `${result.data.name}`;
            userEmailInput.value = `${result.data.email}`;
            
            loginTrigger.textContent = "登出系統";

            loginTrigger.addEventListener("click", () => {
                localStorage.removeItem("token");
                window.location.href = "/";
            });
        } else {
            // token無效，導回首頁
            window.location.href = "/";
        }
    } catch (err) {
        console.error("無法取得登入狀態", err);
        window.location.href = "/";
        return;
    }

    // 嘗試取得預約資料
    loadingSpinner.style.display = "flex";

    try {
        const response = await fetch("/api/booking", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (!result.data){
            showAllInfo.style.display = "none";
            noBookingSection.style.display = "block";
            document.querySelector(".user-info").style.display = "none";
            document.querySelector(".user-payment-info").style.display = "none";
            footer.style.display = "flex";
            return;
        }
        // 取得資料
        const booking = result.data;
        const attraction = booking.attraction;

        //更新畫面、文字
        const spotName = document.querySelector(".taipei-1day-spot");
        const dateValue = document.querySelector(".date").querySelector("span").nextSibling;
        const timeValue = document.querySelector(".time").querySelector("span").nextSibling;
        const feeValue = document.querySelector(".fee").querySelector("span").nextSibling;
        const locationValue = document.querySelector(".location").querySelector("span").nextSibling;
        const totalFee = document.querySelector(".show-fee");
        
        spotName.textContent = `台北一日遊：${attraction.name}`;
        dateValue.textContent = booking.date;
        timeValue.textContent = booking.time === "morning" ? "早上9點到下午4點" : "下午2點到晚上9點";
        feeValue.textContent = `新台幣${booking.price}元`;
        locationValue.textContent = attraction.address;
        totalFee.textContent = `總價：新台幣${booking.price}元`;

        loadingSpinner.style.display = "none";

        // 更新圖片
        const imgContainer = document.querySelector(".attraction-img");
        imgContainer.style.backgroundImage = `url("${attraction.image}")`;

        showAllInfo.style.display = "block";
        footer.style.display = "flex";

    } catch (error){
        console.error("取得預約資料失敗", error);
        // bookingSection.style.display = "none";
        showAllInfo.style.display = "none";
        noBookingSection.style.display = "block";
        
    } finally{
        loadingSpinner.style.display = "none";
    }

    const showBooking = document.getElementById("booking");
    showBooking.addEventListener("click", () => {
        loadingSpinner.style.display = "flex";
        setTimeout(() => {
            window.location.href = "/booking";
        }, 300); // 等個 300ms 讓 loading 出現
    });

    const deleteBooking = document.getElementById("trash-can");
    deleteBooking.addEventListener("click", async () => {
        const confirmDelete = confirm("確定要刪除預約嗎？");
        if (!confirmDelete) return;
        const token = localStorage.getItem("token");

        loadingSpinner.style.display = "flex";

        try{
            const response = await fetch("/api/booking", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // alert("已成功刪除預約！");
                window.location.reload();
                
            } else {
                alert(result.message || "刪除失敗");
            }
        } catch (error) {
            console.error("刪除時發生錯誤", error);
            alert("無法連線伺服器，請稍後再試");
        } finally {
            loadingSpinner.style.display = "none";
        }
    });

    const payMoneyBtn = document.getElementById("confirm-and-pay");
    payMoneyBtn.addEventListener("click", async () => {
        const tappayStatus = TPDirect.card.getTappayFieldsStatus();
        if (!tappayStatus.canGetPrime) {
            alert("請填寫完整且正確的信用卡資訊！");
            return;
        }

        

        try {
            const prime = await getPrimeAsync();
            console.log("取得 Prime 成功：", prime);

            const contactName = document.getElementById("user-name").value;
            const contactEmail = document.getElementById("user-email").value;
            const contactPhone = document.getElementById("user-phone").value;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRefex = /^09\d{8}$/;

            if (!contactName || !contactEmail || !contactPhone) {
                alert("請填寫完整聯絡資訊！");
                return;
            }
            if (!emailRegex.test(contactEmail)){
                alert("請填入正確的 Email 格式！");
                return;
            }
            if (!phoneRefex.test(contactPhone)){
                alert("請填寫正確的台灣手機號碼 ( 09 開頭 )！");
                return;
            }

            loadingSpinner.style.display = "flex"; 
            
            const token = localStorage.getItem("token");
            const bookingRes = await fetch("/api/booking", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            const bookingResult = await bookingRes.json();
            const booking = bookingResult.data;

            if (!booking) {
                alert("尚未預約行程！");
                return;
            }

            const orderData = {
                prime: prime,
                order: {
                    price: booking.price,
                    trip: {
                        attraction: booking.attraction,
                        date: booking.date,
                        time: booking.time
                    },
                    contact: {
                        name: contactName,
                        email: contactEmail,
                        phone: contactPhone
                    }
                }
            };

            const orderRes = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            const orderResult = await orderRes.json();
            if (orderResult.data) {
                const { number, payment } = orderResult.data;
                if (payment.status === 0) {
                    window.location.href = `/thankyou?number=${number}`;
                } else {
                    alert("付款失敗，請重新確認卡片資訊或聯絡客服");
                }
            } else {
                alert("建立訂單失敗：" + (orderResult.message || "未知錯誤"));
            }

        } catch (error) {
            console.error("送出訂單失敗：", error);
            alert("發生錯誤，請稍後再試");
        } finally {
            loadingSpinner.style.display = "none";
        }
    });

});


window.addEventListener("load", function () {
    // 等待 TapPay SDK 可用
    if (typeof TPDirect === "undefined") {
        console.error("TapPay SDK 尚未載入");
        return;
    }

    // TapPay 初始化
    TPDirect.setupSDK(
        159825,
        'app_5hClyHplrlWTOX1aBmLHvwzMBJJmryrKw1JYHC2d65WB6tHZm3GrpmQB6N2B',
        'sandbox'
    );

    TPDirect.card.setup({
        fields: {
            number: {
                element: '#card-number',
                placeholder: '**** **** **** ****'
            },
            expirationDate: {
                element: '#card-expiration-date',
                placeholder: 'MM / YY'
            },
            ccv: {
                element: '#card-ccv',
                placeholder: 'CVV'
            }
        },
        styles: {
            'input': {
                'color': 'gray',
                'font-size': '16px'
            },
            '.valid': {
                'color': 'green'
            },
            '.invalid': {
                'color': 'red'
            }
        }
    });
    
    console.log("TapPay SDK 初始化完成");
});
