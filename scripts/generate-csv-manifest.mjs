import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = join(process.cwd(), 'public', 'data');
await mkdir(directory, { recursive: true });
const files = (await readdir(directory)).filter(name => name.toLowerCase().endsWith('.csv')).sort();
await writeFile(join(directory, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
