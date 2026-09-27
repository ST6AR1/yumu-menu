# 上傳到 Cloudflare Pages（不是 Workers）

你目前的 `*.workers.dev` 網址背後是一個自訂 Cloudflare Worker，我測過它回應影片的方式不正確：
瀏覽器跟它要「影片的一部分」（Range request）時，它不理會 Range，直接把整支影片整包送回去。
iPhone Safari 播放影片非常依賴這個機制，拿不到正確回應就會拒絕自動播放，只顯示一顆播放鍵——這正是你截圖看到的狀況。同一支影片放在 Vercel 上，這個回應是正確的，所以那邊完全正常。

這不是網站程式碼的問題（我已經另外加強了程式，就算真的被擋下也會直接跳過、不會卡住），但**如果想繼續用 Cloudflare 且讓影片正常自動播放，请改用 Cloudflare Pages**，不要用 Workers。Pages 是 Cloudflare 官方的靜態網站託管，本來就會正確處理影片的 Range 請求，不需要自己寫程式去處理。

## 上傳步驟

1. 登入 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 左側選單 **Workers & Pages** → 右上角 **Create** → 選 **Pages** 分頁 → **Upload assets**
3. Project name 隨意取（例如 `yumu-menu`）
4. 把這個資料夾**裡面的所有檔案**（`index.html`、`css`、`js`、`images`、`assets`…）整包拖進上傳區塊 → **Deploy site**
5. 約 10～20 秒後會拿到網址：`https://<project 名稱>.pages.dev`

之後要更新內容，一樣進這個 Pages 專案，**Create deployment** 再拖一次新版檔案即可，網址不會變。

## 換內容的方法（跟 GitHub 版一樣）

- 換價目表圖片：覆蓋 `images/` 裡對應的檔案（維持 1080×1920）
- 調整頁面順序、目錄名稱：編輯 `js/pages.js`
- 換開場影片：覆蓋 `assets/intro.mp4`
