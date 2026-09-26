# 芸莯 YUMU 線上手冊

手機優先的線上翻頁價目表（純 HTML / CSS / JS，不需要安裝或打包）。

## 上傳到 GitHub 並開啟 GitHub Pages

1. 登入 GitHub，右上角 **+ → New repository**
2. Repository name 隨意取（例如 `yumu-menu`），選 **Public**，按 **Create repository**
3. 在新 repo 頁面點 **uploading an existing file**，把這個資料夾**裡面的所有檔案與資料夾**（`index.html`、`css`、`js`、`images`、`assets`、`.nojekyll`…）整包拖進去，按 **Commit changes**
   - 注意是拖「裡面的內容」，不是外層資料夾；`index.html` 必須在 repo 最上層
4. 進 repo 的 **Settings → Pages**
5. **Build and deployment → Source** 選 **Deploy from a branch**，Branch 選 **main**、資料夾選 **/ (root)**，按 **Save**
6. 等 1～2 分鐘，網址會顯示在同一頁上方：
   `https://<帳號>.github.io/<repo 名稱>/`

## 之後如何更新內容

- **換價目表圖片**：把新圖（1080×1920）放進 `images/`，用相同檔名覆蓋即可
- **新增 / 調整頁面順序、目錄名稱**：編輯 `js/pages.js`
- **換開場影片**：覆蓋 `assets/intro.mp4`（建議 10 秒內，越小載入越快）
- 更新後 GitHub Pages 約 1 分鐘內自動生效；若沒變，請強制重新整理瀏覽器
