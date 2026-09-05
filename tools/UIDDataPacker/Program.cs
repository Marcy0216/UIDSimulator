using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ZstdSharp;

if (args.Length < 2)
{
    Console.WriteLine("Usage: UIDDataPacker <csv-directory> <output-directory> [release-tag] [shard-size]");
    return 1;
}

string inputDirectory = Path.GetFullPath(args[0]);
string outputDirectory = Path.GetFullPath(args[1]);
string releaseTag = args.Length >= 3 ? args[2] : "data-v1";
int shardSize = args.Length >= 4 ? int.Parse(args[3]) : 4_194_304;
if (!Directory.Exists(inputDirectory) || shardSize < 65_536)
    throw new ArgumentException("Input directory is missing or shard-size is too small.");

Directory.CreateDirectory(outputDirectory);
string[] csvFiles = Directory.GetFiles(inputDirectory, "*.csv").OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToArray();
if (csvFiles.Length == 0)
    throw new FileNotFoundException("No CSV files were found.");

var manifest = new Manifest
{
    formatVersion = 1,
    codec = "zstd",
    minUid = 1,
    maxUid = int.MaxValue,
    shardSize = shardSize,
    releaseBaseUrl = $"https://github.com/Marcy0216/UIDSimulator/releases/download/{releaseTag}"
};

ShardBuilder? shard = null;
long inputRows = 0;
int lastUid = 0;
foreach (string csvFile in csvFiles)
{
    Console.WriteLine($"Reading {Path.GetFileName(csvFile)}");
    using var reader = new StreamReader(csvFile, Encoding.UTF8, true, 1024 * 1024);
    string? line;
    while ((line = reader.ReadLine()) != null)
    {
        if (line.Length == 0 || line.StartsWith("uid,", StringComparison.OrdinalIgnoreCase))
            continue;
        if (!Csv.TryParse(line, out int uid, out bool mythical, out string itemId))
            throw new InvalidDataException($"Invalid CSV row in {Path.GetFileName(csvFile)}: {line[..Math.Min(160, line.Length)]}");
        if (uid == lastUid)
            continue;
        if (uid < lastUid)
            throw new InvalidDataException("CSV rows must be globally sorted by UID. Sort file names and rows before packing.");

        int shardStart = checked((int)(((long)(uid - 1) / shardSize) * shardSize + 1));
        if (shard == null || shard.Start != shardStart)
        {
            if (shard != null)
                manifest.shards.Add(shard.Write(outputDirectory));
            int shardEnd = (int)Math.Min(int.MaxValue, (long)shardStart + shardSize - 1);
            shard = new ShardBuilder(shardStart, shardEnd);
        }
        shard.Add(uid, mythical, itemId);
        lastUid = uid;
        inputRows++;
        if (inputRows % 10_000_000 == 0)
            Console.WriteLine($"  {inputRows:n0} rows packed");
    }
}
if (shard != null)
    manifest.shards.Add(shard.Write(outputDirectory));

manifest.totalRecords = inputRows;
var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
File.WriteAllText(Path.Combine(outputDirectory, "manifest.json"), JsonSerializer.Serialize(manifest, jsonOptions) + Environment.NewLine);
Console.WriteLine($"Done: {inputRows:n0} records, {manifest.shards.Count:n0} shards");
return 0;

sealed class ShardBuilder
{
    public int Start { get; }
    private readonly int _end;
    private readonly MemoryStream _records = new();
    private readonly Dictionary<string, int> _itemIndexes = new(StringComparer.Ordinal);
    private readonly List<string> _items = new();
    private int _previousUid;
    private int _count;

    public ShardBuilder(int start, int end) { Start = start; _end = end; _previousUid = start - 1; }

    public void Add(int uid, bool mythical, string itemId)
    {
        if (!_itemIndexes.TryGetValue(itemId, out int itemIndex))
        {
            itemIndex = _items.Count;
            _itemIndexes.Add(itemId, itemIndex);
            _items.Add(itemId);
        }
        VarInt.Write(_records, (uint)(uid - _previousUid));
        VarInt.Write(_records, checked((uint)(itemIndex * 2 + (mythical ? 1 : 0))));
        _previousUid = uid;
        _count++;
    }

    public ShardInfo Write(string outputDirectory)
    {
        using var raw = new MemoryStream(32 + (int)_records.Length + _items.Sum(x => Encoding.UTF8.GetByteCount(x) + 5));
        raw.Write("UDS1"u8);
        WriteInt(raw, Start); WriteInt(raw, _end); WriteInt(raw, _count); WriteInt(raw, _items.Count);
        foreach (string item in _items)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(item);
            VarInt.Write(raw, (uint)bytes.Length);
            raw.Write(bytes);
        }
        _records.Position = 0;
        _records.CopyTo(raw);
        byte[] packed;
        using (var compressor = new Compressor(15))
            packed = compressor.Wrap(raw.ToArray()).ToArray();
        string fileName = $"uid_{Start:D10}_{_end:D10}.udz";
        string path = Path.Combine(outputDirectory, fileName);
        File.WriteAllBytes(path, packed);
        string sha = Convert.ToHexString(SHA256.HashData(packed)).ToLowerInvariant();
        Console.WriteLine($"  {fileName}: {_count:n0} records, {packed.Length / 1024d / 1024d:0.00} MiB");
        _records.Dispose();
        return new ShardInfo { start = Start, end = _end, file = fileName, records = _count, compressedBytes = packed.LongLength, sha256 = sha };
    }

    private static void WriteInt(Stream stream, int value)
    {
        Span<byte> bytes = stackalloc byte[4];
        BinaryPrimitives.WriteInt32LittleEndian(bytes, value);
        stream.Write(bytes);
    }
}

static class VarInt
{
    public static void Write(Stream stream, uint value)
    {
        while (value >= 0x80) { stream.WriteByte((byte)(value | 0x80)); value >>= 7; }
        stream.WriteByte((byte)value);
    }
}

static class Csv
{
    public static bool TryParse(string line, out int uid, out bool mythical, out string itemId)
    {
        uid = 0; mythical = false; itemId = "";
        List<string> cells = new(); var value = new StringBuilder(); bool quoted = false;
        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"') { if (quoted && i + 1 < line.Length && line[i + 1] == '"') { value.Append('"'); i++; } else quoted = !quoted; }
            else if (c == ',' && !quoted) { cells.Add(value.ToString()); value.Clear(); }
            else value.Append(c);
        }
        cells.Add(value.ToString());
        if (cells.Count < 3 || !int.TryParse(cells[0], out uid) || uid < 1) return false;
        string rarity = cells[1].Trim();
        if (rarity.Equals("Mythical", StringComparison.OrdinalIgnoreCase) || rarity == "1") mythical = true;
        else if (!rarity.Equals("Legendary", StringComparison.OrdinalIgnoreCase) && rarity != "0") return false;
        itemId = string.Join(',', cells.Skip(2)).Trim();
        return itemId.Length > 0;
    }
}

sealed class Manifest
{
    public int formatVersion { get; set; }
    public string codec { get; set; } = "zstd";
    public int minUid { get; set; }
    public int maxUid { get; set; }
    public int shardSize { get; set; }
    public long totalRecords { get; set; }
    public string releaseBaseUrl { get; set; } = "";
    public List<ShardInfo> shards { get; set; } = new();
}

sealed class ShardInfo
{
    public int start { get; set; }
    public int end { get; set; }
    public string file { get; set; } = "";
    public int records { get; set; }
    public long compressedBytes { get; set; }
    public string sha256 { get; set; } = "";
}
