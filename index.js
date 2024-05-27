// Workaround to use import and const in one project
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Modules
import { downloadXML } from './modules/DownloadXML.js';
import { fetchDataFromDB, updateItemsBySku, updateItemsByAllegroID } from './modules/DatabaseManager.js';
import { parseXMLToJSON } from './modules/ParsingManager.js';
import { filterJSONObjectToArrayOfObjects } from './modules/DataFiltering/GetAllData.js';
import { filterSupplierDataForAllegro, filterSupplierDataForCategory, filterSupplierDataForCategoryByAllegroID } from './modules/DataFiltering/GetAllegroData.js';
import { fetchAndWriteDataForAmazon } from './modules/DataFiltering/GetAmazonData.js';
import { getAndCheckToken } from './modules/APITokenManager.js';
import { updateOffers, sendTelegramMessage } from './modules/AllegroAPIManager.js';
import { downloadGrowboxXML } from './modules/DownloadGrowboxXML.js';

const supplierName = Object.freeze({
    pgn: "pgn",
    unimet: "unimet",
    hurtprem: "hurtprem",
    rekman: "rekman",
    growbox: "growbox"
})

export async function getAllData(supplier, isOffersShouldBeUpdatedOnAllegro, multiplier) {
  if (supplier == 'growbox') {
   // await downloadGrowboxXML();
  } else 
     await downloadXML(supplier);
  

  const databaseItems = await fetchDataFromDB(supplier, isOffersShouldBeUpdatedOnAllegro);

  const jsonFromXML = parseXMLToJSON(supplier);

  const filteredObjects = filterJSONObjectToArrayOfObjects(supplier, jsonFromXML, databaseItems, multiplier);

  return filteredObjects
}

export async function fetchAndUpdateAllegro(filteredObjects, updateControl) {
  const allegroObjects = filterSupplierDataForAllegro(filteredObjects);
  const token = await getAndCheckToken();
  await updateOffers(allegroObjects, token, updateControl);
}

// const filteredObjects = await getAllData(supplierName.growbox, true)
// await fetchAndUpdateAllegro(filteredObjects);

// async function turnOffItemsByCategory(supplier, category) {
//   const filteredObjects = await getAllData(supplier, true);
//   const itemsToTurnOff = filterSupplierDataForCategoryByAllegroID(filteredObjects, category);
//   console.log(itemsToTurnOff.length)
//   await updateItemsByAllegroID(supplier, itemsToTurnOff);
// }

// Юнимет
// категория для отключения метизов - TECHNIKA MOCOWAŃ

// PGN
// категория для отключения мотков ленты - Rolki płótno

// await turnOffItemsByCategory(supplierName.unimet, "TECHNIKA MOCOWAŃ");