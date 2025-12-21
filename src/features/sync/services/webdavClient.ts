export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  basePath?: string;
}

export interface WebDAVEntry {
  href: string;
  name: string;
  isDirectory: boolean;
}

export interface WebDAVClient {
  ensureDirectory: (path: string) => Promise<void>;
  listDirectory: (path: string) => Promise<WebDAVEntry[]>;
  getFile: (path: string) => Promise<string>;
  putFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
}

const normalizeBase = (url: string) => url.replace(/\/+$/, "");
const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const encodeBase64 = (value: string) => {
  if (typeof btoa === "function") {
    return btoa(value);
  }
  const buffer = (globalThis as {
    Buffer?: {
      from: (input: string, encoding: string) => { toString: (enc: string) => string };
    };
  }).Buffer;
  if (buffer) {
    return buffer.from(value, "utf-8").toString("base64");
  }
  return value;
};

const buildAuthHeader = (username: string, password: string) => {
  return `Basic ${encodeBase64(`${username}:${password}`)}`;
};

const buildUrl = (serverUrl: string, path: string) => {
  return `${normalizeBase(serverUrl)}${normalizePath(path)}`;
};

const parsePropfind = (xmlText: string, basePath: string): WebDAVEntry[] => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const responses = Array.from(xml.getElementsByTagName("response"));

  return responses
    .map((node) => {
      const href = node.getElementsByTagName("href")[0]?.textContent ?? "";
      const displayName =
        node.getElementsByTagName("displayname")[0]?.textContent ?? "";
      const isDirectory = node.getElementsByTagName("collection").length > 0;
      const normalizedHref = decodeURIComponent(href);
      const name = displayName || normalizedHref.split("/").filter(Boolean).pop() || "";
      return { href: normalizedHref, name, isDirectory };
    })
    .filter((entry) => {
      const cleanedBase = basePath.replace(/\/+$/, "");
      return entry.name && !entry.href.endsWith(`${cleanedBase}/`);
    });
};

export const createWebDAVClient = (config: WebDAVConfig): WebDAVClient => {
  const authHeader = buildAuthHeader(config.username, config.password);

  const request = async (path: string, init: RequestInit) => {
    const response = await fetch(buildUrl(config.serverUrl, path), {
      ...init,
      headers: {
        Authorization: authHeader,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok && response.status !== 207) {
      const errorText = await response.text();
      throw new Error(`WebDAV 请求失败: ${response.status} ${errorText}`);
    }

    return response;
  };

  const ensureDirectory = async (path: string) => {
    const segments = normalizePath(path).split("/").filter(Boolean);
    let current = "";
    for (const segment of segments) {
      current += `/${segment}`;
      try {
        await request(current, { method: "MKCOL" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("405") || message.includes("409")) {
          continue;
        }
        throw error;
      }
    }
  };

  const listDirectory = async (path: string) => {
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname />
    <D:resourcetype />
  </D:prop>
</D:propfind>`;

    const response = await request(path, {
      method: "PROPFIND",
      headers: {
        Depth: "1",
        "Content-Type": "application/xml",
      },
      body,
    });

    const text = await response.text();
    return parsePropfind(text, path);
  };

  const getFile = async (path: string) => {
    const response = await request(path, { method: "GET" });
    return response.text();
  };

  const putFile = async (path: string, content: string) => {
    await request(path, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: content,
    });
  };

  const deleteFile = async (path: string) => {
    try {
      await request(path, { method: "DELETE" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("404")) {
        return;
      }
      throw error;
    }
  };

  return {
    ensureDirectory,
    listDirectory,
    getFile,
    putFile,
    deleteFile,
  };
};
