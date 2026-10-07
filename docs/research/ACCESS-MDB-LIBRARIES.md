# 從 macOS / Linux 容器讀寫 Access 97（Jet 3.x）MDB 的套件評估

> 撰寫日期：2026-10-08
> 範圍：`LEGACY-CRM-REBUILD-PLAN.md` 第 11.1 節「新舊版同時共存」的套件層研究（檔案層的 SMB 掛載、oplock 不在本文範圍）
> 測試資料：全部用合成 MDB 或 Jackcess 專案公開的 Access 97 測試檔，沒有連線區網、沒有讀任何真實 MDB
> 測試環境：macOS 15.7.3（arm64）、Temurin 21.0.12.1、Node v25.6.0（nvm 預設；mdb-reader 官方支援 18–24）、Python 3.9.6、mdbtools 1.0.1（Homebrew）

---

## 1. 結論與建議

**跨平台套件沒有一個能寫入 Access 97。** Jackcess 官方 FAQ 寫明 "Access 97 read-only"，UCanAccess 也一樣。實測 Jackcess 2.1.2、4.0.8、5.0.3 與 UCanAccess 5.1.8 都拒絕寫入 Jet 3 檔。如果用反射把唯讀旗標硬關掉，寫出來的列連 Jackcess 自己都讀不回來，中文字串的索引鍵也算錯，形同毀損檔案。所以 11.1 節「Jackcess 可開啟 Access 97 檔並讀寫」「Jackcess 是唯一跨平台可寫方案」兩句都要更正。

唯讀方面，**Jackcess 5.0.3 以 Java side-car 執行是目前最好的選擇**。它會讀 MDB 檔頭的字碼頁（950）並自動改用 `x-windows-950` 解碼，結果與 Windows 對造字區（EUDC）的對應完全一致，包括 `FA40–FEFE → U+E000–U+E310` 等範圍。Currency 讀成 `BigDecimal`，四位小數精確；日期正確，`SortOrder 1028` 也能辨識成 "Chinese Traditional"。不過所有跨平台套件都**不實作 Jet 的 `.ldb` 與 byte-range lock 協定**。在 VB6 寫入的同時讀取，不會弄壞檔案，但可能讀到寫到一半的頁面，資料可能不一致，也可能直接丟例外，只能靠「複製快照、比對前後 mtime 與大小、失敗重試」來降低風險。

**要寫入，或要與 VB6 同時寫入，唯一可行的是 Windows 端的 32 位元 Jet bridge。** 這種 bridge 用的是和 VB6 相同的 Jet 引擎，會參與 `.ldb` 鎖定。代價是多一台 Windows 與一套服務要維護。本研究支持 11.1 節的預設結論：**不共存，整批切換**。

| 需求 | 推薦方案 | 次選 | 風險等級 | 主要風險 |
|---|---|---|---|---|
| 唯讀即時讀取（舊系統仍是主資料來源） | Jackcess 5.0.3 side-car（JRE 需含 `jdk.charsets`）。讀取時先把 MDB 複製到本機快照再解析 | mdbtools `mdb-export`（Linux 下的 EUDC 對應需再驗證）；mdb-reader 需要修補才能正確解 950 | **中低** | 沒有鎖定協定，可能讀到不一致的快照；不會損壞來源檔 |
| 寫入 | Windows 32 位元 bridge（.NET x86 + `Microsoft.Jet.OLEDB.4.0`，或 DAO 3.6） | 沒有。跨平台套件都不能寫 Jet 3 | Linux 端：**不可行**；bridge：**中** | bridge 要靠 Windows 內建的 Jet 4.0 與 `msrd3x40.dll`（Jet 3.x ISAM）；Microsoft 已不再發展 Jet |
| 與 VB6 同時開啟 | 讀：同第一列，加上重試。寫：只有 Windows Jet bridge | — | 讀：**中**；Linux 寫：**高（禁止）**；Jet bridge 寫：**中** | 非 Jet 的寫入者會繞過 `.ldb` 與頁鎖，必然有損毀風險 |
| （參考）一次性移轉 | 現行 Jackcess 匯出 CSV 的流程即可，建議改用 5.0.3 | mdbtools | 低 | 字碼頁要明確指定（見 2.1） |

---

## 2. 各候選詳評

### 2.1 Jackcess（Java）＋ jackcess-encrypt

| 項目 | 內容 |
|---|---|
| 維護 | 很活躍。5.0.0（2026-09-12，最低 Java 11）、5.0.1（09-19）、5.0.2（09-25）、5.0.3（2026-10-06）。GitHub `jahlborn/jackcess` 沒有未關 issue。jackcess-encrypt 5.0.2（2026-10-06）。現有 `isin-java/Isin/lib` 是 2.1.2（2015 年），版本太舊 |
| 授權 | Apache-2.0 |
| Access 97 讀 | 支援。Text、Memo、Currency、Date、Boolean、Long 都正確（見第 3 節）|
| Access 97 寫 | **不支援**。2.1.2 開檔就丟 `file format [V1997] does not support writing`；5.0.3 開檔時自動降為唯讀，`addRow` 丟 `NonWritableChannelException`；`create(V1997)` 也被拒絕。用反射強開的實驗見 3.4，結果是毀損 |
| Access 2000（Jet 4）讀寫 | 支援。Currency 帶四位小數（含 ±922337203685477.5807 的極值）、Memo、PUA 字元、自動編號都能正確寫入並讀回 |
| 字碼頁 | 5.0.3 起**依檔頭的 code page 自動選 charset**，changelog 寫的是 "Read Jet 3 text with the charset the database's own code page names"。4.0.x 以前用平台預設字集；Java 18 起預設是 UTF-8，不明確呼叫 `setCharset` 就會全部變成 U+FFFD（已實測）。`setCharset(Charset)` 可以手動指定 |
| PUA 造字 | `x-windows-950` 就是 Windows 的對應：`FA40–FEFE→U+E000–U+E310`、`8E40–A0FE→U+E311–`、`8140–8DFE→U+EEB8–`、`C6A1–C8FE→U+F6B1–U+F848`，實測全部可往返 |
| 打包陷阱 | `x-windows-950` 在 `jdk.charsets` 模組裡。用 jlink 或精簡 JRE 卻沒帶這個模組時，自動偵測會**靜默**解成 U+FFFD，明確指定則丟 `UnsupportedCharsetException`（已實測） |
| 索引與 SortOrder 1028 | 5.0.3 把 1028 辨識成 `SortOrder[1028(0,-1), Chinese Traditional]`。5.0.2 changelog 寫 "Treat a text index in a jet 3 file as read only unless its locale is english"。對唯讀匯出沒有影響（全表掃描不靠索引），只是不能用該索引查找。4.0.11 起有系統屬性可以寫出「broken」索引，再交給 Access 修復，但只適用 Jet 4 以上 |
| 自動編號 | Jet 4 正常；Jet 3 不可寫，不適用 |
| `.ldb` 與鎖定 | **沒有實作。** 不建立也不檢查 `.ldb`，不對 MDB 加 byte-range lock（實測後資料夾裡沒有任何鎖定檔）。社群的一致看法是 Jackcess "really only for use by a single opener"，與其他使用者同時寫入不受支援 |
| 與 DAO 並行 | 讀：Jackcess 以頁為單位隨用隨讀，DAO 寫到一半時可能讀到新舊頁混雜，結果是例外或資料不一致，但**不會寫壞來源檔**。寫：Jet 3 本來就不能寫 |
| jackcess-encrypt | 只在 MDB 用過 Access 97「加密資料庫」（RC4 頁加密）或特殊 codec 時才需要。資料庫密碼不影響 Jackcess 讀取。本研究的合成檔沒有加密，未實測 |
| 容器 | 只需要 JRE 11 以上。jlink 精簡 JRE（`java.base,java.sql,java.logging,jdk.httpserver,jdk.charsets`）實測 **37 MB**，加上 Jackcess jar 1.3 MB（5.x 沒有執行期相依套件）。用 `eclipse-temurin:21-jre-alpine` 也可以，但比較大 |
| side-car 型態 | 建議做成一個小 Java 服務（JDK 內建 `com.sun.net.httpserver` 即可，不需要框架），提供 `GET /tables/:name?since=…` 回傳 JSON 或 NDJSON。或者更簡單，維持 CLI 形式，定時把 CSV 或 NDJSON 輸出到 volume，由 Nest 匯入。HTTP 比 gRPC 簡單，資料量也夠用 |
| 效能 | 20 萬列（Jet 4）全表掃描 178 ms（M 系列 Mac）|

### 2.2 mdbtools（C：libmdb、`mdb-export`、`mdb-sql`）

| 項目 | 內容 |
|---|---|
| 維護 | 中等。最新 release v1.0.1（2024-12-26），repo 最後 push 2026-09-29，open issues 71 個，有 OSS-Fuzz |
| 授權 | libmdb 是 LGPL，utils 是 GPL-2.0。以 CLI 呼叫不會讓我方程式碼受 GPL 約束 |
| Access 97 讀 | 支援（`mdb-ver` 顯示 `JET3`）。Currency 輸出四位小數字串，正確 |
| 寫 | **不支援**。整套工具只讀 |
| 字碼頁 | 沒有設環境變數時，**依檔頭 code page 選 iconv 名稱**：原始碼 `iconv.c` 寫 `case 950: "BIG-5"`。可用 `MDB_JET3_CHARSET` 覆蓋。macOS 的 libiconv 用 `BIG-5`/`BIG5` 時，EUDC 會正確對到 U+E000 起的 PUA；**指定 `CP950` 反而會讓 EUDC 變成 `?`，後面的尾碼位元組也會漏出來**；`BIG5-HKSCS` 會把 EUDC 誤解成 HKSCS 字（例如 `湙`、`𠕇`）。Linux（glibc 或 musl）的 iconv 對 `BIG-5` 的 EUDC 行為**本研究未能實測**（Docker daemon 在測試期間卡住），導入前必須在目標映像裡驗證 |
| 其他問題 | `mdb-export` 預設日期是**兩位數年份**（`01/01/11` 分不出 1911 和 2011），必須加 `-T '%F %T'`；**空字串和 NULL 不分**（`-0 NULL` 時兩者都輸出 NULL）；`mdb-sql` 對 Currency 欄的 WHERE 條件無效（`Calling mdb_test_sarg on unknown type… type 5`），會直接回傳全部列 |
| `.ldb` 與鎖定 | 沒有實作，也不檢查 `.ldb` |
| 與 DAO 並行 | 與 Jackcess 相同：讀取期間可能看到不一致的頁面，不會寫壞檔案 |
| 容器 | Debian 有 `mdbtools` 套件（bookworm 是 1.0.0），Alpine 有 `mdbtools`。相依 glib，映像約增加 10–20 MB（估計，未實測）|
| 效能 | 20 萬列 `mdb-export` 0.68 s |

### 2.3 Node 純 JS：`mdb-reader`

| 項目 | 內容 |
|---|---|
| 維護 | 活躍。v3.2.0（2026-02-18），repo 最後 push 2026-10-07，open issues 18 個。MIT。`node-mdb` 等其他 npm 套件不是包裝 mdbtools 就是早已停更，不建議 |
| 支援範圍 | README 列出 Access 97（Jet 3）到 2019。**只能讀** |
| 型別 | Currency 回傳**字串**（`"1234.5678"`，精確）；Date 回傳 `Date`（以 UTC 表示牆上時間）；空字串和 NULL 有區分 |
| 字碼頁 | **Jet 3 文字寫死用 windows-1252 解碼**（`unicodeCompression.js`：`if (format.textEncoding === "unknown") return decodeWindows1252(buffer)`），沒有選項可以指定 charset，也不讀檔頭 code page |
| 變通辦法 | 把字串用 windows-1252 編回位元組，再解成 950。但有兩個缺口：(1) 內建的 1252 解碼把 `0x81/0x8D/0x8F/0x90` 變成 U+FFFD，**這幾個位元組剛好是 EUDC `8140–90FE` 範圍的前導位元組，會遺失**；(2) `iconv-lite` 的 `cp950` **沒有 EUDC**，`FA40` 會變成 `�@`。要正確處理只能 fork 或用 patch-package 修改 `uncompressText`，讓它回傳原始位元組，再自己寫 950 加 EUDC 的解碼器（公式簡單，約 30 行）|
| `.ldb` 與鎖定 | 沒有。它一次把整個檔案讀進 Buffer 再解析，解析本身是對同一份 bytes 操作，但「讀檔」那一步經過 SMB 並不是原子操作 |
| 容器 | 純 JS，`node_modules` 約 0.9 MB，不需要 native 相依，直接放進現有 backend 映像即可 |
| 效能 | 20 萬列 2.8 s，heap 約 96 MB（整檔載入記憶體）|

### 2.4 Python：`access_parser`、`pandas_access`、`meza`、`pyodbc`

| 套件 | 維護與授權 | Jet 3 | 950 與 PUA | Currency、日期 | 評語 |
|---|---|---|---|---|---|
| `access_parser`（claroty）| 0.0.6（2025-01），Apache-2.0，open issues 15 個 | 讀得出來 | Jet 3 文字先試 UTF-8，失敗就用 latin1，沒有 charset 參數。latin1 可以無損編回位元組，但 Python 的 `cp950` **沒有 EUDC**，而且 `C6A1–C8FE` 的對應和 Windows 不同（例如 `C7E9` 會解成 `①`，Windows 則是 U+F796），需要自訂 codec | Currency 回傳**未縮放的 int64**（`12345678` 表示 1234.5678）；**1899-12-30 變成字串 `"(Empty Date)"`**；空字串變成 `None` | 不建議 |
| `pandas_access` | 0.0.1（2016），repo 2023 後無更新，MIT | 透過 mdbtools CLI | 同 mdbtools | 日期是兩位數年份字串 | **在 NumPy 2 下直接壞掉**（`np.float_` 已移除），已實測；不建議 |
| `meza` | 0.47.0（2025-02），MIT | 透過 `mdb-export` | 同 mdbtools | 全部是字串，日期兩位數年份 | 只是 mdbtools 的薄包裝，沒有額外價值 |
| `pyodbc` + Access ODBC | — | 只能在 Windows 上搭配 32 位元 Jet ODBC（`Microsoft Access Driver (*.mdb)`）| 由 Jet 處理 | 由 Jet 處理 | 本質上就是 2.5 的 Windows bridge，只是換成 Python 寫 |

### 2.5 Windows 端 bridge（.NET x86 + `Microsoft.Jet.OLEDB.4.0`，或 DAO 3.6）：純文獻評估

- **原理**：在一台 Windows 機器上執行小服務（例如 ASP.NET Core 或 .NET Framework 4.8 的 Windows Service，**必須編成 x86**），用 Jet 4.0 OLE DB 開啟 `\\ISIN\isin\*.mdb`，對外提供 HTTP API。Jet 4.0 透過 Jet 3.x ISAM（`msrd3x40.dll`）存取 Access 97 檔，並且**參與 `.ldb` 與 byte-range lock 協定**，所以是唯一能與 VB6/DAO 安全並行寫入的方案。
- **需要的 Windows 版本**：Jet 4.0 SP8 是 Windows 內建元件（在 `SysWOW64`），Win7、Win10、Win11、Windows Server 2012 R2 到 2022 都有，但**只有 32 位元**（Microsoft KB 957570："available in 32-bit versions only"）。ACE（Access Database Engine 2010 以後）雖然有 64 位元版，但**從 Access 2013 起移除了 Jet 3.x IISAM，不能開啟 Access 97 檔**，所以不能拿 ACE 取代 Jet 4.0。
- **限制與風險**：
  - Jet 已停止發展，只收安全更新。2019 年 1 月的 Windows 更新就曾讓 Jet 3 格式檔出現 "Unrecognized Database Format"（`msrd3x40.dll` 回歸，欄名超過 32 字元時觸發），之後在 KB4487022、KB4487023、KB4487025 等更新修復。bridge 主機的 Windows Update 要能控管。
  - `msrd3x40.dll` 曾有遠端執行漏洞（CVE-2019-1250 等），bridge 不能直接處理外部上傳的 MDB。
  - VB6 程式若用 DAO 3.51（Jet 3.5），bridge 用 Jet 4.0 加 Jet 3 ISAM 開同一份檔案，屬於 Microsoft 支援的混用情境，但仍然要先在副本上演練鎖定行為：寫入後 VB6 畫面何時看得到，取決於 DAO 的 page cache 與 `Refresh`。
  - Microsoft 對共用 MDB 的建議是 SMB 伺服器端**停用 oplock**（KB 296264），否則多台用戶端同時寫入時有損毀風險。這和 bridge 無關，是現況本來就存在的風險。
  - 多出一台 Windows 主機（可以就是 ISIN 本機），以及一套 .NET 服務的部署與監控。

### 2.6 UCanAccess（JDBC over Jackcess）

| 項目 | 內容 |
|---|---|
| 維護 | 活躍。由 `spannm/ucanaccess` 接手，5.1.8（2026-09-13，Java 11 以上），內建 fork 版 `io.github.spannm:jackcess` 5.1.7 與 HSQLDB 2.7.4。Apache-2.0 |
| Access 97 | **唯讀**。文件寫 "Access 97 format supported for read-only"；實測 UPDATE 丟 `UCAExc:::5.1.8 Access 97 is supported in read-only`，檔案沒有被改動 |
| 字碼頁 | 內建的 Jackcess fork **不讀檔頭 code page**。預設用平台 UTF-8，中文全部變 U+FFFD。加上連線屬性 `;charset=x-windows-950` 就正確，PUA 也對（已實測）|
| Jet 4 寫入 | 實測 INSERT（中文、PUA、Currency `-1234.5678`、Timestamp）與 `UPDATE … SET AMT = AMT + 0.0001` 都正確，Jackcess 與 mdbtools 讀回一致。過程中有一筆 `AbstractCursorCommand currentRowMatches` 警告 |
| 架構 | 連線時把**整個資料庫載入 HSQLDB 記憶體鏡像**（20 萬列約 1 s，RSS 383 MB），每次偵測到檔案被其他程序修改就重新載入。對幾十萬列的工件、訂單表來說，「即時」讀取的成本很高 |
| 多使用者 | 文件自己寫 "Very limited multiprocess access support"。`openExclusive=true` 只對 MDB 加 Java 檔案鎖，**不是 Jet 的 `.ldb` 協定**，VB6 看不到這個鎖 |
| 適用性 | 方便用 SQL 查，但對 Jet 3 沒有任何超過 Jackcess 的能力，記憶體與載入成本反而更高。唯讀情境下直接用 Jackcess 比較好 |

---

## 3. 實測記錄

所有檔案在 scratchpad：`/private/tmp/claude-501/-Users-isin-dev-isin/de5a0f4f-caaa-5f3e-be04-cdccf31d5be6/scratchpad/mdb-research/`（`java/`、`node/`、`venv/`、`data/`、`patch_jet3.py`、`hdr.py`）。

### 3.1 環境與套件版本

| 元件 | 版本 | 安裝位置 |
|---|---|---|
| Jackcess | 5.0.3、4.0.8（Maven Central）、2.1.2（`isin-java/Isin/lib`，唯讀引用）| scratchpad `lib/` |
| UCanAccess | 5.1.8 + `io.github.spannm:jackcess` 5.1.7 + hsqldb 2.7.4 | scratchpad `lib/` |
| mdbtools | 1.0.1_1 | Homebrew 全域 |
| mdb-reader / iconv-lite | 3.2.0 / 0.7.3 | scratchpad `node/` |
| access_parser / pandas_access / meza / pandas | 0.0.6 / 0.0.1 / 0.47.0 / 2.3.3 | scratchpad `venv/` |

### 3.2 合成資料怎麼來

1. **Jackcess 不能建立 V1997**：`new DatabaseBuilder(f).setFileFormat(V1997).create()` 丟 `IOException: File format V1997 [VERSION_3] does not support writing`，4.0.8 與 5.0.3 都一樣。
2. 因此分成兩組：
   - **Jet 4 完整組** `synth-v2000.mdb`：Jackcess 5.0.3 建立 V2000，資料表 `TEST(ID 自動編號 PK, CODE Text20 加索引, NAME Text100, AMT Currency, MEMO Memo, DT DateTime, FLAG Boolean)`，寫入 10 列，內容包含：一般中文、`鉅機械`、許功蓋（0x5C 尾碼）、EUDC 首尾 `U+E000/U+E310`、363 字的長 Memo、Currency `0.0001`、`-9876543.21`、`±922337203685477.5807/5808`，日期 1899-12-30、1900-01-01、1911-01-01、2038-01-19，以及空字串和 NULL。
     - 注意：V2000 **不能**呼叫 `setCharset(x-windows-950)`，否則系統目錄會解析失敗（`Did not find required parent table id`）。Jet 4 本身是 UTF-16，不需要指定。
   - **Jet 3 組**：從 Jackcess 公開測試檔（由真正的 Access 97 建立：`testV1997.mdb`、`testIndexCodesV1997.mdb`）以 `patch_jet3.py` **同長度位元組替換**，頁結構不變。
     - `synth-v1997-patched.mdb`：`Table1` 第 2 列 A=`鉅機1`、B=`許功蓋!`、Currency 3.5→**1234.5678**、日期→2026-10-08 13:45。
     - `synth-v1997-patched-text.mdb`：8 列文字 `台北X`、`X`、`許功1`、`蓋Z`、`臺灣!`、`C7E9C7EA`+`a`、`ＡＢ.`、`碁b`。
     - `hdr.py` 用 RC4 解開 Jet 3 檔頭，原檔是 sort 1033、code page 1252；另產生 **code page 950、sort 1028** 的版本 `synth-v1997-cp950*.mdb`，模擬繁中 Access 97 的檔頭。
     - 限制：只替換資料頁，索引頁沒有同步（讀取工具做全表掃描，不受影響）。列數受限於原測試檔，Jet 3 組沒有 10 列完整表，也沒有 Jet 3 的 Memo 測試。

### 3.3 讀取比對結果

| 套件 | Jet 4：中文、PUA | Jet 4：Currency | Jet 4：日期、NULL | Jet 3（檔頭 950）中文與 EUDC | Jet 3 Currency |
|---|---|---|---|---|---|
| Jackcess 5.0.3 | ✅ 10/10 一致 | ✅ `BigDecimal` | ✅ 空字串和 NULL 有區分 | ✅ **自動偵測 950**，EUDC 全對；`C7E9`→U+F796（同 Windows）| ✅ 1234.5678 |
| Jackcess 4.0.8 | ✅ | ✅ | ✅ | ❌ 沒有 `setCharset` 時全部 U+FFFD；指定 `x-windows-950` 就 ✅ | ✅ |
| Jackcess 2.1.2 | — | — | — | ✅（指定 charset）| ✅ |
| UCanAccess 5.1.8 | ✅ | ✅ | ✅ | ❌ 預設 U+FFFD；`;charset=x-windows-950` 就 ✅ | ✅ |
| mdbtools 1.0.1（macOS）| ✅ | ✅ 字串 | ⚠ 預設兩位數年份；空字串和 NULL 不分 | ✅ 檔頭 950→`BIG-5`，EUDC 全對；`MDB_JET3_CHARSET=CP950` 時 ❌（EUDC 變 `?`）| ✅ |
| mdb-reader 3.2.0 | ✅ | ✅ 字串 | ✅ | ❌ 寫死 1252；1252→cp950 變通後一般中文 ✅，EUDC ❌（U+FFFD）| ✅ |
| access_parser 0.0.6 | ✅ | ⚠ 未縮放 int64 | ⚠ 1899-12-30 變 `"(Empty Date)"`；空字串變 None | ❌ latin1；轉 cp950 後 EUDC ❌ | ⚠ int64 |
| pandas_access 0.0.1 | ✅（經 mdbtools）| 字串 | ⚠ 兩位數年份 | ❌ NumPy 2 直接崩潰 | — |
| meza 0.47.0 | ✅（經 mdbtools）| 字串 | ⚠ 兩位數年份 | 同 mdbtools | — |

代表性指令與輸出（PUA 以 `<U+XXXX>` 標示）：

```text
$ java -cp jackcess-5.0.3.jar Dump.java synth-v1997-cp950.mdb Table1 none     # 不指定 charset
[鉅<U+E0DB>機1, 許功蓋<U+E000>!, 2, 222, 333333333, 444.555, 2026-10-08T13:45, 1234.5678, true]
$ java -cp jackcess-5.0.3.jar IdxInfo.java synth-v1997-cp950.mdb Table1
charset=x-windows-950 defaultSortOrder=SortOrder[1028(0,-1), Chinese Traditional]
$ java -cp jackcess-4.0.8.jar … Dump.java synth-v1997-cp950.mdb Table1 none
[<U+FFFD>d<U+FFFD>~<U+FFFD><U+FFFD>1, …]          # 4.0.8 用平台 UTF-8
$ MDB_JET3_CHARSET=CP950 mdb-export synth-v1997-patched-text.mdb Table1  → "?~?~X"（EUDC 遺失）
$ mdb-export synth-v1997-cp950-text.mdb Table1                          → "<U+E0DB><U+E0DB>X"（依檔頭 950 → BIG-5）
$ echo "select ID,NAME,AMT from TEST where AMT < 0" | mdb-sql -P synth-v2000.mdb
Calling mdb_test_sarg on unknown type.  Add code to mdb_test_sarg() for type 5   → 回傳全部 10 列
$ node read.mjs synth-v1997-patched.mdb Table1 cp950  → {"A":"鉅<U+FFFD>~機1", …}（EUDC 遺失）
```

### 3.4 寫入測試

| 測試 | 結果 |
|---|---|
| Jackcess 2.1.2 以讀寫模式開 Jet 3 | `IOException: file format [V1997 [VERSION_3]] does not support writing`，檔案不變 |
| Jackcess 5.0.3 以讀寫模式開 Jet 3 再 `addRow` | 開檔成功但自動降為唯讀，`addRow` 丟 `NonWritableChannelException`，檔案不變（`cmp` 確認）|
| UCanAccess 5.1.8 對 Jet 3 執行 UPDATE | `Access 97 is supported in read-only`，檔案不變 |
| **反射強制關掉 `JetFormat.VERSION_3.READ_ONLY`**（`SeedJet3.java`，只為證明不可行）| `createTable` 回傳 null（目錄寫入失敗）；對既有表 `addRow`：第 2 列就因 `PrimaryKey` **唯一性誤判**而失敗（不同的中文字串被算成相同的索引鍵）；改用 ASCII 前綴後雖然寫得進去，但 mdbtools 讀出來的欄位全部位移成亂碼（例如 `D=25601`、`F=-5.7e+250`），**Jackcess 自己讀回時丟 `ArrayIndexOutOfBoundsException`**。結論：Jackcess 的 Jet 3 寫入路徑沒有完成，強開等於毀損檔案 |
| Jackcess 5.0.3 寫 Jet 4（`Seed.java`）| 10 列全部正確，mdbtools、mdb-reader、access_parser、UCanAccess 讀回都一致（各工具自己的型別問題除外）|
| UCanAccess 5.1.8 寫 Jet 4（`Ucan.java`）| INSERT 1 列（中文、PUA、Currency、Timestamp）＋ UPDATE Currency +0.0001，讀回一致 |

### 3.5 效能與映像大小（20 萬列 Jet 4 合成檔，12 MB）

| 工具 | 全表讀取 | 備註 |
|---|---|---|
| Jackcess 5.0.3 | 178 ms | 寫入 20 萬列 493 ms |
| mdbtools `mdb-export` | 0.68 s | — |
| UCanAccess | 約 1 s（含 HSQLDB 載入）| RSS 383 MB |
| mdb-reader | 2.8 s | heap 96 MB |
| access_parser | 5.8 s | — |

- jlink 精簡 JRE（含 `jdk.charsets`）：37 MB；不含 `jdk.charsets` 是 36 MB，但會讀出 U+FFFD。
- **未完成**：在 Linux 容器（Debian、Alpine）驗證 mdbtools 與 glibc/musl iconv 的 EUDC 行為。本機 Docker daemon 在測試期間沒有回應（同時有其他 SMB 研究容器在跑），容器一直停在 Created，已放棄並清除。

### 3.6 鎖定行為（文獻與觀察）

- 任何工具執行後，資料夾裡都**沒有出現 `.ldb`**；Jackcess、mdbtools、mdb-reader、access_parser 都不建立也不讀取 `.ldb`。
- Jet 的多使用者機制是：`.ldb` 記錄機器名與使用者名（每筆 64 bytes，最多 255 筆），**真正的鎖是對 `.ldb` 與 MDB 的 extended byte-range lock**（Microsoft "Understanding Microsoft Jet Locking" 白皮書）。非 Jet 的讀取者不會被擋，也不會擋別人，因此讀取不會造成損毀，但讀到的可能是 DAO 尚未完成的交易頁。
- 非 Jet 的寫入者完全繞過這套機制，會與 DAO 的頁快取和鎖衝突，這是**無法透過設定解決的結構性風險**。

---

## 4. 對 `LEGACY-CRM-REBUILD-PLAN.md` 11.1 節的建議修訂

- 「Jackcess（Java）可開啟 Access 97 檔並讀寫」→ 改為「**Jackcess 對 Access 97 只能讀**（官方 FAQ 與 2.1.2、4.0.8、5.0.3 實測皆同）；強制寫入會毀損檔案」。
- 「寫入：Jackcess（唯一跨平台可寫方案）」→ 改為「**沒有跨平台可寫方案**；寫入只能走 Windows 32 位元 Jet bridge」，並把 UCanAccess 也列為「Access 97 唯讀」。
- 唯讀候選表：把 `node-mdb` 換成 `mdb-reader`，並註明「Jet 3 寫死 1252，需要修補才能讀 950 與 EUDC」；`pandas_access` 註明「已停更、NumPy 2 不相容」；新增 `access_parser`（不建議）。
- 新增一條已知條件：「`SortOrder[1028(0)]` 是 Chinese Traditional 排序；Jackcess 5.0.2 起 Jet 3 非英文文字索引一律唯讀，**對全表匯出沒有影響**」。
- 第 3 節匯出流程與 11.1 節的 Jackcess 版本：建議從 2.1.2 升到 **5.0.3**（Java 11 以上），原因是 (1) 會自動讀檔頭字碼頁；(2) 修正了 Jet 3 索引與日期精度等問題；(3) 現行 Java 21 的預設字集是 UTF-8，舊版若漏掉 `setCharset` 就會亂碼。仍建議**明確指定** `x-windows-950`，同時把檔頭偵測結果記錄到 log。容器或精簡 JRE 必須包含 `jdk.charsets`。
- 「驗證重點」新增：在 `_isin_YYYYMMDD` 副本上 (1) 用 `mdb-ver` 或 `hdr.py` 確認檔頭 code page 是否為 950、sort 是否為 1028；(2) 統計文字欄中 `FA40–FEFE`、`8140–A0FE`、`C6A1–C8FE` 的位元組出現次數，確認造字範圍；(3) 比對 Jackcess 與 mdbtools 匯出的 CSV 是否逐欄一致。
- 檔案層（另一份研究）補一條：唯讀快照建議「複製到本機，比對複製前後的 mtime 與 size，不同就重試」，而不是直接在 SMB 上逐頁解析。
- Windows bridge 一列補充：只能用 x86 的 `Microsoft.Jet.OLEDB.4.0`（Windows 內建、32 位元），**ACE 2013 以後不能開 Access 97**；要控管 Windows Update（2019-01 曾有 Jet 3 回歸）；SMB 伺服器端建議停用 oplock（KB 296264）。
- 「可能的結論形態」維持**第 3 案（不共存，整批切換）為預設**。第 1 案（單向唯讀）的實作建議定為「Jackcess 5.0.3 CLI 或 side-car 加快照複製」，風險等級中低。第 2 案註明「Linux 端沒有替代方案」。
- 研究輸出：本文件 `docs/research/ACCESS-MDB-LIBRARIES.md` 可作為 `LEGACY-CRM-COEXISTENCE-RESEARCH.md` 的套件層附錄。

---

## 5. 參考連結

- Jackcess FAQ（"Access 2000-2019 read/write and Access 97 read-only"）：https://jackcess.sourceforge.io/faq.html
- Jackcess changelog（5.0.1–5.0.3：collation、Jet 3 charset、Jet 3 非英文索引唯讀；4.0.11：broken index 屬性）：https://jackcess.sourceforge.io/changes-report.html
- Jackcess 原始碼與 Access 97 測試檔：https://github.com/jahlborn/jackcess （`src/test/data/V1997/`）
- Jackcess Maven：https://central.sonatype.com/artifact/com.healthmarketscience.jackcess/jackcess
- Jackcess 只適合單一開啟者的社群討論：https://www.b4x.com/android/forum/threads/sqlite-db-read-lock-with-multiple-users.36607/latest 、https://mcpressonline.com/programming-other/java/techtip-let-ibm-i-apps-access-microsoft-access-with-jackcess
- UCanAccess（Access 97 read-only、"Very limited multiprocess access support"、`openExclusive`、`charset`）：https://github.com/spannm/ucanaccess 、https://ucanaccess.sourceforge.net/site.html
- mdbtools：https://github.com/mdbtools/mdbtools （`src/libmdb/iconv.c`：`case 950: "BIG-5"`、`MDB_JET3_CHARSET`）
- mdb-reader：https://github.com/andipaetzold/mdb-reader 、https://npmjs.com/mdb-reader
- access_parser：https://github.com/claroty/access_parser
- pandas_access：https://github.com/jbn/pandas_access
- meza：https://github.com/reubano/meza
- Jet 與 ODBC 白皮書（含 "Understanding Microsoft Jet Locking"）：https://support.microsoft.com/en-us/office/rediscovered-jet-and-odbc-white-papers-c53be265-2035-4dab-96f6-b7755b9fc640 ；摘要：https://www.fmsinc.com/MicrosoftAccess/JetEngine/jet_locking.html
- `.ldb` 與 `.laccdb` 說明：https://support.microsoft.com/kb/299373
- Jet OLE DB 與 ODBC 只有 32 位元（KB 957570）：https://support.microsoft.com/en-us/kb/957570
- Access 2013 移除 Access 97 支援（Jet 3.x IISAM）：https://support.microsoft.com/en-us/office/discontinued-features-and-modified-functionality-in-access-2013-bc006fc3-5b48-499e-8c7d-9a2dfef68e2f
- 2019 年 Jet 3 格式回歸與修復：https://support.microsoft.com/help/4487025 、https://support.microsoft.com/kb/4487023
- `msrd3x40.dll` 漏洞：https://www.fortinet.com/blog/threat-research/microsoft-windows-jet-engine-msrd3x-code-execution-vulnerability
- MDAC 與 Jet 停止發展：https://blogs.msdn.microsoft.com/selvar/mdac-ms-access-deprecated-jet-engine
- Oplock 設定（KB 296264）與資料庫損毀說明：https://www.dataaccess.com/KBasePublic/Files/2476.Tuning%20Microsoft%20Networks%20for%20the%20Legacy%20Embedded%20Database_PDF_FMT.PDF 、https://www.dell.com/support/kbdoc/en-us/000020354
- Jet 檔案格式規格：http://jabakobob.net/mdb/
