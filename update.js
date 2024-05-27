import { getAllData, fetchAndUpdateAllegro } from './index.js';
import { sendTelegramMessage } from './modules/AllegroAPIManager.js';

const supplierName = Object.freeze({
    //growbox: "growbox",
    //pgn: "pgn",
    //hurtprem: "hurtprem",
    //rekman: "rekman",
    unimet: "unimet"
})

export async function updateAllSuppliers(updateControl, multiplier = 0.8) {
    for (const supplier of Object.values(supplierName)) {
        console.log(updateControl)
        if (updateControl.stop) {
            console.log('Update stopped.');
            await sendTelegramMessage(`Updating manually interrupted on ${supplier}`);
            updateControl.stop = false
            return;
        }

        await sendTelegramMessage(`Updating... ${supplier}`);
        console.log(supplier)
        
        const filteredObjects = await getAllData(supplier, true, multiplier);
        await fetchAndUpdateAllegro(filteredObjects, updateControl);
        await sendTelegramMessage(`fetchAndUpdateAllegro completed for supplier: ${supplier}`);
    }
}

await updateAllSuppliers(false,0.8);