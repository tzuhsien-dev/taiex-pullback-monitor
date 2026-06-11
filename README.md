# 台股近期高點回落監控器

可部署到 GitHub Pages 的純靜態台股指數監控工具。網站沒有後端、serverless function 或 `/api` route。完整歷史資料預先產生並提交至 repo；使用者只需在瀏覽器中更新最近月份，結果儲存在該瀏覽器的 `localStorage`。

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

本機品質檢查：

```bash
npm run lint
npm test
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

GitHub Pages 設定：

1. `Settings` → `Pages`
2. Source 選擇 `GitHub Actions`
3. push 到 `main` 後，`.github/workflows/deploy.yml` 會自動 build 並部署 `dist`

## 資料更新

頁面右上角提供：

- `更新最新資料`：瀏覽器只向 TWSE 讀取加權指數與加權報酬指數最近兩個月份，和內建完整歷史合併後儲存在 `localStorage`
- `清除本地資料`：清除瀏覽器中的手動更新資料，回到 repo 內建完整歷史 JSON 或範例資料

資料來源優先序：

1. CSV 上傳資料
2. 本地手動更新資料
3. 內建靜態資料 `public/data/*.json`
4. 內建範例資料

手動更新只影響目前使用者的瀏覽器，不會寫回 GitHub repo，也不會同步給其他使用者。

資料更新可在進行中取消；單次 TWSE 請求逾時或失敗時會顯示對應指數與月份。

## 維護完整歷史資料

維護者可在本機執行：

```bash
npm run data:refresh
```

腳本會從 TWSE 分月下載官方可取得的完整資料：

- 加權指數：自 1999-01-05
- 加權報酬指數：自 2003-01-02

完成後會更新 `public/data/taiex-price.json`、`public/data/taiex-total-return.json` 與 `public/data/metadata.json`。檢查變更後提交到 GitHub，即可讓所有使用者直接載入完整歷史資料，不需要各自在瀏覽器下載數百個月份。

工作樹乾淨且位於 `main` 時，可用單一指令完成下載、測試、commit 與 push：

```bash
npm run data:publish
```

其他模式：

```bash
npm run data:publish -- --dry-run  # 驗證後還原資料檔，不 commit、不 push
npm run data:publish -- --no-push  # 建立 commit，但不 push
```

發布腳本只允許三個 `public/data` 檔案產生變更，不使用 force push；任何下載、測試或 build 失敗都不會推送。

## CSV 備援格式

上傳 CSV 後會改用 CSV 資料進行所有計算。

```csv
date,index
2024-01-01,18000
2024-01-02,18120
```

CSV 支援 UTF-8 BOM、引號欄位與重複日期；同一日期重複出現時採用最後一筆。切換指數類型後會離開目前 CSV，回到該指數的一般資料來源。

## 近期高低點判定模式

本工具支援三種近期高低點判定方式：

- 固定期間高低點：近期高點與近期低點分別是最近 N 筆資料中的最大值與最小值。
- ZigZag 波段高低點：價格反向移動超過使用者設定的 pivot threshold 後，才確認波段高點或低點。
- 波動度調整 ZigZag：用最近 `volLookback` 日平均絕對日報酬乘上倍數，自動產生 pivot threshold，並限制在 min/max threshold 之間。

ZigZag 高低點需要等價格反向移動超過門檻後才會確認，因此不會在轉折當下即時確認。

設定會保存在目前瀏覽器。接近門檻固定為所選回落門檻的 70%，例如回落門檻 10% 時，回落 7% 起顯示「接近」。

走勢圖下方可拖曳日期選取器縮放顯示區間，縮放不會改變回落計算結果；切換指數、觀察期或高低點模式後會自動重設。

## 公式

- 最新指數：`currentIndex = 最新一筆資料的 index`
- 固定期間近期高點：`rollingHigh = 最近 N 筆資料中的最大 index`
- 固定期間近期低點：`rollingLow = 最近 N 筆資料中的最小 index`
- 波動度調整門檻：`pivotThreshold = clamp(avgAbsReturn * multiplier, minThreshold, maxThreshold)`
- 相對近期高點回落：`pullback = currentIndex / rollingHigh - 1`
- 相對近期低點反彈：`reboundFromLow = currentIndex / rollingLow - 1`
- 門檻點位：`thresholdIndex = rollingHigh * (1 - pullbackThreshold)`
- 距離門檻點數：`distanceToThresholdPoints = currentIndex - thresholdIndex`
- 距離門檻百分比：`distanceToThresholdPercent = currentIndex / thresholdIndex - 1`

狀態判斷：

- `pullback <= -pullbackThreshold`：已達近期高點回落門檻
- `pullback <= -(pullbackThreshold * 0.7)`：接近回落門檻
- 其他：尚未達回落門檻

畫面會用「回落 10.00%」這種正向方式顯示 pullback，避免負數造成混淆。

## 資料來源

資料來源為 TWSE 臺灣證券交易所官方資料：

- 加權指數：發行量加權股價指數歷史資料 `MI_5MINS_HIST`
- 加權報酬指數：發行量加權股價報酬指數 `MFI94U`

資料腳本與前端更新都會處理民國年轉西元、含逗號數字轉 number、日期排序與去重。前端增量更新不會裁掉內建歷史資料。

## 免責聲明

此工具僅用於歷史資料與條件篩選，不構成投資建議。指數回落訊號不代表未來報酬，也不代表任何買賣建議。
