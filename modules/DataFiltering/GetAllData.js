// This module filters the data from the json, which was obtained after parsing the XML,
// into an array of objects with all the characteristics needed to work with Allegro and Amazon.

import { supplierSettings } from '../../configs/AllegroConfig.js';

// Helper functions
function extractPrice(priceString, vat, isVatIncluded) {
    if (priceString.includes(",")) {
        priceString = priceString.replace(/[,\s]/g, '.')
    }
    priceString = priceString.replace(/[A-Za-z]/g, '')
    let price = parseFloat(priceString)
    
    if (isNaN(price)) {
        throw new Error(`Invalid price: '${priceString}'`);
    }
    if (!isVatIncluded) {
      price *= 1 + (vat / 100);
    }
    return Math.ceil(price) - 0.05;
}

function extractVat(vatString, isVatIncluded) {
  if (isVatIncluded) {
    return 0
  }

  const vatStr = vatString.replace(/[,.\s0%]/g, '')
  if (vatStr === "") {
      return 0
  }

  const vat = parseFloat(vatStr);

  if (isNaN(vat)) {
      throw new Error(`Invalid VAT: '${vatString}'`);
  } else if (![0, 5, 8, 23].includes(vat)) {
      throw new Error(`Invalid VAT value: '${vat}'`);
  }

  return vat;
}

function calculatePrice(price, priceRanges, isApplyCustomMultipliers, isApplyCustomMultiplier, supplier, itemSku, multiplier) {
  const range = priceRanges.find(({ maxPrice }) => price <= maxPrice);
  if (!range) {
    throw new Error(`Price ${price} is out of range`);
  }

  let finalPrice;

  if (range.factor === 'add') {
    finalPrice = price + range.value;
  } else if (range.factor === 'multiply') {
    finalPrice = price * range.value;
  } else {
    throw new Error(`Invalid price factor: '${range.factor}'`);
  }

  if (isApplyCustomMultipliers) {
    const { customMultipliers } = supplierSettings[supplier];
    const multiplier = customMultipliers[itemSku];
    if (multiplier != null) {
      finalPrice *= multiplier;
    }
  }

  if (isApplyCustomMultiplier) {
    const { customMultiplier } = supplierSettings[supplier];
    if (customMultiplier != null) {
      finalPrice *= customMultiplier;
    }
  }
  
  finalPrice *= multiplier;

  return Math.ceil(finalPrice) - 0.05;
}

function extractAndCalculateStock(xmlStock) {
    const stock = parseInt(xmlStock) || 0;
    return Math.max(Math.min(stock, 100), 0);
}

function formatEAN(ean) {
  const desiredLength = 13;
  const eanString = String(ean);
  return eanString.padStart(desiredLength, '0');
}

function replacePolishCharactersInSKU(input) {
  const polishToEnglish = {
    'ą': 'a',
    'ć': 'c',
    'ę': 'e',
    'ł': 'l',
    'ń': 'n',
    'ó': 'o',
    'ś': 's',
    'ź': 'z',
    'ż': 'z',
    'Ą': 'A',
    'Ć': 'C',
    'Ę': 'E',
    'Ł': 'L',
    'Ń': 'N',
    'Ó': 'O',
    'Ś': 'S',
    'Ź': 'Z',
    'Ż': 'Z'
  };

  return input.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishToEnglish[match]);
}

// Function to convert string values from supplierSettings objects to property
function byString(jsonObj, path) {
  const properties = path.split('.');
  let currentObj = jsonObj;

  for (let i = 0; i < properties.length; i++) {
    let prop = properties[i];
    let prevProp = properties[i-1]
    
    if (prop === 'ean' && prevProp != undefined && prevProp === 'attrs') {
      const attrsArray = currentObj['a'];
      const eanObj = attrsArray.find(obj => obj.basicProductStats.name === 'EAN');
      currentObj = eanObj ? eanObj['#text'] : undefined;
      break;
    } else if (prop.includes('[') && prop.includes(']')) {
      const [arrayProp, index] = prop.split(/[\[\]]/).filter(s => s !== '');
      currentObj = currentObj[arrayProp][parseInt(index)];
    } else {
      currentObj = currentObj[prop];
    }
  }

  return currentObj;
}

// Final function
// export function filterJSONObjectToArrayOfObjects(supplier, jsonFile, databaseItems, multiplier) {
//   const settings = supplierSettings[supplier];

//   const productsPath = settings.xmlPath.products;
//   const skuPath = settings.xmlPath.sku;
//   const categoryPath = settings.xmlPath.category
//   const pricePath = settings.xmlPath.price;
//   const isApplyCustomMultipliers = settings.applyCustomMultipliers;
//   const isApplyCustomMultiplier = settings.applyMultiplier;
//   const vatPath = settings.xmlPath.vat;
//   const stockPath = settings.xmlPath.stock;
//   const eanPath = settings.xmlPath.ean
//   const priceRanges = settings.priceRanges;
//   const isVatIncluded = settings.isVatIncluded;

//   const skuPrefix = settings.skuPrefix
//   const handlingTime = settings.handlingTime

//   const allProducts = byString(jsonFile, productsPath)

//   const productMap = allProducts.reduce((map, product) => {
//     map[byString(product, skuPath)] = product;
//     return map;
//   }, {});
  
//   const filteredObjects = databaseItems.map((item) => {
//     const sku = item.supplier_sku;
//     const product = productMap[sku];
//     if (!product) {
//         return {
//             allegro_offerta_id: item.allegro_oferta_id,
//             amazon_sku: `${skuPrefix}${sku}`,
//             stock: 0,
//             price: 7.77,
//             ean: 404,
//             handling_time: handlingTime,
//             category: 'N/A'
//         };
//     }

//     const priceString = String(byString(product, pricePath));
//     const vatString = String(byString(product,vatPath));
//     const stockString = String(byString(product, stockPath));

//     const eanString = String(byString(product, eanPath));
//     const formattedEan = formatEAN(eanString);

//     const vat = extractVat(vatString, isVatIncluded);
//     const price = extractPrice(priceString, vat, isVatIncluded);
//     const finalPrice = calculatePrice(price, priceRanges, isApplyCustomMultipliers, isApplyCustomMultiplier, supplier, sku);
//     const finalStock = extractAndCalculateStock(stockString);
//     const finalSKU = replacePolishCharactersInSKU(`${skuPrefix}${sku}`);
//     const category = String(byString(product, categoryPath));

//     return {
//       allegro_offerta_id: item.allegro_oferta_id,
//       amazon_sku: finalSKU,
//       stock: finalStock,
//       price: finalPrice,
//       ean: formattedEan,
//       handlingTime: handlingTime,
//       category: category
//     };
//   });
//   return filteredObjects
// }

export function filterJSONObjectToArrayOfObjects(supplier, jsonFile, databaseItems, multiplier = 1) {
  const settings = supplierSettings[supplier];

  const productsPath = settings.xmlPath.products;
  const skuPath = settings.xmlPath.sku;
  const categoryPath = settings.xmlPath.category;
  const pricePath = settings.xmlPath.price;
  const isApplyCustomMultipliers = settings.applyCustomMultipliers;
  const isApplyCustomMultiplier = settings.applyMultiplier;
  const vatPath = settings.xmlPath.vat;
  const stockPath = settings.xmlPath.stock;
  const eanPath = settings.xmlPath.ean;
  const priceRanges = settings.priceRanges;
  const isVatIncluded = settings.isVatIncluded;

  const skuPrefix = settings.skuPrefix;
  const handlingTime = settings.handlingTime;

  const allProducts = byString(jsonFile, productsPath);

  const productMap = allProducts.reduce((map, product) => {
    map[byString(product, skuPath)] = product;
    return map;
  }, {});
  
  const filteredObjects = databaseItems.map((item) => {
    const sku = item.supplier_sku;
    const product = productMap[sku];
    if (!product) {
        return {
            allegro_offerta_id: item.allegro_oferta_id,
            amazon_sku: `${skuPrefix}${sku}`,
            stock: 0,
            price: 7.77,
            ean: 404,
            handling_time: handlingTime,
            category: 'N/A'
        };
    }

    const priceString = String(byString(product, pricePath));
    const vatString = String(byString(product,vatPath));
    const stockString = String(byString(product, stockPath));

    const eanString = String(byString(product, eanPath));
    const formattedEan = formatEAN(eanString);

    const vat = extractVat(vatString, isVatIncluded);
    const price = extractPrice(priceString, vat, isVatIncluded);
    const finalPrice = calculatePrice(price, priceRanges, isApplyCustomMultipliers, isApplyCustomMultiplier, supplier, sku, multiplier);
    const finalStock = extractAndCalculateStock(stockString);
    const finalSKU = replacePolishCharactersInSKU(`${skuPrefix}${sku}`);
    const category = String(byString(product, categoryPath));

    return {
      allegro_offerta_id: item.allegro_oferta_id,
      amazon_sku: finalSKU,
      stock: finalStock,
      price: finalPrice,
      ean: formattedEan,
      handlingTime: handlingTime,
      category: category
    };
  });
  return filteredObjects;
}
