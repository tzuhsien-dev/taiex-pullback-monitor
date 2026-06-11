import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const dataFiles = [
  'public/data/taiex-price.json',
  'public/data/taiex-total-return.json',
  'public/data/metadata.json',
];

const usage = `Usage:
  npm run data:publish
  npm run data:publish -- --dry-run
  npm run data:publish -- --no-push

Options:
  --dry-run  Refresh and validate data, show the planned commit, then restore files.
  --no-push  Refresh, validate, and commit without pushing.
  --help     Show this help.
`;

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr.trim() : '';
    throw new Error(`${command} ${args.join(' ')} 執行失敗${detail ? `：${detail}` : ''}`);
  }
  return options.capture ? result.stdout.trim() : '';
};

const getStatusEntries = () =>
  run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { capture: true })
    .split('\n')
    .filter(Boolean);

const getChangedFiles = () =>
  new Set(
    getStatusEntries().map((entry) => {
      const path = entry.slice(3);
      return path.includes(' -> ') ? path.split(' -> ').at(-1) : path;
    }),
  );

const ensureCleanWorktree = () => {
  const entries = getStatusEntries();
  if (entries.length > 0) {
    throw new Error(`工作樹必須乾淨，請先 commit 或 stash：\n${entries.join('\n')}`);
  }
};

const ensureMainBranch = () => {
  const branch = run('git', ['branch', '--show-current'], { capture: true });
  if (branch !== 'main') throw new Error(`資料發布只允許在 main 執行，目前分支為 ${branch || '(detached HEAD)'}`);
  return branch;
};

const ensureOrigin = () => {
  run('git', ['remote', 'get-url', 'origin'], { capture: true });
};

const readSnapshots = async () =>
  new Map(await Promise.all(dataFiles.map(async (file) => [file, await readFile(file)])));

const restoreSnapshots = async (snapshots) => {
  await Promise.all([...snapshots].map(([file, content]) => writeFile(file, content)));
};

const hasMarketDataChanged = async (snapshots) => {
  const currentPrice = await readFile(dataFiles[0]);
  const currentTotalReturn = await readFile(dataFiles[1]);
  return (
    !currentPrice.equals(snapshots.get(dataFiles[0])) ||
    !currentTotalReturn.equals(snapshots.get(dataFiles[1]))
  );
};

const validateChangedFiles = () => {
  const changed = getChangedFiles();
  const unexpected = [...changed].filter((file) => !dataFiles.includes(file));
  if (unexpected.length > 0) {
    throw new Error(`資料刷新修改了非預期檔案：\n${unexpected.join('\n')}`);
  }
  return dataFiles.filter((file) => changed.has(file));
};

const readMetadata = async () => {
  const metadata = JSON.parse(await readFile('public/data/metadata.json', 'utf8'));
  if (
    metadata.status !== 'ok' ||
    typeof metadata.priceLatestDate !== 'string' ||
    typeof metadata.totalReturnLatestDate !== 'string'
  ) {
    throw new Error('metadata.json 格式不正確。');
  }
  if (metadata.priceLatestDate !== metadata.totalReturnLatestDate) {
    throw new Error(
      `兩種指數最新日期不同：${metadata.priceLatestDate} / ${metadata.totalReturnLatestDate}`,
    );
  }
  return metadata;
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const supportedArgs = new Set(['--dry-run', '--no-push', '--help']);
  const unknownArgs = [...args].filter((arg) => !supportedArgs.has(arg));
  if (unknownArgs.length > 0) throw new Error(`不支援的參數：${unknownArgs.join(', ')}\n${usage}`);
  if (args.has('--help')) {
    console.log(usage);
    return;
  }
  if (args.has('--dry-run') && args.has('--no-push')) {
    throw new Error('--dry-run 與 --no-push 不可同時使用。');
  }

  ensureCleanWorktree();
  const branch = ensureMainBranch();
  ensureOrigin();
  const snapshots = await readSnapshots();

  try {
    run('npm', ['run', 'data:refresh']);
    run('npm', ['test']);
    run('npm', ['run', 'build']);

    if (!(await hasMarketDataChanged(snapshots))) {
      await restoreSnapshots(snapshots);
      console.log('TWSE 指數資料沒有變更，不建立 commit。');
      return;
    }

    const changedFiles = validateChangedFiles();
    const metadata = await readMetadata();
    const commitMessage = `data: refresh TWSE history through ${metadata.priceLatestDate}`;
    console.log(`預計提交：${commitMessage}`);
    console.log(changedFiles.map((file) => `  ${file}`).join('\n'));

    if (args.has('--dry-run')) {
      console.log('Dry run 完成，不建立 commit 或 push。');
      return;
    }

    run('git', ['add', '--', ...dataFiles]);
    run('git', ['commit', '-m', commitMessage, '--', ...dataFiles]);

    if (args.has('--no-push')) {
      console.log('Commit 已建立，依 --no-push 略過推送。');
      return;
    }

    run('git', ['push', 'origin', branch]);
    console.log(`資料已推送至 origin/${branch}。`);
  } finally {
    if (args.has('--dry-run')) await restoreSnapshots(snapshots);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
