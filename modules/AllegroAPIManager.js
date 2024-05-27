import https from 'https';
import got from 'got';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

process.on('unhandledRejection', async (error) => {
  console.log(`Unhandled rejection: ${error}`);
  await sendTelegramMessage(`Unhandled rejection: ${error}`);
});

export async function updateOffers(offersArray, accessToken, updateControl) {
  try {
    let arrayWithPriceErrorsToUpdate = [];
    let arrayToEnd = [];
    let arrayToActivate = [];
    let failedHTTPRequest = [];
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.allegro.public.v1+json",
      Accept: "application/vnd.allegro.public.v1+json",
    };
    
    const maxRetries = 5;
  
    for (let i = 0; i < offersArray.length; i++) {
      const offer = offersArray[i];
      const { id, stock, price } = offer;
      if (offer.stock == 0) {
        console.log(`Offer ${offer.id} is 0 stock. Pushed to the arrayToEnd.`)
        arrayToEnd.push(offer);
        continue;
      }
      
      if (updateControl.stop) {
        console.log('Update stopped.');
        await sendTelegramMessage('Update stopped');
        return;
      }
  
        const data = {
            sellingMode: {
                price: {
                    amount: price,
                    currency: "PLN",
                },
            },
            stock: {
                available: stock,
                unit: "UNIT",
            },
        };
      
        const options = {
            headers: headers,
            method: "PATCH",
            body: JSON.stringify(data),
            url: `https://api.allegro.pl/sale/product-offers/${id}`,
        };
  
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const response = await got(options);
          if (response.statusCode === 200 || response.statusCode === 202) {
            console.log(`Offer ${id} updated successfully`);
            arrayToActivate.push(offer);
            success = true;
          } else {
            console.log(response);
            handleErrors(
              response,
              offer,
              arrayToEnd,
              arrayWithPriceErrorsToUpdate
            );
            success = true;
          }
        } catch (error) {
          console.log(`Error updating offer ${id}: ${error}`);
          const statusCode = error.response?.statusCode;
          if (
            statusCode == 500 ||
            statusCode == 501 ||
            statusCode == 502 ||
            statusCode == 503 ||
            statusCode == 504 ||
            error.code === "ECONNRESET" ||
            error.code === "ETIMEDOUT"
          ) {
            console.log("Bad request - will try again in 5 seconds...");
            retries++;
            await sleep(5000); // wait for 5 seconds before retrying
          } else {
            handleErrors(
              error.response,
              offer,
              arrayToEnd,
              arrayWithPriceErrorsToUpdate
            );
            retries = maxRetries;
            success = true;
          }
        }
      }
  
      if (!success) {
        console.log(`I failed to update ${offer.id}`);
        failedHTTPRequest.push(offer);
      }
  
      console.log("activate:", arrayToActivate.length);
      console.log("end:", arrayToEnd.length);
      console.log("updatePriceErrors", arrayWithPriceErrorsToUpdate.length);
    }
  
    if (arrayWithPriceErrorsToUpdate.length > 0) {
      console.log(
        `Updating ${arrayWithPriceErrorsToUpdate.length} offers with price error...`
      );
      await updateOffers(arrayWithPriceErrorsToUpdate, accessToken);
    }
    if (arrayToActivate.length > 0) {
      console.log(
        `Activating ${arrayToActivate.length} offers...`
      );
      await updateOffersStatus(accessToken, arrayToActivate, "ACTIVATE");
    }
    if (arrayToEnd.length > 0) {
      console.log(
        `Finishing ${arrayToEnd.length} offers with errors...`
      );
      await updateOffersStatus(accessToken, arrayToEnd, "END");
    }
    console.log("Here are the items that could not be updated due to a server error:", failedHTTPRequest)

  } catch (error) {
    console.log(`Critical error: ${error}`);
    await sendTelegramMessage(`Critical error in updateOffers function: ${error}`);
    // you can also rethrow the error if you want to stop the execution of the script
    throw error;
  }
}
  

function handleErrors(response, offer, arrayToEnd, arrayWithPriceErrorsToUpdate) {

    let jsonResponse;

    if (response.body) {
      jsonResponse = JSON.parse(response.body);
    } else {
        console.log("Unknown error: empty error object");
        return;
    }

    const statusCode = response.statusCode;
    const errorObject = jsonResponse.errors[0];
    let errorForID = {
        id: offer.id,
        errorCode: errorObject.code,
        errorText: errorObject.userMessage,
    };
    if (errorObject) {
        switch (statusCode) {
            case 400:
                if (errorObject && errorObject.code === "IllegalOfferUpdateException.IllegalIncreasePrice") {
                    const errorText = errorObject.userMessage;
                    const regexMatch = errorText.match(/([0-9]+,[0-9]+) PLN/);
                    if (regexMatch && regexMatch.length > 1) {
                    const priceString = regexMatch[1];
                    const price = Math.floor(parseFloat(priceString.replace(',', '.')));
                    const newPrice = price - 0.01;
                    arrayWithPriceErrorsToUpdate.push({ id: offer.id, price: newPrice, stock: offer.stock });
                    }
                } else {
                    console.log(`Error code 400: ${JSON.stringify(errorObject)}`);
                    arrayToEnd.push(errorForID)
                }
                break;
            case 401:
                console.log("Error code 401: Unauthorized");
                break;
            case 403:
                console.log("Error code 403: Forbidden");
                break;
            case 422:
                if (errorObject && errorObject.code === "IllegalOfferUpdateException.IllegalIncreasePrice") {
                    const errorText = errorObject.userMessage;
                    const regexMatch = errorText.match(/([0-9]+,[0-9]+) PLN/);
                    if (regexMatch && regexMatch.length > 1) {
                        const priceString = regexMatch[1];
                        const price = Math.floor(parseFloat(priceString.replace(',', '.')));
                        const newPrice = price - 0.01;
                        arrayWithPriceErrorsToUpdate.push({ id: offer.id, price: newPrice, stock: offer.stock });
                        console.log(`New price for ${offer.id} is ${newPrice}.`)
                    } else {
                        console.log("Failed to parse the price!")
                    }
                } else {
                    console.log(`Offer ${offer.id} got an error code 422: ${JSON.stringify(errorObject.userMessage)}`);
                    arrayToEnd.push(errorForID)
                }
                break;
            default:
                console.log(`Default case in handleErrors switch. Unknown error ${statusCode}: ${JSON.stringify(errorObject)}`);
                arrayToEnd.push(errorForID);
        }
    } else {
      console.log(`Error status code: ${statusCode}.  Error: ${errorObject}`);
      arrayToEnd.push(errorForID);
    }
}


async function updateOffersStatus(accessToken, offers, action) {
    const batchSize = 1000;
    const maxOffersPerMinute = 9000;
    let startIndex = 0;
    let endIndex = 0;

    while (startIndex < offers.length) {
      endIndex = Math.min(startIndex + batchSize, offers.length);
      const batchOffers = offers.slice(startIndex, endIndex);

      const payload = {
      offerCriteria: [
          {
          offers: batchOffers.map((offer) => ({ id: offer.id })),
          type: "CONTAINS_OFFERS",
          },
      ],
      publication: {
          action: action,
      },
      };

      const commandId = uuidv4();

      const options = {
        hostname: 'api.allegro.pl',
        port: 443,
        path: `/sale/offer-publication-commands/${commandId}`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json',
            'Content-Type': 'application/vnd.allegro.public.v1+json'
        }
      };

      const req = https.request(options, (res) => {

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 201) {
              console.log(`Command ${action}ed successfully. Command ID: ${commandId}. ${data}`);
            } else {
              console.log(`Error ${res.statusCode}: ${data}`);
            }
        });

      });

      req.on('error', (error) => {
        console.error(`Error sending request: ${error}`);
      });

      req.write(JSON.stringify(payload));
      req.end();

      startIndex += batchSize;

      if (startIndex % maxOffersPerMinute === 0) {
        console.log(`Waiting for 1 minute before processing more offers...`);
        await sleep(60000); // Wait 1 minute before processing more offers
      } else {
        await sleep(500); // Wait 500ms between batches
      }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// I have a task to send a Telegram message when the script throws an error. I need a function that will send a message to Telegram bot.
// I will use the function below to send a message to Telegram bot. 
// Fetch is not defined, error says. Can you please regenerate fucntion using got library?


export async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}`;

  try {
      const response = await got(url, { method: 'GET' });
      const jsonResponse = JSON.parse(response.body);
      if (jsonResponse.ok) {
          console.log(`Telegram message sent successfully: ${message}`);
      } else {
          console.log(`Error sending Telegram message: ${jsonResponse.description}`);
      }
  } catch (error) {
      console.log(`Error sending Telegram message: ${error}`);
  }
}
