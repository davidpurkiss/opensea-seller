const webdriver = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const chromedriver = require("chromedriver");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const By = webdriver.By;

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

// Reads and encodes the MetaMask extension from file
const encodeExt = (file) => {
  const stream = fs.readFileSync(path.resolve(file));
  return Buffer.from(stream).toString("base64");
};

// Add the MetaMask extension to Chrome options
const options = new chrome.Options();
options.addExtensions(encodeExt("./extensions/metamask.crx"));

// This sets up the chrome driver
const driver = new webdriver.Builder()
  .setChromeOptions(options)
  .withCapabilities(webdriver.Capabilities.chrome())
  .build();

// Simple function to wait for specified time in seconds
// Use like, await wait(5000)
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, milliseconds);
  });
}

// This configures the MetaMask extension logging in with your secret words and password.
// These are read from environment variables. You can also configure the vars in a .env file.
// See .env.example.
// A network will be added at this point as well.
const setupMetamask = async (driver) => {
  const config = {
    secretWords: process.env.SECRET_WORDS,
    password: process.env.PASSWORD,
    networkName: process.env.NETWORK_NAME,
    rpcUrl: process.env.RPC_URL,
    chainId: process.env.CHAIN_ID,
  };

  const tabs = await driver.getAllWindowHandles();
  console.info(tabs);
  driver.switchTo().window(tabs[0]);
  await driver.findElement(By.xpath('//button[text()="Get Started"]')).click();
  await driver
    .findElement(By.xpath('//button[text()="Import wallet"]'))
    .click();
  await driver.findElement(By.xpath('//button[text()="No Thanks"]')).click();

  // After this you will need to enter you wallet details

  await wait(2000);

  inputs = await driver.findElements(By.xpath("//input"));
  await inputs[0].sendKeys(config.secretWords);
  await inputs[1].sendKeys(config.password);
  await inputs[2].sendKeys(config.password);
  await driver.findElement(By.css(".first-time-flow__terms")).click();
  await driver.findElement(By.xpath('//button[text()="Import"]')).click();

  await wait(3000);

  await driver.findElement(By.xpath('//button[text()="All Done"]')).click();

  await driver
    .findElement(By.xpath('//button[@data-testid="popover-close"]'))
    .click();

  await driver
    .findElement(
      By.xpath('//div[@role="button" and contains(@class, "network-display")]')
    )
    .click();
  await driver.findElement(By.xpath('//span[text()="Custom RPC"]')).click();
  inputs = await driver.findElements(By.xpath("//input"));
  await inputs[0].sendKeys(config.networkName);
  await inputs[1].sendKeys(config.rpcUrl);
  await inputs[2].sendKeys(config.chainId);
  await driver.findElement(By.xpath('//button[text()="Save"]')).click();
};

// Connects to your wallet when on the OpenSea page.
const connectToMetaMask = async (driver) => {
  await wait(3000);

  await driver.findElement(By.xpath('//span[text()="MetaMask"]')).click();

  await wait(3000);

  const windows = await driver.getAllWindowHandles();
  await driver.switchTo().window(windows[2]);

  await driver.findElement(By.xpath('//button[text()="Next"]')).click();
  await driver.findElement(By.xpath('//button[text()="Connect"]')).click();

  await wait(3000);

  await driver.switchTo().window(currentWindow);
};

// The main selling function
const sell = async () => {
  await setupMetamask(driver);

  let isFirst = true;

  const contractAddress = process.env.CONTRACT_ADDRESS;
  const start = 1; // The token you want to start with.
  const end = 1000; // The last token you want to sell.

  for (let i = start; i <= end; i++) {
    // For each token, browse to the page in OpenSea
    await driver.get(
      `https://opensea.io/assets/matic/${contractAddress}/${i}/sell`
    );

    // We need to switch between the OpenSea page and the MetaMask extension window.
    // This stores a handle to the current window
    const currentWindow = await driver.getWindowHandle();

    if (isFirst) {
      // The first time this is run we need to connect OpenSea to the wallet
      await connectToMetaMask(driver);
      isFirst = false;
    } else {
      await wait(1000);
    }

    // Set the price from the environment variable
    await driver
      .findElement(By.xpath("//input[@name='price']"))
      .sendKeys(process.env.PRICE);

    // Completes the listing
    await driver
      .findElement(By.xpath('//button[text()="Complete listing"]'))
      .click();

    // Wait for the Sign dialog to open.
    await wait(3000);

    // And click the sign button
    await driver.findElement(By.xpath('//button[text()="Sign"]')).click();

    // Wait a couple of seconds and switch to the MetaMask window
    await wait(2000);
    const windows = await driver.getAllWindowHandles();
    await driver.switchTo().window(windows[2]);

    // Sign the transaction in MetaMask
    await driver.findElement(By.xpath('//button[text()="Sign"]')).click();

    await wait(1000);

    // Switch back to the OpenSea window to repeat the process for the next token
    await driver.switchTo().window(currentWindow);
  }
};

setTimeout(() => {
  sell();
}, 5000);
