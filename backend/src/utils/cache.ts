const cache = new Map();

const get = (key) => cache.get(key);
const set = (key, value) => cache.set(key, value);
const clear = () => {
    cache.clear();
    console.log("⚡ [Cache Manager] Cache cleared due to write/upload operation.");
};

export {  get, set, clear  };
