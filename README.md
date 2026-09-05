# UID Simulator

UID Scannerが出力したCSVから、現在UID以降の装備ドロップ候補を探索するGitHub Pagesサイトです。

## CSVを更新する

1. `public/data/` に1個以上の `.csv` を追加します。
2. GitHubへコミットしてpushします。
3. GitHub ActionsがCSV一覧を生成し、サイトを自動更新します。

CSV形式は `uid,rarity,itemId` です。`rarity` は `Legendary` / `Mythical` と、旧形式の `0` / `1` の両方に対応します。画面からローカルCSVを直接読み込むこともできます。
