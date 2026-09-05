# UID Data Packer

UID Scannerの分割CSVを、Web検索向けの辞書化・UID差分・レアリティ1ビット形式へ変換し、Zstandardで圧縮します。24GB級CSVを一括でメモリへ読み込まず、順番に処理します。

```powershell
dotnet run -c Release -- "D:\path\to\csv" "D:\path\to\packed" data-v1
```

入力CSVはUID昇順で、ファイル名も走査順に並ぶ必要があります。出力された `.udz` をGitHubの `data-v1` Releaseへすべてアップロードし、`manifest.json` をUIDSimulatorの `public/data/manifest.json` として置き換えてください。

各Releaseアセットは2GiBより十分小さい約419万UID単位です。変換処理は重複UIDを無視し、順序逆転を検出すると停止します。
