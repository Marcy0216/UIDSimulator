# UID Simulator

UID Scannerが出力したCSVから、現在UID以降の装備ドロップ候補を探索するGitHub Pagesサイトです。

## CSVを更新する

1. UIDDataPackerでCSVを `.udz` 分割データへ変換します。
2. `.udz` をGitHubの `data-v1` Releaseへアップロードします。
3. 生成された `manifest.json` を `public/data/manifest.json` と置き換えてpushします。

サイトは指定UIDに必要な分割だけを取得して展開します。画面からローカルCSVを直接読み込むこともできます。

```powershell
dotnet run --project .\tools\UIDDataPacker -c Release -- "D:\CSVフォルダ" "D:\圧縮データ" data-v1
```

`.udz` は約419万UID単位で分割され、アイテムID辞書・UID差分・レアリティ1ビット表現をZstandard圧縮したものです。
