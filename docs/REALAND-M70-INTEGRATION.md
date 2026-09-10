# 真地（Realand）M70 v3.6.8 串接文件

> 最後驗證：2026-09-10
> 測試設備：M70 v3.6.8，IP 192.168.0.223
> 直接連線：TCP 192.168.0.223:5005
> 設備 Machine ID / DN：3
> 本文件的測試範圍以唯讀操作為主，未讀取指紋、人臉模板，也未執行清除、寫入、開門、重啟或韌體操作。

## 1. 結論摘要

這台 M70 不是以 HTTP REST API 提供功能，而是使用 Realand 舊式 native TCP 協定。已從 docs/RAMS-F.zip 的官方程式與 DLL 逆向確認，並以實機封包驗證：

| 端點 | 用途 | 結論 |
|---|---|---|
| 192.168.0.223:5005/TCP | 電腦直接連線到打卡機 | **已驗證可用** |
| 182.254.150.81:4000 | RAMS 的 P2P relay/server 設定 | 不是內網設備的 HTTP/API 端點 |
| 5055/UDP | RAMS 電腦端可能使用的即時事件接收埠 | 不是已驗證的設備 TCP 服務埠 |
| HTTP GET / WebSocket | Web/API 嘗試 | M70 v3.6.8 未回應；不要當成 REST API 使用 |

本機資料庫 RAS.mdb 的設備設定確認了：

~~~text
DN              = 3
Communication   = TCP/IP
IpAddress       = 192.168.0.223
IpPort          = 5005
Password        = 0
Model           = P001K
~~~

其中 DN 必須和設備的 Machine ID 相同。使用 DN 1 時設備不回應；改用資料庫中的 DN 3 後，初始化、狀態、設備資訊、時間、序號及人員資料讀取均成功。

## 2. 建議的連線流程

每一條 TCP 連線只由一個流程循序送命令；不要在同一 socket 上平行送命令。建議流程如下：

~~~text
1. TCP connect 192.168.0.223:5005
2. 使用 DN = 3
3. 送初始化/能力確認命令 0x0052，arg2 = 1，arg3 = 0
4. 讀取 8-byte ACK
5. 讀取 14-byte command result
6. 依序執行唯讀命令
7. 對每個命令完整消費 ACK、result 及可能的 data/big-data frame
8. 關閉 socket
~~~

原生 DLL 對應的高階呼叫是：

~~~text
SetMachineIDX(3)
StartTcpX("192.168.0.223", 5005)
SendCommandX(0x0052, arg2=1, arg3=0, timeout=5000)
RecExeResultX(...)
~~~

初始化封包（小端序）：

~~~text
55 aa 03 00 79 19 52 00 00 00 00 00 01 00 e7 01
~~~

已驗證回應：

~~~text
ACK:    5a a5 03 00 01 00 03 01
result: aa 55 03 00 00 00 01 00 00 36 00 00 39 01
~~~

重點是收到正確 DN、result frame 及 checksum；不要把所有 result 欄位都當成同一個狀態碼。

## 3. 封包格式

### 3.1 Command frame：16 bytes

所有數字欄位為 little-endian。

| Offset | 長度 | 內容 |
|---:|---:|---|
| 0 | 2 | magic 0xAA55，線上 bytes 為 55 aa |
| 2 | 2 | DN / Machine ID |
| 4 | 2 | protocol mark 0x1979，線上 bytes 為 79 19 |
| 6 | 2 | command code |
| 8 | 4 | arg3 |
| 12 | 2 | arg2 |
| 14 | 2 | checksum |

checksum 是 offset 0..13 所有 byte 的總和，取低 16 bit，再以 little-endian 寫入。

注意：SendCommandX 的 native 參數順序為 command, arg2, arg3, timeout，但線上封包欄位順序是 command, arg3, arg2。

### 3.2 ACK：8 bytes

~~~text
5a a5 [DN:2] [result-word:2] [checksum:2]
~~~

本設備成功 ACK 的固定型態為：

~~~text
5a a5 03 00 01 00 03 01
~~~

### 3.3 Command result：14 bytes

~~~text
aa 55 [DN:2] [reserved/status:2] [word:2] [value:4] [checksum:2]
~~~

GetDeviceStatus、GetDeviceInfo、GetBackupNumber 等命令會用這種 frame 回傳結果。

### 3.4 Data frame

一般 data frame：

~~~text
a5 5a [DN:2] [payload:N] [checksum:2]
~~~

checksum 是 header 加 payload（offset 0..N+3）的 byte sum 低 16 bit。RecDataX 會先收完整 frame，再把 payload 複製給呼叫端。

### 3.5 Big-data frame

人員摘要、日誌等資料可能使用：

~~~text
5a a5 [DN:2] [payload:N] [checksum:2]
~~~

不要只依固定大小讀取。應先依協定取得資料筆數/長度，再完整讀取 payload 和 checksum。

M70 的 GetUserName 有一個重要相容性細節：DLL 的舊版呼叫路徑看起來要求 0x18 bytes，但 M70 v3.6.8 實際送出 48-byte UTF-16LE 欄位，完整 data frame 為 54 bytes。若只讀 24 或 30 bytes，下一個命令會從殘留資料開始解析而失去同步。

## 4. 已驗證的唯讀命令

下表是目前直接以 M70 v3.6.8 實機驗證過的命令。command code 為線上封包的 little-endian word。

| 功能 | Command | 參數 | 回應 |
|---|---:|---|---|
| 初始化/能力確認 | 0x0052 | arg2=1, arg3=0 | ACK + result |
| 取得設備狀態 | 0x0108 | arg2=selector, arg3=0 | ACK + result |
| 取得設備資訊 | 0x0109 | arg2=selector, arg3=0 | ACK + result |
| 取得設備時間 | 0x010E | arg2=0, arg3=4 | ACK + 4-byte time data + result |
| 讀取人員摘要第一階段 | 0x0112 | arg2=0, arg3=0 | 取得人數 |
| 讀取人員摘要第二階段 | 0x0112 | arg2=1, arg3=人數 | big-data |
| 取得序號 | 0x0113 | arg2=0, arg3=0 | ACK + 32-byte data + result |
| 取得備份編號 | 0x0115 | arg2=0, arg3=0 | ACK + result |
| 取得產品碼 | 0x0116 | arg2=0, arg3=0 | ACK + 32-byte data + result |
| 取得人員姓名 | 0x011A | arg2=0, arg3=User ID | ACK + 48-byte UTF-16LE data + result |

### 4.1 設備狀態 selector

這些 selector 對應官方 SBXPC OCX Reference Manual 的 GetDeviceStatus 定義。本機讀值如下：

| Selector | 意義 | 本機讀值 |
|---:|---|---:|
| 1 | 管理者人數 | 3 |
| 2 | 人員人數 | 22 |
| 3 | 指紋數 | 39 |
| 4 | 密碼數 | 0 |
| 5 | 管理記錄總數 | 193 |
| 6 | 出勤記錄總數 | 166 |
| 7 | 卡片數 | 1 |
| 8 | 警報狀態 bits | 0 |
| 9 | 人臉數 | 22 |
| 10 | 未讀管理記錄數 | 193 |
| 11 | 未讀出勤記錄數 | 36 |

### 4.2 設備資訊 selector

| Selector | 意義 | 本機 raw 值 |
|---:|---|---:|
| 1 | 最大管理者數 | 5 |
| 2 | Machine ID | 3 |
| 3 | UI 語言 | 2 |
| 4 | 自動關機分鐘數 | 0 |
| 5 | 開門秒數 | 5 |
| 6 | 出勤記錄警告門檻 | 500 |
| 7 | 管理記錄警告門檻 | 50 |
| 8 | 重複驗證間隔 | 3 |
| 9 | 序列埠 baud raw code | 7 |
| 10 | parity | 0 |
| 11 | stop bit raw code | 8 |
| 12 | 日期分隔符 | 1 |
| 13 | 驗證模式 | 0 |
| 14 | 門控模式 | 2 |
| 15 | 門磁類型 | 1 |
| 16 | 開門逾時 | 20 |
| 17 | anti-pass | 0 |
| 18 | 自動休眠 | 1 |
| 19 | daylight offset | 0 |
| 20–22 | 保留欄位 | 0 |
| 23 | 顯示即時攝影機 | 2 |
| 24 | 使用 fail log | 0 |

selector 9 和 11 的值與參考手冊的部分列舉值不完全一致，應視為這個韌體的 raw value；不要依這兩個值反向設定設備。

### 4.3 設備時間

0x010E 的 4-byte payload 是自 2000-01-01 00:00:00 起算的秒數（此解碼與實機當時顯示時間吻合）。時間範圍依 SDK 文件為 2000-01-01 至 2099-12-31。

~~~text
seconds = uint32_le(payload[0:4])
device_time = 2000-01-01 00:00:00 + seconds
~~~

本次測試設備時間與測試主機相差約數十秒，證明此命令可讀取目前設備時間。

### 4.4 人員資料

人員摘要是兩階段流程：

~~~text
1. command 0x0112, arg2=0, arg3=0
   -> result value = user count

2. command 0x0112, arg2=1, arg3=user count
   -> big-data records
~~~

本機回傳 22 個不同 User ID。摘要資料每筆 8 bytes，現階段建議保留 raw record；其欄位可對應 SDK 的 GetAllUserID 概念（enroll number、machine number、backup number、privilege、enable），但本 M70 回傳的部分 byte 超出舊版手冊的列舉值，不要自行把它推論成指紋/卡片類型。

姓名讀取：

~~~text
command  = 0x011A
arg2      = 0
arg3      = user_id
payload   = 48 bytes UTF-16LE，尾端以 NUL 補齊
~~~

已成功讀取全部 22 個姓名；本文件不保存實際姓名，以免把個人資料寫入串接規格。沒有讀取任何指紋或人臉模板。

## 5. Python 唯讀測試骨架

以下只示範協定結構、初始化和 status；未包含任何寫入/清除/開門功能。

~~~python
import socket
import struct

IP = "192.168.0.223"
PORT = 5005
DN = 3

def checksum(data: bytes) -> int:
    return sum(data) & 0xFFFF

def command_frame(command: int, arg2: int = 0, arg3: int = 0) -> bytes:
    body = struct.pack("<HHHHIH", 0xAA55, DN, 0x1979,
                       command, arg3, arg2)
    return body + struct.pack("<H", checksum(body))

def recv_exact(sock: socket.socket, size: int) -> bytes:
    out = bytearray()
    while len(out) < size:
        part = sock.recv(size - len(out))
        if not part:
            raise ConnectionError("device closed the connection")
        out.extend(part)
    return bytes(out)

def read_ack(sock: socket.socket) -> bytes:
    ack = recv_exact(sock, 8)
    if ack[:2] != b"\x5a\xa5" or ack[2:4] != struct.pack("<H", DN):
        raise ValueError(f"unexpected ACK: {ack.hex(' ')}")
    if checksum(ack[:6]) != struct.unpack_from("<H", ack, 6)[0]:
        raise ValueError("ACK checksum mismatch")
    return ack

def read_result(sock: socket.socket) -> tuple[int, int]:
    frame = recv_exact(sock, 14)
    if frame[:2] != b"\xaa\x55":
        raise ValueError(f"unexpected result: {frame.hex(' ')}")
    if checksum(frame[:12]) != struct.unpack_from("<H", frame, 12)[0]:
        raise ValueError("result checksum mismatch")
    word = struct.unpack_from("<H", frame, 6)[0]
    value = struct.unpack_from("<I", frame, 8)[0]
    return word, value

with socket.create_connection((IP, PORT), timeout=5) as s:
    s.sendall(command_frame(0x0052, arg2=1))
    read_ack(s)
    read_result(s)

    s.sendall(command_frame(0x0108, arg2=2))
    read_ack(s)
    _, enrolled_users = read_result(s)
    print("enrolled users:", enrolled_users)
~~~

正式程式還必須處理 data frame、big-data frame、socket timeout、設備斷線、錯誤 frame 及同一連線上殘留資料；上例不是完整 SDK。

## 6. DLL / SDK 函式總表

### 6.1 SBXPCDLL.dll exports

這是 RealandAPI.dll 直接 P/Invoke 的 native façade。底線開頭是 native entry point；不帶底線通常是 DLL 中的 managed/native wrapper 名稱。下表列出該 DLL 的全部 export。

| Ordinal | Export | 類別 |
|---:|---|---|
| 3 | _SetMachineType | 設定機型 |
| 4 | _DotNET | runtime/SDK 初始化 |
| 5 | _GetEnrollData | 讀取人員模板 |
| 6 | _GetEnrollData1 | 讀取人員模板變體 |
| 7 | _SetEnrollData | 寫入人員模板 |
| 8 | _SetEnrollData1 | 寫入人員模板變體 |
| 9 | _DeleteEnrollData | 刪除人員模板 |
| 10 | _ReadSuperLogData | 準備讀取管理 log |
| 11 | _GetSuperLogData | 取得管理 log |
| 12 | _ReadGeneralLogData | 準備讀取出勤 log |
| 13 | _GetGeneralLogData | 取得出勤 log |
| 14 | _ReadAllSLogData | 準備讀取全部管理 log |
| 15 | _GetAllSLogData | 取得全部管理 log |
| 16 | _ReadAllGLogData | 準備讀取全部出勤 log |
| 17 | _GetAllGLogData | 取得全部出勤 log |
| 18 | _GetDeviceStatus | 唯讀設備狀態 |
| 19 | _GetDeviceInfo | 唯讀設備資訊 |
| 20 | _SetDeviceInfo | 寫入設備資訊 |
| 21 | _EnableDevice | 啟用/停用設備 |
| 22 | _EnableUser | 啟用/停用人員 |
| 23 | _GetDeviceTime | 唯讀設備時間 |
| 24 | _SetDeviceTime | 寫入設備時間 |
| 25 | _PowerOnAllDevice | 開啟設備 |
| 26 | _PowerOffDevice | 關閉設備 |
| 27 | _ModifyPrivilege | 修改權限 |
| 28 | _ReadAllUserID | 準備讀取全部人員 ID |
| 29 | _GetAllUserID | 取得人員 ID 摘要 |
| 30 | _GetSerialNumber | 唯讀序號 |
| 31 | _GetBackupNumber | 唯讀備份編號 |
| 32 | _GetProductCode | 唯讀產品碼 |
| 33 | _ClearKeeperData | 清除 keeper/管理者資料 |
| 34 | _EmptyEnrollData | 清除人員模板 |
| 35 | _EmptyGeneralLogData | 清除出勤 log |
| 36 | _EmptySuperLogData | 清除管理 log |
| 37 | _GetUserName | 取得姓名 |
| 38 | _GetUserName1 | 取得姓名變體 |
| 39 | _SetUserName | 寫入姓名 |
| 40 | _SetUserName1 | 寫入姓名變體 |
| 41 | _GetCompanyName | 取得公司名稱 |
| 42 | _GetCompanyName1 | 取得公司名稱變體 |
| 43 | _SetCompanyName | 寫入公司名稱 |
| 44 | _SetCompanyName1 | 寫入公司名稱變體 |
| 45 | _GetDoorStatus | 讀取門狀態 |
| 46 | _SetDoorStatus | 修改門狀態/門控 |
| 47 | _GetBellTime | 讀取響鈴時間 |
| 48 | _SetBellTime | 寫入響鈴時間 |
| 49 | _ConnectSerial | 序列埠連線 |
| 50 | _ConnectTcpip | TCP/IP 連線 |
| 51 | _ConnectP2p | P2P 連線 |
| 52 | _Disconnect | 中斷連線 |
| 53 | _GetLastError | 取得最後錯誤 |
| 54 | _GeneralOperationXML | XML 通用操作 |
| 55 | _GetDeviceLongInfo | 取得長格式設備資訊 |
| 56 | _SetDeviceLongInfo | 寫入長格式設備資訊 |
| 57 | _ModifyDuressFP | 修改脅迫指紋 |
| 58 | _GetMachineIP | 取得設備 IP |
| 59 | _GetDepartName | 取得部門名稱 |
| 60 | _SetDepartName | 寫入部門名稱 |
| 61 | _StartEventCapture | 開始事件擷取 |
| 62 | _StopEventCapture | 停止事件擷取 |
| 63 | _XML_ParseInt | XML 解析 integer |
| 64 | _XML_ParseLong | XML 解析 long |
| 65 | _XML_ParseBoolean | XML 解析 boolean |
| 66 | _XML_ParseString | XML 解析 string |
| 67 | _XML_ParseBinaryByte | XML 解析 binary byte |
| 68 | _XML_ParseBinaryWord | XML 解析 binary word |
| 69 | _XML_ParseBinaryLong | XML 解析 binary long |
| 70 | _XML_ParseBinaryUnicode | XML 解析 binary Unicode |
| 71 | _XML_AddInt | 建立 XML integer |
| 72 | _XML_AddLong | 建立 XML long |
| 73 | _XML_AddBoolean | 建立 XML boolean |
| 74 | _XML_AddString | 建立 XML string |
| 75 | _XML_AddBinaryByte | 建立 binary byte |
| 76 | _XML_AddBinaryWord | 建立 binary word |
| 77 | _XML_AddBinaryLong | 建立 binary long |
| 78 | _XML_AddBinaryUnicode | 建立 binary Unicode |
| 79 | _XML_AddBinaryGlyph | 建立 glyph |
| 80 | _PrepareP2p | 準備 P2P |
| 81 | _XML_AddBinaryNameGlyph | 建立姓名 glyph |
| 82 | _XML_ParseMultiUnicode | 解析多重 Unicode |
| 83 | _SetDeviceTime1 | 設定時間變體 |

### 6.2 SBPCCOMM.DLL transport exports

這一層負責 socket/serial/P2P 傳輸和 frame 收發。它不是業務 API，但如果不使用 RealandAPI.dll，可用於自行實作相容 client。

| Ordinal | Export | 說明 |
|---:|---|---|
| 1 | StartComX | 建立 COM 連線 |
| 2 | StartUsbX | 建立 USB 連線 |
| 3 | StartTcpX | 建立 TCP 連線 |
| 4 | StartP2pX | 建立 P2P 連線 |
| 5 | SetMachineIDX | 設定全域 DN/Machine ID |
| 6 | SendCommandX | 送 16-byte command frame |
| 7 | RecExeResultX | 收 14-byte result frame |
| 8 | SendDataX | 送一般 data |
| 9 | RecDataX | 收一般 data |
| 10 | SendBigDataX | 送 big-data |
| 11 | RecBigDataX | 收 big-data |
| 12 | ComWakeUpX | 喚醒通訊 |
| 13 | EndX | 結束 transport context |
| 14 | GetPercentX | 取得傳輸進度 |
| 15 | PrepareP2pX | 準備 P2P |
| 21 | SendCommandX_EXT | extended command |
| 22 | SendAckX_EXT | extended ACK |
| 23 | RecvAckX_EXT | 收 extended ACK |
| 24 | RecvAcknCheckX_EXT | 收 ACK 並檢查 |
| 25 | SendDataX_EXT | extended data send |
| 26 | RecvDataX_EXT | extended data receive |
| 27 | ChangeCompanyMark_EXT | 修改 protocol/company mark |
| 28 | SetTranseiveCallback | 設定傳輸 callback |

Ordinal 16–20 在此 DLL 沒有 export；ordinal 21 之後是 extended API。

### 6.3 RealandAPI.Sapi managed/native API

以下是 RealandAPI.dll 的 Sapi 類別可用函式。成對名稱中，底線版本是 P/Invoke native entry point，不帶底線版本是 managed wrapper。實際參數型別以 DLL 的 metadata/Interop 宣告為準。

#### 連線、初始化、錯誤

~~~text
_DotNET / DotNET
_SetMachineType / SetMachineType
_ConnectSerial / ConnectSerial
_ConnectTcpip / ConnectTcpip
_ConnectP2p / ConnectP2p
_PrepareP2p / PrepareP2p
_Disconnect / Disconnect
DisconnectAll
_GetLastError / GetLastError
~~~

#### 人員、模板、權限

~~~text
_GetEnrollData / GetEnrollData
_GetEnrollData1 / GetEnrollData1
_SetEnrollData / SetEnrollData
_SetEnrollData1 / SetEnrollData1
_DeleteEnrollData / DeleteEnrollData
_ReadAllUserID / ReadAllUserID
_GetAllUserID / GetAllUserID
_EnableUser / EnableUser
_ModifyPrivilege / ModifyPrivilege
_ModifyDuressFP / ModifyDuressFP
_GetUserName / GetUserName
_GetUserName1 / GetUserName1
_SetUserName / SetUserName
_SetUserName1 / SetUserName1
_GetDepartName / GetDepartName
_SetDepartName / SetDepartName
~~~

#### 管理 log、出勤 log

~~~text
_ReadSuperLogData / ReadSuperLogData
_GetSuperLogData / GetSuperLogData
_ReadGeneralLogData / ReadGeneralLogData
_GetGeneralLogData / GetGeneralLogData
_ReadAllSLogData / ReadAllSLogData
_GetAllSLogData / GetAllSLogData
_ReadAllGLogData / ReadAllGLogData
_GetAllGLogData / GetAllGLogData
~~~

ReadGeneralLogData 的參數中有 ReadMark 概念；依 SDK 文件，某些模式可能會把記錄標成已讀。若只想同步而不改變設備的未讀計數，先確認 ReadMark 行為。

#### 設備資訊、狀態、時間、電源

~~~text
_GetDeviceStatus / GetDeviceStatus
_GetDeviceInfo / GetDeviceInfo
_SetDeviceInfo / SetDeviceInfo
_GetDeviceTime / GetDeviceTime
_SetDeviceTime / SetDeviceTime
_SetDeviceTime1 / SetDeviceTime1
_GetSerialNumber / GetSerialNumber
_GetBackupNumber / GetBackupNumber
_GetProductCode / GetProductCode
_GetDeviceLongInfo / GetDeviceLongInfo
_SetDeviceLongInfo / SetDeviceLongInfo
_GetMachineIP
_EnableDevice / EnableDevice
_PowerOnAllDevice / PowerOnAllDevice
_PowerOffDevice / PowerOffDevice
_ClearKeeperData / ClearKeeperData
_EmptyEnrollData / EmptyEnrollData
_EmptyGeneralLogData / EmptyGeneralLogData
_EmptySuperLogData / EmptySuperLogData
~~~

#### 公司、門控、響鈴

~~~text
_GetCompanyName / GetCompanyName
_GetCompanyName1 / GetCompanyName1
_SetCompanyName / SetCompanyName
_SetCompanyName1 / SetCompanyName1
_GetDoorStatus / GetDoorStatus
_SetDoorStatus / SetDoorStatus
_GetBellTime / GetBellTime
_SetBellTime / SetBellTime
~~~

#### XML / extended operation

~~~text
_GeneralOperationXML / GeneralOperationXML
_XML_ParseInt / XML_ParseInt
_XML_ParseLong / XML_ParseLong
_XML_ParseBoolean / _XML_ParseBoolean
_XML_ParseString / XML_ParseString
_XML_ParseBinaryByte / XML_ParseBinaryByte
_XML_ParseBinaryWord / XML_ParseBinaryWord
_XML_ParseBinaryLong / XML_ParseBinaryLong
_XML_ParseBinaryUnicode / XML_ParseBinaryUnicode
_XML_ParseMultiUnicode / XML_ParseMultiUnicode
_XML_AddInt / XML_AddInt
_XML_AddLong / XML_AddLong
_XML_AddBoolean / XML_AddBoolean
_XML_AddString / XML_AddString
_XML_AddBinaryByte / XML_AddBinaryByte
_XML_AddBinaryWord / XML_AddBinaryWord
_XML_AddBinaryLong / XML_AddBinaryLong
_XML_AddBinaryUnicode / XML_AddBinaryUnicode
_XML_AddBinaryGlyph / XML_AddBinaryGlyph
_XML_AddBinaryNameGlyph / XML_AddBinaryNameGlyph
~~~

#### 事件

~~~text
_StartEventCapture / StartEventCapture
_StopEventCapture / StopEventCapture
_SetTranseiveCallback
DisabledTransceiveCallback
_DisableTranseiveCallback
OnEvent
~~~

### 6.4 RealandAPI.Device 高階 API

RealandAPI.Device 是較適合應用程式使用的 managed façade。以下列出反編譯 metadata 中的可用方法；property getter/setter 另列在後面。

#### 連線與基本資料

~~~text
.ctor
SetOperateModel
OpenDevice
CloseDevice
OpenCommunication
CloseCommunication
GetStatus
GetStatusO
IsSB3000
SupportICCard
IsIpAddress
~~~

#### log 與人員

~~~text
GetNewlyRecords
GetNewlyGeneralLogCount
GetGeneralLogCountO
GetNewlyGeneralLogCountO
GetGeneralLogCount
GetGeneralLogDataO
GetAllGLogDataO
GetAllRecords
GetRecords
GetNewlySuperRecords
ReadGeneralLogData
ReadAllGLogData
ReadSuperLogData
ReadAllSLogData
GetAllSuperRecords
GetEnroll
GetEnrollO
SetEnroll
SetEnrollO
DelEnroll
GetAllEnroll
GetAllEnrollO
EmptyAllEnroll
GetUserName
SetUserName
GetUserLongName
SetUserLongName
SetUserNameO
EmptyAllRecords
EmptyAllSuperRecords
GetMonitoringRecord
OnlineEnroll
~~~

#### 設備、時間、電源

~~~text
GetDateTime
SetDateTime
Shutdown
ClearKeeperData
GetProductCode
GetDeviceText
SetDeviceText
GetDeviceStandbyText
SetDeviceStandbyText
GetDeviceMessage
SetDeviceMessage
SetDeviceDisplay
SetTimerOnOff
GetTimerOnOff
UploadSoundO
~~~

#### 權限、門控、排程

~~~text
ModifyPrivilege
ModifyPrivilegeO
GetPassTime
SetPassTime
GetGroupTime
SetGroupTime
GetTimeZone
SetTimeZone
GetLockGroup
SetLockGroup
GetBellTime
SetBellTime
GetDoorKey
SetDoorKey
GetUserCtrl
SetUserCtrl
SetUserBirthday
GetDoorStatus
SetDoorStatus
~~~

#### 人臉/影像及其他

~~~text
GetAttImageCount
GetAttImageList
GetAttImage
~~~

#### Device properties

~~~text
Communication
Model
SerialNumber
Baudrate
ComPort
Password
IpPort
IpAddress
DN
IsBusy
~~~

Device 的 Set*、Del*、Empty*、Shutdown、OnlineEnroll、SetDoorStatus、UploadSoundO 及模板/影像相關函式都視為有副作用；不應由背景同步工作自動呼叫。

### 6.5 Riss.Devices.dll（2911 SDK，可選）

RAMS-F 也包含 Riss.Devices.dll。它是另一套較通用的 2911 SDK façade；本次 M70 v3.6.8 的成功測試走的是 SBPCCOMM/RealandAPI native 路徑，因此不要直接假設 Riss.Devices 的封包和 M70 完全相同。

以下列出其中具名且可作為 SDK surface 使用的函式：

~~~text
DeviceConnection:
  .ctor
  CreateConnection
  Open
  Close
  SetCommOption
  GetCommOption
  SetProperty
  GetProperty
  EnableDevice
  ContainUnicodeChar
  GetDecodeName
  EncodeName

ZdCommBase:
  Open
  Close
  SendData
  RecvData
  WakeupMachine
  Device
  CmdLen
  CommunicationPercent
  PercentChanged

Zd2911Monitor:
  CreateZd2911Monitor
  OpenListen
  CloseListen
  ReceiveHandler
  Monitor
  IsBusy

Monitor:
  Mode
  UDPAddress
  UDPPort
  SerialPort
  SerialBaudRate

P2pUtils:
  IsIpAddress
  SetP2pServerIpAddress
  SetP2pServerPort
  SetP2pTransitServerIpAddress
  SetP2pTransitServerPort
  SetP2pResultCache

Zd2911Utils:
  BitCheck
  SetBit
  CreateChunkHeader
  GetUserFromBuffer
  CheckData
  SendMessageToDevice
  SendEnrollToDevice
  SendGetVersionCmd
  SendGetSettingsCmd
  SendPowerCmd
  SendSettingsSetCmd
  SendDateTimeCmd
  GetFirmwareVersionString
  GetDeviceSettings
  ProcessFirmware
  ProcessRealTimeLog
  GetHeadCode
  GetCmdCode
  GetPrefix
  GetEnrollRequestPIN
  GetEnrollRequestMAC
  GetNotifyDeviceMAC
  GetNotifyDeviceDN
  ConvertByteToHex
  ConvertHexToByte
  IsMacAddress
  GetLocalIpAddress
  CheckWaveFormat
  GetSoundData

Zd2911EnrollFileManagement:
  SaveAllUserEnrollDataAsDB
  SaveUserEnrollDataAsDB
  LoadAllUserEnrollDataFromDB
  LoadUserEnrollDataFromDB
  SaveUserNameData
  LoadUserNameData

ZdFpReader:
  Open
  Close
  Save
  Delete
  DeleteID
  DeleteAll
  AdjustSensor
  Capture
  IsFinger
  GetImage
  ImageEnroll
  EnrollStart
  EnrollNth
  EnrollEnd
  Identify
  GetEnrollCount
  Verify
  VerifyID
  SearchUnusedID
  SearchUnusedFN
  CheckId
  CheckFingerNum
  CheckManager
  CheckManagerID
  DeviceConnected

Reader.RLYN060:
  YN060_Initialize / Initialize
  YN060_Uninitialize / Uninitialize
  YN060_SetDatabasePath / SetDatabasePath
  YN060_IsFingerPress / IsFingerPress
  YN060_CaptureFingerImage / CaptureFingerImage
  YN060_CreateTemplate / CreateTemplate
  YN060_GetTemplateForRegister / GetTemplateForRegister
  YN060_ConvertTemplate / ConvertTemplate
  YN060_Enroll / Enroll
  YN060_RemoveTemplate / RemoveTemplate
  YN060_RemoveAll / RemoveAll
  YN060_GetEnrollCount
  YN060_SetDupCheck
  YN060_AdjustBrightness / AdjustBrightness
  YN060_PlaySound
  YN060_SetLedState
  YN060_AdjustSensor / AdjustSensor
  ImageBufferToBitmap
~~~

User、Enroll、Record 等資料類別的屬性也已由 metadata 確認：

~~~text
User:
  Privilege, DIN, UserName, IDNumber, Sex, Enable, Comment
  DeptId, AttType, Birthday, AccessControl, ValidityPeriod
  UseUserGroupACTZ, UseUserGroupVM, Department, Enrolls
  AccessTimeZone, ValidDate, InvalidDate, UserGroup
  LockControl, Res

Enroll:
  DIN, EnrollType, IsDuress, Fingerprint, Password, CardID

Record:
  DN, DIN, Clock, Verify, Action, Remark, MDIN
  DoorStatus, JobCode, Antipassback
~~~

Riss.Devices.dll 中另有大量名稱已被 obfuscate 的內部 helper/private type；那些不是穩定的公開串接契約，且本次沒有用於 M70 v3.6.8，因此不應把它們當成可支援 API。

## 7. 安全分級

### 可作為一般同步流程的唯讀函式

~~~text
ConnectSerial / ConnectTcpip / ConnectP2p
GetDeviceStatus
GetDeviceInfo
GetDeviceTime
GetSerialNumber
GetBackupNumber
GetProductCode
GetAllUserID
GetUserName
GetCompanyName
GetDepartName
GetMachineIP
GetDoorStatus
GetBellTime
GetDeviceLongInfo
~~~

讀取 log 時，需另外確認 ReadMark 是否會改變未讀狀態。

### 必須人工確認後才能使用

~~~text
SetDeviceInfo / SetDeviceTime / SetDeviceLongInfo
SetUserName / SetEnroll / SetUserName1
DeleteEnrollData / DelEnroll / EmptyAllEnroll
EnableDevice / EnableUser
ModifyPrivilege / ModifyDuressFP
SetDoorStatus / SetDoorKey
PowerOnAllDevice / PowerOffDevice / Shutdown
ClearKeeperData
EmptyGeneralLogData / EmptySuperLogData
OnlineEnroll
SetCompanyName / SetDepartName
SetBellTime / SetPassTime / SetGroupTime / SetTimeZone
SetDeviceText / SetDeviceMessage / SetDeviceDisplay
UploadSoundO
GeneralOperationXML
StartEventCapture / StopEventCapture
~~~

尤其不要把 GeneralOperationXML、SetDoorStatus、Empty* 或模板 API 暴露成未授權的 HTTP endpoint。

## 8. 建議的 NestJS 介接邊界

應用層建議只暴露明確的唯讀 use case，把 native protocol 隔離在 adapter：

~~~text
RealandM70Client
├── connect()
├── getStatus()
├── getInfo()
├── getTime()
├── listUsers()
├── getUserName(userId)
├── listAttendanceLogs()
└── disconnect()
~~~

建議加入以下保護：

1. IP、port、DN 放在設定檔，不要寫死在 controller。
2. 每台設備使用獨立 socket 或 per-device mutex。
3. 每個 frame 驗證 magic、DN、長度和 checksum。
4. 連線 timeout 建議 5 秒；讀取 big-data 要另外設定總量上限。
5. 對外 API 預設只開放 GET/同步；寫入 API 需另外的權限、audit log 和人工確認。
6. log 同步採 cursor/時間範圍時，先確認設備端的 ReadMark 行為。
7. 不要把設備的序號、人員姓名、指紋、人臉模板寫入一般 application log。

## 9. 參考資料與來源

- [Realand 官方 SDK Download](https://www.realandtec.com/download/sdk-download_c0005)：官方 SDK 套件入口。
- [Realand M70/相關機型產品頁](https://www.realandtec.com/a-l351-biometric-fingerprint-time-attendance_p0149.html)：LAN/Cloud 軟體與產品資訊。
- [SBXPC OCX Reference Manual V3.15（公開文件副本）](https://www.scribd.com/document/727616704/SBXPC-OCX-Reference-Manual-V3-15)：M70 支援、GetDeviceStatus、GetDeviceInfo、GetAllUserID、P2P/5005 等 API 說明。
- [Attendance Access System Manual 71（相容系統手冊）](https://m.media-amazon.com/images/I/C1H7xZa1mPL.pdf)：TCP/IP、Machine ID、port 5005、P2S/即時監控的操作說明；此文件不是本台設備的韌體原始碼，僅作協定交叉參考。
- [Realand ZD2911 User Guide（官方 SDK 內附）](Realand-ZD2911-User-Guide-en.pdf)：官方 SDK 內附的硬體/操作手冊。
- [Realand RAMS Software Manual（官方下載）](Realand-RAMS-Software-Manual.pdf)：RAMS 軟體使用與設備管理手冊。
- 原始下載檔：[Realand-2911-SDK.rar](Realand-2911-SDK.rar)、[Realand-RAMS-Software-Manual.rar](Realand-RAMS-Software-Manual.rar)。
- 本機 docs/RAMS-F.zip：RAMS 程式、RealandAPI.dll、SBXPCDLL.dll、SBPCCOMM.DLL 與 RAS.mdb 的靜態分析結果。

## 10. 尚未承諾的部分

以下名稱雖然存在於 DLL/SDK，但本次沒有對 M70 執行，不能只依名稱推定參數或副作用：

- 指紋、人臉、卡片模板的完整讀寫格式。
- 全部 management/general log 的 record schema 與分頁方式。
- P2P relay 的完整握手及 NAT 行為。
- GeneralOperationXML 的 XML schema。
- SBPCCOMM.DLL extended functions 的版本相容性。

在沒有設備備份、維護時段和明確回復方案前，保持這些函式停用。
