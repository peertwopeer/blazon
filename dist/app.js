"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Application main class
 */
const chromium = require("chrome-aws-lambda");
class App {
    constructor(version) {
        this.version = version;
    }
    /**
     * Lambda function
     * @param event
     * @param context
     * @returns
     */
    lambdaHandler(event, context) {
        return __awaiter(this, void 0, void 0, function* () {
            let browser = null;
            try {
                let executablePath = "/usr/bin/chromium-browser";
                if (process.env.ENVIRONMENT != "local")
                    executablePath = yield chromium.executablePath;
                browser = yield chromium.puppeteer.launch({
                    defaultViewport: chromium.defaultViewport,
                    headless: chromium.headless,
                    args: chromium.args,
                    executablePath,
                });
                const page = yield browser.newPage();
                const loaded = page.waitForNavigation({ waitUntil: "load" });
                yield page.setContent(event.html);
                const options = {
                    format: "A4",
                    printBackground: true,
                    margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
                };
                yield loaded;
                let pdfBuffer = yield page.pdf(options);
                if (pdfBuffer) {
                    let response = {
                        body: pdfBuffer.toString("base64"),
                        isBase64Encoded: true,
                        statusCode: 200,
                    };
                    context.succeed(response);
                }
            }
            catch (error) {
                return console.log(error, "lambdaHandler");
            }
            finally {
                if (browser !== null)
                    yield browser.close();
            }
        });
    }
}
exports.default = App;
