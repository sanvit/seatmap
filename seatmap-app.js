(function () {
  const config = {
    baseUrl: "https://pocketbase-jy07czyh81ggoziw747e8vli.gc.jaewon.de",
    authCollection: "users",
    seatmapCollection: "seatmaps",
    storageKey: "seatmap-pocketbase-auth"
  };

  function getStoredAuth() {
    try {
      const raw = localStorage.getItem(config.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.token || !parsed.record || !parsed.record.id) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function setStoredAuth(auth) {
    localStorage.setItem(config.storageKey, JSON.stringify(auth));
  }

  function clearStoredAuth() {
    localStorage.removeItem(config.storageKey);
  }

  async function request(path, options) {
    const init = options || {};
    const headers = new Headers(init.headers || {});

    if (init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: init.method || "GET",
      headers,
      body: init.body && !(init.body instanceof FormData) ? JSON.stringify(init.body) : init.body
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(data && data.message ? data.message : "PocketBase request failed.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function getAuthHeaders() {
    const auth = getStoredAuth();
    return auth ? { Authorization: auth.token } : {};
  }

  async function login(email, password) {
    const data = await request(`/api/collections/${config.authCollection}/auth-with-password`, {
      method: "POST",
      body: {
        identity: email,
        password
      }
    });

    const auth = {
      token: data.token,
      record: data.record
    };

    setStoredAuth(auth);
    return auth;
  }

  function logout() {
    clearStoredAuth();
  }

  async function verifyAuth() {
    const auth = getStoredAuth();
    if (!auth) {
      return null;
    }

    try {
      await request(`/api/collections/${config.seatmapCollection}/records?page=1&perPage=1`, {
        headers: getAuthHeaders()
      });
      return auth;
    } catch (error) {
      if (error.status === 401) {
        clearStoredAuth();
        return null;
      }
      throw error;
    }
  }

  async function listSeatmaps() {
    return request(
      `/api/collections/${config.seatmapCollection}/records?page=1&perPage=100&sort=-updatedAt&fields=id,title,rowCount,seatCount,createdAt,updatedAt`,
      {
        headers: getAuthHeaders()
      }
    );
  }

  async function getSeatmap(id) {
    return request(`/api/collections/${config.seatmapCollection}/records/${id}`, {
      headers: getAuthHeaders()
    });
  }

  async function saveSeatmap(payload, id) {
    const auth = getStoredAuth();
    if (!auth) {
      throw new Error("로그인 후 저장할 수 있습니다.");
    }

    const body = Object.assign({}, payload, { ownerId: auth.record.id });
    const method = id ? "PATCH" : "POST";
    const path = id
      ? `/api/collections/${config.seatmapCollection}/records/${id}`
      : `/api/collections/${config.seatmapCollection}/records`;

    return request(path, {
      method,
      headers: getAuthHeaders(),
      body
    });
  }

  function formatDate(isoString) {
    if (!isoString) {
      return "-";
    }

    const date = new Date(isoString);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  window.SeatmapApp = {
    config,
    formatDate,
    getStoredAuth,
    getSeatmap,
    listSeatmaps,
    login,
    logout,
    saveSeatmap,
    verifyAuth
  };
})();
