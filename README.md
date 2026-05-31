# 台股近期高點回落監控器

可部署到 GitHub Pages 的純靜態台股指數監控工具。前端只讀取靜態 JSON，不使用後端、serverless function 或 `/api` route。真實資料由 GitHub Actions 定時從 TWSE 抓取並更新到 `public/data/*.json`。

## 安裝

```bash
npm install
```

## 本機啟動

```bash
npm run dev
```

建置：

```bash
npm run build
```

手動更新 TWSE 靜態資料：

```bash
npm run update:data
```

## GitHub Pages 部署

此專案預設 repo 名稱為 `taiex-pullback-monitor`，所以 production build 的 Vite `base` 預設為：

```ts
/taiex-pullback-monitor/
```

如果你的 repo 名稱不同，請在 `vite.config.ts` 修改預設 base，或在 GitHub Actions build 時設定：

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

如果使用自訂網域，base 通常可設為 `/`。

## GitHub Actions 權限

請到 GitHub repo：

1. `Settings` → `Actions` → `General`
2. 確認 workflow 允許使用 `GITHUB_TOKEN` 寫入 repo
3. `Settings` → `Pages`
4. Source 選擇 `GitHub Actions`

## 資料更新

`.github/workflows/update-data.yml` 會在週一至週五 UTC 11:00 執行，約台灣時間晚上 7 點，也支援手動 `workflow_dispatch`。

流程會執行：

```bash
npm run update:data
```

並產生：

- `public/data/taiex-price.json`
- `public/data/taiex-total-return.json`
- `public/data/metadata.json`

若檔案有變動，workflow 會自動 commit 回 `main`。

## CSV 備援格式

前端保留 CSV 上傳。上傳後會改用 CSV 資料進行所有計算，資料來源會顯示為「CSV 上傳資料」。

```csv
date,index
2024-01-01,18000
2024-01-02,18120
```

## 近期高點不是歷史高點

本工具計算的是使用者指定觀察期 N 筆交易日內的最高點，例如 60 日、120 日、250 日高點，不是台股歷史最高點。

## 公式

- 最新指數：`currentIndex = 最新一筆資料的 index`
- 近期高點：`rollingHigh = 最近 N 筆資料中的最大 index`
- 回落後低點：若近期高點不是最新日，取近期高點後到最新日之間的最低點；若最新日創高，取最新日前最多 10 筆交易日內低於最新指數的最低點
- 相對近期高點回落：`pullback = currentIndex / rollingHigh - 1`
- 相對回落後低點反彈：`reboundFromLow = currentIndex / rollingLow - 1`
- 門檻點位：`thresholdIndex = rollingHigh * (1 - pullbackThreshold)`
- 距離門檻點數：`distanceToThresholdPoints = currentIndex - thresholdIndex`
- 距離門檻百分比：`distanceToThresholdPercent = currentIndex / thresholdIndex - 1`

狀態判斷：

- `pullback <= -pullbackThreshold`：已達近期高點回落門檻
- `pullback <= -nearThreshold`：接近回落門檻
- 其他：尚未達回落門檻

畫面會用「回落 10.00%」這種正向方式顯示 pullback，避免負數造成混淆。

## 資料來源

資料來源為 TWSE 臺灣證券交易所官方資料：

- 加權指數：發行量加權股價指數歷史資料 `MI_5MINS_HIST`
- 加權報酬指數：發行量加權股價報酬指數 `MFI94U`

GitHub Actions 抓取資料時會處理：

- 民國年轉西元 `YYYY-MM-DD`
- 含逗號數字轉 number
- 依日期由舊到新排序
- 只保留最近 1000 筆交易日
- TWSE 欄位格式改變時輸出清楚錯誤

## 免責聲明

此工具僅用於歷史資料與條件篩選，不構成投資建議。指數回落訊號不代表未來報酬，也不代表任何買賣建議。
