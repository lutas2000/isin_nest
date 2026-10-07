# 研究：讓容器內的 NestJS 讀取（必要時寫入）Windows SMB 共用資料夾

> 撰寫日期：2026-10-08
> 範圍：`\\ISIN\isin`（Access 97 MDB）、`\\Server\C\`（DXF，約 40 萬檔，唯讀）、`\\SERVER\n\`（CNC，唯讀）
> 背景：`docs/LEGACY-CRM-REBUILD-PLAN.md` 第 0、4、9、11.1 節
> 實測環境：Mac mini（Apple Silicon）＋ **OrbStack 2.2.3**（不是 Docker Desktop），本機自建 Samba 容器模擬，未連線 ISIN／SERVER
> 範例設定：`docs/research/smb-mount.compose.example.yml`

---

## 1. 結論與建議

**一段話結論：** 在這台 Mac mini 上，SMB 一律在 **Linux 端（OrbStack VM 核心的 cifs）掛載**：DXF／CNC 唯讀沿用現在後端已經在用的「容器內 `mount -t cifs`」（`NasService` + `/etc/auto_nas`），但要把每個 share 改成各自的選項（`ro`、能用就用 `vers=2.1`、`actimeo`、credentials 檔），而且程式端的 SMB I/O 要有逾時和併發上限。切換日的 MDB 複製用同一套唯讀掛載（或 `smbclient get`），確認沒有 `.ldb` 再複製到本機 volume。**共存研究的「即時寫入」不要從 Linux 直接寫 MDB**：檔案層的鎖只有在 `vers>=2.1` 且 `cache=none,nolease` 時才會立刻送到 server；`vers=1.0` 在本機實測中，第二個 client 拿得到第一個 client 已經鎖住的位元組範圍（衝突沒有擋下來）。而且就算鎖傳得對，Jackcess 也不實作 Jet 的鎖定協定。macOS 主機先掛 smbfs 再 bind mount 進容器（方案 1）**不要用**：本機實測把 OrbStack 的 bind mount 機制整個卡死。

### 比較表

| | 方案 1 macOS smbfs → bind mount | 方案 2 容器內 `mount -t cifs` | 方案 3 Docker `local` volume `type=cifs` | 方案 4 SMB client library | 方案 5 Windows 端 robocopy 推送 |
|---|---|---|---|---|---|
| OrbStack 上可行 | 掛載本身可以，**bind 進容器時卡死**（3.4 節） | 可行（`cap_add: SYS_ADMIN, DAC_READ_SEARCH` 就夠） | 可行（掛在 VM 內，容器不需權限） | 可行（`@marsaud/smb2` 需 `--openssl-legacy-provider`，只支援 SMB2） | 可行（要另外開 Mac 的 SMB 分享） |
| 現況 | 主機有 `/etc/auto_master` → `/nas auto_nas`（smbfs） | **後端已在用**：`privileged`、`cifs-utils`、`NasService` 一律 `vers=1.0` | 未用 | 未用 | 未用 |
| SMB 版本 | macOS smbfs 預設優先 SMB2/3（SMB1 可由 `/etc/nsmb.conf` 的 `protocol_vers_map` 控制，未實測） | 1.0～3.1.1 都可指定 | 同方案 2 | 只有 SMB2.0.2；`smbclient` 可 NT1～SMB3 | — |
| 斷線重連 | autofs／launchd，需另外處理 | 核心自動重連（server 回來後約 3 秒恢復） | 同方案 2；但 **server 不在時容器起不來** | 由程式自己重連 | 不需要（推送失敗下次再推） |
| byte-range lock | 無法驗證（測試前就卡死），不可信 | `vers>=2.1` 加上 `nolease` 會送到 server；`vers=1.0` 實測衝突沒擋下來 | 同方案 2 | 程式要自己發 lock，通常沒做 | 不適用 |
| 帳密 | macOS Keychain／auto_nas 明碼 | credentials 檔＋docker secret 最好；現況是 argv 明碼 | **`docker volume inspect` 看得到明碼** | 程式設定 | Windows 端排程帳號 |
| 40 萬 DXF 按路徑讀 | 經 virtiofs 再加一層 | 每次 `stat` 約 1 RTT，`readFile` 約 3～4 RTT | 同方案 2 | 每次約 1～2 RTT，但要自己管連線池 | 本機檔案系統，最快；要同步 40 萬檔 |

### 依用途的建議

| 用途 | 推薦 | 主要風險與對策 |
|---|---|---|
| **DXF／CNC 唯讀** | 方案 2（沿用 `NasService`，每個 share 加 `ro,vers=2.1,actimeo=60,echo_interval=10`），也可以用方案 3 掛在獨立服務 | SERVER 卡住時 fs 呼叫會一直佔住 libuv thread → 加併發上限、`UV_THREADPOOL_SIZE`、健康檢查；`actimeo` 會讓新產生的 CNC 晚幾秒才看得到（CNC 用 10 秒，DXF 用 60 秒）；SERVER 若只支援 SMB1 才用 `vers=1.0`，而且只限唯讀 |
| **切換日複製 MDB** | 方案 2 或 3 唯讀掛載 `\\ISIN\isin`（`ro,cache=none,actimeo=0`），或者一次性 `smbclient //ISIN/isin -c 'get ...'`；方案 5（Windows robocopy）作為備案 | 先確認所有 `.ldb` 都不在，複製後比對大小／雜湊；Linux 開檔會拿 oplock，只在沒人使用時做 |
| **共存研究的即時讀寫** | 讀：先把 MDB **複製**成快照再讀，不要直接讀正在寫的檔。寫：**不要從 Linux 寫**；如果一定要做，走 11.1 的 Windows bridge（Jet/DAO 在 Windows 端） | 在 Linux 端讀到寫到一半的頁；`vers=1.0` 鎖衝突沒擋下來；Linux client 拿 oplock 會讓 Win7 的 DAO 開檔要等 oplock break；Jackcess 不懂 `.ldb` 協定 |

---

## 2. 各方案詳評

### 2.1 方案 1：macOS 掛載 SMB，再 bind mount 進容器

**本機 runtime：** `docker info` 顯示 context `orbstack`、Server 29.4.0、核心 `7.0.14-orbstack`；`orb version` 2.2.3。`which orbstack colima` 都找不到（OrbStack 的 CLI 叫 `orb`／`orbctl`），也沒有 Docker Desktop。OrbStack 的 bind mount 走 VirtioFS（官方文件說有額外調校，但「經過 macOS 存取檔案仍有固有成本」）。

**實測結果（3.4 節）：**
- `mount_smbfs -o nobrowse,rdonly //smbuser:...@127.0.0.1:10445/dxf <dir>` 成功，協商到 SMB 3.1.1，主機上 `ls` 和中文檔名都正常。
- 但 `docker run -v <smbfs 掛載點>:/legacy/dxf:ro ...` **一直卡住**，容器停在 `Created`。之後**任何**含 macOS bind mount 的新容器都卡在 `Created`（包括 scratchpad 裡一個普通的空目錄），`docker rm -f` 卡住，`umount` 在 macOS 核心內進入不可中斷等待（`U` 狀態，超過 1 小時）。沒有 bind mount 的容器、`docker exec`、`docker build`、已在跑的 isin_nest 容器不受影響。
- 但要注意：測試拓撲是 macOS smbfs → `127.0.0.1` → OrbStack port forward → OrbStack VM 內的 Samba。SMB 流量和 VirtioFS 檔案服務都經過同一個 OrbStack Helper，可能形成迴圈死結，這是這次測試特有的情況。正式環境 SMB server 在區網，不會經過 OrbStack。即使如此，這台機器是正式主機，「一卡就要重開 OrbStack」的風險不能接受。
- Docker Desktop 也有類似問題：Docker 論壇有人用 macOS 上的 SMB 分享做 bind mount，Windows 端檔案一直被 "Apple Virtualization Process" 開著刪不掉；回覆建議改成直接用 CIFS volume 掛載（[Docker Forum #147069](https://forums.docker.com/t/file-access-problems-open-processes-with-smb-shares-in-docker-desktop/147069)）。

**其他面向：**
- 權限：smbfs 掛載點屬於掛載者（`noowners`），容器內看到的 uid 由 VirtioFS 對應，一般可讀；寫入權限取決於 macOS 端的掛載使用者。
- 重連：macOS smbfs 斷線後可能自動重連，也可能在 Finder 跳「伺服器已中斷連線」；要穩定得靠 autofs（主機已設定 `/nas auto_nas`，選項 `-fstype=smbfs,soft`）或 launchd 定期 `mount_smbfs`。autofs 是「存取時才掛」，但 VirtioFS 上的容器存取能不能觸發 macOS autofs，沒有文件保證。
- 鎖定：容器內的 `fcntl` 鎖先到 VM 核心的 virtiofs/FUSE，能不能經由 OrbStack 的檔案服務轉成 macOS 的 `fcntl`，再由 smbfs 轉成 SMB byte-range lock，OrbStack 文件沒有說明，這次也測不到（卡死發生在鎖測試之前）。**應該假設鎖會丟失。**
- 字碼頁：SMB2/3 的檔名一律是 UTF-16，macOS 會轉成 UTF-8（NFD/NFC 的差異在中文上影響不大）；大小寫不敏感。
- 結論：**不建議。** 只有在「Windows 主機只支援 SMB1、而 Linux 端又不願意開 SMB1」時才值得重新考慮。

### 2.2 方案 2：容器內直接 `mount -t cifs`

**這就是現況。** `docker/backend.Dockerfile` 安裝了 `cifs-utils`，`docker-compose.yml` 的 backend 設成 `privileged: true`，並把主機的 `/etc/auto_nas` 唯讀掛進容器。`apps/backend/src/system/nas/nas.service.ts` 啟動時解析 `auto_nas`，每個 share 都用 `mount -t cifs //host/share /nas/<key> -o username=…,password=…,vers=1.0` 掛載。`auto_nas` 裡已經有 `c`、`n`（SERVER）和 `isin`（ISIN）這幾個 key，也就是說 4 節要的三個路徑，**正式環境的 backend 容器裡應該已經掛在 `/nas/c`、`/nas/n`、`/nas/isin`**（我沒有讀正式容器做確認，被權限擋下）。

**OrbStack 可行性：** VM 核心有 `cifs`、`smb3`（`/proc/filesystems`），而且 cifs 模組已載入（`enable_oplocks=Y`）。實測只要 `--cap-add SYS_ADMIN --cap-add DAC_READ_SEARCH` 就能掛，不需要 `privileged`。

**唯讀／讀寫設定：**
- 唯讀（DXF/CNC）：`ro,vers=2.1,iocharset=utf8,actimeo=60,echo_interval=10,soft`；CNC 可把 `actimeo` 調成 10，讓新產生的檔案早點看得到。
- 讀 MDB（切換日、研究）：`ro,cache=none,actimeo=0`，避免讀到快取的舊頁。
- 寫 MDB（不建議）：`rw,vers>=2.1,cache=none,nolease`。

**SMB1 與 SMB2/3：**
- Win7／Server 2008 R2 支援 SMB 2.1；只有 XP／2003 以前才只會 SMB1（[Microsoft：偵測／啟用／停用 SMBv1/v2/v3](https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/detect-enable-and-disable-smbv1-v2-v3)）。如果 ISIN／SERVER 是 Win7，**現在寫死的 `vers=1.0` 沒有必要**，應改成 `vers=2.1`。Win7 的 SMB2 server 預設就是開的，Windows 端不需要做任何事。
- `vers=1.0` 在 Linux 端只要求 client 指定，Windows 端「開啟 SMB1」只有在主機本身已關閉 SMB1 server 時才需要；Win7 預設 SMB1 server 是開的。**不要為了這件事在任何較新的 Windows 上開 SMB1**（[Stop using SMB1](https://techcommunity.microsoft.com/blog/filecab/stop-using-smb1/425858)）。
- 怎麼確認版本（要在區網上由人執行，這次沒有連線）：在容器內用 `mount -t cifs ... -o vers=2.1` 試掛，失敗再試 `vers=1.0`；或 `smbclient -L //<IP> -U <user> -m SMB2`。

**字碼頁與大小寫：**
- 檔名：SMB2/3 一律是 UTF-16；SMB1 只要 server 有 Unicode 能力（NT 系列都有）也是。所以「950 檔名」在線路上已經是 Unicode，Linux 端只要 `iocharset=utf8` 就能正確顯示（實測：沒有加 `iocharset` 時 OrbStack 核心預設也是 utf8，`客戶圖面-測試.DXF` 照樣能讀；但建議明確寫上）。950 只影響**檔案內容**（MDB 文字欄、DXF 內的文字），這要在解析層處理，和掛載無關。
- 大小寫：Windows（和預設設定的 Samba）比對檔名不分大小寫。實測 `X/X99/X990001.DXF` 和 `x/x99/X990001.dxf` 都能開到實際檔名是 `X990001.dxf` 的檔。所以程式組路徑時固定用 `{id}.DXF` 就好，不需要逐一嘗試大小寫。但要注意：以後如果把 DXF 複製到 Linux 本機檔案系統，就會變成分大小寫，那時要統一檔名。

**byte-range lock 與 oplock（Access `.ldb` 的關鍵）**——實測（3.3 節）：

| client 選項 | A 鎖 `0x7FFFFF00` 1 byte 後 server 上看到的狀態 | 另一個 client B 對同一範圍加鎖 |
|---|---|---|
| `vers=3.0,cache=none` | 檔案帶 `LEASE(RWH)`，**server 上沒有 byte-range lock**（鎖暫存在 client） | 失敗 `EACCES`（B 開檔觸發 lease break，A 把鎖推到 server）✔ |
| `vers=3.0,cache=strict`（預設） | 同上 | 失敗 ✔ |
| `vers=2.1,cache=none` | `LEASE(RWH)` | 失敗 ✔ |
| `vers=3.0,cache=none,nolease` | Oplock `NONE`，`smbstatus -B` 立刻看到 `W 2147483392 1` ✔ | 失敗 ✔ |
| `vers=1.0,cache=none` | `EXCLUSIVE` oplock，server 上沒有鎖 | **成功**（衝突沒擋下來）✘ |
| `vers=1.0,cache=strict` | 同上 | **成功** ✘ |
| `vers=1.0,forcemandatorylock` | 同上 | **成功** ✘ |

- 原因：Linux cifs 持有 oplock/lease 時，會把 byte-range lock 暫存在 client 端，等到 oplock break 才推到 server（[mount.cifs(8)](https://man7.org/linux/man-pages/man8/mount.cifs.8.html) 的 `cache=strict` 說明）。**`cache=none` 不會停止請求 oplock**；SMB2+ 可以用 `nolease` 關掉，SMB1 只能用全域模組參數 `/sys/module/cifs/parameters/enable_oplocks=0`。在 OrbStack 上這個參數是**整台 VM 共用**，會影響所有容器的 cifs 掛載（[cifs enable_oplocks commit](https://git.linaro.org/plugins/gitiles/kernel/linux-linaro-stable.git/+/e75047344ea415760b2508a6fa29c0288c7b6b68%5E%21/fs/cifs/file.c)）。
- SMB1 失敗的確切原因沒有再往下追（可能是 SMB1 oplock break 與推送鎖的時序問題，對手是 Samba 4.19，不是真的 Windows）。但結論很清楚：**任何需要和 Win7 DAO 共享鎖的情境都不能用 `vers=1.0`**。
- 另外，Access 在 SMB 上和 oplock 一向處不好；Samba 社群長期建議對 `*.mdb/*.ldb` 關掉 oplock（`veto oplock files`）（[samba list 2004](https://lists.samba.org/archive/samba/2004-June/087716.html)、[samba list 2002](https://lists.samba.org/archive/samba/2002-May/042975.html)）。Linux client 打開正在使用的 MDB 拿到 oplock 後，Win7 端的 DAO 下一次開檔要先等 oplock break，可能變慢；用 `nolease`／唯讀短暫開檔可以降低影響。
- 即使鎖完全正確：Jet 的多使用者協定是「在 `.mdb`／`.ldb` 的特定位移加鎖並寫 `.ldb` 內容」。Linux 端的讀寫程式（Jackcess 等）必須**照著同一套協定**做才算安全，而它們沒有做（11.1 已知條件）。所以「檔案層鎖能透傳」只是必要條件，不是充分條件。

**斷線、重開、休眠（3.5 節實測）：**
- server 停止（連線被拒）：大約 10 秒後回 `EHOSTDOWN`；接下來每個呼叫要等 10～45 秒才出錯（`soft` 掛載會重試）。server 回來後約 **3 秒自動恢復**，SMB1、SMB3 都一樣，不需要重新掛載。
- server 沒有回應（`docker pause` 模擬休眠或卡住，TCP 還在）：SMB1 掛載上的 `readFile` **一直卡住**到 server 恢復（90 秒），每秒一次的輪詢累積了 90 個卡住的呼叫；SMB3 掛載持有 lease，從快取回應沒有卡住（只適用於已經快取的檔案）。
- **對 Node 的影響：** 每個卡住的 `fs.*` 會佔住一個 libuv threadpool thread（預設 4 個），而且無法取消。threadpool 滿了以後，**整個 NestJS 的 fs、`crypto.pbkdf2`、`dns.lookup`、zlib 都會跟著停**。所以要：(1) 對 SMB 路徑的呼叫加 semaphore（例如同時最多 2～4 個）；(2) `UV_THREADPOOL_SIZE` 拉到 16；(3) 用 `Promise.race` 做逾時回應，至少讓 API 回 503（thread 本身還是卡著）；(4) 更穩的做法是把 SMB I/O 放到 worker thread 或子行程，卡住時可以整個砍掉。
- 主機重開：掛載時記住的是 IP（mount 選項 `addr=`），重開後只要 IP 不變就會自動重連。容器內沒有 `cifs.upcall`／keyutils，不會重新解析主機名 → **ISIN／SERVER 要做 DHCP 保留**。
- 密碼變更：要重新掛載（`NasService` 的 `POST /system/nas/mount` 只會掛「還沒掛上」的 share，要再加 remount 功能）。
- `echo_interval=10`（預設 60）可以更快偵測斷線。`hard` 會讓程式永遠卡住，不要用。

**效能（3.2 節）：** 1 萬個 2 KB 的 DXF 檔，按 `{第1字}/{前3字}/{圖號}.DXF` 路徑存取：
- 同一個 VM 內（RTT 約 0.05 ms）：`fs.access` 平均 0.12～0.15 ms，`fs.readFile` 0.18～0.29 ms，走完整棵目錄樹 `readdir` 1 萬檔約 80 ms。
- 用 netem 加延遲（實際量到的 ping 平均約 3 ms，抖動大）：SMB3 的 `fs.access` 約 3 ms（≈1 RTT），`readFile` 約 10 ms（≈3～4 RTT：open、read、close）；SMB1 冷快取的 `access` 約 6 ms（≈2 RTT）。`actimeo=600` 時熱快取的 `access` 降到 0.03 ms，`readFile` 減半。
- 換算到區網（Win7 主機，RTT 0.3～0.5 ms，加上 Windows 磁碟）：預估 `fs.access` 約 0.5～1 ms，`readFile` 約 2～5 ms。工件畫面一次只看一張 DXF、一次 CNC 存在檢查，**完全不是瓶頸**。40 萬檔的數量只影響「列目錄」，程式**絕對不要對整棵樹 `readdir`／glob**。

**安全性：**
- 現況問題：(1) 主機 `/etc/auto_nas` 存明碼密碼，而且整個檔掛進容器；(2) `NasService` 把密碼放在 `mount` 的 argv，掛載期間同一容器內的行程從 `/proc/*/cmdline` 看得到；(3) 帳密含逗號會解析錯誤；(4) `privileged: true` 範圍過大。
- 建議：用 compose `secrets` 提供 mount.cifs 格式的 credentials 檔（`username=`／`password=`／`domain=`），mount 改成 `-o credentials=/run/secrets/smb_server_cred,...`（mount.cifs 支援；argv 裡沒有密碼）；`privileged` 縮成 `cap_add: [SYS_ADMIN, DAC_READ_SEARCH]`；SMB 帳號在 Windows 端只給該 share 唯讀權限（`isin` 也是唯讀，除非真的要做共存寫入）。
- `/nas/isin` 現在是**讀寫**掛載，而且是 SMB1。依原則 6（遷移期間不碰正式 MDB），建議改成 `ro`。

### 2.3 方案 3：Docker `local` volume driver `type: cifs`

- **OrbStack 可行性：** 可行。volume 是由 OrbStack VM 內的 dockerd 用 `mount(2)` 掛的，跟方案 2 用的是同一個 VM 核心 cifs，所以鎖、重連、效能的特性都一樣（實測 `fs.access` 冷快取 0.095 ms、熱快取 0.017 ms（`actimeo=60`），`readFile` 0.146 ms；中文檔名正常；設定 `uid=1000,gid=1000,file_mode=0664` 的讀寫掛載可以寫入）。容器本身**不需要任何 capability**。
- **Docker Desktop for Mac：** 原理相同（volume 在 LinuxKit VM 內掛載），只要 VM 能連到區網就可以；這次沒有 Docker Desktop，沒有實測。
- **缺點（實測）：**
  1. `docker volume inspect` 會列出 `o` 選項的**明碼密碼**；local driver 直接呼叫 `mount(2)`，不經過 `mount.cifs`，所以**不支援 `credentials=` 檔**（[Docker Forum：credentials file](https://forums.docker.com/t/create-cifs-volume-using-local-driver-and-credentials-file/66496)）。
  2. 容器啟動時 SMB 主機不在 → `Error response from daemon: error while mounting volume ... failed to mount local volume`，**容器直接起不來**。如果把它掛在 backend 上，SERVER 一關機整個後端就停擺。要用的話，掛在獨立的小服務（例如只負責讀圖檔的 `legacy-files`）比較安全。
  3. 改 `driver_opts` 要先 `docker volume rm`（volume 被使用中時還要先停容器）。
  4. Docker 25 起 `addr=` 的處理有變更，部分寫法要調整（[Docker Forum：Docker 25 CIFS addr](https://forums.docker.com/t/docker-version-25-cifs-volumes-and-the-addr-option/139453)）；這次用 Docker 29.4，`device=//IP/share` 加 `o=addr=IP,...` 可以正常運作。
- 第三方 volume plugin（例如 docker-volume-netshare、Trident 等）在 OrbStack 上要以 managed plugin 安裝，維護狀態普遍不佳，功能也沒有超過 local driver，**不考慮**。

### 2.4 方案 4：不掛載，改用 SMB client library

| 套件 | 狀態 | 評估 |
|---|---|---|
| `@marsaud/smb2` 0.18.0（Node） | 最後發布 2022-06 | 只支援 SMB 2.0.2；NTLM 用 MD4，Node 17+ 要 `--openssl-legacy-provider` 才能跑（實測：沒加會 `ERR_OSSL_EVP_UNSUPPORTED`）。實測 `exists` 平均 0.17 ms、`readFile` 0.19 ms，中文檔名正確。沒有 SMB1；沒有簽章、加密；斷線要自己處理。**不建議用在正式環境。** |
| `samba-client` 7.2.0（Node，包 `smbclient` CLI） | 2026 仍有更新 | 每個操作 spawn 一次 `smbclient`，每次都要重新協商、驗證，單次約數十 ms；支援 NT1～SMB3（看 `smbclient` 版本）。適合**切換日一次性 `get` 整批 MDB**，不適合每次開工件畫面都叫一次。 |
| Python `smbprotocol` | 維護中 | SMB2/3，功能完整（含加密、DFS），但要在 Node 後端旁邊多一個 Python 行程。 |
| Python `pysmb` | 維護中 | SMB1/2；純 Python，同樣要多一個行程。 |

- 和掛載相比的優點：不需要 `SYS_ADMIN`；卡住時是 JS 層的 socket，可以設逾時、取消，不會佔住 libuv thread；server 不在時不影響程式啟動。
- 缺點：Node 生態系沒有成熟、仍在維護、支援 SMB 2.1 加簽章的 client；`@marsaud/smb2` 的認證走 legacy crypto。`readFile` 這類 API 的語意要自己包。
- 結論：**按需讀單一檔案「理論上」比掛載更好控制，但 Node 端沒有可靠的套件**。比較實際的做法是保留 cifs 掛載，在程式端加上 2.2 節的逾時、併發、worker 隔離。切換日的一次性複製可以用 `smbclient`。

### 2.5 方案 5：反向推送（Windows 排程 robocopy 到 Mac）

- 做法：在 Mac 開「檔案共享」（SMB，只開一個專用資料夾、專用帳號），Windows 端用工作排程器跑 `robocopy \\ISIN\isin\ D:\push\ *.mdb /R:2 /W:5 /XF *.ldb`（或直接推到 Mac 的 share）。Mac 上的資料夾再用 bind mount 唯讀給容器（本機普通目錄的 bind mount 沒有方案 1 的問題）。
- 適合：切換日 MDB（可在 Windows 端先確認 `.ldb` 不存在再推）；DXF 如果要做本機鏡像，robocopy `/MIR` 的第一次同步是 40 萬檔，之後增量。
- 字碼頁：robocopy 用 Unicode API，中文檔名沒問題；Mac 的 SMB server 會存成 UTF-8（NFD）。
- 優點：Linux 端完全不用碰 SMB，也沒有鎖的問題；Windows 端可以用 VSS（`robocopy /B` 或 `diskshadow`）拿到一致的快照。
- 缺點：要在 Windows 端維護排程與帳號；資料有延遲；Mac 的檔案共享要開 445 port 給區網；Mac 端要有夠大的空間放 40 萬檔。
- 結論：**當作切換日的備案**，以及「SERVER 只支援 SMB1 而且大家都不想在 Linux 端開 SMB1」時的 DXF/CNC 替代方案。

---

## 3. 實測記錄

### 3.1 環境

| 項目 | 版本 |
|---|---|
| 主機 | Mac mini，Apple Silicon（arm64），macOS 15.7.3（24G419） |
| Docker runtime | **OrbStack 2.2.3**（`orb version`），docker context `orbstack` |
| Docker Engine | Client／Server 29.4.0，Compose v5.1.2，overlay2 on btrfs |
| VM 核心 | `7.0.14-orbstack-00380-ga7e0a2dc9535`，`/proc/filesystems` 有 `cifs`、`smb3`、`virtiofs`、`fuse`；`cifs.enable_oplocks=Y` |
| SMB server | 自建 `alpine:3.20` + Samba 4.19.9。`server min protocol = NT1`、`max = SMB3`、`dos charset = CP950`、`oplocks = yes`、`strict locking = yes`；共用 `dxf`(ro)、`cnc`(ro)、`isin`(rw)；資料放在 docker volume（不經 VirtioFS） |
| client | `node:22-alpine`（Node 22.23.3）+ `cifs-utils`、`samba-client`、`python3`（`fcntl.lockf` 用） |
| 測試資料 | 10,000 個 2 KB 的 `.DXF`，路徑 `{第1字}/{前3字}/{圖號}.DXF`（A～K 共 10 個字母，每字母 20 個子目錄）；1,000 個 `.cnc`；1 個小寫 `.dxf`；1 個中文檔名 `客戶圖面-測試.DXF` |

測試檔都在 scratchpad：`smb-research/samba/`（Dockerfile、smb.conf）、`smb-research/node/`（`bench.mjs`、`lock.py`）、`smb-research/lib/`（`smb2bench.mjs`）、`smb-research/locktest.sh`。

### 3.2 方案 2／3：讀取與延遲

```sh
docker run --rm --network smbtest-net --cap-add SYS_ADMIN --cap-add DAC_READ_SEARCH smbtest-node sh -c '
  mount -t cifs //smbtest-samba/dxf /mnt/dxf1 -o username=smbuser,password=…,vers=1.0,ro,iocharset=utf8
  mount -t cifs //smbtest-samba/dxf /mnt/dxf3 -o username=smbuser,password=…,vers=3.0,ro,iocharset=utf8
  node bench.mjs /mnt/dxf1; node bench.mjs /mnt/dxf3'
```

`/proc/mounts` 預設值：`cache=strict,soft,actimeo=1,echo_interval=60,serverino,nounix`；`rsize` SMB1=61440、SMB3=4 MiB。

| 條件 | access 冷 | access 熱 | access 不存在 | readFile | readdir 全樹 |
|---|---|---|---|---|---|
| SMB1，VM 內 | 0.154 ms | 0.057 | 0.088 | 0.175 | 73 ms |
| SMB3，VM 內 | 0.122 | 0.086 | 0.104 | 0.292 | 86 ms |
| SMB1，netem（ping 平均約 3.3 ms） | 6.28 | 3.06 | 2.86 | 12.0 | 653 ms |
| SMB3，netem | 3.12 | 3.18 | 3.14 | 10.1 | 2.45 s |
| SMB3，netem，`actimeo=600` | 3.02 | **0.027** | 2.86 | 5.91 | 2.05 s |
| 方案 3 volume（SMB3，`actimeo=60`），VM 內 | 0.095 | 0.017 | 0.069 | 0.146 | 100 ms |
| `@marsaud/smb2`（SMB2），VM 內 | 0.173（exists） | — | 0.098 | 0.192 | — |

全部 10,000／10,000 成功。大小寫測試：`ls X/X99/X990001.DXF` 和 `x/x99/X990001.dxf` 都能找到（實際檔名 `X990001.dxf`）。中文檔名在有加和沒加 `iocharset=utf8` 時都能列出和讀取。

### 3.3 byte-range lock 傳遞

`lock.py` 在 `test.ldb` 用 `fcntl.lockf(LOCK_EX|LOCK_NB, len=1, start=0x7FFFFF00)` 加鎖並保持；同時在 server 上執行 `smbstatus -L`／`-B`；再從另一個容器（`nosharesock`，另一條 SMB 連線）嘗試鎖同一範圍。結果見 2.2 節的表。關鍵輸出：

```
== vers=3.0 cache=none,nolease
Byte range locks:
Pid  dev:inode       R/W  start      size  SharePath   Name
149  41:1208071:0    W    2147483392 1     /share/mdb  test.ldb
-- B: lock FAILED: [Errno 13] Permission denied

== vers=1.0 cache=none
Locked files: ... RDWR  EXCLUSIVE  /share/mdb  test.ldb      （沒有 Byte range locks 區段）
-- B: lock OK at 0x7FFFFF00                                   ← 衝突沒擋下來
```

限制：對手是 Samba，不是 Windows 7 的 srv/srv2。另一方也是 Linux cifs，不是 Windows DAO。要在真實環境確認，得在一份 MDB 副本上由 Win7 開啟，再從 Linux 端觀察 `EACCES`（只能由人員在區網上執行）。

### 3.4 方案 1：macOS smbfs → bind mount

```sh
mount_smbfs -o nobrowse,rdonly //smbuser:…@127.0.0.1:10445/dxf <scratchpad>/smb-research/mnt-dxf   # 成功
smbutil statshares -m <mnt>   # SMB_VERSION SMB_3.1.1，簽章 AES_128_GMAC
docker run --rm -v <mnt>:/legacy/dxf:ro -v <scratchpad>/node:/w:ro smbtest-node node /w/bench.mjs /legacy/dxf
# → 600 秒沒有任何輸出，容器停在 Created
```

後續觀察：
- `docker run -v <scratchpad 內普通空目錄>:/x alpine echo` 也卡在 `Created` → OrbStack 的 bind mount 機制整體卡住。
- 沒有 bind mount 的 `docker run`、`docker exec`、`docker build` 正常；isin_nest 三個容器維持 `Up`／`healthy`，`/health` 回 200。
- `umount <mnt>` 卡在 `unmount()` 系統呼叫（`sample` 顯示停在 `unmount  (in libsystem_kernel.dylib)`），行程狀態 `U`，超過 1 小時。掛載點已從 `mount` 的列表消失。`sample` OrbStack Helper 看到兩個 thread 停在 `__open`。
- 試過：kill 那條 macOS 的 SMB session、停掉 Samba 容器、等 smbfs soft timeout → 都沒有解開。沒有 sudo，也沒有重開 OrbStack（會連帶重啟正式容器）。

**這個狀態在報告完成時仍然存在**（見最後的「殘留狀態」）。

### 3.5 斷線與恢復（方案 2）

一個容器同時掛 `/m1`（vers=1.0）與 `/m3`（vers=3.0），`echo_interval=10`，每秒對兩邊各 `readFile` 一次：

| 時間（UTC） | 事件 | 觀察 |
|---|---|---|
| 20:54:09 | `docker stop smbtest-samba` | 約 10 秒後開始 `EHOSTDOWN`，每次呼叫 10～45 秒才回錯誤 |
| 20:55:09 | `docker start` | 20:55:12 兩邊都恢復 `ok`（約 3 秒），累積的呼叫一起完成 |
| 20:55:54 | `docker pause`（server 不回應，TCP 還在） | `/m1`（SMB1）的讀取全部卡住；`/m3` 從 lease 快取回應，沒有卡 |
| 20:57:24 | `docker unpause` | `/m1` 卡了 1～90 秒的 90 個呼叫在 20:57:25 一起完成 |

方案 3：server 停止時 `docker run -v smbtest-vol-dxf:...` 直接失敗 `error while mounting volume`。

---

## 4. 建議的 docker-compose 片段與環境變數

完整範例：`docs/research/smb-mount.compose.example.yml`。重點：

```yaml
services:
  backend:
    cap_add: [SYS_ADMIN, DAC_READ_SEARCH]   # 取代 privileged: true
    environment:
      LEGACY_DXF_PATH: ${LEGACY_DXF_PATH:-/nas/c}      # \\Server\C\
      LEGACY_CNC_PATH: ${LEGACY_CNC_PATH:-/nas/n}      # \\SERVER\n\
      LEGACY_MDB_PATH: ${LEGACY_MDB_PATH:-/nas/isin}   # \\ISIN\isin\（唯讀）
      UV_THREADPOOL_SIZE: ${UV_THREADPOOL_SIZE:-16}
    secrets: [smb_server_cred, smb_isin_cred]
secrets:
  smb_server_cred: { file: ./secrets/smb_server.cred }
  smb_isin_cred:   { file: ./secrets/smb_isin.cred }
```

每個 share 的 mount 選項（`NasService` 要支援每個 share 自己的選項，不再寫死 `vers=1.0`）：

| share | 選項 |
|---|---|
| DXF `//<SERVER>/c` | `credentials=/run/secrets/smb_server_cred,vers=2.1,ro,iocharset=utf8,actimeo=60,echo_interval=10,soft` |
| CNC `//<SERVER>/n` | `credentials=/run/secrets/smb_server_cred,vers=2.1,ro,iocharset=utf8,actimeo=10,echo_interval=10,soft` |
| MDB `//<ISIN>/isin` | `credentials=/run/secrets/smb_isin_cred,vers=2.1,ro,iocharset=utf8,cache=none,actimeo=0,echo_interval=10,soft` |

如果實測發現 SERVER／ISIN 只支援 SMB1，就把 `vers=2.1` 改成 `vers=1.0`，**而且只限唯讀**。

程式端（`legacy-crm/parts`）的建議：
- 路徑一律 `path.join(LEGACY_DXF_PATH, id[0], id.slice(0, 3), `${id}.DXF`)`，不做目錄列舉。
- 所有 SMB 存取都經過一個 `LegacyFileService`：semaphore（同時 ≤ 4）、逾時 3 秒回 503／「圖檔伺服器無回應」，CNC 檢查逾時要回「未知」，**不要當作不存在**（因為工作單的 CNC_OK 規則會受影響）。
- 健康檢查：`/system/nas/status` 加上對每個掛載點做一次 `stat`（含逾時）的結果。

---

## 5. 對 `LEGACY-CRM-REBUILD-PLAN.md` 的建議修訂

**第 9 節（部署與維運）**
- 把「docker compose 新增 SMB 掛載」改成：**沿用既有 `NasService`（`/etc/auto_nas` → `/nas/<key>`）**，`LEGACY_DXF_PATH=/nas/c`、`LEGACY_CNC_PATH=/nas/n`、`LEGACY_MDB_PATH=/nas/isin`；不另外加 compose volume，也不用 macOS 主機掛載再 bind mount。
- 新增工作項：`NasService` 支援每個 share 自己的 mount 選項（`vers`、`ro`、`actimeo`、`cache`、`nolease`），帳密改成 docker secret 的 credentials 檔，`privileged` 縮成 `cap_add: SYS_ADMIN, DAC_READ_SEARCH`，`isin` 改成唯讀。
- 新增前置確認：ISIN／SERVER 的 Windows 版本與最高 SMB 版本（Win7 → `vers=2.1`）；兩台主機做 DHCP 保留。
- 新增：SMB I/O 的逾時、併發上限、`UV_THREADPOOL_SIZE`；掛載健康檢查與 remount API（密碼變更、長時間斷線後使用）。
- 明訂：DXF 不做全目錄掃描、不建立檔案索引；`parts` 表只存圖號，用路徑規則推算。
- 第 4 節的環境變數清單補上 `LEGACY_MDB_PATH`。

**第 11.1 節（共存研究）**
- 「檔案層」那一列的研究問題可以填入結論：Linux cifs **只在 `vers>=2.1` 時**會正確傳遞 byte-range lock，而且持有 lease 時鎖是暫存在 client，要加 `nolease` 才會立即送到 server；`vers=1.0` 在本機實測中衝突沒有擋下來 → 任何 Linux 端寫入 MDB 的方案都要求 ISIN 支援 SMB2.1，並用 `cache=none,nolease`。
- 加一條已知條件：在 OrbStack 上，macOS smbfs → bind mount 的路線會讓 bind mount 機制卡死（本研究 3.4 節），排除這條路。
- 「唯讀即時讀取」補充：不要直接讀正在寫的 MDB；改成「複製到本機 → 讀副本」，用 mtime／大小判斷要不要重新複製。這也能避免 Linux client 拿到 oplock、拖慢 Win7 的 DAO 開檔。
- 結論形態 1（單向唯讀）的實作建議：`ro,cache=none,actimeo=0` 掛載加上定時複製；結論形態 2（Windows bridge）維持是唯一合理的寫入路線，因為檔案鎖正確不代表 Jet 協定正確。
- 研究輸出要多一項：在區網上由人員實測「Win7 DAO 開著副本 MDB 時，Linux 端對 `.ldb` 範圍 `lockf` 會不會得到 `EACCES`」，驗證 SMB 2.1 對 Windows srv2 的行為（本研究只測了 Samba）。
- 預設建議（不共存、整批切換）維持不變；本研究的結果讓這個建議更站得住。

---

## 6. 參考連結

- mount.cifs(8)（`cache=`、`nobrl`、`nolease`、`actimeo`、`soft`/`hard`、`echo_interval`、`credentials=`）：https://man7.org/linux/man-pages/man8/mount.cifs.8.html
- Linux cifs `enable_oplocks` 模組參數 commit：https://git.linaro.org/plugins/gitiles/kernel/linux-linaro-stable.git/+/e75047344ea415760b2508a6fa29c0288c7b6b68%5E%21/fs/cifs/file.c
- Microsoft：如何偵測、啟用及停用 SMBv1/v2/v3：https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/detect-enable-and-disable-smbv1-v2-v3
- Microsoft：Stop using SMB1：https://techcommunity.microsoft.com/blog/filecab/stop-using-smb1/425858
- OrbStack：Volumes & mounts（VirtioFS bind mount）：https://docs.orbstack.dev/docker/file-sharing
- OrbStack issues：https://github.com/orbstack/orbstack/issues
- Docker Forum：macOS 上把 SMB 分享 bind mount 進容器，造成檔案被佔用：https://forums.docker.com/t/file-access-problems-open-processes-with-smb-shares-in-docker-desktop/147069
- Docker Forum：local driver CIFS 不支援 credentials 檔：https://forums.docker.com/t/create-cifs-volume-using-local-driver-and-credentials-file/66496
- Docker Forum：Docker 25 起 CIFS volume 的 `addr=` 選項：https://forums.docker.com/t/docker-version-25-cifs-volumes-and-the-addr-option/139453
- Samba 郵件列表：Samba + MS Access（oplocks／`veto oplock files`）：https://lists.samba.org/archive/samba/2004-June/087716.html 、https://lists.samba.org/archive/samba/2002-May/042975.html
- npm：`@marsaud/smb2`：https://www.npmjs.com/package/@marsaud/smb2 ；`samba-client`：https://www.npmjs.com/package/samba-client
- Python：`smbprotocol`：https://github.com/jborean93/smbprotocol ；`pysmb`：https://github.com/miketeo/pysmb

---

## 殘留狀態（研究結束時）

- 已移除：Samba 容器 `smbtest-samba`、volume `smbtest-data`／`smbtest-vol-dxf`／`smbtest-vol-isin`、network `smbtest-net`、各測試 client 容器。
- **未能移除（3.4 節的 OrbStack bind mount 卡死造成）：** 停在 `Created` 的容器 `smbtest-client`、`smbtest-lockA`、`kind_cartwright`（另有一個不是本研究建立的 `relaxed_solomon` 也卡在 `Created`）；macOS 上 `umount <scratchpad>/smb-research/mnt-dxf` 的行程卡在核心（`U` 狀態）。在這種狀態下，OrbStack 上**任何需要 macOS bind mount 的新容器都無法啟動**，包括 isin_nest backend 重啟（它 bind mount 了 `/etc/auto_nas`）。解法應該是重開 OrbStack（`orb restart` 或從選單 Quit 再開），會讓正在跑的 isin_nest 容器跟著重啟（`restart: unless-stopped` 會自動起來）；如果 `umount` 行程還在，可能需要重開機。之後再 `docker rm -f` 上述容器、`docker rmi smbtest-node:local smbtest-node-py:local smbtest-node-w:local smbtest-samba:local`（`docker rmi` 在卡住狀態下也沒有回應）。
