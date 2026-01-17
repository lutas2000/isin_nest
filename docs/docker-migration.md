使用 **Docker Compose** 進行遷移是最推薦的方式，因為它不僅能遷移資料，還能確保新環境的設定（如連接埠、環境變數、網路）與舊環境完全一致。

以下是將容器從 **設備 A (舊)** 遷移到 **設備 B (新)** 的詳細步驟：

---

### 第一步：確認原始配置與資料路徑

在 **設備 A** 上，找到該容器的 `docker-compose.yml` 檔案，並確認資料掛載的路徑。

1. 打開 `docker-compose.yml`。
2. 查看 `volumes:` 區段。例如：
```yaml
volumes:
  - ./mysql_data:/var/lib/mysql  # 這裡的 ./mysql_data 就是你要搬的資料

```



---

### 第二步：停止容器並打包資料

為了確保遷移時資料的一致性（避免資料庫在寫入時被複製），請務必先停止服務。

1. **停止並移除容器（但不刪除資料）：**
```bash
docker-compose down

```


2. **打包設定檔與資料夾：**
將整個專案資料夾（包含 `docker-compose.yml` 和資料子目錄）打包成一個壓縮檔。
```bash
tar -zcvf my_project_backup.tar.gz ./my_project_folder

```



---

### 第三步：將檔案傳輸至新設備

將壓縮檔從 **設備 A** 傳送到 **設備 B**。你可以使用 `scp`、雲端空間或隨身碟。

* **使用 SCP 指令範例：**
```bash
scp my_project_backup.tar.gz username@device_b_ip:/home/username/

```



---

### 第四步：在新設備還原並啟動

切換到 **設備 B**，執行以下操作：

1. **解壓縮檔案：**
```bash
tar -zxvf my_project_backup.tar.gz
cd my_project_folder

```


2. **檢查目錄權限（關鍵步驟）：**
由於不同設備的使用者 ID 可能不同，建議確保資料夾權限正確。
```bash
sudo chown -R $USER:$USER ./資料夾名稱

```


3. **啟動容器：**
```bash
docker-compose up -d

```



---

### 第五步：驗證遷移結果

1. **檢查容器狀態：** `docker ps` 確保容器處於 Up 狀態。
2. **檢查日誌：** `docker-compose logs -f` 查看是否有資料庫讀取錯誤。
3. **確認資料：** 進入應用程式介面，確認先前的資料是否完整呈現。

---

### 遷移常見問題排查

| 問題現象 | 解決方案 |
| --- | --- |
| **啟動後資料是空的** | 檢查 `docker-compose.yml` 中的相對路徑是否正確，確保資料夾已搬到對應位置。 |
| **權限錯誤 (Permission Denied)** | 這是最常見的問題。請對掛載的資料夾執行 `chmod -R 777` (測試用) 或正確配置 `chown`。 |
| **映像檔下載過慢** | 如果新環境網路不佳，請參考方法一，手動使用 `docker save` 打包映像檔再過去。 |

---

### 💡 小撇步

如果你在新設備上使用的是不同的路徑（例如從 `/home/user/data` 改到 `/volume1/docker/data`），記得修改 `docker-compose.yml` 裡冒號左側的主機路徑。

**您目前的容器是否有掛載特定的資料卷 (Volumes)？如果您不確定路徑，我可以教您如何使用 `docker inspect` 指令來確認。**