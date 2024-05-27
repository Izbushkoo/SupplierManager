export function filterSupplierDataForAllegro(filteredObjects) {  
    const allegroObjects = filteredObjects.map((item) => {
        // console.log(item)
      return {
          id: item.allegro_offerta_id,
          stock: item.stock,
          price: item.price,
      };
    });
    return allegroObjects
}

export function filterSupplierDataForCategory(filteredObjects, category) {
    const allegroObjects = filteredObjects.reduce((accumulator, item) => {
      if (item.category.includes(category)) {
        accumulator.push({
          id: item.allegro_offerta_id,
          stock: 0,
          price: 77.77,
        });
      }
      return accumulator;
    }, []);
    return allegroObjects;
}

export function filterSupplierDataForCategoryByAllegroID(filteredObjects, category) {
  const itemsToTurnOff = filteredObjects.reduce((accumulator, item) => {
    if (item.category.includes(category)) {
      accumulator.push(item.allegro_offerta_id);
    }
    return accumulator;
  }, []);
  return itemsToTurnOff;
}