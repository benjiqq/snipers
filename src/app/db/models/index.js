import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const models: any = {};
let models_loaded = false;

async function* asyncGenerator() {
    for (const model of await fs.readdir(__dirname)) {
        if (model === 'index.js') continue;
        yield await import(join(__dirname, model));
    }
}

(async () => {
    for await (const { default: modelDefiner } of asyncGenerator()) {
        if (typeof modelDefiner === 'function') {
            models[modelDefiner.modelName] = modelDefiner;
            asyncGenerator();
        }
    }
    models_loaded = true;
})();

async function getModels() {
    return new Promise((resolve) => {
        function tick() {
            if (models_loaded) {
                resolve(models);
            } else {
                setTimeout(tick, 1000);
            }
        }
        tick();
    });
}

export { getModels };
export default models;
