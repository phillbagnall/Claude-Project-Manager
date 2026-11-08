import { useState } from 'react';
import type { Settings } from '../data';

const TOKEN_URL =
  'https://github.com/settings/personal-access-tokens/new?name=Project%20Manager%20dashboard&description=Read%2Fwrite%20PROJECT_STATUS.md%20files&contents=write';

export function Setup({
  settings,
  onSave,
  onCancel,
  authError,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
  onCancel?: () => void;
  authError?: boolean;
}) {
  const [token, setToken] = useState(settings.token);
  const [dataRepo, setDataRepo] = useState(settings.dataRepo);
  const [registryPath, setRegistryPath] = useState(settings.registryPath);
  const repoOk = /^[\w.-]+\/[\w.-]+$/.test(dataRepo.trim());
  const canSave = token.trim().length > 20 && repoOk;

  return (
    <form
      className="setup panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave({ token: token.trim(), dataRepo: dataRepo.trim(), registryPath: registryPath.trim() || 'projects.json', demo: false });
      }}
    >
      <h2>{onCancel ? 'Settings' : 'Connect your projects'}</h2>
      {authError && <p className="error">GitHub rejected the token — it may have expired. Paste a new one.</p>}
      {!onCancel && (
        <p className="muted">
          This page holds no data. It reads your <code>PROJECT_STATUS.md</code> files straight from GitHub using a
          token that's stored only in this browser.
        </p>
      )}
      <label className="field">
        <span>Data repo <small>(owner/name, holds <code>projects.json</code>)</small></span>
        <input value={dataRepo} onChange={(e) => setDataRepo(e.target.value)} placeholder="phillbagnall/project-tracker-data" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <label className="field">
        <span>GitHub token <small>(fine-grained, Contents: read &amp; write)</small></span>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" />
      </label>
      <details>
        <summary>Advanced</summary>
        <label className="field">
          <span>Registry file path</span>
          <input value={registryPath} onChange={(e) => setRegistryPath(e.target.value)} />
        </label>
      </details>
      <p className="small muted">
        <a href={TOKEN_URL} target="_blank" rel="noreferrer">Create a token</a> → Repository access: <em>All
        repositories</em> (simplest) or <em>Only select repositories</em> (the data repo + each project repo) →
        Permissions: <em>Contents: Read and write</em>. Don't save it on a shared device.
      </p>
      <div className="row">
        <button className="primary" type="submit" disabled={!canSave}>Save &amp; load</button>
        {onCancel ? (
          <>
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" className="danger" onClick={() => onSave({ ...settings, token: '', demo: false })}>Sign out</button>
          </>
        ) : (
          <button type="button" onClick={() => onSave({ ...settings, demo: true })}>Try with demo data</button>
        )}
      </div>
    </form>
  );
}
