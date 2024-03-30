const fs = require('fs').promises;
const path = require('path');
//const modelsDirPath = path.join(__dirname, 'app', 'db', 'models');
const modelsDirPath = path.join(__dirname, '.');

//const __mdirname = path.dirname((require.main && require.main.filename) ? require.main.filename : '.');
const __mdirname = modelsDirPath;

const models: Models = {};
let models_loaded = false;

interface Models {
    [key: string]: any; // Consider using a more specific type instead of `any` if possible
}


async function* asyncGenerator() {
    for (const model of await fs.readdir(__mdirname)) {
        //console.log('Found file:', model);
        if (model === 'index.js') continue;
        yield Promise.resolve(require(path.join(__mdirname, model)));
    }
}

(async () => {
    for await (const modelDefiner of asyncGenerator()) {
        //console.log('Processing model:', modelDefiner);
        if (typeof modelDefiner.default === 'function') {
            //console.log('Defining model:', modelDefiner.default.modelName); // Debug message    
            models[modelDefiner.default.modelName] = modelDefiner.default;
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

//module.exports = { getModels };
export { getModels };
module.exports.default = models;
