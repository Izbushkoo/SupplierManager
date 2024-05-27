import fs from 'fs';
import got from 'got';

const urls = Object.freeze({
  pgn: "https://b2b.pgn.com.pl/xml?id=26",
  unimet: "https://img.unimet.pl/cennik.xml",
  hurtprem: "https://www.hurtowniaprzemyslowa.pl/xml/baselinker.xml",
  rekman: "https://api.rekman.com.pl/cennik.php?email=aradzevich&password=GeVIOj&TylkoNaStanie=TRUE",
  growbox: "https://goodlink.pl/xmlapi/1/3/utf8/"
});

export async function downloadXML(supplier) {
    const url = urls[supplier];
    const fileDest = `./xml/${supplier}.xml`;
  
    const response = await got(url);
  
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(fileDest);
  
      response.pipe(stream);
  
      stream.on('finish', () => {
        fs.writeFile(fileDest, response.body, (err) => {
          if (err) {
            console.error(`Error writing file: ${err}`);
            reject();
          } else {
            console.log(`File downloaded to ${fileDest}`);
            resolve();
          }
        });
      });
  
      stream.on('error', (err) => {
        console.error(`Error downloading file: ${err}`);
        reject();
      });
    });
}

