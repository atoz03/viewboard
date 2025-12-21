import { useEffect, useState } from "react";
import type { WebDAVConfig } from "../../sync/services/webdavClient";

interface WebDAVSettingsProps {
  config: WebDAVConfig | null;
  onConfigChange: (config: WebDAVConfig | null) => void;
}

export const WebDAVSettings = ({
  config,
  onConfigChange,
}: WebDAVSettingsProps) => {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [basePath, setBasePath] = useState("/viewboard");

  useEffect(() => {
    if (config) {
      setServerUrl(config.serverUrl ?? "");
      setUsername(config.username ?? "");
      setPassword(config.password ?? "");
      setBasePath(config.basePath ?? "/viewboard");
    } else {
      setServerUrl("");
      setUsername("");
      setPassword("");
      setBasePath("/viewboard");
    }
  }, [config]);

  const handleSave = () => {
    if (!serverUrl || !username || !password) {
      return;
    }
    const normalizedBasePath = basePath.trim() || "/viewboard";
    const finalBasePath = normalizedBasePath.startsWith("/")
      ? normalizedBasePath
      : `/${normalizedBasePath}`;
    onConfigChange({
      serverUrl: serverUrl.trim(),
      username: username.trim(),
      password: password.trim(),
      basePath: finalBasePath,
    });
  };

  const handleClear = () => {
    setServerUrl("");
    setUsername("");
    setPassword("");
    setBasePath("/viewboard");
    onConfigChange(null);
  };

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="text-xs text-neutral-400">服务器地址</label>
        <input
          className="vb-input mt-2"
          placeholder="https://example.com/remote.php/dav/files/user"
          value={serverUrl}
          onChange={(event) => setServerUrl(event.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-neutral-400">用户名</label>
        <input
          className="vb-input mt-2"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-neutral-400">密码</label>
        <input
          className="vb-input mt-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-neutral-400">远程目录</label>
        <input
          className="vb-input mt-2"
          value={basePath}
          onChange={(event) => setBasePath(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="vb-button" type="button" onClick={handleSave}>
          保存配置
        </button>
        <button className="vb-button" type="button" onClick={handleClear}>
          清除配置
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        WebDAV 会在 /viewboard/tasks 下存储任务文件，支持坚果云与
        Nextcloud。
      </p>
    </div>
  );
};
