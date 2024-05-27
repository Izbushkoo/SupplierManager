import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

const supplierDatabaseID = Object.freeze({ 
  pgn: "63d41080b4d9fc9a7f1aeb25",
  unimet: "63d4110fb4d9fc9a7f1aeb28",
  hurtprem: "63d39858b4d9fc9a7f1acedb",
  rekman: "6400778b7b4bb4cab20ccccf",
  growbox: "640f0ddec6defcd7745fe210"
});

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const dbCollection = process.env.DB_COLL;

export async function fetchDataFromDB(supplier, allegroUpdate) {
  const supplierID = supplierDatabaseID[supplier];
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  
  try {
    // Connect to the MongoDB cluster
    await client.connect();   
    const database = client.db(dbName);
    const collection = database.collection(dbCollection);

    // Query
    const query = { 
      groups: supplierID,
      allegro_we_sell_it: allegroUpdate
    };
    const options = {
      // Include only those fields in each returned document
      projection: { _id: 0, allegro_oferta_id: 1, supplier_sku: 1 },
    };
    const documents = await collection.find(query, options);

    // Convert the cursor to an array and store the results
    const itemsArray = await documents.toArray();
    return itemsArray;
  } finally {
    // Close the connection when done
    await client.close();
  }
}


// export async function updateItemsBySku(supplier, skus) {
//   const supplierID = supplierDatabaseID[supplier];
//   const client = new MongoClient(uri, { useUnifiedTopology: true });

//   try {
//     // Connect to the MongoDB cluster
//     await client.connect();   
//     const database = client.db(dbName);
//     const collection = database.collection(dbCollection);

//     // Update query
//     const filter = { 
//       groups: supplierID,
//       supplier_sku: { $in: skus }
//     };

//     const update = {
//       $set: { allegro_we_update_it: false }
//     };

//     const result = await collection.updateMany(filter, update);
//     console.log(`${result.modifiedCount} document(s) was/were updated.`);
//   } finally {
//     // Close the connection when done
//     await client.close();
//   }
// }

export async function updateItemsBySku(supplier, skus) {
  if (!supplier || !skus || skus.length === 0) {
    console.error("Supplier or SKUs not provided");
    return;
  }
  const supplierID = supplierDatabaseID[supplier];
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  // Remove the prefix by splitting at the second underscore and taking the part after it
  const cleanedSkus = skus.map((sku) => sku.split("_").slice(2).join("_"));

  try {
    await client.connect();   
    const database = client.db(dbName);
    const collection = database.collection(dbCollection);

    const filter = { 
      groups: supplierID,
      supplier_sku: { $in: cleanedSkus }
    };

    const update = {
      $set: { allegro_we_update_it: false }
    };

    const result = await collection.updateMany(filter, update)
    console.log(`${result.modifiedCount} document(s) was/were updated.`);
  } catch (error) {
    console.error("Error updating documents:", error);
  }
}

export async function updateItemsByAllegroID(supplier, allegroIDs) {
  if (!supplier || !allegroIDs || allegroIDs.length === 0) {
    console.error("Supplier or IDs not provided");
    return;
  }
  const supplierID = supplierDatabaseID[supplier];
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    await client.connect();   
    const database = client.db(dbName);
    const collection = database.collection(dbCollection);

    const filter = {
      groups: supplierID,
      allegro_oferta_id: { $in: allegroIDs }
    };
    console.log(filter)
    const update = {
      $set: { allegro_we_update_it: false }
    };
    const result = await collection.updateMany(filter, update)
    console.log(result)
    console.log(`${result.modifiedCount} document(s) was/were updated.`);
  } catch (error) {
    console.error("Error updating documents:", error);
  }
}