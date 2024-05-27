import fs from 'fs';
import path from 'path';
// import { url } from 'url';
import { google } from 'googleapis';
import keys from '../artful-abode-394612-269fa32007e4.json' assert { type: 'json' };

function downloadFile(drive, fileId, filename) {
  return new Promise((resolve, reject) => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const destPath = path.join(__dirname, '../xml', filename);

    console.log('Destination Path:', destPath);


    var dest = fs.createWriteStream(destPath);
    // var dest = fs.createWriteStream(`/Users/vladkatsubo/Desktop/SuppMan/SupplierManager/xml/${filename}`);
    let progress = 0;

    drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' },
      function (err, res) {
        if (err) {
          console.error('Error downloading file.');
          reject(err);
        } else {
          res.data
            .on('end', () => {
              console.log('Done downloading file.');
              resolve();
            })
            .on('error', err => {
              console.error('Error downloading file.');
              reject(err);
            })
            .on('data', d => {
              progress += d.length;
              if (process.stdout.isTTY) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`Downloaded ${progress} bytes`);
              }
            })
            .pipe(dest);
        }
      }
    );
  });
}

function listFiles(auth) {
  return new Promise((resolve, reject) => {
    const drive = google.drive({ version: 'v3', auth });
    drive.files.list({
      q: "'1ioZ6c31Dth-l16eLWBJi3zJ6bBkNbUv0' in parents",
      fields: 'files(id, name)',
    }, (err, res) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err);
      } else {
        const files = res.data.files;
        if (files.length) {
          console.log('Files:');
          const downloadPromises = files.map((file) => {
            console.log(`${file.name} (${file.id})`);
            return downloadFile(drive, file.id, file.name);
          });
          Promise.all(downloadPromises).then(resolve).catch(reject);
        } else {
          console.log('No files found.');
          resolve();
        }
      }
    });
  });
}

export async function downloadGrowboxXML() {
  return new Promise((resolve, reject) => {
    const client = new google.auth.JWT(
      keys.client_email,
      null,
      keys.private_key,
      ['https://www.googleapis.com/auth/drive']
    );

    client.authorize(function(err, tokens) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log('Connected!');
        listFiles(client).then(resolve).catch(reject);
      }
    });
  });
}
