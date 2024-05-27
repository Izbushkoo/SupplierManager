import { writeFile } from 'fs';

export function writeToTxtFile(supplier, allegroObjects) {
    writeFile(`./final/${supplier}.txt`, JSON.stringify(allegroObjects) , err => {
        if (err) {
            console.error(err);
        }
    });
}