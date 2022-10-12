/**
 * Application main class
 */
const chromium = require("chrome-aws-lambda");

class App {
  public version: string;

  constructor(version) {
    this.version = version;
  }

  /**
   * Lambda function
   * @param event
   * @param context
   * @returns
   */
  public async lambdaHandler(event: any, context: any) {
    let browser = null;

    try {
      let executablePath = "/usr/bin/chromium-browser";
      if (process.env.ENVIRONMENT != "local")
        executablePath = await chromium.executablePath;

      browser = await chromium.puppeteer.launch({
        defaultViewport: chromium.defaultViewport,
        headless: chromium.headless,
        args: chromium.args,
        executablePath,
      });

      const page = await browser.newPage();
      const loaded = page.waitForNavigation({ waitUntil: "load" });
      await page.setContent(event.html);

      const options = {
        format: "A4",
        printBackground: true,
        margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      };
      await loaded;

      let pdfBuffer = await page.pdf(options);
      if (pdfBuffer) {
        let response = {
          body: pdfBuffer.toString("base64"),
          isBase64Encoded: true,
          statusCode: 200,
        };
        context.succeed(response);
      }
    } catch (error) {
      return console.log(error, "lambdaHandler");
    } finally {
      if (browser !== null) await browser.close();
    }
  }
}

export default App;
