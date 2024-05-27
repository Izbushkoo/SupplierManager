import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import https from 'https';
dotenv.config({ path: '.env.dev' });

let accessToken = process.env.ACCESS_TOKEN;
let refreshToken = process.env.REFRESH_TOKEN;

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const client = new MongoClient(uri, { useUnifiedTopology: true });

async function getToken() {
    
    try {
        // Connect to the MongoDB cluster
        await client.connect();   
        const database = client.db(dbName);
        const collection = database.collection("token");

        // Query
        const document = await collection.findOne({});
        const { access_token, refresh_token } = document;
        accessToken = access_token
        refreshToken = refresh_token
    } finally {
        // Close the connection when done
        await client.close();
    }
}

async function checkToken() {
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.allegro.public.v1+json',
    },
    hostname: 'api.allegro.pl',
    path: '/me',
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, async (res) => {
      if (res.statusCode === 200) {
        console.log('API call successful, token is valid');
        resolve(accessToken);
      } else if (res.statusCode === 401) {
        console.log('API call failed, token has expired, refreshing...');
        try {
          const newAccessToken = await refreshAccessToken();
          console.log('Access token refreshed successfully');
          resolve(newAccessToken);
        } catch (err) {
          console.log('Error refreshing access token:', err);
          reject(err);
        }
      } else {
        console.log('API call failed, token is invalid:', res.statusMessage);
        reject(new Error('Invalid access token'));
      }
    });

    req.on('error', (err) => {
      console.log('API call failed:', err.message);
      reject(err);
    });

    req.end();
  });
}

async function refreshAccessToken() {
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    hostname: 'allegro.pl',
    path: `/auth/oauth/token?grant_type=refresh_token&refresh_token=${refreshToken}&redirect_uri=https://www.fursoller.com/`,
  };

  const data = new URLSearchParams();

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', async () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(body);
          accessToken = response.access_token;
          refreshToken = response.refresh_token;
          console.log('Access token refreshed successfully');

          try {
            await client.connect();
            const db = client.db(dbName);
            const tokenCollection = db.collection('token');
            await tokenCollection.updateOne(
              {},
              { $set: { access_token: accessToken, refresh_token: refreshToken } },
              { upsert: true }
            );
            console.log('New tokens saved to database successfully');
            await client.close();
          } catch (error) {
            console.log('Error saving new tokens to database:', error);
            reject(new Error('Failed to save new tokens to database'));
          }

          resolve(accessToken);
        } else {
          console.log(`Error refreshing access token: ${res.statusCode} ${res.statusMessage} ${res.url}`);
          reject(new Error('Failed to refresh access token'));
        }
      });
    });

    req.on('error', (err) => {
      console.log('Error refreshing access token:', err);
      reject(err);
    });

    req.write(data.toString());
    req.end();
  });
}

export async function getAndCheckToken() {
  await getToken();
  try {
    const checkedAccessToken = await checkToken();
    return checkedAccessToken
  } catch (err) {
    console.log('Error checking access token:', err);
  }
}