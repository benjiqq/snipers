const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'dist');

function copyFiles(src, dest) {
    fs.readdir(src, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }

        files.forEach(file => {
            const srcFilePath = path.join(src, file.name);
            const destFilePath = path.join(dest, file.name);

            if (file.isDirectory()) {
                if (!fs.existsSync(destFilePath)) {
                    fs.mkdirSync(destFilePath, { recursive: true });
                }
                copyFiles(srcFilePath, destFilePath);
            } else {
                if (path.extname(file.name) === '.json') {
                    fs.copyFile(srcFilePath, destFilePath, err => {
                        if (err) console.error(err);
                    });
                }
            }
        });
    });
}

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

copyFiles(srcDir, destDir);
