import { AmazonSettings } from '../../configs/AmazonConfig.js';
import fs from 'fs';
import got from 'got';

async function filterSupplierDataForAmazon(filteredObjects) {
    const zlToEuroRate = await getZlToEuroRate();
  
    const { itemsToDelete, itemsToAdd } = filteredObjects.reduce(
      (acc, item) => {
        if (item.stock <= 0) {
          acc.itemsToDelete.push({
            'seller-sku': item.amazon_sku,
            'add-delete': 'x',
          });
        } else {
          const price = calculateAmazonPriceInEuro(item.price, zlToEuroRate, AmazonSettings.priceMultiplier.DE)
          const shippingTemplate = setShippingTemplateFor(price);
  
          acc.itemsToAdd.push({
            'sku': item.amazon_sku,
            'product-id': item.ean,
            'product-id-type': '4',
            'price': price,
            'item-condition': '11',
            'quantity': item.stock,
            'add-delete': 'a',
            'handling-time': item.handlingTime,
            'merchant_shipping_group_name': shippingTemplate,
            'expedited-shipping': 'N',
          });
        }
        return acc;
      },
      { itemsToDelete: [], itemsToAdd: [] }
    );
    return { itemsToAdd, itemsToDelete };
  }
  
  function calculateAmazonPriceInEuro(price, currencyRate, multiplier) {
    const priceInEuro = price * currencyRate
    const multipliedPrice = priceInEuro * multiplier
    const roundedPrice = Math.ceil(multipliedPrice);
    const beautifiedPrice = roundedPrice + 0.75
    const dotToCommaPrice = String(beautifiedPrice).replace('.', ',');
    return dotToCommaPrice
  }
  
  function setShippingTemplateFor(price) {
    const priceStringToNumber = Number(price.replace(",","."));
    switch (true) {
      case priceStringToNumber <= 50:
        return '15_99 flat';
      case priceStringToNumber <= 150:
        return '9_99 flat';
      case priceStringToNumber > 150:
        return 'Free DE shipping';
    }
  }
  
  async function getZlToEuroRate() {
    try {
      const apiKey = 'qU7kpVMn2IUOhMJwoa3J5516nDh4k9uE';
      const response = await got(`https://api.apilayer.com/exchangerates_data/latest?apikey=${apiKey}&symbols=PLN,EUR`);
      const rates = JSON.parse(response.body).rates;
  
      const eurRate = rates.EUR / rates.PLN;
      return eurRate
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      throw error;
    }
  }

function generateTSV(data, headers, filename) {
    const tsvData = data
        .map((row) =>
        headers
            .map((header) => row[header] || '')
            .join('\t')
        )
        .join('\n');

    const outputData = headers.join('\t') + '\n' + tsvData;
    fs.writeFileSync(filename, outputData);
}

function generateFilename(supplier, type) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${supplier}_${type}_${timestamp}.tsv`;
}


export async function fetchAndWriteDataForAmazon(filteredObjects, supplier) {
    const { itemsToAdd, itemsToDelete } = await filterSupplierDataForAmazon(filteredObjects);
    // Generate filenames
    const amazonAddItemsFileName = generateFilename(supplier, AmazonSettings.fileType.add_items);
    const amazonRemoveItemsFileName = generateFilename(supplier, AmazonSettings.fileType.remove_items);
    // Pass generated filenames to the generateTSV function
    generateTSV(itemsToAdd, AmazonSettings.tsvHeaders.add_items, amazonAddItemsFileName);
    generateTSV(itemsToDelete, AmazonSettings.tsvHeaders.remove_items, amazonRemoveItemsFileName);
}