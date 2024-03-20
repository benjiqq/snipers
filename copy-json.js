import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');
const destDir = path.join(process.cwd(), 'dist');

async function copyFiles(src, dest) {
    try {
        const files = await fs.promises.readdir(src, { withFileTypes: true });

        for (const file of files) {
            const srcFilePath = path.join(src, file.name);
            const destFilePath = path.join(dest, file.name);

            if (file.isDirectory()) {
                await fs.promises.mkdir(destFilePath, { recursive: true }).catch(console.error);
                await copyFiles(srcFilePath, destFilePath);
            } else {
                if (path.extname(file.name) === '.json') {
                    await fs.promises.copyFile(srcFilePath, destFilePath).catch(console.error);
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function main() {
    try {
        await fs.promises.mkdir(destDir, { recursive: true });
        await copyFiles(srcDir, destDir);
    } catch (err) {
        console.error(err);
    }
}

main();
