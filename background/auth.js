const AUTH = {
  getToken: function(interactive) {
    return new Promise(function(resolve, reject) {
      chrome.identity.getAuthToken({ interactive: interactive }, function(token) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });
  },

  removeToken: function(token) {
    return new Promise(function(resolve) {
      chrome.identity.removeCachedAuthToken({ token: token }, resolve);
    });
  },

  refreshToken: async function() {
    try {
      const oldToken = await AUTH.getToken(false);
      if (oldToken) await AUTH.removeToken(oldToken);
    } catch (e) {}
    return AUTH.getToken(false);
  },

  signOut: async function() {
    try {
      const token = await AUTH.getToken(false);
      if (token) {
        await fetch('https://accounts.google.com/o/oauth2/revoke?token=' + encodeURIComponent(token));
        await AUTH.removeToken(token);
      }
    } catch (e) {}
  },

  isAuthenticated: async function() {
    try {
      const token = await AUTH.getToken(false);
      return !!token;
    } catch (e) {
      return false;
    }
  }
};

export default AUTH;