// Small per-process cache for hot public reads; mutations call invalidate()
const store = new Map();

const remember = async (key, ttlMs, load) => {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
};

const invalidate = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

module.exports = { remember, invalidate };
