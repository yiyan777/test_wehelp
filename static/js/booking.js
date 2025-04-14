document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const bookingSection = document.getElementById("booking-detail");
    const noBookingSection = document.getElementById("no-booking");
    const loginTrigger = document.getElementById("login-trigger");
    const bookingTitle = document.querySelector(".booking-title");
    const showAllInfo = document.querySelector(".all-info");
    const userNameInput = document.querySelector("#user-name");
    const userEmailInput = document.querySelector("#user-email");

    // 沒登入就導回首頁
    if (!token){
        window.location.href = "/";
        return;
    }

    // ✅ 檢查登入狀態，顯示登入 / 登出
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
    try {
        const response = await fetch("/api/booking", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (!result.data){
            // bookingSection.style.display = "none";
            showAllInfo.style.display = "none";
            noBookingSection.style.display = "block";
            document.querySelector(".user-info").style.display = "none";
            document.querySelector(".user-payment-info").style.display = "none";
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

        // 更新圖片
        const imgContainer = document.querySelector(".attraction-img");
        imgContainer.style.backgroundImage = `url("${attraction.image}")`;

    } catch (error){
        console.error("取得預約資料失敗", error);
        // bookingSection.style.display = "none";
        showAllInfo.style.display = "none";
        noBookingSection.style.display = "block";
    }
    const showBooking = document.getElementById("booking");
    showBooking.addEventListener("click", () => {
        window.location.href = "/booking";
    });

    const deleteBooking = document.getElementById("trash-can");
    deleteBooking.addEventListener("click", async () => {
        const confirmDelete = confirm("確定要刪除預約嗎？");
        if (!confirmDelete) return;
        const token = localStorage.getItem("token");
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
        }
    });
});